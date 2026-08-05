import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { UserProfile } from '@/stores/users'

/**
 * Firestore-backed user profiles (role/name/active) — คนละเรื่องกับบัญชี Firebase Auth (email/password) เอง
 * เอกสารใน collection นี้ id = Firebase Auth uid เสมอ (setDoc ตรงๆ ไม่ใช้ addDoc สุ่ม id เพราะต้อง match กับ uid)
 * ไม่มี delete จริงจากที่นี่ — ลบบัญชี Firebase Auth ของคนอื่นทำจาก client ตรงๆ ไม่ได้ (ต้องมี Admin SDK/Cloud
 * Function) เก็บไว้แค่ปิดใช้งาน (active:false) ผ่าน update() พอ
 */
const COLLECTION = 'users'

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
    await setDoc(doc(db, COLLECTION, uid), data)
  },

  async update(uid: string, data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
    await setDoc(doc(db, COLLECTION, uid), data, { merge: true })
  },
}
