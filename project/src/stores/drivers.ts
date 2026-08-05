import { defineStore } from 'pinia'
import { ref } from 'vue'
import { driverRepository, sanitizeDriver } from '@/repositories/driverRepository'

export type EmploymentStatus = 'active' | 'resigned'
export type IncomeType = 'daily' | 'monthly' | 'trip'
export type LicenseType = 'ท.1' | 'ท.2'

export interface DriverRecord {
  /** id เอกสารใน Firestore — เพิ่มเข้ามาเป็น Phase 2 ของการย้ายจาก localStorage ไป Firestore (ดู repositories/driverRepository.ts)
   *  ไม่มีค่าตอนที่ยังไม่ได้บันทึกจริง (เช่น record ว่างจาก emptyForm ใน DriversView.vue) */
  id?: string
  code: string
  prefix: string
  firstName: string
  lastName: string
  idCard: string
  licenseNo: string
  licenseType: LicenseType
  licenseExpiry: string
  address: string
  subDistrict: string
  district: string
  province: string
  zipCode: string
  phone: string
  lineId: string
  emergencyContact: string
  emergencyRelation: string
  startDate: string
  employmentStatus: EmploymentStatus
  resignDate: string
  incomeType: IncomeType
  incomeAmount: number
  commission: number
  phoneAllowance: number
  bankAccount: string
  photo: string | null
  avatarBg: string
}

export const useDriversStore = defineStore('drivers', () => {
  const drivers = ref<DriverRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** ไม่ auto-reseed ข้อมูลตัวอย่าง (mock) เข้า Firestore อีกต่อไป — ถ้า collection ว่าง แปลว่าว่างจริง (ล้าง mock
   *  data ทิ้งโดยตั้งใจ) ไม่ใช่ "ยังไม่เคย migrate" ต้องให้ผู้ใช้กรอกคนขับจริงเองผ่านหน้า สมุดรายชื่อ > พนักงานขับรถ */
  async function fetchDrivers() {
    loading.value = true
    error.value = null
    try {
      drivers.value = await driverRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลคนขับจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchDrivers()

  const fullName = (driver: DriverRecord) => `${driver.prefix}${driver.firstName} ${driver.lastName}`.trim()

  async function createDriver(data: Omit<DriverRecord, 'id'>) {
    const clean = sanitizeDriver(data)
    const id = await driverRepository.create(clean)
    drivers.value.unshift({ ...clean, id })
  }

  async function updateDriver(id: string, data: Omit<DriverRecord, 'id'>) {
    const clean = sanitizeDriver(data)
    await driverRepository.update(id, clean)
    const index = drivers.value.findIndex((d) => d.id === id)
    if (index !== -1) drivers.value[index] = { ...clean, id }
  }

  async function deleteDriver(id: string) {
    await driverRepository.delete(id)
    drivers.value = drivers.value.filter((d) => d.id !== id)
  }

  return { drivers, loading, error, fullName, createDriver, updateDriver, deleteDriver, sanitizeDriver }
})
