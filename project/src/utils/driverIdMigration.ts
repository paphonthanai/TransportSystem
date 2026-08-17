import type { Booking } from '@/types'
import type { DriverRecord } from '@/stores/drivers'
import type { UserProfile } from '@/stores/users'
import { userRepository } from '@/repositories/userRepository'

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** ชื่อคนขับที่เจอในระบบมีได้ 2 รูปแบบ (มี/ไม่มีคำนำหน้า) — เทียบกับทั้งสองรูปแบบของ DriverRecord แต่ละคน */
function findDriverMatches(name: string, drivers: DriverRecord[]): DriverRecord[] {
  const n = normalize(name)
  if (!n) return []
  return drivers.filter((d) => {
    const withPrefix = normalize(`${d.prefix}${d.firstName} ${d.lastName}`)
    const withoutPrefix = normalize(`${d.firstName} ${d.lastName}`)
    return n === withPrefix || n === withoutPrefix
  })
}

export interface DriverIdMigrationReport {
  bookings: {
    matched: { docNo: string; driverName: string; driverId: string }[]
    alreadyLinked: number
    unmatched: { docNo: string; driverName: string }[]
    ambiguous: { docNo: string; driverName: string; candidates: string[] }[]
  }
  users: {
    matched: { email: string; name: string; driverId: string }[]
    alreadyLinked: number
    unmatched: { email: string; name: string }[]
    ambiguous: { email: string; name: string; candidates: string[] }[]
  }
}

/**
 * จับคู่ Booking.driverName และ UserProfile.name (เฉพาะ role DRIVER) เข้ากับ DriverRecord.id ให้อัตโนมัติ เฉพาะกรณี
 * เทียบชื่อ (มี/ไม่มีคำนำหน้า) แล้วเจอ DriverRecord ที่ตรงกันแบบไม่กำกวมพอดี 1 คนเท่านั้น
 *
 * ฝั่ง Booking: เติมทั้ง driverId (ผูกบัญชี Login/Driver App) และ driverFirstName/driverLastName (snapshot ชื่อ ณ
 * ตอนจับคู่ — ตัวที่ Payroll ต้องใช้จริง ดู Booking.driverFirstName ใน types/index.ts และ driverKeyFor ใน
 * useDriverPayroll.ts) ไม่ใช่แค่ driverId เฉยๆ — booking ที่มี driverId อยู่แล้วแต่ยังไม่มี snapshot ชื่อ (เช่น จับคู่
 * ด้วยเวอร์ชันเก่าของฟังก์ชันนี้ก่อนมี field นี้) จะถูกเติม snapshot ให้ครบโดยจับคู่จาก driverId เดิมตรงๆ ไม่ต้องเทียบชื่อซ้ำ
 *
 * เป็นการเพิ่มข้อมูลเท่านั้น (additive) — ไม่ลบ/ทับ driverName หรือ name เดิมเลย ปลอดภัยรันซ้ำได้ (ข้าม booking ที่มีทั้ง
 * driverId และ snapshot ชื่อครบแล้วโดยอัตโนมัติ — ดู alreadyLinked)
 *
 * คืนรายงานแยก 4 กรณีต่อประเภทข้อมูล: จับคู่สำเร็จ (matched) / มีข้อมูลครบอยู่แล้วไม่ต้องทำอะไร (alreadyLinked) /
 * หาไม่เจอเลย (unmatched) / กำกวมเจอมากกว่า 1 คน (ambiguous — จงใจไม่จับคู่ให้อัตโนมัติ ต้องให้แอดมินตรวจสอบเอง)
 *
 * booking ที่จับคู่ได้จะถูก mutate ตรงๆ (ให้ deep watcher ใน booking.ts persist ขึ้น Firestore เองตามปกติ)
 * ส่วน user ต้องเรียก userRepository.update() เองตรงนี้ เพราะ store users.ts ไม่มี auto-persist watcher
 */
export async function matchDriverIds(bookings: Booking[], drivers: DriverRecord[], users: UserProfile[]): Promise<DriverIdMigrationReport> {
  const report: DriverIdMigrationReport = {
    bookings: { matched: [], alreadyLinked: 0, unmatched: [], ambiguous: [] },
    users: { matched: [], alreadyLinked: 0, unmatched: [], ambiguous: [] },
  }

  bookings.forEach((b) => {
    if (!b.driverName) return
    if (b.driverId && b.driverFirstName && b.driverLastName) {
      report.bookings.alreadyLinked++
      return
    }
    // มี driverId อยู่แล้วแต่ยัง snapshot ชื่อไม่ครบ — ใช้ driverId เดิมหา DriverRecord ตรงๆ ไม่ต้องเทียบชื่อใหม่
    const linkedDriver = b.driverId ? drivers.find((d) => d.id === b.driverId) : undefined
    const matches = linkedDriver ? [linkedDriver] : findDriverMatches(b.driverName, drivers)
    if (matches.length === 1) {
      b.driverId = matches[0].id
      b.driverFirstName = matches[0].firstName
      b.driverLastName = matches[0].lastName
      report.bookings.matched.push({ docNo: b.docNo, driverName: b.driverName, driverId: matches[0].id! })
    } else if (matches.length === 0) {
      report.bookings.unmatched.push({ docNo: b.docNo, driverName: b.driverName })
    } else {
      report.bookings.ambiguous.push({ docNo: b.docNo, driverName: b.driverName, candidates: matches.map((d) => d.id!) })
    }
  })

  const userUpdates: Promise<void>[] = []
  users.forEach((u) => {
    if (u.role !== 'DRIVER') return
    if (u.driverId) {
      report.users.alreadyLinked++
      return
    }
    const matches = findDriverMatches(u.name, drivers)
    if (matches.length === 1) {
      u.driverId = matches[0].id
      userUpdates.push(userRepository.update(u.id, { driverId: matches[0].id, updatedAt: new Date().toISOString() }))
      report.users.matched.push({ email: u.email, name: u.name, driverId: matches[0].id! })
    } else if (matches.length === 0) {
      report.users.unmatched.push({ email: u.email, name: u.name })
    } else {
      report.users.ambiguous.push({ email: u.email, name: u.name, candidates: matches.map((d) => d.id!) })
    }
  })
  await Promise.all(userUpdates)

  return report
}
