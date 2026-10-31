import type { Booking } from '@/types'
import { normalizeDriverName } from '@/utils/driverIdentity'
import { MAX_TRIPS_PER_DAY, resolveTripNumber } from '@/utils/tripSequence'

/**
 * กลุ่ม "งานของคนขับคนเดียวกันในวันเดียวกัน" สำหรับนับเที่ยวที่ — ใช้ร่วมกันทั้งตาราง Booking และ store (tripNumberOf)
 *
 * เดิมเทียบ booking.driverName แบบตรงตัวอักษร งานเก่าบางงานเก็บชื่อมีช่องว่างซ้อน/ช่องว่างท้าย/คำนำหน้า (ทะเบียนคนขับเคย
 * มีช่องว่างเกิน) บนจอดูเหมือนกันทุกตัวอักษร (HTML ยุบช่องว่างซ้อน) แต่ถูกนับเป็นคนละคน — จำนวนตัวเลือกเที่ยวที่/เลขเที่ยว/
 * การเตือนเลขซ้ำของคนขับคนเดียวกันจึงไม่เท่ากัน ตอนนี้ใช้ driverId ถ้ามีทั้งคู่ ไม่งั้นเทียบชื่อแบบไม่สนช่องว่าง/คำนำหน้า
 */
type DriverRef = Pick<Booking, 'driverId' | 'driverName'>

export function isSameDriver(a: DriverRef, b: DriverRef): boolean {
  if (a.driverId && b.driverId) return a.driverId === b.driverId
  const na = normalizeDriverName(a.driverName)
  return !!na && na === normalizeDriverName(b.driverName)
}

/** วันของงานสำหรับนับเที่ยว: วันที่ขนส่ง ไม่มีค่อยใช้วันที่สร้างงาน */
const dayKeyOf = (b: Pick<Booking, 'shipDate' | 'createdAt'>) => {
  const d = new Date(b.shipDate || b.createdAt)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** งานของคนขับคนเดียวกับ booking ในวันเดียวกัน (รวมตัว booking เอง) — ไม่มีคนขับ = [booking] */
export function driverDayGroup<T extends Booking>(booking: T, all: T[]): T[] {
  if (!booking.driverName && !booking.driverId) return [booking]
  const day = dayKeyOf(booking)
  const group = all.filter((b) => (b.driverName || b.driverId) && isSameDriver(b, booking) && dayKeyOf(b) === day)
  return group.some((b) => b.id === booking.id) ? group : [...group, booking]
}

/** เลขเที่ยวของงานในกลุ่มคนขับ/วันเดียวกัน */
export const driverTripNumber = (booking: Booking, all: Booking[]) => resolveTripNumber(booking, driverDayGroup(booking, all))

/** ตัวเลือก "เที่ยวที่" — 1-4 เท่ากันทุกงาน (วันละไม่เกิน 4 เที่ยว) */
export const MIN_TRIP_CHOICES = MAX_TRIPS_PER_DAY

/** 1..4 — งานเก่าที่เคยตั้งเลขเกิน 4 ไว้ ยังโชว์เลขเดิมให้เห็น (เลือกเปลี่ยนเป็น 1-4 ได้ เลือกกลับเป็นเลขเกินไม่ได้) */
export function tripNumberChoices(booking: Pick<Booking, 'tripSequence'>): number[] {
  const base = Array.from({ length: MAX_TRIPS_PER_DAY }, (_, i) => i + 1)
  const current = booking.tripSequence
  return current !== undefined && current > MAX_TRIPS_PER_DAY ? [...base, current] : base
}
