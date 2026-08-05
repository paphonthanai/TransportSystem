import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, firebaseConfig, useEmulator } from '@/config/firebase'
import { useOnboardingStore } from '@/stores/onboarding'
import { userRepository } from '@/repositories/userRepository'
import type { UserProfile, UserRole } from '@/stores/users'

/**
 * ระบบ Login จริงผ่าน Firebase Auth (แทน Local User/localStorage ของ Phase 0) — คู่กับ Firestore Rules
 * ที่ตรวจสิทธิ์จาก role ใน /users/{uid} จริง (ดู firestore.rules) ไม่ใช่แค่ล็อกฝั่ง UI เหมือนก่อนหน้านี้
 * โปรไฟล์ (ชื่อ/role/สถานะ) เก็บที่ Firestore /users/{uid} — id เอกสาร = Firebase Auth uid เสมอ
 */
export const useAuthStore = defineStore('auth', () => {
  const onboardingStore = useOnboardingStore()

  const firebaseUser = ref<FirebaseUser | null>(null)
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const authReady = ref(false)

  const isAuthenticated = computed(() => !!firebaseUser.value && !!profile.value)
  const role = computed<UserRole | null>(() => profile.value?.role ?? null)
  const userName = computed(() => profile.value?.name || firebaseUser.value?.email || 'User')
  const userInitial = computed(() => (userName.value || 'U').charAt(0).toUpperCase())
  /** เก็บ shape ใกล้เคียงของเดิม (email/displayName) ให้โค้ดหน้าอื่นที่เคยอ่าน authStore.user?.email ใช้งานต่อได้ */
  const user = computed(() => (firebaseUser.value ? { email: firebaseUser.value.email || '', displayName: profile.value?.name || '' } : null))
  /** alias เดิมที่ UserManagementView.vue ใช้เช็ค "ปิดใช้งานบัญชีตัวเองไม่ได้" */
  const currentUser = computed(() => profile.value)

  onAuthStateChanged(auth, async (fbUser) => {
    firebaseUser.value = fbUser
    if (fbUser) {
      try {
        const p = await userRepository.get(fbUser.uid)
        if (!p) {
          error.value = 'ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ (ติดต่อผู้ดูแลระบบ)'
          await signOut(auth)
          profile.value = null
        } else if (!p.active) {
          error.value = 'บัญชีนี้ถูกปิดใช้งาน'
          await signOut(auth)
          profile.value = null
        } else {
          profile.value = p
        }
      } catch (err: any) {
        error.value = err?.message || 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ'
        profile.value = null
      }
    } else {
      profile.value = null
    }
    authReady.value = true
  })

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      // รอ onAuthStateChanged โหลดโปรไฟล์เสร็จก่อน (มี async fetch อยู่ในนั้น)
      for (let i = 0; i < 100 && !profile.value; i++) {
        await new Promise((r) => setTimeout(r, 20))
        if (!firebaseUser.value) break // ถูก sign out เพราะไม่มีโปรไฟล์/ปิดใช้งาน — เลิกรอ
      }
      if (!profile.value) throw new Error(error.value || 'เข้าสู่ระบบไม่สำเร็จ')
      onboardingStore.markDone('signedUp')
    } catch (err: any) {
      const code = err?.code as string | undefined
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        error.value = 'Email หรือ Password ไม่ถูกต้อง'
      } else if (!error.value) {
        error.value = err?.message || 'เข้าสู่ระบบไม่สำเร็จ'
      }
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await signOut(auth)
  }

  /**
   * สร้างบัญชีพนักงานใหม่ (ADMIN เท่านั้นที่เรียกได้ — บังคับจริงที่ Firestore Rules) — ต้องใช้ Firebase App
   * instance ที่สองชั่วคราว เพราะ createUserWithEmailAndPassword() บน instance หลักจะ sign-in เป็นบัญชีใหม่
   * ทันทีและเตะ Admin ที่ล็อกอินอยู่ออกจาก session (ข้อจำกัดของ Firebase Auth ฝั่ง client ที่ไม่มี Admin SDK/
   * backend) — สร้างเสร็จ sign out ออกจาก instance ที่สองแล้วทิ้งทันที ไม่กระทบ session ของ Admin เลย
   */
  async function createStaffAccount(email: string, password: string, name: string, staffRole: UserRole) {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const secondaryAuth = getAuth(secondaryApp)
    if (useEmulator) {
      const { connectAuthEmulator } = await import('firebase/auth')
      connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    }
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password)
      const now = new Date().toISOString()
      await userRepository.create(cred.user.uid, { email: email.trim(), name, role: staffRole, active: true, createdAt: now, updatedAt: now })
      await signOut(secondaryAuth)
      return cred.user.uid
    } finally {
      await deleteApp(secondaryApp)
    }
  }

  /** ตั้งรหัสผ่านใหม่ให้ผู้ใช้อื่นโดยตรงจาก client ทำไม่ได้ (ต้องมี Admin SDK) — ทำได้แค่ส่งอีเมลลิงก์ตั้งรหัสผ่านใหม่
   *  ไปให้ผู้ใช้กดเอง ต้องเป็นอีเมลที่รับได้จริงจึงจะใช้งานได้ */
  async function sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email.trim())
  }

  return {
    user,
    currentUser,
    profile,
    loading,
    error,
    role,
    isAuthenticated,
    authReady,
    userInitial,
    userName,
    login,
    logout,
    createStaffAccount,
    sendPasswordReset,
  }
})
