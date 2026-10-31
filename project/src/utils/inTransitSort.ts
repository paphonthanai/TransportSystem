import type { Booking, BookingStatus } from '@/types'

/** ลำดับสถานะของตาราง "งานที่กำลังขนส่ง": ส่งของเสร็จสิ้น → กำลังส่งของ → คนขับตอบรับแล้ว (สถานะอื่นไปท้ายสุด) */
const IN_TRANSIT_STATUS_RANK: Partial<Record<BookingStatus, number>> = {
  DELIVERED: 0,
  DELIVERING: 1,
  IN_TRANSIT: 1,
  ACCEPTED: 2,
  ASSIGNED: 2,
}

const dayValue = (date?: Date) => {
  if (!date) return Number.POSITIVE_INFINITY
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** สถานะเดียวกัน เรียงวันที่ลงงานเก่า → ใหม่ แล้วเวลาลงงานเช้า → เย็น (ไม่มีวันที่/เวลาไปท้ายกลุ่ม) สุดท้ายเลขที่งาน */
export function compareInTransitBookings(
  a: Pick<Booking, 'status' | 'loadingDate' | 'loadingTime' | 'docNo'>,
  b: Pick<Booking, 'status' | 'loadingDate' | 'loadingTime' | 'docNo'>
): number {
  const rankDiff = (IN_TRANSIT_STATUS_RANK[a.status] ?? 9) - (IN_TRANSIT_STATUS_RANK[b.status] ?? 9)
  if (rankDiff !== 0) return rankDiff
  const dayA = dayValue(a.loadingDate)
  const dayB = dayValue(b.loadingDate)
  if (dayA !== dayB) return dayA < dayB ? -1 : 1
  const timeA = a.loadingTime || '99:99'
  const timeB = b.loadingTime || '99:99'
  if (timeA !== timeB) return timeA.padStart(5, '0').localeCompare(timeB.padStart(5, '0'))
  return (a.docNo || '').localeCompare(b.docNo || '')
}
