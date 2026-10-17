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
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
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
      throw new Error(error.value ?? 'เข้าสู่ระบบไม่สำเร็จ')
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
  async function createStaffAccount(email: string, password: string, name: string, staffRole: UserRole, driverId?: string) {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const secondaryAuth = getAuth(secondaryApp)
    if (useEmulator) {
      const { connectAuthEmulator } = await import('firebase/auth')
      connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    }
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password)
      const now = new Date().toISOString()
      await userRepository.create(cred.user.uid, {
        email: email.trim(),
        name,
        role: staffRole,
        active: true,
        createdAt: now,
        updatedAt: now,
        ...(driverId ? { driverId } : {}),
      })
      await signOut(secondaryAuth)
      return cred.user.uid
    } finally {
      await deleteApp(secondaryApp)
    }
  }

  /**
   * ซ่อมบัญชีคนขับที่ตั้งรหัสเข้าแอปไว้แล้ว (มี driverLoginCredentials) แต่ไม่มีโปรไฟล์ /users ผูกอยู่ — เช่นโปรไฟล์ถูกลบ (ลบได้แค่โปรไฟล์
   * บัญชี Firebase Auth ยังอยู่) หรือการตั้งค่าเดิมค้างครึ่งทาง คนขับกลุ่มนี้ login แล้วขึ้น "ไม่พบข้อมูลผู้ใช้งาน" และอ่านงานไม่ได้
   *
   * ใช้ Auth Bootstrap Secret (authPassword) ที่ระบบเก็บไว้คู่กับรหัสคนขับ — ไม่แตะ/ไม่เปลี่ยน PIN ที่คนขับใช้ล็อกอิน:
   *  1) ยังไม่มีบัญชี Auth = สร้างใหม่ด้วย secret เดิม  2) มีบัญชี Auth แล้ว = ล็อกอินด้วย secret เดิมเพื่อได้ uid
   *  (secret ไม่ตรง = ซ่อมไม่ได้ ต้องลบบัญชีนั้นใน Firebase Console ก่อน)  แล้วสร้าง/ผูกโปรไฟล์ role DRIVER + driverId
   * ใช้ Firebase App ตัวที่สองชั่วคราวเหมือน createStaffAccount เพื่อไม่ให้แอดมินที่ล็อกอินอยู่หลุด session — ADMIN เท่านั้น (Rules บังคับ)
   */
  async function repairDriverAccount(email: string, authPassword: string, name: string, driverId: string): Promise<{ uid: string; created: boolean }> {
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const secondaryAuth = getAuth(secondaryApp)
    if (useEmulator) {
      const { connectAuthEmulator } = await import('firebase/auth')
      connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    }
    try {
      let uid: string
      try {
        uid = (await createUserWithEmailAndPassword(secondaryAuth, email.trim(), authPassword)).user.uid
      } catch (err: any) {
        if (err?.code !== 'auth/email-already-in-use') throw err
        try {
          uid = (await signInWithEmailAndPassword(secondaryAuth, email.trim(), authPassword)).user.uid
        } catch (signInErr: any) {
          const code = signInErr?.code as string | undefined
          if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
            throw new Error(
              `มีบัญชี ${email} ใน Firebase Auth อยู่แล้ว แต่รหัสภายในที่ระบบเก็บไว้ไม่ตรงกับบัญชีนั้น — ซ่อมอัตโนมัติไม่ได้ ให้ลบบัญชีนี้ใน Firebase Console → Authentication แล้วกด "ตั้งค่า" ใหม่`
            )
          }
          throw signInErr
        }
      }
      const now = new Date().toISOString()
      const existing = await userRepository.get(uid)
      if (existing) {
        if (existing.role !== 'DRIVER') throw new Error(`บัญชีนี้เป็นโปรไฟล์ role ${existing.role} อยู่แล้ว ไม่ใช่คนขับ — ไม่ซ่อมทับให้`)
        if (existing.driverId && existing.driverId !== driverId) throw new Error('บัญชีนี้ผูกกับคนขับอีกคนอยู่แล้ว — ไม่ซ่อมทับให้')
        await userRepository.update(uid, { driverId, active: true, updatedAt: now })
        await signOut(secondaryAuth)
        return { uid, created: false }
      }
      await userRepository.create(uid, { email: email.trim(), name, role: 'DRIVER', active: true, createdAt: now, updatedAt: now, driverId })
      await signOut(secondaryAuth)
      return { uid, created: true }
    } finally {
      await deleteApp(secondaryApp)
    }
  }

  /** ตั้งรหัสผ่านใหม่ให้ผู้ใช้อื่นโดยตรงจาก client ทำไม่ได้ (ต้องมี Admin SDK) — ทำได้แค่ส่งอีเมลลิงก์ตั้งรหัสผ่านใหม่
   *  ไปให้ผู้ใช้กดเอง ต้องเป็นอีเมลที่รับได้จริงจึงจะใช้งานได้ */
  async function sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email.trim())
  }

  /**
   * Self-service: เปลี่ยนอีเมล/PIN ของ "บัญชีตัวเอง" เท่านั้น (ใช้กับคนขับที่อยากผูกอีเมลจริงแทนอีเมลภายใน
   * d{code}@drivers.internal ทีหลัง — ดู DriverAppView.vue) เปลี่ยนอีเมลของบัญชีคนอื่นจาก client ทำไม่ได้เลย
   * (ต้องมี Admin SDK/Cloud Function ซึ่งระบบนี้ไม่มี — ดูรายงาน Inspect) จึงออกแบบให้เป็นการกระทำของเจ้าของบัญชีเอง
   * เท่านั้น ไม่ใช่แอดมินทำแทน
   *
   * Firebase Auth บังคับ re-authenticate ก่อนแก้ email/password เสมอ (auth/requires-recent-login) — ใช้ PIN/
   * password ปัจจุบันเป็น credential ยืนยันตัวตนก่อนเรียก updateEmail/updatePassword จริง
   */
  async function updateOwnCredentials(data: { currentPassword: string; newEmail?: string; newPassword?: string }) {
    const fbUser = firebaseUser.value
    if (!fbUser?.email) throw new Error('ไม่พบบัญชีที่ล็อกอินอยู่')
    const credential = EmailAuthProvider.credential(fbUser.email, data.currentPassword)
    await reauthenticateWithCredential(fbUser, credential)
    const newEmail = data.newEmail?.trim()
    if (newEmail && newEmail !== fbUser.email) {
      await firebaseUpdateEmail(fbUser, newEmail)
      // ซิงก์ /users/{uid}.email ให้ตรงกับ Firebase Auth ทันที (ไม่งั้นหน้าแอดมิน/จัดการผู้ใช้งานจะโชว์อีเมลเก่าค้างอยู่
      // แม้ Auth จะเปลี่ยนไปแล้วจริง) — เขียนได้เพราะเป็น uid ตัวเอง (ดู firestore.rules self-service email update)
      await userRepository.update(fbUser.uid, { email: newEmail, updatedAt: new Date().toISOString() })
      if (profile.value) profile.value = { ...profile.value, email: newEmail }
    }
    if (data.newPassword && data.newPassword.trim()) {
      await firebaseUpdatePassword(fbUser, data.newPassword.trim())
    }
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
    repairDriverAccount,
    sendPasswordReset,
    updateOwnCredentials,
  }
})
