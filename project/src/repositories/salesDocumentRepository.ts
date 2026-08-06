import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { SalesDocument } from '@/stores/salesDocuments'

const COLLECTION = 'salesDocuments'

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): SalesDocument {
  return {
    ...raw,
    date: new Date(raw.date),
    dueDate: raw.dueDate ? new Date(raw.dueDate) : undefined,
    paidDate: raw.paidDate ? new Date(raw.paidDate) : undefined,
    dateFrom: raw.dateFrom ? new Date(raw.dateFrom) : undefined,
    dateTo: raw.dateTo ? new Date(raw.dateTo) : undefined,
    createdAt: new Date(raw.createdAt),
  }
}

export const salesDocumentRepository = {
  async getAll(): Promise<SalesDocument[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  /** upsert ด้วย id ที่ store สร้างเอง (genId('sdoc')) — ใช้ setDoc แทน create/update แยก เพราะฟังก์ชันสร้าง/แก้ไขเอกสารมีกระจายอยู่เกือบ 20 จุด */
  async set(id: string, data: Omit<SalesDocument, 'id'>): Promise<void> {
    await setDoc(doc(db, COLLECTION, id), sanitize(data as unknown as Record<string, unknown>))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },

  subscribe(onData: (docs: SalesDocument[]) => void, onError: (err: any) => void) {
    return onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => onData(snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))),
      onError
    )
  },
}
