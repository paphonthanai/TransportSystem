import type { Booking } from '@/types'

/**
 * ลำดับมาตรฐานก่อนรวม Booking เข้าเอกสาร (ใบวางบิล/ใบแจ้งหนี้รวม) — Phase 2 ข้อ 4: วันที่งาน ASC -> เวลาลงสินค้า ASC
 * -> docNo ASC เสมอ ไม่ว่าผู้ใช้จะติ๊กเลือกงานในตารางตามลำดับไหนก็ตาม ใช้ร่วมกันทั้งฝั่ง store (สร้างเอกสารจริง) และ
 * ฝั่งหน้าจอเลือกงาน (โชว์ลำดับให้ตรงกับที่จะออกในเอกสารตั้งแต่ตอนเลือก)
 */
export function sortBookingsForDocumentMerge<T extends Pick<Booking, 'shipDate' | 'createdAt' | 'loadingTime' | 'docNo'>>(bookings: T[]): T[] {
  return [...bookings].sort((a, b) => {
    const dateA = new Date(a.shipDate || a.createdAt).getTime()
    const dateB = new Date(b.shipDate || b.createdAt).getTime()
    if (dateA !== dateB) return dateA - dateB
    const timeA = a.loadingTime || ''
    const timeB = b.loadingTime || ''
    if (timeA !== timeB) return timeA.localeCompare(timeB)
    return a.docNo.localeCompare(b.docNo)
  })
}
