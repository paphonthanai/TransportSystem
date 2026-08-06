import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { VendorRecord } from '@/stores/vendors'

const COLLECTION = 'vendors'

export function sanitizeVendor(data: Partial<VendorRecord> & Record<string, unknown>): Omit<VendorRecord, 'id'> {
  return {
    name: (data.name as string) ?? '',
    category: (data.category as string) ?? '',
    contact: (data.contact as string) ?? '',
    phone: (data.phone as string) ?? '',
  }
}

export const vendorRepository = {
  async getAll(): Promise<VendorRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VendorRecord, 'id'>) }))
  },

  async create(data: Omit<VendorRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeVendor(data))
    return ref.id
  },

  async update(id: string, data: Omit<VendorRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeVendor(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
