/**
 * ตรวจว่างานขนส่งเป็นของคนขับคนนี้จริงไหม — driverId เป็นตัวอ้างอิงหลัก และชื่อคนขับใน Snapshot ของงานต้องตรงกับ
 * ทะเบียนคนขับประกอบด้วย ถ้าข้อมูลขัดกัน (ไม่มี driverId / driverId ไม่ตรง / ชื่อไม่ตรง) ห้ามนำงานไปรวมยอดหรือออกเอกสาร
 * รายได้อัตโนมัติ ต้องให้ผู้ใช้ตรวจสอบก่อน (ตามที่ตกลงกับผู้ใช้) — ใช้ร่วมกันทั้งหน้ารายละเอียดคนขับและ store เอกสารรายได้
 */

/** คำนำหน้าชื่อที่พบในข้อมูลจริง — ตัดทิ้งก่อนเทียบชื่อ เพราะทะเบียนคนขับเก็บคำนำหน้าแยก แต่ Snapshot ในงานบางงานไม่มี */
const NAME_PREFIXES = ['นางสาว', 'น.ส.', 'นาย', 'นาง', 'mr.', 'mrs.', 'ms.', 'miss']

export function normalizeDriverName(name: string | undefined): string {
  let s = (name || '').replace(/\s+/g, '').toLowerCase()
  const prefix = NAME_PREFIXES.find((p) => s.startsWith(p))
  if (prefix) s = s.slice(prefix.length)
  return s
}

/** ชื่อคนขับที่บันทึกไว้ในงาน (ชื่อ-นามสกุลก่อน ถ้าไม่มีใช้ driverName) */
export function bookingDriverNameOf(b: { driverFirstName?: string; driverLastName?: string; driverName?: string }): string {
  return `${b.driverFirstName || ''} ${b.driverLastName || ''}`.trim() || b.driverName || ''
}

/** ข้อความอธิบายความขัดแย้ง ว่าง = ข้อมูลตรงกัน */
export function driverIdentityIssue(
  booking: { driverId?: string; driverFirstName?: string; driverLastName?: string; driverName?: string },
  driver: { id?: string; firstName: string; lastName: string },
  registryName: string
): string {
  const bookingName = bookingDriverNameOf(booking)
  if (!booking.driverId) return `งานไม่มีรหัสคนขับ (driverId) — จับคู่จากชื่อ "${bookingName || '-'}" อย่างเดียว`
  if (booking.driverId !== driver.id) return `รหัสคนขับในงาน (${booking.driverId}) ไม่ตรงกับคนขับคนนี้ (${driver.id || '-'})`
  if (normalizeDriverName(bookingName) !== normalizeDriverName(`${driver.firstName}${driver.lastName}`)) {
    return `ชื่อคนขับในงาน "${bookingName || '-'}" ไม่ตรงกับทะเบียน "${registryName}"`
  }
  return ''
}
