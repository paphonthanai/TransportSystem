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
 * เป็นการเพิ่มข้อมูลเท่านั้น (additive) — ไม่ลบ/ทับ driverName หรือ name เดิมเลย เพิ่ม driverId เป็น field ใหม่คู่กัน
 * เท่านั้น ปลอดภัยรันซ้ำได้ (ข้ามรายการที่มี driverId อยู่แล้วโดยอัตโนมัติ — ดู alreadyLinked)
 *
 * คืนรายงานแยก 4 กรณีต่อประเภทข้อมูล: จับคู่สำเร็จ (matched) / มี driverId อยู่แล้วไม่ต้องทำอะไร (alreadyLinked) /
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
    if (b.driverId) {
      report.bookings.alreadyLinked++
      return
    }
    const matches = findDriverMatches(b.driverName, drivers)
    if (matches.length === 1) {
      b.driverId = matches[0].id
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
