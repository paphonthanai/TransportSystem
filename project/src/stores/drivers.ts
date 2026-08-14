import { defineStore } from 'pinia'
import { ref } from 'vue'
import { driverRepository, sanitizeDriver } from '@/repositories/driverRepository'
import { driverAuthRepository } from '@/repositories/driverAuthRepository'
import { internalDriverEmail } from '@/utils/driverAuth'

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
  /** อีเมลที่ใช้ล็อกอิน Firebase Auth ของบัญชีคนขับคนนี้ (ถ้าผูกบัญชี Driver App ไว้แล้ว) — ค่าเริ่มต้นเป็นอีเมลภายใน
   *  d{code}@drivers.internal เสมอ (derive ได้ตรงๆ ไม่ต้องเก็บก็ได้) ฟิลด์นี้เก็บไว้แค่โชว์ในหน้าแอดมิน + เป็นสำเนาคู่กับ
   *  driverAuthEmails/{code} (ดู repositories/driverAuthRepository.ts) เวลาคนขับเปลี่ยนไปใช้อีเมลจริงภายหลัง */
  authEmail?: string
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

  /** resolve รหัสคนขับ -> อีเมลที่ใช้กับ Firebase Auth จริง เรียกจากหน้า Login ก่อน authenticate เสมอ (ดู
   *  utils/driverAuth.ts + repositories/driverAuthRepository.ts) — ถ้ายังไม่เคยผูกอีเมลจริง (ไม่มี override ใน
   *  driverAuthEmails) คืนค่าอีเมลภายในที่ derive ได้ตรงๆ จาก code เสมอ ไม่มีทาง fail แค่เพราะยังไม่ตั้งอีเมลจริง */
  async function resolveLoginEmail(code: string): Promise<string> {
    const override = await driverAuthRepository.getAuthEmail(code)
    return override || internalDriverEmail(code)
  }

  /**
   * เปลี่ยนอีเมลล็อกอินของ "ตัวเอง" (เรียกหลัง Firebase Auth updateEmail สำเร็จแล้วเท่านั้น — ดู
   * authStore.updateOwnCredentials / DriverAppView.vue self-service) อัปเดตทั้ง DriverRecord.authEmail (โชว์ในหน้า
   * แอดมิน) และ driverAuthEmails/{code} (index ที่หน้า Login ใช้ resolve) พร้อมกันเสมอ กันข้อมูลสองที่ไม่ตรงกัน
   *
   * ใช้ driverRepository.get(id) (single-doc get() ตรงๆ) แทนการหาใน drivers.value/fetchDrivers() ที่เป็น list()
   * เจตนา — คนขับ (role DRIVER) มีสิทธิ์อ่านได้แค่ record ตัวเองเท่านั้น (ดู firestore.rules) ซึ่งใช้ได้กับ get()
   * เท่านั้น ไม่รองรับ list() ทั้ง collection แม้จะกรองเหลือแค่ของตัวเองก็ตาม
   */
  async function setAuthEmail(driverId: string, newEmail: string) {
    const driver = await driverRepository.get(driverId)
    if (!driver) return
    await driverAuthRepository.setAuthEmail(driver.code, newEmail)
    await driverRepository.update(driverId, sanitizeDriver({ ...driver, authEmail: newEmail }))
    const index = drivers.value.findIndex((d) => d.id === driverId)
    if (index !== -1) drivers.value[index] = { ...drivers.value[index], authEmail: newEmail }
  }

  return { drivers, loading, error, fullName, createDriver, updateDriver, deleteDriver, sanitizeDriver, resolveLoginEmail, setAuthEmail }
})
