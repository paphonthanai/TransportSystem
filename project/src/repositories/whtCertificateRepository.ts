import { addDoc, collection, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { WHTCertificate } from '@/types'

const COLLECTION = 'whtCertificates'

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): WHTCertificate {
  return { ...raw, payDate: new Date(raw.payDate), createdAt: new Date(raw.createdAt) }
}

export const whtCertificateRepository = {
  async getAll(): Promise<WHTCertificate[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))
  },

  async create(data: Omit<WHTCertificate, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitize(data as unknown as Record<string, unknown>))
    return ref.id
  },

  subscribe(onData: (certs: WHTCertificate[]) => void, onError: (err: any) => void) {
    return onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => onData(snapshot.docs.map((d) => revive({ id: d.id, ...d.data() }))),
      onError
    )
  },
}
