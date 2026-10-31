import { defineStore } from 'pinia'
import { trackLoading } from '@/stores/loading'
import { ref } from 'vue'
import { useBookingStore } from './booking'
import { useDocumentNumberRegistryStore } from './documentNumberRegistry'
import { usePayrollDeductionsStore } from './payrollDeductions'
import { useDriversStore } from './drivers'
import { useAuthStore } from './auth'
import { driverIdentityIssue } from '@/utils/driverIdentity'
import { driverPayrollDocumentRepository } from '@/repositories/driverPayrollDocumentRepository'
import { adjustmentIssue, cleanAdjustmentLines, emptyAdjustments, type IncomeAdjustments } from '@/utils/incomeAdjustments'

/**
 * เอกสารรายได้คนขับ — ต่างจากเดิม (DriverIncomeDocumentView.vue เวอร์ชันก่อนหน้า) ตรงที่เป็นระเบียนถาวรจริง ไม่ใช่คำนวณสด
 * ทุกครั้งที่เปิดหน้า: สร้างจากงานที่ผู้ใช้เลือกเองเท่านั้น (ไม่ใช่ทั้งรอบอัตโนมัติ) ผูก bookingIds ไว้ตายตัว และ Snapshot
 * ยอดเงิน ณ ตอนสร้างไว้ (ไม่ขยับตามถ้ามีคนแก้ไขรายการหักของคนขับภายหลัง) — เหมือน SalesDocument (Billing/Invoice/Receipt)
 * แต่แยก Entity กันเพราะไม่ใช่เอกสารขาย ไม่มี VAT/ลูกค้า
 */
export interface DriverPayrollDocument {
  id: string
  number: string
  driverId: string
  /** Snapshot ชื่อคนขับ ณ ตอนสร้างเอกสาร — ไม่ผูกกับชื่อปัจจุบันในทะเบียนคนขับ */
  driverName: string
  /** รอบเดือน ค.ศ. "YYYY-MM" ของงานที่เลือก (ใช้แสดงผล ไม่ใช่ตัวกรองข้อมูล เพราะข้อมูลอิง bookingIds ตรงๆ อยู่แล้ว) */
  period: string
  bookingIds: string[]
  tripIncomeTotal: number
  additionTotal: number
  deductionTotal: number
  /** Snapshot รายได้อื่นๆ/รายการหักทีละรายการ ณ ตอนสร้าง — เอกสารเก่าก่อนมี field นี้มีแค่ยอดรวม */
  additionItems?: DriverPayrollLineItem[]
  deductionItems?: DriverPayrollLineItem[]
  netIncome: number
  paymentStatus: 'UNPAID' | 'PAID'
  paidDate?: Date
  createdAt: Date
}

export interface DriverPayrollLineItem {
  type: string
  label: string
  amount: number
}

/** หัก % ตอนออกเอกสารคนขับ คิดจากรายได้จากงาน (tripIncomeTotal) — label ใช้เฉพาะ OTHER */
export type DriverPayrollPercentDeduction = { kind: 'WHT' | 'OTHER'; percent: number; label?: string }
export const DRIVER_WHT_PERCENT = 3

/** สิ่งที่ผู้ใช้เลือก/พิมพ์เองตอนออกเอกสาร: หัก % + รายได้ส่วนเพิ่ม/หักค่าใช้จ่าย (ระบุรายละเอียด/ราคาเอง) */
export type DriverPayrollExtras = { percentDeductions?: DriverPayrollPercentDeduction[]; adjustments?: IncomeAdjustments }

/** รายการหัก % เป็น DriverPayrollLineItem (type PERCENT) เช่น "หักภาษี ณ ที่จ่าย 3%" — ปัดเป็นสตางค์ */
export function percentDeductionItems(tripIncomeTotal: number, options: DriverPayrollPercentDeduction[]): DriverPayrollLineItem[] {
  return options.map((o) => ({
    type: 'PERCENT',
    label: `${o.kind === 'WHT' ? 'หักภาษี ณ ที่จ่าย' : (o.label || '').trim() || 'หักอื่นๆ'} ${o.percent}%`,
    amount: Math.round(tripIncomeTotal * o.percent) / 100,
  }))
}

export type ActionResult = { ok: boolean; message?: string }
export type CreateDriverPayrollResult = ActionResult & {
  doc?: DriverPayrollDocument
  /** งานที่ driverId/ชื่อคนขับขัดกับทะเบียน — ไม่สร้างเอกสารให้ ต้องให้ผู้ใช้ตรวจสอบก่อน */
  mismatches?: { bookingId: string; docNo: string; issue: string }[]
}

const roundMoney = (n: number) => Math.round(n * 100) / 100

export const useDriverPayrollDocumentsStore = defineStore('driverPayrollDocuments', () => {
  const documents = ref<DriverPayrollDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      documents.value = await driverPayrollDocumentRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดเอกสารรายได้คนขับจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
    driverPayrollDocumentRepository.subscribe(
      (docs) => (documents.value = docs),
      (err) => {
        error.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ (เอกสารรายได้คนขับ)'
      }
    )
  }
  trackLoading(fetchAll())

  const genId = () => `drpr${Date.now()}${Math.random().toString(36).slice(2, 6)}`
  const toBEPeriodLabel = (monthValue: string) => {
    const [y, m] = monthValue.split('-')
    return `${Number(y) + 543}-${m}`
  }
  function generateDocNumber(seq: number, date: Date) {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `PR${yyyy}${mm}${dd}${String(seq).padStart(4, '0')}`
  }

  const save = (doc: DriverPayrollDocument) => {
    const { id, ...rest } = doc
    return driverPayrollDocumentRepository.set(id, rest)
  }

  /** แก้ field ของเอกสาร — บันทึก Firestore สำเร็จก่อนค่อยเปลี่ยนในหน้าจอ แล้วเขียน log */
  async function update(doc: DriverPayrollDocument, patch: Partial<DriverPayrollDocument>, logAction: string): Promise<ActionResult> {
    try {
      await save({ ...doc, ...patch })
    } catch (err: any) {
      return { ok: false, message: `บันทึกไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'})` }
    }
    Object.assign(doc, patch)
    useBookingStore().addLog(logAction, { docId: doc.id })
    return { ok: true }
  }

  /** จัดการเอกสาร (สร้าง/จ่าย/รีเซ็ต/ยกเลิก/ปลดล็อก) ได้เฉพาะ ADMIN และฝ่ายบัญชี — ตรงกับ Firestore Rules ของ collection นี้ */
  const canManage = () => ['ADMIN', 'ACCOUNTING'].includes(useAuthStore().role ?? '')

  const paidDateIssue = (date: Date) => {
    if (Number.isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง'
    if (date.getTime() > Date.now()) return 'ห้ามเลือกวันที่จ่ายล่วงหน้า'
    return ''
  }

  /**
   * สร้างเอกสารรายได้คนขับจากงานที่เลือกเอง — ต้องเป็นงานของคนขับคนนี้ทุกงาน, ส่งของสำเร็จแล้ว (DELIVERED), และยังไม่เคยถูก
   * ดึงไปออกเอกสารรายได้คนขับอื่น (driverPayrollDocId) จับคู่ด้วย driverId เป็นหลักและตรวจชื่อประกอบ (driverIdentityIssue)
   * ถ้าขัดกันไม่สร้างให้ คืนรายการที่ไม่ตรงไปให้ผู้ใช้ตรวจสอบก่อน
   * รายได้จากงาน (tripIncomeTotal) รวมจาก finalAllowance/allowance ของแต่ละงานที่เลือกเป๊ะๆ — รายได้อื่นๆ/รายการหัก
   * Snapshot ทีละรายการจาก payrollDeductionsStore ด้วยชื่อเต็มตามทะเบียนคนขับ (มีคำนำหน้า — key เดียวกับที่
   * PayrollDeductionPanel บันทึกไว้ เดิมใช้ชื่อจาก Snapshot ในงานซึ่งไม่มีคำนำหน้า จึงหายอดหักไม่เจอ) ไม่ขยับตามถ้ามีคน
   * แก้ไขรายการหักภายหลัง — ต้องบันทึกเอกสารลง Firestore สำเร็จก่อน ค่อยผูกงาน (driverPayrollDocId) กันงานค้างป้าย
   * "ออกเอกสารแล้ว" ทั้งที่ไม่มีเอกสารจริง
   */
  async function createDriverPayrollDocument(
    driverId: string,
    bookingIds: string[],
    period: string,
    extras: DriverPayrollExtras = {}
  ): Promise<CreateDriverPayrollResult> {
    if (!canManage()) return { ok: false, message: 'สร้างเอกสารรายได้คนขับได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    if (bookingIds.length === 0) return { ok: false, message: 'ยังไม่ได้เลือกงาน' }
    const percentDeductions = extras.percentDeductions ?? []
    const adjustments = extras.adjustments ?? emptyAdjustments()
    if (percentDeductions.some((o) => !Number.isFinite(o.percent) || o.percent <= 0 || o.percent > 100))
      return { ok: false, message: 'เปอร์เซ็นต์การหักต้องมากกว่า 0 และไม่เกิน 100' }
    if (percentDeductions.some((o) => o.kind === 'OTHER' && !(o.label || '').trim())) return { ok: false, message: 'กรุณาระบุชื่อรายการหักอื่นๆ' }
    const adjIssue = adjustmentIssue(adjustments)
    if (adjIssue) return { ok: false, message: adjIssue }
    const bookingStore = useBookingStore()
    const driversStore = useDriversStore()
    const deductionsStore = usePayrollDeductionsStore()
    // รายการหักโหลดไม่สำเร็จ (เช่นสิทธิ์อ่านไม่พอ) ห้ามสร้าง — ไม่งั้นเอกสารจะ Snapshot ยอดหักเป็น 0 แบบเงียบๆ
    if (deductionsStore.loading || deductionsStore.error) return { ok: false, message: 'ยังโหลดรายการหัก/รายได้อื่นๆ ของคนขับไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่' }
    const driver = driversStore.drivers.find((d) => d.id === driverId)
    if (!driver) return { ok: false, message: 'ไม่พบคนขับในทะเบียน' }
    const driverName = driversStore.fullName(driver)
    const targetBookings = bookingStore.bookings.filter((b) => bookingIds.includes(b.id))
    if (targetBookings.length !== bookingIds.length) return { ok: false, message: 'ไม่พบงานบางรายการ กรุณารีเฟรชหน้านี้แล้วลองใหม่' }
    const notEligible = targetBookings.filter((b) => b.status !== 'DELIVERED' || b.driverPayrollDocId)
    if (notEligible.length) return { ok: false, message: `งาน ${notEligible.map((b) => b.docNo).join(', ')} ยังไม่จบหรือออกเอกสารไปแล้ว` }
    const mismatches = targetBookings
      .map((b) => ({ bookingId: b.id, docNo: b.docNo, issue: driverIdentityIssue(b, driver, driverName) }))
      .filter((m) => m.issue)
    if (mismatches.length) return { ok: false, message: 'ข้อมูลคนขับในงานไม่ตรงกับทะเบียน กรุณาตรวจสอบก่อน', mismatches }

    const periodLabel = toBEPeriodLabel(period)
    const toItem = (d: { type: string; label: string; amount: number }) => ({ type: d.type, label: d.label, amount: d.amount })
    const tripIncomeTotal = roundMoney(targetBookings.reduce((sum, b) => sum + (b.finalAllowance ?? b.allowance ?? 0), 0))
    // รายการจากหน้าเงินเดือน + รายการที่พิมพ์เองตอนออกเอกสาร (MANUAL) + หัก % จากรายได้จากงาน (PERCENT)
    const manual = (l: { label: string; amount: number }) => ({ type: 'MANUAL', label: l.label, amount: l.amount })
    const additionItems = [...deductionsStore.additionsFor(driverName, periodLabel).map(toItem), ...cleanAdjustmentLines(adjustments.additions).map(manual)]
    const deductionItems = [
      ...deductionsStore.deductionsFor(driverName, periodLabel).map(toItem),
      ...percentDeductionItems(tripIncomeTotal, percentDeductions),
      ...cleanAdjustmentLines(adjustments.deductions).map(manual),
    ]
    const additionTotal = roundMoney(additionItems.reduce((sum, a) => sum + a.amount, 0))
    const deductionTotal = roundMoney(deductionItems.reduce((sum, d) => sum + d.amount, 0))
    const netIncome = roundMoney(tripIncomeTotal + additionTotal - deductionTotal)

    const registry = useDocumentNumberRegistryStore()
    const seq = registry.nextSequence('DRIVER_PAYROLL')
    const now = new Date()
    const doc: DriverPayrollDocument = {
      id: genId(),
      number: generateDocNumber(seq, now),
      driverId,
      driverName,
      period,
      bookingIds: targetBookings.map((b) => b.id),
      tripIncomeTotal,
      additionTotal,
      deductionTotal,
      additionItems,
      deductionItems,
      netIncome,
      paymentStatus: 'UNPAID',
      createdAt: now,
    }
    try {
      await save(doc)
    } catch (err: any) {
      return { ok: false, message: `บันทึกเอกสารไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'}) — ยังไม่ได้ผูกงานใดๆ` }
    }
    if (!documents.value.some((d) => d.id === doc.id)) documents.value.unshift(doc)
    registry.registerNumber(doc.number)
    targetBookings.forEach((b) => {
      b.driverPayrollDocId = doc.id
    })
    bookingStore.addLog('สร้างเอกสาร ' + doc.number, { docId: doc.id })
    return { ok: true, doc }
  }

  /** บันทึกจ่ายเงินเอกสาร (รอจ่าย → จ่ายแล้ว) — เฉพาะ ADMIN, วันที่จ่ายห้ามล่วงหน้า */
  async function recordPayment(id: string, paidDate: Date = new Date()): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'บันทึกจ่ายเงินได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (doc.paymentStatus === 'PAID') return { ok: false, message: 'เอกสารนี้จ่ายแล้ว' }
    const dateIssue = paidDateIssue(paidDate)
    if (dateIssue) return { ok: false, message: dateIssue }
    return update(doc, { paymentStatus: 'PAID', paidDate }, `บันทึกจ่ายเงินเอกสาร ${doc.number} (${paidDate.toLocaleDateString('th-TH')})`)
  }

  /** แก้วันที่จ่ายของเอกสารที่จ่ายแล้ว — เฉพาะ ADMIN */
  async function updatePaidDate(id: string, paidDate: Date): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'แก้วันที่จ่ายได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (doc.paymentStatus !== 'PAID') return { ok: false, message: 'เอกสารนี้ยังไม่จ่าย' }
    const dateIssue = paidDateIssue(paidDate)
    if (dateIssue) return { ok: false, message: dateIssue }
    return update(doc, { paidDate }, `แก้วันที่จ่ายเอกสาร ${doc.number} → ${paidDate.toLocaleDateString('th-TH')}`)
  }

  /** รีเซ็ตเอกสารที่จ่ายแล้วกลับเป็นรอจ่าย — เฉพาะ ADMIN (UI ต้องให้ยืนยันก่อนเรียก) งานในเอกสารยังผูกอยู่เหมือนเดิม */
  async function resetPayment(id: string): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'รีเซ็ตสถานะจ่ายได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (doc.paymentStatus !== 'PAID') return { ok: false, message: 'เอกสารนี้ยังไม่จ่าย' }
    return update(doc, { paymentStatus: 'UNPAID', paidDate: undefined }, `รีเซ็ตเอกสาร ${doc.number} จากจ่ายแล้วเป็นรอจ่าย`)
  }

  /**
   * ยกเลิกเอกสารที่ยังไม่จ่าย — เฉพาะ ADMIN ลบเอกสารใน Firestore ให้สำเร็จก่อน แล้วค่อยปลดงานที่ผูกอยู่ (driverPayrollDocId)
   * ให้กลับมาเลือกออกเอกสารใหม่ได้ (ลบไม่สำเร็จ = ไม่ปลดงาน กันงานหลุดจากเอกสารที่ยังอยู่จริง)
   */
  async function cancelDriverPayrollDocument(id: string): Promise<ActionResult> {
    if (!canManage()) return { ok: false, message: 'ยกเลิกเอกสารได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (doc.paymentStatus !== 'UNPAID') return { ok: false, message: 'เอกสารนี้จ่ายแล้ว ต้องรีเซ็ตเป็นรอจ่ายก่อนจึงจะยกเลิกได้' }
    try {
      await driverPayrollDocumentRepository.delete(id)
    } catch (err: any) {
      return { ok: false, message: `ลบเอกสารไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'})` }
    }
    const bookingStore = useBookingStore()
    doc.bookingIds.forEach((bid) => {
      const b = bookingStore.bookings.find((bk) => bk.id === bid)
      if (b && b.driverPayrollDocId === id) b.driverPayrollDocId = undefined
    })
    documents.value = documents.value.filter((d) => d.id !== id)
    bookingStore.addLog(`ยกเลิกเอกสาร ${doc.number} (ปลดงาน ${doc.bookingIds.length} งาน)`, { docId: id })
    return { ok: true }
  }

  /**
   * งานผูก driverPayrollDocId ไว้แต่หาเอกสารไม่เจอ (เช่นเอกสารบันทึกไม่สำเร็จสมัย Rules ยังไม่เปิดให้เขียน) — ต้องโหลด
   * เอกสารสำเร็จก่อนเท่านั้น ไม่งั้นแยกไม่ออกว่าเอกสารหายจริงหรือแค่ยังโหลดไม่ได้
   */
  function isOrphanedBooking(booking: { driverPayrollDocId?: string }): boolean {
    if (!booking.driverPayrollDocId || loading.value || error.value) return false
    return !documents.value.some((d) => d.id === booking.driverPayrollDocId)
  }

  /** ปลดงานที่ค้างป้าย "ออกเอกสารแล้ว" แต่ไม่มีเอกสารจริง — เฉพาะ ADMIN */
  function releaseOrphanedBooking(bookingId: string): ActionResult {
    if (!canManage()) return { ok: false, message: 'ปลดล็อกงานได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    const bookingStore = useBookingStore()
    const booking = bookingStore.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false, message: 'ไม่พบงาน' }
    if (!isOrphanedBooking(booking)) return { ok: false, message: 'งานนี้มีเอกสารรายได้คนขับอยู่จริง (หรือยังโหลดเอกสารไม่สำเร็จ) ปลดล็อกไม่ได้' }
    const missingId = booking.driverPayrollDocId
    booking.driverPayrollDocId = undefined
    bookingStore.addLog(`ปลดล็อกงาน ${booking.docNo} จากเอกสารรายได้คนขับที่ไม่พบ (${missingId})`, { bookingId: booking.id })
    return { ok: true }
  }

  const documentsForDriver = (driverId: string) =>
    documents.value.filter((d) => d.driverId === driverId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    documents,
    loading,
    error,
    canManage,
    createDriverPayrollDocument,
    recordPayment,
    updatePaidDate,
    resetPayment,
    cancelDriverPayrollDocument,
    isOrphanedBooking,
    releaseOrphanedBooking,
    documentsForDriver,
  }
})
