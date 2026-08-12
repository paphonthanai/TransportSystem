import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { StaffRecord } from '@/stores/staff'

const COLLECTION = 'staff'

export function sanitizeStaff(data: Partial<StaffRecord> & Record<string, unknown>): Omit<StaffRecord, 'id'> {
  return {
    code: (data.code as string) ?? '',
    prefix: (data.prefix as string) ?? '',
    firstName: (data.firstName as string) ?? '',
    lastName: (data.lastName as string) ?? '',
    position: (data.position as string) ?? '',
    idCard: (data.idCard as string) ?? '',
    address: (data.address as string) ?? '',
    subDistrict: (data.subDistrict as string) ?? '',
    district: (data.district as string) ?? '',
    province: (data.province as string) ?? '',
    zipCode: (data.zipCode as string) ?? '',
    phone: (data.phone as string) ?? '',
    lineId: (data.lineId as string) ?? '',
    emergencyContact: (data.emergencyContact as string) ?? '',
    emergencyRelation: (data.emergencyRelation as string) ?? '',
    startDate: (data.startDate as string) ?? '',
    employmentStatus: (data.employmentStatus as StaffRecord['employmentStatus']) ?? 'active',
    resignDate: (data.resignDate as string) ?? '',
    bankAccount: (data.bankAccount as string) ?? '',
    photo: (data.photo as string | null) ?? null,
    avatarBg: (data.avatarBg as string) ?? '#64748b',
  }
}

export const staffRepository = {
  /** revive ผ่าน sanitizeStaff() เสมอ (ไม่ใช่แค่ cast ตรงๆ) เพื่อรองรับ record เก่าที่เคยสร้างไว้ก่อนเพิ่ม field
   *  ใหม่ๆ (เช่น รูปแบบเดิมที่มีแค่ name/position/phone) ไม่ให้พังตอนอ่าน — field ที่ขาดจะได้ค่า default แทน undefined */
  async getAll(): Promise<StaffRecord[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => ({ id: d.id, ...sanitizeStaff(d.data()) }))
  },

  async create(data: Omit<StaffRecord, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeStaff(data))
    return ref.id
  },

  async update(id: string, data: Omit<StaffRecord, 'id'>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeStaff(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
