import type { BookingStatus, BillingStatus } from '@/types'

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
