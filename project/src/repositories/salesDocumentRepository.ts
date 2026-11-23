import { collection, deleteDoc, doc, getDocFromServer, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
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

  /** มีเอกสารนี้อยู่จริงบนเซิร์ฟเวอร์หรือไม่ (ไม่เชื่อแคชในเครื่อง) — ใช้ยืนยันก่อนปลดงานที่ค้างผูกกับเอกสารที่ไม่มีแล้ว
   *  ต่อเซิร์ฟเวอร์ไม่ได้ (ออฟไลน์) = โยน error ให้ผู้เรียกหยุด ไม่ถือว่า "ไม่มี" */
  async existsOnServer(id: string): Promise<boolean> {
    return (await getDocFromServer(doc(db, COLLECTION, id))).exists()
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },

  /** onData ได้ id ของเอกสารที่ยืนยันแล้วบนเซิร์ฟเวอร์ด้วย (ไม่นับเอกสารที่เพิ่งเขียนในเครื่องและยังรอเซิร์ฟเวอร์ตอบ — hasPendingWrites) */
  subscribe(onData: (docs: SalesDocument[] | null, confirmedIds: Set<string>) => void, onError: (err: any) => void) {
    let first = true
    return onSnapshot(
      collection(db, COLLECTION),
      { includeMetadataChanges: true },
      (snapshot) => {
        const confirmedIds = new Set(snapshot.docs.filter((d) => !d.metadata.hasPendingWrites).map((d) => d.id))
        // snapshot ที่เปลี่ยนแค่ metadata (เซิร์ฟเวอร์ตอบรับการเขียน) — ไม่สร้างเอกสารทั้งชุดใหม่ แจ้งแค่ id ที่ยืนยันแล้ว
        if (!first && snapshot.docChanges().length === 0) return onData(null, confirmedIds)
        first = false
        onData(snapshot.docs.map((d) => revive({ id: d.id, ...d.data() })), confirmedIds)
      },
      onError
    )
  },
}
