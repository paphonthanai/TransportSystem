import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { StaffRecord } from '@/stores/staff'

const COLLECTION = 'staff'

export function sanitizeStaff(data: Partial<StaffRecord> & Record<string, unknown>): Omit<StaffRecord, 'id'> {
  return {
    name: (data.name as string) ?? '',
    position: (data.position as string) ?? '',
    phone: (data.phone as string) ?? '',
  }
}

export const staffRepository = {
  async getAll(): Promise<StaffRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffRecord, 'id'>) }))
  },

  async create(data: Omit<StaffRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeStaff(data))
    return ref.id
  },

  async update(id: string, data: Omit<StaffRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeStaff(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
