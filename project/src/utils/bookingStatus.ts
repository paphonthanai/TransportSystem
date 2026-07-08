import type { BookingStatus, BillingStatus } from '@/types'

export const bookingStatusLabel: Record<BookingStatus, string> = {
  WAITING_DISPATCH: 'รอจัดรถ',
  DISPATCHED: 'จัดรถแล้ว',
  IN_TRANSIT: 'กำลังขนส่ง',
  DELIVERED: 'ส่งของสำเร็จ',
}

export const bookingStatusClass: Record<BookingStatus, string> = {
  WAITING_DISPATCH: 'bg-amber-100 text-amber-700',
  DISPATCHED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
}

export const billingStatusLabel: Record<BillingStatus, string> = {
  UNBILLED: 'ยังไม่วางบิล',
  IN_BATCH: 'อยู่ในรอบบิล',
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
