import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { PickupOrigin } from '@/types'

const COLLECTION = 'origins'

export function sanitizeOrigin(data: Partial<PickupOrigin> & Record<string, unknown>): Omit<PickupOrigin, 'id'> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value
  }
  return out as Omit<PickupOrigin, 'id'>
}

export const originRepository = {
  async getAll(): Promise<PickupOrigin[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PickupOrigin, 'id'>) }))
  },

  async create(data: Omit<PickupOrigin, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeOrigin(data))
    return ref.id
  },

  async update(id: string, data: Partial<Omit<PickupOrigin, 'id'>>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeOrigin(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
