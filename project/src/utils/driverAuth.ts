/** เดาว่าข้อความที่กรอกในหน้า Login เป็นอีเมล (STAFF/ADMIN/ฯลฯ) หรือรหัสคนขับ (ตัวเลข/ข้อความสั้น ไม่มี @) */
export function isEmailLike(input: string): boolean {
  return /\S+@\S+\.\S+/.test(input.trim())
}

/** อีเมลภายในที่ derive จากรหัสคนขับแบบ deterministic เสมอ (ไม่ต้อง query Firestore) — ค่าเริ่มต้นของทุกบัญชีคนขับ
 *  ก่อนที่จะผูกอีเมลจริง (ดู driverAuthRepository.ts สำหรับ override หลังผูกอีเมลจริงแล้ว) */
export function internalDriverEmail(driverCode: string): string {
  return `d${driverCode.trim()}@drivers.internal`
}
