import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Product } from '@/stores/inventory'

const COLLECTION = 'products'

export function sanitizeProduct(data: Partial<Product> & Record<string, unknown>): Omit<Product, 'id'> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value
  }
  return out as Omit<Product, 'id'>
}

export const productRepository = {
  async getAll(): Promise<Product[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
  },

  async create(data: Omit<Product, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeProduct(data))
    return ref.id
  },

  async update(id: string, data: Partial<Omit<Product, 'id'>>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeProduct(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
