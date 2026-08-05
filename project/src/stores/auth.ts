import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import { useLocalUserStore, type LocalUser, type UserRole } from '@/stores/localUsers'

const SESSION_KEY = 'tms_session_user_id_v1'

/**
 * Phase 0: ระบบ Login/Session ใช้ Local User (localStorage ผ่าน stores/localUsers.ts) แทน Demo Account/Firebase Auth
 * เดิม ทุกที่ในแอปที่เคยอ่าน authStore.user/.role ยังใช้ shape เดิมได้ (email/displayName/role) เพื่อไม่ต้องแก้ไฟล์อื่น
 * ที่ไม่เกี่ยวกับ auth โดยตรง — role เปลี่ยนจาก string พิมพ์เล็ก ('admin') เป็น UserRole พิมพ์ใหญ่ ('ADMIN') ตามที่
 * Permission Layer (src/services/permission.ts) ใช้ ต้องอัปเดตจุดที่เทียบ role ตรงๆ ให้ตรงกันด้วย
 */
export const useAuthStore = defineStore('auth', () => {
  const onboardingStore = useOnboardingStore()
  const localUserStore = useLocalUserStore()

  const currentUser = ref<LocalUser | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sessionRestored = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const role = computed<UserRole | null>(() => currentUser.value?.role ?? null)
  const userName = computed(() => currentUser.value?.name || currentUser.value?.username || 'User')
  const userInitial = computed(() => (userName.value || 'U').charAt(0).toUpperCase())
  /** เก็บ shape ใกล้เคียงของเดิม (email/displayName) ให้โค้ดหน้าอื่นที่เคยอ่าน authStore.user?.email ใช้งานต่อได้ */
  const user = computed(() => (currentUser.value ? { email: currentUser.value.username, displayName: currentUser.value.name } : null))

  /** กู้ session เดิมจาก localStorage หลัง reload — ต้องรอ localUserStore โหลด/seed เสร็จก่อน (ready) */
  async function restoreSession() {
    if (sessionRestored.value) return
    sessionRestored.value = true
    const savedId = localStorage.getItem(SESSION_KEY)
    if (!savedId) return
    for (let i = 0; i < 50 && !localUserStore.ready; i++) {
      await new Promise((r) => setTimeout(r, 20))
    }
    const found = localUserStore.users.find((u) => u.id === savedId && u.active)
    if (found) currentUser.value = found
    else localStorage.removeItem(SESSION_KEY)
  }
  restoreSession()

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      for (let i = 0; i < 50 && !localUserStore.ready; i++) {
        await new Promise((r) => setTimeout(r, 20))
      }
      const found = await localUserStore.verifyLogin(username, password)
      if (!found) throw new Error('Username หรือ Password ไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน')
      currentUser.value = found
      localStorage.setItem(SESSION_KEY, found.id)
      onboardingStore.markDone('signedUp')
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    currentUser.value = null
    localStorage.removeItem(SESSION_KEY)
  }

  return {
    user,
    currentUser,
    loading,
    error,
    role,
    isAuthenticated,
    userInitial,
    userName,
    login,
    logout,
  }
})
