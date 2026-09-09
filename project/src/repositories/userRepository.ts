import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { UserProfile } from '@/stores/users'

/**
 * Firestore-backed user profiles (role/name/active) — คนละเรื่องกับบัญชี Firebase Auth (email/password) เอง
 * เอกสารใน collection นี้ id = Firebase Auth uid เสมอ (setDoc ตรงๆ ไม่ใช้ addDoc สุ่ม id เพราะต้อง match กับ uid)
 * remove() ลบได้แค่โปรไฟล์ตรงนี้เท่านั้น — ลบบัญชี Firebase Auth ของคนอื่นทำจาก client ตรงๆ ไม่ได้ (ต้องมี Admin
 * SDK/Cloud Function ซึ่งระบบนี้ไม่มี) ดู firestore.rules's /users allow delete และ UserManagementView.vue
 */
const COLLECTION = 'users'

/** setDoc ปฏิเสธ field ที่เป็น undefined ตรงๆ (ต่างจาก Repository อื่นในระบบที่กรองออกก่อนเขียนกันหมดแล้ว) — ตัดทิ้งก่อนเขียนเสมอ */
function stripUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    ;(out as Record<string, unknown>)[key] = value
  }
  return out
}

export const userRepository = {
  async getAll(): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserProfile, 'id'>) }))
  },

  async get(uid: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, uid))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...(snapshot.data() as Omit<UserProfile, 'id'>) }
  },

  async create(uid: string, data: Omit<UserProfile, 'id'>): Promise<void> {
    await setDoc(doc(db, COLLECTION, uid), stripUndefined(data))
  },

  async update(uid: string, data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
    await setDoc(doc(db, COLLECTION, uid), stripUndefined(data), { merge: true })
  },

  /** ลบโปรไฟล์ถาวร — ADMIN เท่านั้น (บังคับซ้ำที่ firestore.rules) ไม่สามารถกู้คืนได้ */
  async remove(uid: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, uid))
  },
}
