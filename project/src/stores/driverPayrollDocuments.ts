import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useBookingStore } from './booking'
import { useDocumentNumberRegistryStore } from './documentNumberRegistry'
import { usePayrollDeductionsStore } from './payrollDeductions'
import { driverPayrollDocumentRepository } from '@/repositories/driverPayrollDocumentRepository'

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
  netIncome: number
  paymentStatus: 'UNPAID' | 'PAID'
  paidDate?: Date
  createdAt: Date
}

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
  fetchAll()

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

  const persist = (doc: DriverPayrollDocument) => {
    const { id, ...rest } = doc
    driverPayrollDocumentRepository.set(id, rest).catch((err: any) => {
      error.value = err?.message || 'บันทึกเอกสารรายได้คนขับไป Firestore ไม่สำเร็จ'
    })
  }

  /**
   * สร้างเอกสารรายได้คนขับจากงานที่เลือกเอง — ต้องเป็นงานของคนขับคนนี้ทุกงาน (ผูกด้วย driverId ตรงๆ ไม่ match ชื่อ),
   * ส่งของสำเร็จแล้ว (DELIVERED), และยังไม่เคยถูกดึงไปออกเอกสารรายได้คนขับอื่น (driverPayrollDocId) มิฉะนั้นคืนค่า null
   * รายได้จากงาน (tripIncomeTotal) รวมจาก finalAllowance/allowance ของแต่ละงานที่เลือกเป๊ะๆ — รายได้อื่นๆ/รายการหัก
   * (additionTotal/deductionTotal) Snapshot จากยอดที่มีอยู่ ณ ตอนสร้างเท่านั้น (payrollDeductionsStore) ไม่ขยับตามถ้ามีคน
   * แก้ไขรายการหักภายหลัง — เอกสารที่ออกไปแล้วถือว่า final
   */
  function createDriverPayrollDocument(driverId: string, bookingIds: string[], period: string): DriverPayrollDocument | null {
    if (bookingIds.length === 0) return null
    const bookingStore = useBookingStore()
    const deductionsStore = usePayrollDeductionsStore()
    const targetBookings = bookingStore.bookings.filter((b) => bookingIds.includes(b.id))
    if (targetBookings.length !== bookingIds.length) return null
    const allEligible = targetBookings.every((b) => b.status === 'DELIVERED' && b.driverId === driverId && !b.driverPayrollDocId)
    if (!allEligible) return null

    const driverName = `${targetBookings[0].driverFirstName || ''} ${targetBookings[0].driverLastName || ''}`.trim() || targetBookings[0].driverName || ''
    const periodLabel = toBEPeriodLabel(period)
    const tripIncomeTotal = Math.round(targetBookings.reduce((sum, b) => sum + (b.finalAllowance ?? b.allowance ?? 0), 0))
    const additionTotal = deductionsStore.additionsFor(driverName, periodLabel).reduce((sum, a) => sum + a.amount, 0)
    const deductionTotal = deductionsStore.deductionsFor(driverName, periodLabel).reduce((sum, d) => sum + d.amount, 0)
    const netIncome = tripIncomeTotal + additionTotal - deductionTotal

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
      netIncome,
      paymentStatus: 'UNPAID',
      createdAt: now,
    }
    documents.value.unshift(doc)
    persist(doc)
    registry.registerNumber(doc.number)
    targetBookings.forEach((b) => {
      b.driverPayrollDocId = doc.id
    })
    bookingStore.addLog('สร้างเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  function recordPayment(id: string, paidDate?: Date): DriverPayrollDocument | null {
    const doc = documents.value.find((d) => d.id === id)
    if (!doc || doc.paymentStatus === 'PAID') return null
    doc.paymentStatus = 'PAID'
    doc.paidDate = paidDate || new Date()
    persist(doc)
    return doc
  }

  /** ยกเลิกเอกสารที่ยังไม่จ่าย — คืนสถานะงานขนส่งที่ผูกอยู่กลับเป็นว่าง (driverPayrollDocId) แล้วลบเอกสารทิ้ง */
  function cancelDriverPayrollDocument(id: string): boolean {
    const doc = documents.value.find((d) => d.id === id)
    if (!doc || doc.paymentStatus !== 'UNPAID') return false
    const bookingStore = useBookingStore()
    doc.bookingIds.forEach((bid) => {
      const b = bookingStore.bookings.find((bk) => bk.id === bid)
      if (b && b.driverPayrollDocId === id) b.driverPayrollDocId = undefined
    })
    documents.value = documents.value.filter((d) => d.id !== id)
    driverPayrollDocumentRepository.delete(id).catch((err: any) => {
      error.value = err?.message || 'ลบเอกสารรายได้คนขับจาก Firestore ไม่สำเร็จ'
    })
    return true
  }

  const documentsForDriver = (driverId: string) =>
    documents.value.filter((d) => d.driverId === driverId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    documents,
    loading,
    error,
    createDriverPayrollDocument,
    recordPayment,
    cancelDriverPayrollDocument,
    documentsForDriver,
  }
})
