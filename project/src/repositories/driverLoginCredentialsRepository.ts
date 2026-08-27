import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

/**
 * ข้อมูลยืนยันตัวตนของ Driver App โดยเฉพาะ — แยกออกจาก Firebase Auth เด็ดขาดตามข้อกำหนด (ห้าม sync กับรหัสผ่าน
 * Firebase Auth) เก็บเป็น document แยกต่างหาก ไม่รวมกับ /drivers/{driverId} เพราะ DISPATCHER มีสิทธิ์อ่าน/เขียน
 * /drivers/* ทั้ง collection อยู่แล้ว (จำเป็นสำหรับหน้าจัดรถ) แต่ driverLoginPassword ต้องห้าม DISPATCHER/STAFF เห็น
 * เด็ดขาด — แยก collection ใหม่ที่ ADMIN เท่านั้นเขียนได้ จึงบังคับสิทธิ์ได้ตรงจุดโดยไม่กระทบสิทธิ์เดิมของ /drivers/*
 *
 * id เอกสาร = driverCode ตรงๆ (ไม่ใช่ auto-id) เพื่อให้หน้า Login (ก่อน authenticate) resolve ด้วย get() ตรงๆ ได้
 * โดยไม่ต้อง query แบบ WHERE (ซึ่งจะต้องเปิด list แบบ public เสี่ยงกว่ามาก) — ดู firestore.rules
 *
 * ข้อควรระวังด้านความปลอดภัย (บันทึกไว้ตรงนี้เพราะเป็นข้อจำกัดของสถาปัตยกรรม ไม่ใช่บั๊ก): เอกสารนี้ต้องอ่านได้แบบ
 * public (allow get: if true) เพื่อให้หน้า Login เทียบ driverLoginPassword ได้ก่อนมี Firebase Auth session จริง
 * (ข้อกำหนด "Frontend + Firestore เท่านั้น ห้ามใช้ Cloud Functions") ผลคือใครก็ตามที่รู้/เดา driverCode ที่ถูกต้อง
 * จะอ่าน driverLoginPassword ตรงๆ ผ่าน Firestore SDK ได้เช่นกัน (ไม่ใช่แค่ผ่านฟอร์ม Login) — ข้อกำหนด "DISPATCHER/
 * STAFF ห้ามเห็น" จึงบังคับได้แค่ระดับแอป (ไม่ query/แสดงคอลเลกชันนี้ในหน้าที่ role เหล่านั้นเข้าถึงได้) ไม่ใช่ระดับ
 * Firestore Rules สำหรับกรณี pre-auth read โดยเฉพาะ — เป็นข้อจำกัดที่มากับสถาปัตยกรรมนี้ ไม่มีทางเลี่ยงถ้าไม่มี Backend
 */
const COLLECTION = 'driverLoginCredentials'

export interface DriverLoginCredentials {
  driverId: string
  code: string
  /** รหัสผ่านคนขับ (Plaintext ตามข้อกำหนด) — คนขับพิมพ์คู่กับ driverCode ตอน Login, ADMIN ดู/แก้ไขได้จาก
   *  ตั้งค่า → จัดการผู้ใช้งาน */
  loginPassword: string
  /** รหัสผ่านภายในสำหรับผูก Firebase Auth (Auth Bootstrap Secret) — ห้ามแสดงในหน้าไหนเลย ตั้งครั้งเดียวตอนสร้าง/
   *  ย้ายบัญชี ไม่เปลี่ยนตามการเปลี่ยน loginPassword ของแอดมินอีกเลย (ดู utils/driverAuth.ts generateAuthBootstrapSecret) */
  authPassword: string
  updatedAt: string
}

export const driverLoginCredentialsRepository = {
  async get(code: string): Promise<DriverLoginCredentials | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, code))
    if (!snapshot.exists()) return null
    return snapshot.data() as DriverLoginCredentials
  },

  async set(code: string, data: DriverLoginCredentials): Promise<void> {
    await setDoc(doc(db, COLLECTION, code), data)
  },

  /** ใช้ตอนแอดมินเปลี่ยน driverCode — ย้าย document ไป id ใหม่ (ต้องลบของเก่าทิ้งเพราะ id เอกสาร = code) */
  async move(oldCode: string, newCode: string, data: DriverLoginCredentials): Promise<void> {
    await setDoc(doc(db, COLLECTION, newCode), data)
    if (oldCode !== newCode) await deleteDoc(doc(db, COLLECTION, oldCode))
  },
}
