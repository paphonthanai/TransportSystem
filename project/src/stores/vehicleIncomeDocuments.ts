import { defineStore } from 'pinia'
import { trackLoading } from '@/stores/loading'
import { firstSnapshot } from '@/utils/firstSnapshot'
import { ref } from 'vue'
import { useBookingStore } from './booking'
import { useVehiclesStore } from './vehicles'
import { useAuthStore } from './auth'
import { useDocumentNumberRegistryStore } from './documentNumberRegistry'
import { useVehicleExpensesStore } from './vehicleExpenses'
import { fuelCostOf } from '@/utils/bookingMoney'
import { vehicleIncomeDocumentRepository } from '@/repositories/vehicleIncomeDocumentRepository'
import {
  adjustmentIssue,
  cleanAdjustmentLines,
  emptyAdjustments,
  sumAdjustmentLines,
  type IncomeAdjustmentLine,
  type IncomeAdjustments,
} from '@/utils/incomeAdjustments'
import type { Booking } from '@/types'

/**
 * เอกสารรายได้รถร่วม — คู่กับ DriverPayrollDocument (stores/driverPayrollDocuments.ts) แต่ผูกกับ "รถ" ไม่ใช่ "คนขับ":
 * เป็นระเบียนถาวรจริง สร้างจากงานที่ผู้ใช้เลือกเองเท่านั้น (ไม่ใช่ทั้งรอบอัตโนมัติ) ผูก bookingIds ไว้ตายตัว และ Snapshot
 * ยอดเงิน ณ ตอนสร้างไว้
 */
export interface VehicleIncomeDocument {
  id: string
  number: string
  vehicleId: string
  /** Snapshot ทะเบียนรถ ณ ตอนสร้างเอกสาร */
  plate: string
  /** รอบเดือน ค.ศ. "YYYY-MM" ของงานที่เลือก (ใช้แสดงผล ไม่ใช่ตัวกรองข้อมูล เพราะข้อมูลอิง bookingIds ตรงๆ อยู่แล้ว) */
  period: string
  bookingIds: string[]
  tripIncomeTotal: number
  fuelCostTotal: number
  vehicleExpenseTotal: number
  netTotal: number
  /** Snapshot ยอดต่องาน ณ ตอนสร้าง — เอกสารเก่าก่อนมี field นี้ (ค่าน้ำมันคำนวณลิตร × เรท, ค่าใช้จ่ายประจำรถเป็นยอดสะสม) ไม่มี */
  lines?: VehicleIncomeLine[]
  /** รายการหักที่เลือกตอนออกเอกสาร (ภาษี ณ ที่จ่าย/ค่าดำเนินการ/อื่นๆ) คิด % จากรายได้จากงาน (tripIncomeTotal) — เอกสารเก่าไม่มี */
  deductions?: VehicleIncomeDeduction[]
  deductionTotal?: number
  /** เบี้ยเลี้ยงรวม — เอกสารเก่าก่อนมี field นี้ไม่มี (ไม่ได้รวมเบี้ยเลี้ยง) */
  allowanceTotal?: number
  /**
   * true = เบี้ยเลี้ยงเป็นรายจ่ายที่หักจากรถร่วม (บริษัทนำไปจ่ายคนขับ) — เอกสารใหม่ทุกใบ; เอกสารที่มี allowanceTotal แต่ไม่มี
   * field นี้ ออกช่วงสั้นๆ ที่เบี้ยเลี้ยงถูกบวกเป็นรายได้ ยอดใน Snapshot ยังคิดแบบนั้น จึงแสดงตามแบบเดิม
   */
  allowanceIsExpense?: boolean
  /** รายได้ส่วนเพิ่ม/หักค่าใช้จ่าย ที่ผู้ใช้พิมพ์เองตอนออกเอกสาร — เอกสารเก่าไม่มี */
  additions?: IncomeAdjustmentLine[]
  additionTotal?: number
  manualDeductions?: IncomeAdjustmentLine[]
  manualDeductionTotal?: number
  /** สถานะจ่ายของเอกสาร (แบบเดียวกับเอกสารรายได้คนขับ) — เอกสารเก่าก่อนมี field นี้ = รอจ่าย ดู paymentStatusOf */
  paymentStatus?: 'UNPAID' | 'PAID'
  paidDate?: Date
  createdAt: Date
}

export type VehicleIncomeDeductionKind = 'WHT' | 'SERVICE' | 'OTHER'

export interface VehicleIncomeDeduction {
  kind: VehicleIncomeDeductionKind
  label: string
  percent: number
  amount: number
}

/** ตัวเลือกการหักที่ผู้ใช้ติ๊กก่อนออกเอกสาร — label ใช้เฉพาะ OTHER (ที่เหลือใช้ชื่อมาตรฐาน) */
export type VehicleIncomeDeductionOption = { kind: VehicleIncomeDeductionKind; percent: number; label?: string }

const deductionLabelOf = (o: VehicleIncomeDeductionOption) =>
  o.kind === 'WHT' ? 'หักภาษี ณ ที่จ่าย' : o.kind === 'SERVICE' ? 'หักค่าดำเนินการ' : (o.label || '').trim() || 'หักอื่นๆ'

export interface VehicleIncomeLine {
  bookingId: string
  tripFee: number
  fuelCost: number
  vehicleExpense: number
  /** เบี้ยเลี้ยงของงาน (vendorAllowanceOf) — รายจ่ายที่หักจากรถร่วม; เอกสารเก่าไม่มี */
  allowance?: number
}

export type ActionResult = { ok: boolean; message?: string }

export const paymentStatusOf = (doc: Pick<VehicleIncomeDocument, 'paymentStatus'>) => doc.paymentStatus ?? 'UNPAID'

const roundMoney = (n: number) => Math.round(n * 100) / 100

/** คิดยอดหักแต่ละรายการเป็น % ของรายได้จากงาน (ยอดจริงก่อนหักค่าน้ำมัน/ค่าใช้จ่าย) */
export function computeDeductions(tripIncomeTotal: number, options: VehicleIncomeDeductionOption[]): VehicleIncomeDeduction[] {
  return options.map((o) => ({ kind: o.kind, label: deductionLabelOf(o), percent: o.percent, amount: roundMoney((tripIncomeTotal * o.percent) / 100) }))
}

/**
 * ยอดรวม/สุทธิของเอกสารจาก lines + ตัวเลือกการหัก % + รายการที่พิมพ์เอง — ใช้ทั้งตอนสร้างและตอนเอางานออกจากเอกสาร
 * สุทธิ = รายได้จากงาน − หัก % − เบี้ยเลี้ยง (บริษัทนำไปจ่ายคนขับ) + รายได้ส่วนเพิ่ม − ค่าน้ำมัน − ค่าใช้จ่ายประจำรถ − หักค่าใช้จ่าย
 * (หัก % คิดจากรายได้จากงานอย่างเดียว) — เอกสารเก่าที่ไม่มีเบี้ยเลี้ยงใน lines ไม่ถูกเติมเบี้ยเลี้ยงย้อนหลัง
 * allowanceIsExpense = false ใช้เฉพาะคำนวณเอกสารที่ออกช่วงเบี้ยเลี้ยงเป็นรายได้ใหม่ (ตอนเอางานออก) ให้คงแบบเดิม
 */
function totalsOf(
  lines: VehicleIncomeLine[],
  options: VehicleIncomeDeductionOption[],
  adjustments: IncomeAdjustments = emptyAdjustments(),
  allowanceIsExpense = true
) {
  const tripIncomeTotal = roundMoney(lines.reduce((sum, l) => sum + l.tripFee, 0))
  const fuelCostTotal = roundMoney(lines.reduce((sum, l) => sum + l.fuelCost, 0))
  const vehicleExpenseTotal = roundMoney(lines.reduce((sum, l) => sum + l.vehicleExpense, 0))
  const hasAllowance = lines.some((l) => l.allowance !== undefined)
  const allowanceTotal = roundMoney(lines.reduce((sum, l) => sum + (l.allowance ?? 0), 0))
  const deductions = computeDeductions(tripIncomeTotal, options)
  const deductionTotal = roundMoney(deductions.reduce((sum, d) => sum + d.amount, 0))
  const additions = cleanAdjustmentLines(adjustments.additions)
  const manualDeductions = cleanAdjustmentLines(adjustments.deductions)
  const additionTotal = sumAdjustmentLines(additions)
  const manualDeductionTotal = sumAdjustmentLines(manualDeductions)
  const netTotal = roundMoney(
    tripIncomeTotal - deductionTotal + (allowanceIsExpense ? -allowanceTotal : allowanceTotal) + additionTotal - fuelCostTotal - vehicleExpenseTotal - manualDeductionTotal
  )
  return {
    tripIncomeTotal,
    fuelCostTotal,
    vehicleExpenseTotal,
    deductions,
    deductionTotal,
    ...(hasAllowance ? { allowanceTotal, ...(allowanceIsExpense ? { allowanceIsExpense: true } : {}) } : {}),
    ...(additions.length ? { additions, additionTotal } : {}),
    ...(manualDeductions.length ? { manualDeductions, manualDeductionTotal } : {}),
    netTotal,
  }
}

/** เบี้ยเลี้ยงต่องานของรถร่วม — ค่าที่แก้เองในหน้ารถร่วม (vendorAllowance) ถ้ามี ไม่งั้นเบี้ยเลี้ยงของงาน (หลังเพิ่ม/ลดหนี้ ถ้ามี) */
export const vendorAllowanceOf = (b: Pick<Booking, 'vendorAllowance' | 'finalAllowance' | 'allowance'>) =>
  b.vendorAllowance ?? roundMoney(b.finalAllowance ?? b.allowance ?? 0)

/**
 * ค่าน้ำมันต่องานสำหรับรายได้รถร่วม — ระบบคำนวณให้จากลิตร × เรทของงาน ถ้าผู้ใช้แก้เองในตารางหน้ารถร่วม
 * (vendorFuelCost) ใช้ค่าที่แก้แทน — ค่าใช้จ่ายประจำรถดู vehicleExpenseOf ใน store (ต้องรู้งานทั้งเดือนของรถ)
 */
export const vendorFuelCostOf = (b: Pick<Booking, 'vendorFuelCost' | 'fuelLiters' | 'fuelRate'>) => b.vendorFuelCost ?? fuelCostOf(b)

const monthKeyOf = (date?: Date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const useVehicleIncomeDocumentsStore = defineStore('vehicleIncomeDocuments', () => {
  const documents = ref<VehicleIncomeDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    // listener ตัวเดียวทำทั้งโหลดครั้งแรกและ realtime (เดิมอ่านทั้ง collection 2 รอบ) — snapshot แรก = โหลดเสร็จ
    try {
      await firstSnapshot((next, fail) =>
        vehicleIncomeDocumentRepository.subscribe(
          (docs) => {
            documents.value = docs
            next()
          },
          (err) => {
            error.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ (เอกสารรายได้รถร่วม)'
            fail(err)
          }
        )
      )
    } catch (err: any) {
      error.value = err?.message || 'โหลดเอกสารรายได้รถร่วมจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }
  trackLoading(fetchAll())

  const genId = () => `vhic${Date.now()}${Math.random().toString(36).slice(2, 6)}`
  function generateDocNumber(seq: number, date: Date) {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `VI${yyyy}${mm}${dd}${String(seq).padStart(4, '0')}`
  }

  /** จัดการเอกสาร (สร้าง/จ่าย/รีเซ็ต/ยกเลิก/ปลดล็อก) ได้เฉพาะ ADMIN และฝ่ายบัญชี — ตรงกับ Firestore Rules ของ collection นี้ */
  const canManage = () => ['ADMIN', 'ACCOUNTING'].includes(useAuthStore().role ?? '')

  /**
   * สร้างเอกสารรายได้รถจากงานที่เลือกเอง — เฉพาะ ADMIN ต้องเป็นงานของรถคันนี้ทุกงาน (จับคู่ด้วย Booking.plate ตรงกับทะเบียนรถ
   * ไม่ใช้คนขับประจำปัจจุบันมา join ย้อนหลัง), ส่งของสำเร็จแล้ว (DELIVERED), และยังไม่เคยถูกดึงไปออกเอกสารรายได้รถอื่น
   * (vehicleIncomeDocId) ค่าน้ำมัน/ค่าใช้จ่ายประจำรถต่องาน (vendorFuelCostOf/vehicleExpenseOf — ระบบคำนวณ หรือค่าที่ผู้ใช้แก้เอง)
   * — บันทึกเอกสารลง Firestore สำเร็จก่อนค่อยผูกงาน กันงานค้างป้าย "ออกเอกสารแล้ว" ทั้งที่ไม่มีเอกสารจริง
   */
  async function createVehicleIncomeDocument(
    vehicleId: string,
    bookingIds: string[],
    period: string,
    deductionOptions: VehicleIncomeDeductionOption[] = [],
    adjustments: IncomeAdjustments = emptyAdjustments()
  ): Promise<ActionResult & { doc?: VehicleIncomeDocument }> {
    if (!canManage()) return { ok: false, message: 'สร้างเอกสารรายได้รถร่วมได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    if (bookingIds.length === 0) return { ok: false, message: 'ยังไม่ได้เลือกงาน' }
    if (deductionOptions.some((o) => !Number.isFinite(o.percent) || o.percent <= 0 || o.percent > 100))
      return { ok: false, message: 'เปอร์เซ็นต์การหักต้องมากกว่า 0 และไม่เกิน 100' }
    if (deductionOptions.some((o) => o.kind === 'OTHER' && !(o.label || '').trim())) return { ok: false, message: 'กรุณาระบุชื่อรายการหักอื่นๆ' }
    const adjIssue = adjustmentIssue(adjustments)
    if (adjIssue) return { ok: false, message: adjIssue }
    const bookingStore = useBookingStore()
    const vehiclesStore = useVehiclesStore()
    const vehicle = vehiclesStore.vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) return { ok: false, message: 'ไม่พบรถคันนี้' }
    const full = vehiclesStore.fullPlate(vehicle)
    const targetBookings = bookingStore.bookings.filter((b) => bookingIds.includes(b.id))
    if (targetBookings.length !== bookingIds.length) return { ok: false, message: 'ไม่พบงานบางรายการ กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
    const notEligible = targetBookings.filter((b) => b.status !== 'DELIVERED' || (b.plate !== full && b.plate !== vehicle.plate) || b.vehicleIncomeDocId)
    if (notEligible.length) return { ok: false, message: `งาน ${notEligible.map((b) => b.docNo).join(', ')} ไม่ใช่งานที่จบแล้วของรถคันนี้ หรือออกเอกสารไปแล้ว` }

    const lines: VehicleIncomeLine[] = targetBookings.map((b) => ({
      bookingId: b.id,
      tripFee: b.tripFee || 0,
      fuelCost: vendorFuelCostOf(b),
      vehicleExpense: vehicleExpenseOf(b),
      allowance: vendorAllowanceOf(b),
    }))
    const totals = totalsOf(lines, deductionOptions, adjustments)

    const registry = useDocumentNumberRegistryStore()
    const seq = registry.nextSequence('VEHICLE_INCOME')
    const now = new Date()
    const doc: VehicleIncomeDocument = {
      id: genId(),
      number: generateDocNumber(seq, now),
      vehicleId,
      plate: full,
      period,
      bookingIds: targetBookings.map((b) => b.id),
      ...totals,
      lines,
      paymentStatus: 'UNPAID',
      createdAt: now,
    }
    const { id, ...rest } = doc
    try {
      await vehicleIncomeDocumentRepository.set(id, rest)
    } catch (err: any) {
      return { ok: false, message: `บันทึกเอกสารไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'}) — ยังไม่ได้ผูกงานใดๆ` }
    }
    if (!documents.value.some((d) => d.id === doc.id)) documents.value.unshift(doc)
    registry.registerNumber(doc.number)
    targetBookings.forEach((b) => {
      b.vehicleIncomeDocId = doc.id
    })
    bookingStore.addLog('สร้างเอกสาร ' + doc.number, { docId: doc.id })
    return { ok: true, doc }
  }

  /** ยกเลิกเอกสาร — เฉพาะ ADMIN ลบเอกสารใน Firestore ให้สำเร็จก่อน แล้วค่อยปลดงานที่ผูกอยู่ (vehicleIncomeDocId) */
  async function cancelVehicleIncomeDocument(id: string): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'ยกเลิกเอกสารได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (paymentStatusOf(doc) === 'PAID') return { ok: false, message: 'เอกสารนี้จ่ายแล้ว ต้องรีเซ็ตเป็นรอจ่ายก่อนจึงจะยกเลิกได้' }
    try {
      await vehicleIncomeDocumentRepository.delete(id)
    } catch (err: any) {
      return { ok: false, message: `ลบเอกสารไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'})` }
    }
    const bookingStore = useBookingStore()
    doc.bookingIds.forEach((bid) => {
      const b = bookingStore.bookings.find((bk) => bk.id === bid)
      if (b && b.vehicleIncomeDocId === id) b.vehicleIncomeDocId = undefined
    })
    documents.value = documents.value.filter((d) => d.id !== id)
    bookingStore.addLog(`ยกเลิกเอกสาร ${doc.number} (ปลดงาน ${doc.bookingIds.length} งาน)`, { docId: id })
    return { ok: true }
  }

  /**
   * เอางานเดียวออกจากเอกสาร (รีเซ็ตป้าย "ออกเอกสารแล้ว" ของงานนั้น) — คิดยอดรวม/รายการหัก % ใหม่จากงานที่เหลือ บันทึกเอกสาร
   * ลง Firestore สำเร็จก่อนค่อยปลดงาน ถ้าเป็นงานสุดท้ายในเอกสาร = ยกเลิกเอกสารทั้งใบ
   */
  async function removeBookingFromDocument(bookingId: string): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'รีเซ็ตงานได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const bookingStore = useBookingStore()
    const booking = bookingStore.bookings.find((b) => b.id === bookingId)
    if (!booking?.vehicleIncomeDocId) return { ok: false, message: 'งานนี้ยังไม่ได้ออกเอกสาร' }
    const doc = documents.value.find((d) => d.id === booking.vehicleIncomeDocId)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร — ใช้ปุ่มปลดล็อกแทน' }
    if (paymentStatusOf(doc) === 'PAID') return { ok: false, message: `เอกสาร ${doc.number} จ่ายแล้ว ต้องรีเซ็ตเป็นรอจ่ายก่อนจึงจะเอางานออกได้` }
    if (doc.bookingIds.length <= 1) return cancelVehicleIncomeDocument(doc.id)

    const remainingIds = doc.bookingIds.filter((id) => id !== bookingId)
    // เอกสารเก่าไม่มี lines — สร้างจากงานจริงตอนนี้ (ยอดของงานในเอกสารเก่าถูกล็อกไว้ตั้งแต่ออกเอกสารอยู่แล้ว)
    const lines: VehicleIncomeLine[] = (doc.lines ?? remainingIds.map((id) => {
      const b = bookingStore.bookings.find((bk) => bk.id === id)
      return { bookingId: id, tripFee: b?.tripFee || 0, fuelCost: b ? vendorFuelCostOf(b) : 0, vehicleExpense: b ? vehicleExpenseOf(b) : 0 }
    })).filter((l) => l.bookingId !== bookingId)
    const options: VehicleIncomeDeductionOption[] = (doc.deductions ?? []).map((d) => ({ kind: d.kind, percent: d.percent, label: d.label }))
    // รายได้ส่วนเพิ่ม/หักค่าใช้จ่ายที่พิมพ์เองเป็นยอดของทั้งเอกสาร ไม่ผูกกับงานใด — คงไว้เหมือนเดิม
    const adjustments: IncomeAdjustments = { additions: doc.additions ?? [], deductions: doc.manualDeductions ?? [] }
    const keepIncomeStyle = doc.allowanceTotal !== undefined && !doc.allowanceIsExpense
    const updated: VehicleIncomeDocument = { ...doc, bookingIds: remainingIds, lines, ...totalsOf(lines, options, adjustments, !keepIncomeStyle) }
    const { id, ...rest } = updated
    try {
      await vehicleIncomeDocumentRepository.set(id, rest)
    } catch (err: any) {
      return { ok: false, message: `บันทึกเอกสารไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'}) — ยังไม่ได้ปลดงาน` }
    }
    documents.value = documents.value.map((d) => (d.id === id ? updated : d))
    booking.vehicleIncomeDocId = undefined
    bookingStore.addLog(`เอางาน ${booking.docNo} ออกจากเอกสาร ${doc.number} (สุทธิ ${doc.netTotal} → ${updated.netTotal} บาท)`, { docId: id, bookingId })
    return { ok: true }
  }

  const paidDateIssue = (date: Date) => {
    if (Number.isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง'
    if (date.getTime() > Date.now()) return 'ห้ามเลือกวันที่จ่ายล่วงหน้า'
    return ''
  }

  /** บันทึกเอกสารที่แก้แล้วลง Firestore ให้สำเร็จก่อน ค่อยอัปเดตในหน้าจอ + log — เหมือน update() ใน driverPayrollDocuments.ts */
  async function update(doc: VehicleIncomeDocument, patch: Partial<VehicleIncomeDocument>, logAction: string): Promise<ActionResult> {
    const { id, ...rest } = { ...doc, ...patch }
    try {
      await vehicleIncomeDocumentRepository.set(id, rest)
    } catch (err: any) {
      return { ok: false, message: `บันทึกไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'})` }
    }
    Object.assign(doc, patch)
    useBookingStore().addLog(logAction, { docId: doc.id })
    return { ok: true }
  }

  async function recordPayment(id: string, paidDate: Date = new Date()): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'บันทึกจ่ายเงินได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (paymentStatusOf(doc) === 'PAID') return { ok: false, message: 'เอกสารนี้จ่ายแล้ว' }
    const dateIssue = paidDateIssue(paidDate)
    if (dateIssue) return { ok: false, message: dateIssue }
    return update(doc, { paymentStatus: 'PAID', paidDate }, `บันทึกจ่ายเงินเอกสาร ${doc.number} (${paidDate.toLocaleDateString('th-TH')})`)
  }

  async function updatePaidDate(id: string, paidDate: Date): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'แก้วันที่จ่ายได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (paymentStatusOf(doc) !== 'PAID') return { ok: false, message: 'เอกสารนี้ยังไม่จ่าย' }
    const dateIssue = paidDateIssue(paidDate)
    if (dateIssue) return { ok: false, message: dateIssue }
    return update(doc, { paidDate }, `แก้วันที่จ่ายเอกสาร ${doc.number} → ${paidDate.toLocaleDateString('th-TH')}`)
  }

  /** รีเซ็ตเอกสารที่จ่ายแล้วกลับเป็นรอจ่าย (UI ต้องให้ยืนยันก่อนเรียก) งานในเอกสารยังผูกอยู่เหมือนเดิม */
  async function resetPayment(id: string): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'รีเซ็ตสถานะจ่ายได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (paymentStatusOf(doc) !== 'PAID') return { ok: false, message: 'เอกสารนี้ยังไม่จ่าย' }
    return update(doc, { paymentStatus: 'UNPAID', paidDate: undefined }, `รีเซ็ตเอกสาร ${doc.number} จากจ่ายแล้วเป็นรอจ่าย`)
  }

  /** เหตุผลที่แก้ค่าน้ำมัน/ค่าใช้จ่ายประจำรถของงานในหน้ารถร่วมไม่ได้ — ว่าง = แก้ได้ */
  function vendorCostEditBlockedReason(booking: Booking): string {
    if (!canManage()) return 'เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี'
    if (booking.status !== 'DELIVERED') return 'งานยังไม่จบ'
    if (booking.vehicleIncomeDocId) return 'ออกเอกสารแล้ว'
    return ''
  }

  /** งานที่จบแล้วของรถคันเดียวกับ booking ในเดือนเดียวกัน (จับคู่ด้วย Booking.plate เหมือนตอนออกเอกสาร) */
  function vehicleOfBooking(booking: Pick<Booking, 'plate'>) {
    const vehiclesStore = useVehiclesStore()
    return vehiclesStore.vehicles.find((v) => booking.plate === vehiclesStore.fullPlate(v) || booking.plate === v.plate)
  }

  /**
   * ค่าใช้จ่ายประจำรถเฉลี่ยต่องาน = ค่าใช้จ่ายประจำรถของเดือนนั้น (vehicleExpenses ตามวันที่รายการ) ÷ จำนวนงานที่จบแล้ว
   * ของรถคันนี้ในเดือนเดียวกัน — ปัดทีละงานเป็นสตางค์ ผลรวมอาจคลาดจากยอดเดือนได้ไม่เกินไม่กี่สตางค์
   */
  function autoVehicleExpenseOf(booking: Booking): number {
    const vehicle = vehicleOfBooking(booking)
    const month = monthKeyOf(booking.shipDate || booking.completedAt)
    if (!vehicle || !month) return 0
    const vehiclesStore = useVehiclesStore()
    const full = vehiclesStore.fullPlate(vehicle)
    const jobCount = useBookingStore().bookings.filter(
      (b) => b.status === 'DELIVERED' && (b.plate === full || b.plate === vehicle.plate) && monthKeyOf(b.shipDate || b.completedAt) === month
    ).length
    if (jobCount === 0) return 0
    const monthTotal = useVehicleExpensesStore()
      .expensesForVehicle(vehicle.id)
      .filter((e) => monthKeyOf(e.date) === month)
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    return roundMoney(monthTotal / jobCount)
  }

  /** ค่าใช้จ่ายประจำรถต่องาน — ค่าที่ผู้ใช้แก้เอง (vendorVehicleExpense) ถ้ามี ไม่งั้นค่าเฉลี่ยอัตโนมัติ */
  const vehicleExpenseOf = (booking: Booking) => booking.vendorVehicleExpense ?? autoVehicleExpenseOf(booking)

  /**
   * แก้ค่าน้ำมัน/ค่าใช้จ่ายประจำรถต่องาน (บาท, ไม่ติดลบ) — ไม่แตะลิตร/เรทน้ำมันของงาน ส่ง null = ล้างค่าที่แก้เอง กลับไปใช้
   * ค่าที่ระบบคำนวณอัตโนมัติ
   */
  function updateVendorCosts(
    bookingId: string,
    data: { fuelCost?: number | null; vehicleExpense?: number | null; allowance?: number | null }
  ): ActionResult {
    const bookingStore = useBookingStore()
    const booking = bookingStore.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false, message: 'ไม่พบงาน' }
    const blocked = vendorCostEditBlockedReason(booking)
    if (blocked) return { ok: false, message: blocked }
    const values = [data.fuelCost, data.vehicleExpense, data.allowance].filter((v) => v !== undefined && v !== null) as number[]
    if (values.some((v) => !Number.isFinite(v) || v < 0)) return { ok: false, message: 'จำนวนเงินต้องเป็นตัวเลขไม่ติดลบ' }
    const changes: string[] = []
    if (data.fuelCost !== undefined) {
      const before = vendorFuelCostOf(booking)
      booking.vendorFuelCost = data.fuelCost === null ? undefined : roundMoney(data.fuelCost)
      changes.push(`ค่าน้ำมัน ${before} → ${vendorFuelCostOf(booking)}${data.fuelCost === null ? ' (กลับไปคำนวณอัตโนมัติ)' : ''}`)
    }
    if (data.vehicleExpense !== undefined) {
      const before = vehicleExpenseOf(booking)
      booking.vendorVehicleExpense = data.vehicleExpense === null ? undefined : roundMoney(data.vehicleExpense)
      changes.push(`ค่าใช้จ่ายประจำรถ ${before} → ${vehicleExpenseOf(booking)}${data.vehicleExpense === null ? ' (กลับไปเฉลี่ยอัตโนมัติ)' : ''}`)
    }
    if (data.allowance !== undefined) {
      const before = vendorAllowanceOf(booking)
      booking.vendorAllowance = data.allowance === null ? undefined : roundMoney(data.allowance)
      changes.push(`เบี้ยเลี้ยง ${before} → ${vendorAllowanceOf(booking)}${data.allowance === null ? ' (กลับไปใช้เบี้ยเลี้ยงของงาน)' : ''}`)
    }
    if (changes.length) bookingStore.addLog(`แก้ยอดรถร่วม ${booking.docNo}: ${changes.join(', ')} บาท`, { bookingId: booking.id })
    return { ok: true }
  }

  /** งานผูก vehicleIncomeDocId ไว้แต่หาเอกสารไม่เจอ — ดู isOrphanedBooking ใน driverPayrollDocuments.ts */
  function isOrphanedBooking(booking: { vehicleIncomeDocId?: string }): boolean {
    if (!booking.vehicleIncomeDocId || loading.value || error.value) return false
    return !documents.value.some((d) => d.id === booking.vehicleIncomeDocId)
  }

  function releaseOrphanedBooking(bookingId: string): ActionResult {
    if (!canManage()) return { ok: false, message: 'ปลดล็อกงานได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const bookingStore = useBookingStore()
    const booking = bookingStore.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false, message: 'ไม่พบงาน' }
    if (!isOrphanedBooking(booking)) return { ok: false, message: 'งานนี้มีเอกสารรายได้รถร่วมอยู่จริง (หรือยังโหลดเอกสารไม่สำเร็จ) ปลดล็อกไม่ได้' }
    const missingId = booking.vehicleIncomeDocId
    booking.vehicleIncomeDocId = undefined
    bookingStore.addLog(`ปลดล็อกงาน ${booking.docNo} จากเอกสารรายได้รถร่วมที่ไม่พบ (${missingId})`, { bookingId: booking.id })
    return { ok: true }
  }

  const documentsForVehicle = (vehicleId: string) =>
    documents.value.filter((d) => d.vehicleId === vehicleId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    documents,
    loading,
    error,
    canManage,
    createVehicleIncomeDocument,
    cancelVehicleIncomeDocument,
    removeBookingFromDocument,
    recordPayment,
    updatePaidDate,
    resetPayment,
    vendorCostEditBlockedReason,
    updateVendorCosts,
    vehicleExpenseOf,
    isOrphanedBooking,
    releaseOrphanedBooking,
    documentsForVehicle,
  }
})
