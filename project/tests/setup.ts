import { vi } from 'vitest'

/**
 * Vitest setup file — โหลดก่อนทุก test suite (ดู vitest.config.ts's setupFiles) จำเป็นเพราะเกือบทุก Pinia store
 * ในโปรเจกต์นี้ยิง Firestore/Firebase Auth call ทันทีตอน store ถูกสร้าง (เช่น bookingStore เรียก fetchBookings()
 * ที่ module-level ทันที ดู stores/booking.ts, authStore ผูก onAuthStateChanged ทันทีตอน setup ดู stores/auth.ts)
 * ไม่ใช่แค่ตอนถูกเรียกใช้งาน — ถ้าไม่ mock ตรงนี้ การแค่ import store มาเทสต์ก็จะพยายามต่อ Firebase จริงทันที
 *
 * แทนที่จะ mock ทีละ repository (มีเกือบ 20 ไฟล์ใน src/repositories/) mock ที่ระดับ SDK ('firebase/firestore',
 * 'firebase/auth', 'firebase/app') แทน เพราะทุก repository เรียกฟังก์ชันชุดเดียวกันจากที่นี่ — mock จุดเดียวใช้ได้กับ
 * ทุก store/repository โดยอัตโนมัติ ไม่ต้องแก้เพิ่มทุกครั้งที่มี repository ใหม่
 *
 * Firestore fake เป็น in-memory store ธรรมดา (Map ต่อ collection path) รองรับเฉพาะฟังก์ชันที่ repository layer ของ
 * โปรเจกต์นี้ใช้จริง (ตรวจแล้วไม่มี query()/where()/orderBy()/limit() ที่ไหนเลย ทุก repository อ่านทั้ง collection
 * ตรงๆ) ถ้าในอนาคตมี repository ใหม่เริ่มใช้ query จะต้องมาเพิ่ม mock ตรงนี้ก่อน
 */

vi.mock('@/config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  firebaseConfig: {},
  useEmulator: false,
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  deleteApp: vi.fn(async () => {}),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null)
    return () => {}
  }),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(async () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  connectStorageEmulator: vi.fn(),
  ref: vi.fn(),
  uploadString: vi.fn(),
  getDownloadURL: vi.fn(),
}))

const DELETE_FIELD = Symbol('deleteField')

interface DocRef {
  __kind: 'doc'
  path: string
  id: string
}
interface CollectionRef {
  __kind: 'collection'
  path: string
}

const store = new Map<string, Map<string, Record<string, unknown>>>()
let autoId = 0

function collectionMap(path: string) {
  if (!store.has(path)) store.set(path, new Map())
  return store.get(path)!
}

function applyDeleteFieldSentinels(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = {}
  const deletes: string[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v === DELETE_FIELD) deletes.push(k)
    else clean[k] = v
  }
  return { clean, deletes }
}

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, path: string): CollectionRef => ({ __kind: 'collection', path }),
  doc: (a: unknown, b?: string, c?: string): DocRef => {
    // doc(collectionRef) -> auto id ; doc(db, path, id) -> explicit id
    if (b === undefined) {
      const ref = a as CollectionRef
      return { __kind: 'doc', path: ref.path, id: `fake-id-${++autoId}` }
    }
    return { __kind: 'doc', path: b, id: c as string }
  },
  getDoc: async (ref: DocRef) => {
    const data = collectionMap(ref.path).get(ref.id)
    return { exists: () => data !== undefined, data: () => data, id: ref.id }
  },
  getDocs: async (ref: CollectionRef) => {
    const map = collectionMap(ref.path)
    const docs = [...map.entries()].map(([id, data]) => ({ id, data: () => data }))
    return { docs }
  },
  setDoc: async (ref: DocRef, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
    const map = collectionMap(ref.path)
    const { clean, deletes } = applyDeleteFieldSentinels(data)
    const existing = opts?.merge ? map.get(ref.id) || {} : {}
    const next = { ...existing, ...clean }
    deletes.forEach((k) => delete next[k])
    map.set(ref.id, next)
  },
  updateDoc: async (ref: DocRef, data: Record<string, unknown>) => {
    const map = collectionMap(ref.path)
    const { clean, deletes } = applyDeleteFieldSentinels(data)
    const next = { ...(map.get(ref.id) || {}), ...clean }
    deletes.forEach((k) => delete next[k])
    map.set(ref.id, next)
  },
  addDoc: async (ref: CollectionRef, data: Record<string, unknown>) => {
    const id = `fake-id-${++autoId}`
    collectionMap(ref.path).set(id, { ...data })
    return { id }
  },
  deleteDoc: async (ref: DocRef) => {
    collectionMap(ref.path).delete(ref.id)
  },
  // รองรับทั้ง onSnapshot(collectionRef, ...) (repository pattern ปกติ) และ onSnapshot(docRef, ...) (single-document
  // listener เช่น composables/useFirestoreSettings.ts) — สอง shape คืนค่าต่างกัน (docs[] vs exists()/data() ตรงๆ)
  onSnapshot: (ref: DocRef | CollectionRef, onNext: (snap: unknown) => void) => {
    if (ref.__kind === 'doc') {
      const data = collectionMap(ref.path).get(ref.id)
      onNext({ exists: () => data !== undefined, data: () => data, id: ref.id })
      return () => {}
    }
    const map = collectionMap(ref.path)
    const docs = [...map.entries()].map(([id, data]) => ({ id, data: () => data }))
    onNext({ docs })
    return () => {}
  },
  deleteField: () => DELETE_FIELD,
}))
