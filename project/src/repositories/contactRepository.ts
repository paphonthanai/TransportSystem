import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { ContactRecord } from '@/stores/contacts'

const COLLECTION = 'contacts'

export function sanitizeContact(data: Partial<ContactRecord> & Record<string, unknown>): Omit<ContactRecord, 'id'> {
  const now = new Date().toISOString()
  return {
    customerId: (data.customerId as string) ?? '',
    name: (data.name as string) ?? '',
    position: (data.position as string) ?? '',
    phone: (data.phone as string) ?? '',
    email: (data.email as string) ?? '',
    isPrimary: (data.isPrimary as boolean) ?? false,
    active: data.active === undefined ? true : (data.active as boolean),
    createdAt: (data.createdAt as string) ?? now,
    updatedAt: (data.updatedAt as string) ?? now,
  }
}

export const contactRepository = {
  async getAll(): Promise<ContactRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...sanitizeContact(d.data()) }))
  },

  async create(data: Omit<ContactRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeContact(data))
    return ref.id
  },

  async update(id: string, data: Omit<ContactRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeContact(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
