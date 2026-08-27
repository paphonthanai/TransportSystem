/** ตรวจว่าข้อความที่กรอกในหน้า Login เป็นอีเมล Corporate (STAFF/ADMIN/DISPATCHER/ACCOUNTING) หรือไม่ — ต้องตรงรูปแบบ
 *  ...@...(.com|.go.th|.co.th) เป๊ะเท่านั้น (ไม่ใช่แค่ includes('@')) ถ้าไม่ตรง ถือว่าเป็นรหัสคนขับเสมอ ดู LoginView.vue */
export function isCorporateEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.(com|go\.th|co\.th)$/i.test(input.trim())
}

/** กรองข้อความเหลือเฉพาะตัวเลข 0-9 — ใช้กับทั้งรหัสคนขับและรหัสผ่านคนขับที่กรอกในช่อง Login เดียวกับ Corporate Email
 *  (คนขับพิมพ์ตัวอักษร/สัญลักษณ์ปนมาได้ ระบบตัดทิ้งอัตโนมัติก่อนค้นหา ไม่ error ใส่ผู้ใช้) */
export function filterDigits(input: string): string {
  return input.replace(/\D/g, '')
}

/** อีเมลภายในที่ derive จากรหัสคนขับแบบ deterministic เสมอ (ไม่ต้อง query Firestore) — ค่าเริ่มต้นของทุกบัญชีคนขับ
 *  ก่อนที่จะผูกอีเมลจริง (ดู driverAuthRepository.ts สำหรับ override หลังผูกอีเมลจริงแล้ว) */
export function internalDriverEmail(driverCode: string): string {
  return `d${driverCode.trim()}@drivers.internal`
}

/** สุ่มรหัสผ่านภายในสำหรับผูกบัญชี Firebase Auth ของคนขับ (Auth Bootstrap Secret) — ใช้ครั้งเดียวตอนสร้าง/ย้ายบัญชี
 *  คนขับเข้าระบบ driverLoginCredentials ไม่ใช่รหัสผ่านที่คนขับหรือแอดมินเห็น/พิมพ์เลย เป็นแค่กลไกภายในให้แอปยัง
 *  เรียก signInWithEmailAndPassword ได้จริงหลังตรวจ driverCode+driverLoginPassword ผ่านแล้ว (ดู stores/drivers.ts
 *  verifyDriverLogin) — ตั้งใจแยกออกจาก driverLoginPassword เด็ดขาดตามข้อกำหนด ห้าม sync กัน ไม่ต้องเปลี่ยนอีกเลย
 *  แม้แอดมินจะเปลี่ยน driverLoginPassword ทีหลังกี่ครั้งก็ตาม */
export function generateAuthBootstrapSecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
