import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { SalesDocumentItem } from '@/stores/salesDocuments'

const COLLECTION = 'salesDocumentItems'

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value
  }
  return out
}

export const salesDocumentItemRepository = {
  async getAll(): Promise<SalesDocumentItem[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SalesDocumentItem, 'id'>) }))
  },

  async set(id: string, data: Omit<SalesDocumentItem, 'id'>): Promise<void> {
    await setDoc(doc(db, COLLECTION, id), sanitize(data as unknown as Record<string, unknown>))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },

  subscribe(onData: (items: SalesDocumentItem[]) => void, onError: (err: any) => void) {
    return onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SalesDocumentItem, 'id'>) }))),
      onError
    )
  },
}
