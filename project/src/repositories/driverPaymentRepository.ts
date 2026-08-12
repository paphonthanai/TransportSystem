import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { DriverPaymentRecord } from '@/types'

const COLLECTION = 'driverPayments'

function sanitize(data: Partial<DriverPaymentRecord> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): DriverPaymentRecord {
  return { ...raw, updatedAt: new Date(raw.updatedAt) } as DriverPaymentRecord
}

export const driverPaymentRepository = {
  async getAll(): Promise<DriverPaymentRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  async create(data: Omit<DriverPaymentRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitize(data))
    return ref.id
  },

  async update(id: string, data: Omit<DriverPaymentRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitize(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
