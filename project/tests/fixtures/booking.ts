import type { Booking, JobItem } from '@/types'

let seq = 0

export function makeJobItem(overrides: Partial<JobItem> = {}): JobItem {
  seq += 1
  return {
    id: `item-${seq}`,
    product: 'Cement',
    qty: 10,
    unit: 'ตัน',
    siteName: `ไซต์ ${seq}`,
    province: 'กรุงเทพมหานคร',
    district: 'บางนา',
    ...overrides,
  }
}

/** Booking fixture ครบฟิลด์บังคับตาม types/index.ts — ใช้ seed ตรงเข้า bookingStore.bookings.value ในเทสต์
 *  โดยไม่ผ่าน Firestore จริง (mock แล้วใน tests/setup.ts) */
export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  seq += 1
  return {
    id: `booking-${seq}`,
    category: 'cements',
    docNo: `DOC-${seq}`,
    customer: 'ลูกค้าทดสอบ',
    status: 'DELIVERED',
    items: [],
    allowance: 0,
    tripFee: 1000,
    agreedPrice: 1000,
    ...overrides,
  } as Booking
}
