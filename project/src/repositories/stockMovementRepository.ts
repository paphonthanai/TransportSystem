import { addDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { StockMovement } from '@/stores/inventory'

const COLLECTION = 'stockMovements'

function sanitize(data: Partial<StockMovement> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): StockMovement {
  return { ...raw, date: raw.date ? new Date(raw.date) : new Date() }
}

/** ไม่มี update/delete — ตั้งใจ เพราะเป็น ledger บันทึกประวัติการตัดสต๊อก แก้ไข/ลบย้อนหลังจะทำให้ยอดคงเหลือไม่ตรงกับความเป็นจริงที่เกิดขึ้น */
export const stockMovementRepository = {
  async getAll(): Promise<StockMovement[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  async create(data: Omit<StockMovement, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitize(data))
    return ref.id
  },
}
