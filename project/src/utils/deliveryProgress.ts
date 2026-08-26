import type { JobItem } from '@/types'

export interface DeliveryProgress {
  total: number
  completed: number
  remaining: number
}

/**
 * นับความคืบหน้าการส่งของของงานหนึ่งงานจาก JobItem[] ตรงๆ (Booking เดิมคือ Source of Truth เดียว — ไม่มี Job
 * ใหม่/ไม่มี field ใหม่ ดู Phase E: Driver Sequential Delivery Workflow) ใช้ deliveryStatus ของแต่ละ item
 * ตรงๆ จึงสะท้อนของจริงเสมอไม่ว่าจะผ่าน Reset/เปลี่ยนคนขับ/เปลี่ยนรถมากี่ครั้งก็ตาม (deliveryStatus ไม่ถูกแตะระหว่าง
 * flow เหล่านั้นเลย ดู resetBookingStatus/dispatchBooking ใน stores/booking.ts)
 * ใช้ร่วมกันได้ทั้ง Driver App, หน้า Dispatch, Dashboard, และการคำนวณเบี้ยเลี้ยงในอนาคต โดยไม่ต้องคำนวณซ้ำที่แต่ละหน้า
 */
export function deliveryProgress(items: JobItem[]): DeliveryProgress {
  const total = items.length
  const completed = items.filter((i) => i.deliveryStatus === 'DELIVERED').length
  return { total, completed, remaining: total - completed }
}

/** เหมือน deliveryProgress() แต่นับจาก pickupStatus แทน — ใช้แสดงความคืบหน้าขั้นรับสินค้า (LOADING) แยกจากขั้นส่งของ */
export function pickupProgress(items: JobItem[]): DeliveryProgress {
  const total = items.length
  const completed = items.filter((i) => i.pickupStatus === 'PICKED_UP').length
  return { total, completed, remaining: total - completed }
}
