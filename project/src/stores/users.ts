import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userRepository } from '@/repositories/userRepository'

export type UserRole = 'ADMIN' | 'STAFF' | 'DISPATCHER' | 'DRIVER' | 'ACCOUNTING'

/**
 * โปรไฟล์ผู้ใช้ (ชื่อ/role/สถานะ) เก็บใน Firestore แยกจากบัญชี Firebase Auth (email/password) เอง — id ของเอกสาร
 * ในนี้ = Firebase Auth uid เสมอ ดู src/repositories/userRepository.ts และ src/stores/auth.ts (login จริงผ่าน
 * Firebase Auth, createStaffAccount สร้างทั้งบัญชี Auth + โปรไฟล์นี้พร้อมกัน)
 */
export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  /** สิทธิ์พิเศษ: กรอกค่าน้ำมัน (ลิตร) สำหรับอำเภอที่ยังไม่ได้ตั้งค่าไว้ล่วงหน้าได้ — ปกติ ADMIN ทั่วไปก็ทำไม่ได้ ต้องเปิดสิทธิ์นี้ให้เฉพาะบัญชีผู้จัดการเท่านั้น */
  canOverrideFuelRate?: boolean
  createdAt: string
  updatedAt: string
  /** id ของ DriverRecord (stores/drivers.ts) ที่บัญชีนี้คือ — มีความหมายเฉพาะ role DRIVER เท่านั้น ใช้จับคู่งานที่
   * จ่ายให้คนขับคนนี้ใน Driver App ด้วย id แทนการเทียบ name (free text ที่ admin พิมพ์ตอนสร้างบัญชี) กับ driverName */
  driverId?: string
}

export const useUserStore = defineStore('users', () => {
  const users = ref<UserProfile[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await userRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลผู้ใช้งานจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchUsers()

  /** อัปเดตหลังจากสร้างบัญชี Firebase Auth สำเร็จแล้วเท่านั้น (ดู authStore.createStaffAccount) ไม่ได้สร้างบัญชี Auth เอง */
  function addLocalCopy(profile: UserProfile) {
    users.value.unshift(profile)
  }

  async function updateProfile(uid: string, data: Partial<Pick<UserProfile, 'name' | 'role' | 'canOverrideFuelRate' | 'driverId'>>) {
    await userRepository.update(uid, { ...data, updatedAt: new Date().toISOString() })
    const index = users.value.findIndex((u) => u.id === uid)
    if (index !== -1) users.value[index] = { ...users.value[index], ...data }
  }

  async function setActive(uid: string, active: boolean) {
    await userRepository.update(uid, { active, updatedAt: new Date().toISOString() })
    const user = users.value.find((u) => u.id === uid)
    if (user) user.active = active
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    addLocalCopy,
    updateProfile,
    setActive,
  }
})
