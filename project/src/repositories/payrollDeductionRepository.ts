import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { PayrollDeduction } from '@/types'

const COLLECTION = 'payrollDeductions'

function sanitize(data: Partial<PayrollDeduction> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): PayrollDeduction {
  return { ...raw, createdAt: new Date(raw.createdAt) }
}

/** ไม่มี update — แก้ไขทำได้แค่ลบแล้วเพิ่มใหม่ เพราะเป็นรายการหักต่อรอบ ไม่ใช่ค่าที่ต้อง edit-in-place */
export const payrollDeductionRepository = {
  async getAll(): Promise<PayrollDeduction[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  async create(data: Omit<PayrollDeduction, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitize(data))
    return ref.id
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
