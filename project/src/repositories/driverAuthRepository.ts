import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

/**
 * Index สาธารณะเล็กๆ แค่ map "รหัสคนขับ (DriverRecord.code) -> authEmail ปัจจุบัน" เท่านั้น (ไม่มีข้อมูลส่วนตัวอื่นเลย)
 * มีไว้ให้หน้า Login (ก่อน authenticate) resolve authEmail ได้ตอนคนขับเปลี่ยนจากอีเมลภายใน (d{code}@drivers.internal)
 * ไปเป็นอีเมลจริงภายหลัง (ดู utils/driverAuth.ts + stores/auth.ts updateOwnCredentials)
 *
 * เอกสารนี้ "ไม่จำเป็นต้องมี" สำหรับคนขับที่ยังใช้อีเมลภายในแบบ default อยู่ (คำนวณได้ตรงๆ จาก code เสมอ ไม่ต้อง
 * query) — จะถูกสร้าง/อัปเดตเฉพาะตอนคนขับเปลี่ยนไปใช้อีเมลจริงเท่านั้น (ดู firestore.rules: allow get แบบ public
 * เพราะรู้แค่ code เป๊ะถึงจะอ่านได้ — enumerate ไม่ได้ เพราะ allow list ปิดไว้)
 */
const COLLECTION = 'driverAuthEmails'

export const driverAuthRepository = {
  async getAuthEmail(code: string): Promise<string | null> {
    const snapshot = await getDoc(doc(db, COLLECTION, code))
    if (!snapshot.exists()) return null
    return (snapshot.data().authEmail as string) || null
  },

  async setAuthEmail(code: string, authEmail: string): Promise<void> {
    await setDoc(doc(db, COLLECTION, code), { authEmail })
  },
}
