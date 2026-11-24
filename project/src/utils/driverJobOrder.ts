import type { Booking } from '@/types'

/**
 * ลำดับการ์ด "งานที่ได้รับมอบหมาย" ในแอปคนขับ — งานที่รับแล้ว/กำลังทำอยู่ขึ้นก่อน เรียงตามเที่ยวที่ (1, 2, ...)
 * งานที่รอตอบรับ (ASSIGNED) ไว้ล่างสุด เรียงตามเที่ยวที่เหมือนกัน
 * (เดิมเรียงตามเที่ยวอย่างเดียว งานรอตอบรับปนกับงานที่ทำอยู่: เที่ยว 1, เที่ยว 1, เที่ยว 2, เที่ยว 2)
 * งานที่ไม่มีเลขเที่ยวอยู่ท้ายกลุ่มของตัวเอง ลำดับเดิมคงไว้ (sort เสถียร)
 */
export function compareDriverJobs(a: Pick<Booking, 'status' | 'tripSequence'>, b: Pick<Booking, 'status' | 'tripSequence'>): number {
  const group = (x: Pick<Booking, 'status'>) => (x.status === 'ASSIGNED' ? 1 : 0)
  const g = group(a) - group(b)
  if (g !== 0) return g
  const sa = a.tripSequence
  const sb = b.tripSequence
  if (sa !== undefined && sb !== undefined) return sa - sb
  if (sa !== undefined) return -1
  if (sb !== undefined) return 1
  return 0
}
