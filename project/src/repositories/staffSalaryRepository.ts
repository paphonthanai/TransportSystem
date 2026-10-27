import { addDoc, collection, deleteDoc, deleteField, doc, getDocs, updateDoc } from 'firebase/firestore'
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
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    documentDate: raw.documentDate ? new Date(raw.documentDate) : undefined,
  } as StaffSalaryRecord
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

  /** แก้บาง field (inline edit หน้ารายละเอียด) — ค่า undefined = ล้าง field นั้นใน Firestore จริง (deleteField) ไม่ใช่ข้ามไป */
  async patch(id: string, data: Partial<Omit<StaffSalaryRecord, 'id'>>): Promise<void> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      out[key] = value === undefined ? deleteField() : value instanceof Date ? value.toISOString() : value
    }
    await updateDoc(doc(db, COLLECTION, id), out)
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
