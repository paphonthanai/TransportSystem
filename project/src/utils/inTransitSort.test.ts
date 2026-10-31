import { describe, it, expect } from 'vitest'
import { compareInTransitBookings } from './inTransitSort'
import type { BookingStatus } from '@/types'

const job = (docNo: string, status: BookingStatus, loadingDate?: Date, loadingTime?: string) => ({ docNo, status, loadingDate, loadingTime })

describe('compareInTransitBookings', () => {
  it('ส่งของเสร็จสิ้น → กำลังส่งของ → คนขับตอบรับแล้ว แล้วเรียงวันที่ลงงาน + เวลา', () => {
    const rows = [
      job('A', 'ACCEPTED', new Date(2026, 9, 1), '08:00'),
      job('B', 'IN_TRANSIT', new Date(2026, 9, 2), '10:00'),
      job('C', 'DELIVERED', new Date(2026, 9, 3), '07:00'),
      job('D', 'DELIVERING', new Date(2026, 9, 2), '8:30'),
      job('E', 'DELIVERED', new Date(2026, 9, 3, 15), '06:00'),
      job('F', 'IN_TRANSIT'),
    ]
    expect(rows.sort(compareInTransitBookings).map((r) => r.docNo)).toEqual(['E', 'C', 'D', 'B', 'F', 'A'])
  })
})
