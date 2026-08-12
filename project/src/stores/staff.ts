import { defineStore } from 'pinia'
import { ref } from 'vue'
import { staffRepository, sanitizeStaff } from '@/repositories/staffRepository'

export type StaffEmploymentStatus = 'active' | 'resigned'

/**
 * พนักงานออฟฟิศ (เสมียน/บัญชี/ผู้ดูแลระบบ ฯลฯ) — เก็บเป็น Entity ของตัวเอง แยกจากบัญชีผู้ใช้งาน (UserProfile/Firebase
 * Auth) โดยเจตนา เพราะบัญชีผู้ใช้งานมีไว้สำหรับ login/สิทธิ์การเข้าถึงระบบเท่านั้น ไม่ใช่ทะเบียนประวัติพนักงานจริง —
 * คนคนเดียวกันอาจมีบัญชีผู้ใช้งาน หรือไม่มีก็ได้ (เช่น พนักงานที่ยังไม่ต้อง login เข้าระบบ) ดูโครงสร้างเดียวกับ
 * DriverRecord ใน stores/drivers.ts เกือบทั้งหมด ต่างกันตรงไม่มีข้อมูลใบขับขี่/รถประจำ และไม่มี field รายได้
 * (เงินเดือน/ค่าคอมมิชชั่น) เพราะเรื่องเงินเดือนอยู่ที่ stores/staffSalaries.ts แยกต่างหากอยู่แล้ว
 */
export interface StaffRecord {
  id?: string
  code: string
  prefix: string
  firstName: string
  lastName: string
  position: string
  idCard: string
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
  employmentStatus: StaffEmploymentStatus
  resignDate: string
  bankAccount: string
  photo: string | null
  avatarBg: string
}

export const useStaffStore = defineStore('staff', () => {
  const staffList = ref<StaffRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStaff() {
    loading.value = true
    error.value = null
    try {
      staffList.value = await staffRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลเสมียนจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchStaff()

  const fullName = (staff: StaffRecord) => `${staff.prefix}${staff.firstName} ${staff.lastName}`.trim()

  async function createStaff(data: Omit<StaffRecord, 'id'>) {
    const clean = sanitizeStaff(data)
    const id = await staffRepository.create(clean)
    staffList.value.unshift({ ...clean, id })
  }

  async function updateStaff(id: string, data: Omit<StaffRecord, 'id'>) {
    const clean = sanitizeStaff(data)
    await staffRepository.update(id, clean)
    const index = staffList.value.findIndex((s) => s.id === id)
    if (index !== -1) staffList.value[index] = { ...clean, id }
  }

  async function deleteStaff(id: string) {
    await staffRepository.delete(id)
    staffList.value = staffList.value.filter((s) => s.id !== id)
  }

  return { staffList, loading, error, fetchStaff, fullName, createStaff, updateStaff, deleteStaff, sanitizeStaff }
})
