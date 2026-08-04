import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { ContactEntityType, ContactOffice, CustomerRecord } from '@/stores/customers'

/**
 * Phase 1 ของ incremental migration (localStorage -> Firestore) — คุยกับ Firestore ตรงๆ ผ่านไฟล์นี้ไฟล์เดียว
 * เพื่อให้ stores/customers.ts ไม่ต้อง import อะไรจาก 'firebase/firestore' เลย (Component/Store ห้ามรู้จัก Firestore)
 * ยังไม่ทำ realtime listener (onSnapshot) ตามที่ตกลงไว้ — ใช้ getDocs/addDoc/updateDoc/deleteDoc แบบ one-shot ก่อน
 */
const COLLECTION = 'customers'

/**
 * Allowlist ฟิลด์ตาม CustomerRecord เท่านั้น — กันไม่ให้ field ที่ไม่ได้เป็นส่วนหนึ่งของ data model (เช่น avatarBg/
 * initial/jobs/total ที่ CustomersView.vue คำนวณเพิ่มไว้แสดงผลในตาราง "สมุดรายชื่อ" เท่านั้น) หลุดไปบันทึกจริงใน
 * Firestore แม้ว่าต้นทางจะส่ง object ที่ถูก enrich มาแล้วก็ตาม create()/update() ต้องเรียกผ่าน helper นี้เสมอ
 */
export function sanitizeCustomer(data: Partial<CustomerRecord> & Record<string, unknown>): Omit<CustomerRecord, 'id'> {
  return {
    code: data.code ?? '',
    entityType: (data.entityType as ContactEntityType) ?? 'corporate',
    isCustomer: !!data.isCustomer,
    isVendor: !!data.isVendor,
    creditDays: data.creditDays ?? 0,
    name: data.name ?? '',
    taxId: data.taxId ?? '',
    office: (data.office as ContactOffice) ?? 'hq',
    branchName: data.branchName ?? '',
    address: data.address ?? '',
    zipCode: data.zipCode ?? '',
    contact: data.contact ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    bankName: data.bankName ?? '',
    bankAccountName: data.bankAccountName ?? '',
    bankAccountNumber: data.bankAccountNumber ?? '',
    note: data.note ?? '',
  }
}

export const customerRepository = {
  async getAll(): Promise<CustomerRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerRecord, 'id'>) }))
  },

  async get(id: string): Promise<CustomerRecord | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...(snapshot.data() as Omit<CustomerRecord, 'id'>) }
  },

  async create(data: Omit<CustomerRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeCustomer(data))
    return ref.id
  },

  async update(id: string, data: Omit<CustomerRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeCustomer(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
