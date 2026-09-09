import type { Booking } from '@/types'

/**
 * ชื่องานที่อ่านแล้วเข้าใจได้ทันที (ชื่อลูกค้า · หน้างาน · สินค้า) แทนเลขที่เอกสาร (docNo) ที่ไม่สื่อความหมายอะไรเลย
 * ใช้ข้อมูลที่มีอยู่แล้วบน Booking/Item ต่อกันเป็นประโยค ไม่เพิ่ม field ใหม่ — ใช้ร่วมกันทั้งฝั่งจัดรถ (BookingView.vue)
 * และฝั่งคนขับ (DriverJobsView.vue/DriverJobDetailView.vue) ให้เป็นรูปแบบเดียวกัน
 */
export function bookingTitle(booking: Booking): string {
  const first = booking.items[0]
  const parts = [booking.customer, first?.siteName, first?.product].filter(Boolean)
  return parts.length ? parts.join(' · ') : booking.docNo
}
