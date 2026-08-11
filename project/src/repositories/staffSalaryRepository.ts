import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { StaffSalaryRecord } from '@/stores/staffSalaries'

const COLLECTION = 'staffSalaries'

function sanitize(data: Partial<StaffSalaryRecord> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): StaffSalaryRecord {
  return { ...raw, createdAt: new Date(raw.createdAt), updatedAt: new Date(raw.updatedAt) } as StaffSalaryRecord
}

export const staffSalaryRepository = {
  async getAll(): Promise<StaffSalaryRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  async create(data: Omit<StaffSalaryRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitize(data))
    return ref.id
  },

  async update(id: string, data: Omit<StaffSalaryRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitize(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
