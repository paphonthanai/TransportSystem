import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { CustomerRecord } from '@/stores/customers'

/**
 * Phase 1 ของ incremental migration (localStorage -> Firestore) — คุยกับ Firestore ตรงๆ ผ่านไฟล์นี้ไฟล์เดียว
 * เพื่อให้ stores/customers.ts ไม่ต้อง import อะไรจาก 'firebase/firestore' เลย (Component/Store ห้ามรู้จัก Firestore)
 * ยังไม่ทำ realtime listener (onSnapshot) ตามที่ตกลงไว้ — ใช้ getDocs/addDoc/updateDoc/deleteDoc แบบ one-shot ก่อน
 */
const COLLECTION = 'customers'

export const customerRepository = {
  async getAll(): Promise<CustomerRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerRecord, 'id'>) }))
  },

  async get(id: string): Promise<CustomerRecord | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...(snapshot.data() as Omit<CustomerRecord, 'id'>) }
  },

  async create(data: Omit<CustomerRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), data)
    return ref.id
  },

  async update(id: string, data: Omit<CustomerRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { ...data })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
