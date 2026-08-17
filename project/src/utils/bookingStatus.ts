import type { BookingStatus, BillingStatus, PodReviewStatus } from '@/types'

export const bookingStatusLabel: Record<BookingStatus, string> = {
  WAITING_DISPATCH: 'รอจัดรถ',
  ASSIGNED: 'รอคนขับตอบรับ',
  ACCEPTED: 'คนขับตอบรับแล้ว',
  FUEL_RECEIVED: 'รับน้ำมันแล้ว',
  LOADING: 'กำลังรับสินค้า',
  LOADED: 'รับสินค้าครบแล้ว',
  IN_TRANSIT: 'กำลังขนส่ง',
  DELIVERING: 'กำลังส่งของ',
  DELIVERED: 'ส่งของสำเร็จ',
}

export const bookingStatusClass: Record<BookingStatus, string> = {
  WAITING_DISPATCH: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-cyan-100 text-cyan-700',
  FUEL_RECEIVED: 'bg-orange-100 text-orange-700',
  LOADING: 'bg-teal-100 text-teal-700',
  LOADED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERING: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
}

export const billingStatusLabel: Record<BillingStatus, string> = {
  UNBILLED: 'ยังไม่วางบิล',
  IN_BATCH: 'อยู่ในรายการวางบิล',
  HOLD: 'พักบิล',
  INVOICED: 'ออกใบแจ้งหนี้แล้ว',
  PAID: 'ชำระแล้ว',
}

export const billingStatusClass: Record<BillingStatus, string> = {
  UNBILLED: 'bg-gray-100 text-gray-700',
  IN_BATCH: 'bg-blue-100 text-blue-700',
  HOLD: 'bg-red-100 text-red-700',
  INVOICED: 'bg-purple-100 text-purple-700',
  PAID: 'bg-green-100 text-green-700',
}

export interface DocumentClaimBadge {
  label: string
  class: string
}

/** สถานะเอกสารรวมทั้ง 3 ประเภทของงานนี้ (ใบวางบิล/ใบแจ้งหนี้/ใบเสร็จ) เป็นอิสระต่อกันโดยเจตนา ไม่ใช่ progression เดียวแบบ billingStatus
 *  เดิม (ระบบเก่า ดู Booking.billingStatus ใน types/index.ts) — งานหนึ่งอยู่ได้หลายป้ายพร้อมกัน คืนป้ายทั้งหมดที่ควรแสดง (0-3 ป้าย) */
export function documentClaimBadges(booking: { billingNoteDocId?: string; taxInvoiceDocId?: string; receiptDocId?: string }): DocumentClaimBadge[] {
  const badges: DocumentClaimBadge[] = []
  if (booking.billingNoteDocId) badges.push({ label: 'วางบิลแล้ว', class: 'bg-blue-100 text-blue-700' })
  if (booking.taxInvoiceDocId) badges.push({ label: 'ออกใบแจ้งหนี้แล้ว', class: 'bg-purple-100 text-purple-700' })
  if (booking.receiptDocId) badges.push({ label: 'รับเงินแล้ว', class: 'bg-green-100 text-green-700' })
  return badges
}

export const podReviewStatusLabel: Record<PodReviewStatus, string> = {
  PENDING_REVIEW: 'รอตรวจสอบ POD',
  APPROVED: 'ตรวจสอบแล้ว',
  REJECTED: 'ตีกลับ',
}

export const podReviewStatusClass: Record<PodReviewStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}
