import type { Booking, JobItem } from '@/types'

/**
 * จับคู่งานกับคนขับที่เลือกอยู่ — ถ้างานมี driverId และรู้ id คนขับที่เลือกอยู่ ให้เทียบด้วย id (แม่นยำ ไม่พังเพราะรูปแบบ
 * ชื่อไม่ตรงกัน) งานเก่าก่อนมี driverId (หรือยังไม่รู้ id คนขับที่เลือก) fallback ไปเทียบชื่อแบบเดิม — Booking.driverId
 * คือ canonical identity เสมอ, driverName เป็นแค่ snapshot/fallback (ห้ามใช้ Vehicle.driverCode หา historical jobs)
 * ใช้ร่วมกันทั้ง DriverJobsView.vue (list) และ DriverJobDetailView.vue (detail) กันตรรกะสองที่ไม่ตรงกัน
 */
export function matchesSelectedDriver(booking: Booking, selectedDriverId: string | undefined, selectedDriverName: string): boolean {
  if (booking.driverId && selectedDriverId) return booking.driverId === selectedDriverId
  return booking.driverName === selectedDriverName
}

/**
 * จุดรับสินค้าถัดไปที่ Driver ควรเห็น (Phase E.1: Sequential Pickup) — เรียงตามลำดับที่ item ปรากฏใน booking.items[]
 * ตรงๆ ไม่มี field ลำดับรับล่วงหน้าแยกต่างหาก ตั้งใจใช้ array order เป็น Source of Truth เดียว ตรงกับที่
 * pickupJobItem (stores/booking.ts) บันทึก pickupSequence ตามลำดับที่กดจริงอยู่แล้ว — คืนค่า null เมื่อรับครบทุกรายการแล้ว
 */
export function nextPickup(items: JobItem[]): JobItem | null {
  return items.find((i) => i.pickupStatus !== 'PICKED_UP') ?? null
}

/**
 * จุดส่งของถัดไปที่ Driver ควรเห็น (Phase E.1: Sequential Delivery) — เรียงตาม deliverySequence ที่ pickupJobItem
 * คำนวณย้อนกลับจากลำดับรับไว้แล้วตอนรับสินค้าครบ (deliverySequence = maxPickupSequence - pickupSequence) คืนค่า
 * null เมื่อส่งครบทุกรายการแล้ว
 */
export function nextDelivery(items: JobItem[]): JobItem | null {
  const pending = items.filter((i) => i.deliveryStatus !== 'DELIVERED')
  if (!pending.length) return null
  return [...pending].sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0))[0]
}
