import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { DriverPayrollDocument } from '@/stores/driverPayrollDocuments'

const COLLECTION = 'driverPayrollDocuments'

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): DriverPayrollDocument {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    paidDate: raw.paidDate ? new Date(raw.paidDate) : undefined,
  }
}

export const driverPayrollDocumentRepository = {
  async getAll(): Promise<DriverPayrollDocument[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  /** upsert ด้วย id ที่ store สร้างเอง (genId('drpr')) — เหมือน salesDocumentRepository.ts เพื่อให้ store คืนค่าเอกสารใหม่แบบ synchronous ได้ทันที ไม่ต้องรอ round trip */
  async set(id: string, data: Omit<DriverPayrollDocument, 'id'>): Promise<void> {
    await setDoc(doc(db, COLLECTION, id), sanitize(data as unknown as Record<string, unknown>))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },

  subscribe(onData: (docs: DriverPayrollDocument[]) => void, onError: (err: any) => void) {
    return onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => onData(snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))),
      onError
    )
  },
}
