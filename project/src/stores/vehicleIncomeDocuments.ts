import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useBookingStore } from './booking'
import { useVehiclesStore } from './vehicles'
import { useVehicleExpensesStore } from './vehicleExpenses'
import { useDocumentNumberRegistryStore } from './documentNumberRegistry'
import { vehicleIncomeDocumentRepository } from '@/repositories/vehicleIncomeDocumentRepository'

/**
 * เอกสารรายได้รถร่วม — คู่กับ DriverPayrollDocument (stores/driverPayrollDocuments.ts) แต่ผูกกับ "รถ" ไม่ใช่ "คนขับ":
 * เป็นระเบียนถาวรจริง สร้างจากงานที่ผู้ใช้เลือกเองเท่านั้น (ไม่ใช่ทั้งรอบอัตโนมัติ) ผูก bookingIds ไว้ตายตัว และ Snapshot
 * ยอดเงิน ณ ตอนสร้างไว้ (รวมค่าใช้จ่ายประจำรถ ซึ่งปกติกรอกแบบสะสมไม่แยกรอบ — Snapshot ยอด ณ ตอนสร้างเอกสารไว้ตรงนี้แทน)
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
  createdAt: Date
}

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
  fetchAll()

  const genId = () => `vhic${Date.now()}${Math.random().toString(36).slice(2, 6)}`
  function generateDocNumber(seq: number, date: Date) {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `VI${yyyy}${mm}${dd}${String(seq).padStart(4, '0')}`
  }

  const persist = (doc: VehicleIncomeDocument) => {
    const { id, ...rest } = doc
    vehicleIncomeDocumentRepository.set(id, rest).catch((err: any) => {
      error.value = err?.message || 'บันทึกเอกสารรายได้รถร่วมไป Firestore ไม่สำเร็จ'
    })
  }

  /**
   * สร้างเอกสารรายได้รถจากงานที่เลือกเอง — ต้องเป็นงานของรถคันนี้ทุกงาน (จับคู่ด้วย Booking.plate ตรงกับทะเบียนรถ ตาม
   * ธรรมเนียมเดิมที่ VendorFleetVehicleDetailView.vue ใช้อยู่แล้ว — ไม่ใช้คนขับประจำปัจจุบันมา join ย้อนหลัง), ส่งของสำเร็จ
   * แล้ว (DELIVERED), และยังไม่เคยถูกดึงไปออกเอกสารรายได้รถอื่น (vehicleIncomeDocId) มิฉะนั้นคืนค่า null
   * ค่าน้ำมัน (fuelCostTotal) รวมจากงานที่เลือกเท่านั้น ส่วนค่าใช้จ่ายประจำรถ (vehicleExpenseTotal) Snapshot ยอดสะสม
   * ทั้งหมด ณ ตอนสร้างเอกสาร (ธรรมชาติของรายการแบบนี้ไม่แยกตามรอบ — ดู VendorFleetVehicleDetailView.vue)
   */
  function createVehicleIncomeDocument(vehicleId: string, bookingIds: string[], period: string): VehicleIncomeDocument | null {
    if (bookingIds.length === 0) return null
    const bookingStore = useBookingStore()
    const vehiclesStore = useVehiclesStore()
    const vehicleExpensesStore = useVehicleExpensesStore()
    const vehicle = vehiclesStore.vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) return null
    const full = vehiclesStore.fullPlate(vehicle)
    const targetBookings = bookingStore.bookings.filter((b) => bookingIds.includes(b.id))
    if (targetBookings.length !== bookingIds.length) return null
    const allEligible = targetBookings.every(
      (b) => b.status === 'DELIVERED' && (b.plate === full || b.plate === vehicle.plate) && !b.vehicleIncomeDocId
    )
    if (!allEligible) return null

    const tripIncomeTotal = Math.round(targetBookings.reduce((sum, b) => sum + (b.tripFee || 0), 0))
    const fuelCostTotal = Math.round(targetBookings.reduce((sum, b) => sum + (b.fuelLiters || 0) * (b.fuelRate || 0), 0))
    const vehicleExpenseTotal = Math.round(vehicleExpensesStore.expensesForVehicle(vehicle.id).reduce((sum, e) => sum + e.amount, 0))
    const netTotal = tripIncomeTotal - fuelCostTotal - vehicleExpenseTotal

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
      createdAt: now,
    }
    documents.value.unshift(doc)
    persist(doc)
    registry.registerNumber(doc.number)
    targetBookings.forEach((b) => {
      b.vehicleIncomeDocId = doc.id
    })
    bookingStore.addLog('สร้างเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  /** ยกเลิกเอกสาร — คืนสถานะงานขนส่งที่ผูกอยู่กลับเป็นว่าง (vehicleIncomeDocId) แล้วลบเอกสารทิ้ง */
  function cancelVehicleIncomeDocument(id: string): boolean {
    const doc = documents.value.find((d) => d.id === id)
    if (!doc) return false
    const bookingStore = useBookingStore()
    doc.bookingIds.forEach((bid) => {
      const b = bookingStore.bookings.find((bk) => bk.id === bid)
      if (b && b.vehicleIncomeDocId === id) b.vehicleIncomeDocId = undefined
    })
    documents.value = documents.value.filter((d) => d.id !== id)
    vehicleIncomeDocumentRepository.delete(id).catch((err: any) => {
      error.value = err?.message || 'ลบเอกสารรายได้รถร่วมจาก Firestore ไม่สำเร็จ'
    })
    return true
  }

  const documentsForVehicle = (vehicleId: string) =>
    documents.value.filter((d) => d.vehicleId === vehicleId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    documents,
    loading,
    error,
    createVehicleIncomeDocument,
    cancelVehicleIncomeDocument,
    documentsForVehicle,
  }
})
