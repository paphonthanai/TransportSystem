import { defineStore } from 'pinia'
import { trackLoading } from '@/stores/loading'
import { ref } from 'vue'
import { useBookingStore } from './booking'
import { useVehiclesStore } from './vehicles'
import { useAuthStore } from './auth'
import { useDocumentNumberRegistryStore } from './documentNumberRegistry'
import { vehicleIncomeDocumentRepository } from '@/repositories/vehicleIncomeDocumentRepository'
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
  createdAt: Date
}

export interface VehicleIncomeLine {
  bookingId: string
  tripFee: number
  fuelCost: number
  vehicleExpense: number
}

export type ActionResult = { ok: boolean; message?: string }

const roundMoney = (n: number) => Math.round(n * 100) / 100

/**
 * ค่าน้ำมัน/ค่าใช้จ่ายประจำรถต่องานสำหรับรายได้รถร่วม — ผู้ใช้กรอกเองในตารางหน้ารถร่วม (ปิดการคำนวณอัตโนมัติจาก
 * ลิตร × เรท และยอดสะสม vehicleExpenses ไว้ก่อนตามที่ผู้ใช้สั่ง) ยังไม่กรอก = 0
 */
export const vendorFuelCostOf = (b: Pick<Booking, 'vendorFuelCost'>) => b.vendorFuelCost ?? 0
export const vendorVehicleExpenseOf = (b: Pick<Booking, 'vendorVehicleExpense'>) => b.vendorVehicleExpense ?? 0

export const useVehicleIncomeDocumentsStore = defineStore('vehicleIncomeDocuments', () => {
  const documents = ref<VehicleIncomeDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      documents.value = await vehicleIncomeDocumentRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดเอกสารรายได้รถร่วมจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
    vehicleIncomeDocumentRepository.subscribe(
      (docs) => (documents.value = docs),
      (err) => {
        error.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ (เอกสารรายได้รถร่วม)'
      }
    )
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
   * (vehicleIncomeDocId) ค่าน้ำมัน/ค่าใช้จ่ายประจำรถรวมจากที่ผู้ใช้กรอกเองต่องาน (vendorFuelCostOf/vendorVehicleExpenseOf)
   * — บันทึกเอกสารลง Firestore สำเร็จก่อนค่อยผูกงาน กันงานค้างป้าย "ออกเอกสารแล้ว" ทั้งที่ไม่มีเอกสารจริง
   */
  async function createVehicleIncomeDocument(vehicleId: string, bookingIds: string[], period: string): Promise<ActionResult & { doc?: VehicleIncomeDocument }> {
    if (!canManage()) return { ok: false, message: 'สร้างเอกสารรายได้รถร่วมได้เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี' }
    if (bookingIds.length === 0) return { ok: false, message: 'ยังไม่ได้เลือกงาน' }
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
      vehicleExpense: vendorVehicleExpenseOf(b),
    }))
    const tripIncomeTotal = roundMoney(lines.reduce((sum, l) => sum + l.tripFee, 0))
    const fuelCostTotal = roundMoney(lines.reduce((sum, l) => sum + l.fuelCost, 0))
    const vehicleExpenseTotal = roundMoney(lines.reduce((sum, l) => sum + l.vehicleExpense, 0))
    const netTotal = roundMoney(tripIncomeTotal - fuelCostTotal - vehicleExpenseTotal)

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
      tripIncomeTotal,
      fuelCostTotal,
      vehicleExpenseTotal,
      netTotal,
      lines,
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

  /** เหตุผลที่แก้ค่าน้ำมัน/ค่าใช้จ่ายประจำรถของงานในหน้ารถร่วมไม่ได้ — ว่าง = แก้ได้ */
  function vendorCostEditBlockedReason(booking: Booking): string {
    if (!canManage()) return 'เฉพาะผู้ดูแลระบบหรือฝ่ายบัญชี'
    if (booking.status !== 'DELIVERED') return 'งานยังไม่จบ'
    if (booking.vehicleIncomeDocId) return 'ออกเอกสารแล้ว'
    return ''
  }

  /** แก้ค่าน้ำมัน/ค่าใช้จ่ายประจำรถที่ผู้ใช้กรอกเองต่องาน (บาท, ไม่ติดลบ) — ไม่แตะลิตร/เรทน้ำมันของงาน */
  function updateVendorCosts(bookingId: string, data: { fuelCost?: number; vehicleExpense?: number }): ActionResult {
    const bookingStore = useBookingStore()
    const booking = bookingStore.bookings.find((b) => b.id === bookingId)
    if (!booking) return { ok: false, message: 'ไม่พบงาน' }
    const blocked = vendorCostEditBlockedReason(booking)
    if (blocked) return { ok: false, message: blocked }
    const values = [data.fuelCost, data.vehicleExpense].filter((v) => v !== undefined) as number[]
    if (values.some((v) => !Number.isFinite(v) || v < 0)) return { ok: false, message: 'จำนวนเงินต้องเป็นตัวเลขไม่ติดลบ' }
    const changes: string[] = []
    if (data.fuelCost !== undefined) {
      changes.push(`ค่าน้ำมัน ${vendorFuelCostOf(booking)} → ${roundMoney(data.fuelCost)}`)
      booking.vendorFuelCost = roundMoney(data.fuelCost)
    }
    if (data.vehicleExpense !== undefined) {
      changes.push(`ค่าใช้จ่ายประจำรถ ${vendorVehicleExpenseOf(booking)} → ${roundMoney(data.vehicleExpense)}`)
      booking.vendorVehicleExpense = roundMoney(data.vehicleExpense)
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
    vendorCostEditBlockedReason,
    updateVendorCosts,
    isOrphanedBooking,
    releaseOrphanedBooking,
    documentsForVehicle,
  }
})
