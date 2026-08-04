import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Vehicle, VehicleType } from '@/types'

/**
 * Phase 3 ของ incremental migration (localStorage -> Firestore) — เหมือน customerRepository.ts/driverRepository.ts:
 * ไฟล์นี้ไฟล์เดียวที่ import จาก 'firebase/firestore' ให้ stores/vehicles.ts ไม่ต้องรู้จัก Firestore เลย
 * ยังไม่ทำ realtime listener (onSnapshot) — ใช้ getDocs/addDoc/updateDoc/deleteDoc แบบ one-shot ก่อน
 */
const COLLECTION = 'vehicles'

/**
 * Allowlist ฟิลด์ตาม Vehicle เท่านั้น (เหมือน sanitizeCustomer/sanitizeDriver) — ต่างจากสองตัวก่อนหน้าตรงที่ Vehicle
 * มีฟิลด์ optional จริง (trailerPlate/repairStatus/repairDays/driverCode) ที่ "ไม่มีค่า" ต้องแปลงเป็น null แทนการ
 * ละ key ทิ้งไปเฉยๆ เพราะ store จะเรียก update() ด้วย object เต็มรูปแบบเสมอ (merge existing + change ที่ฝั่ง store
 * ก่อนเรียก) — ถ้าละ key ไว้เฉยๆ updateDoc() จะไม่แตะฟิลด์เดิมใน Firestore เลย (merge behavior) ซึ่งทำให้
 * "ถอดคนขับออกจากรถ" (assignDriver ตั้ง driverCode = undefined) เขียนไม่ลง Firestore จริง ต้องส่ง null ชัดเจนแทน
 * (Firestore SDK ไม่รับ undefined เป็นค่า field ใน addDoc/updateDoc เลย จะ throw ทันที)
 */
export function sanitizeVehicle(data: Partial<Vehicle> & Record<string, unknown>): Record<string, unknown> {
  return {
    plate: (data.plate as string) ?? '',
    plateProvince: (data.plateProvince as string) ?? '',
    vehicleNo: (data.vehicleNo as string) ?? '',
    trailerPlate: (data.trailerPlate as string) || null,
    brand: (data.brand as string) ?? '',
    bodyType: (data.bodyType as string) ?? '',
    chassisNo: (data.chassisNo as string) ?? '',
    engineNo: (data.engineNo as string) ?? '',
    department: (data.department as VehicleType) ?? 'รถบริษัท',
    mileage: typeof data.mileage === 'number' ? data.mileage : 0,
    repairStatus: (data.repairStatus as string) || null,
    repairDays: typeof data.repairDays === 'number' ? data.repairDays : null,
    driverCode: (data.driverCode as string) || null,
  }
}

/** แปลงข้อมูลดิบจาก Firestore กลับเป็น Vehicle ที่ตรงกับ types/index.ts เป๊ะ (null -> undefined) เพื่อไม่ให้ null
 *  ของ Firestore หลุดเข้าไปในโค้ดส่วนอื่นที่คาดหวัง string | undefined ตาม interface เดิม */
function fromFirestore(id: string, data: Record<string, any>): Vehicle {
  return {
    id,
    plate: data.plate ?? '',
    plateProvince: data.plateProvince ?? '',
    vehicleNo: data.vehicleNo ?? '',
    trailerPlate: data.trailerPlate ?? undefined,
    brand: data.brand ?? '',
    bodyType: data.bodyType ?? '',
    chassisNo: data.chassisNo ?? '',
    engineNo: data.engineNo ?? '',
    department: data.department ?? 'รถบริษัท',
    mileage: data.mileage ?? 0,
    repairStatus: data.repairStatus ?? undefined,
    repairDays: data.repairDays ?? undefined,
    driverCode: data.driverCode ?? undefined,
  }
}

export const vehicleRepository = {
  async getAll(): Promise<Vehicle[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => fromFirestore(d.id, d.data()))
  },

  async get(id: string): Promise<Vehicle | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, id))
    if (!snapshot.exists()) return null
    return fromFirestore(snapshot.id, snapshot.data())
  },

  async create(data: Partial<Vehicle> & Record<string, unknown>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitizeVehicle(data))
    return ref.id
  },

  async update(id: string, data: Partial<Vehicle> & Record<string, unknown>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), sanitizeVehicle(data))
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
