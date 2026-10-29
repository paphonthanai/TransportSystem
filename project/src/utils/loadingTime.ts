import type { Booking, JobItem } from '@/types'

/** เวลานัดลงสินค้า "HH:mm" — ใช้ของจุดส่งก่อน ไม่มีค่อยใช้ของทั้งงาน (import คอลัมน์ "time" เก็บที่ booking.loadingTime) */
export function loadingTimeOf(booking: Pick<Booking, 'loadingTime'>, item?: Pick<JobItem, 'loadingTime'>): string {
  return item?.loadingTime || booking.loadingTime || ''
}
