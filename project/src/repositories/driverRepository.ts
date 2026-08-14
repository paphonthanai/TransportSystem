import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { DriverRecord, EmploymentStatus, IncomeType, LicenseType } from '@/stores/drivers'

/**
 * Phase 2 ของ incremental migration (localStorage -> Firestore) — เหมือน customerRepository.ts:
 * ไฟล์นี้ไฟล์เดียวที่ import จาก 'firebase/firestore' ให้ stores/drivers.ts ไม่ต้องรู้จัก Firestore เลย
 * ยังไม่ทำ realtime listener (onSnapshot) — ใช้ getDocs/addDoc/updateDoc/deleteDoc แบบ one-shot ก่อน
 */
const COLLECTION = 'drivers'

/**
 * Allowlist ฟิลด์ตาม DriverRecord เท่านั้น (เหมือน sanitizeCustomer ใน customerRepository.ts) — กันไม่ให้
 * field ที่ไม่ได้เป็นส่วนหนึ่งของ data model หลุดไปบันทึกจริงใน Firestore ไม่ว่าต้นทางจะส่ง object แบบไหนมาก็ตาม
 * create()/update() ต้องเรียกผ่าน helper นี้เสมอ
 */
export function sanitizeDriver(data: Partial<DriverRecord> & Record<string, unknown>): Omit<DriverRecord, 'id'> {
  return {
    code: data.code ?? '',
    prefix: data.prefix ?? '',
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    idCard: data.idCard ?? '',
    licenseNo: data.licenseNo ?? '',
    licenseType: (data.licenseType as LicenseType) ?? 'ท.1',
    licenseExpiry: data.licenseExpiry ?? '',
    address: data.address ?? '',
    subDistrict: data.subDistrict ?? '',
    district: data.district ?? '',
    province: data.province ?? '',
    zipCode: data.zipCode ?? '',
    phone: data.phone ?? '',
    lineId: data.lineId ?? '',
    emergencyContact: data.emergencyContact ?? '',
    emergencyRelation: data.emergencyRelation ?? '',
    startDate: data.startDate ?? '',
    employmentStatus: (data.employmentStatus as EmploymentStatus) ?? 'active',
    resignDate: data.resignDate ?? '',
    incomeType: (data.incomeType as IncomeType) ?? 'trip',
    incomeAmount: data.incomeAmount ?? 0,
    commission: data.commission ?? 0,
    phoneAllowance: data.phoneAllowance ?? 0,
    bankAccount: data.bankAccount ?? '',
    photo: (data.photo as string | null) ?? null,
    avatarBg: data.avatarBg ?? '#64748b',
    ...(data.authEmail ? { authEmail: data.authEmail } : {}),
  }
}

export const driverRepository = {
  async getAll(): Promise<DriverRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DriverRecord, 'id'>) }))
  },

  async get(id: string): Promise<DriverRecord | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...(snapshot.data() as Omit<DriverRecord, 'id'>) }
  },

  async create(data: Omit<DriverRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeDriver(data))
    return ref.id
  },

  async update(id: string, data: Omit<DriverRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeDriver(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
