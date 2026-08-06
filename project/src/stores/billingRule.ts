import { defineStore } from 'pinia'
import { useFirestoreSettings } from '@/composables/useFirestoreSettings'
import type { Booking, BookingStatus } from '@/types'

export interface BillingRule {
  /** สถานะงานที่ถือว่าพร้อมนำไปวางบิลได้ ค่าเริ่มต้น = ต้องส่งของสำเร็จ (DELIVERED) เท่านั้น ปรับเพิ่มสถานะอื่นได้ในอนาคตโดยไม่ต้องแก้โค้ด */
  allowedJobStatus: BookingStatus[]
  /** ต้องมี POD ครบทุกรายการก่อนจึงจะวางบิลได้ */
  requirePOD: boolean
  /** ราคาต้องตรงกับที่ตกลงไว้ก่อนจึงจะวางบิลได้ (ปกติปิดไว้ เพราะระบบให้ตรวจสอบราคาตอนอยู่ในรายการวางบิลแทนอยู่แล้ว) */
  requirePrice: boolean
  /** ต้องผ่านการอนุมัติก่อน — แอปนี้ยังไม่มีระบบอนุมัติ เปิดใช้แล้วจะไม่มีงานผ่านเงื่อนไขนี้ได้เลยจนกว่าจะมีฟีเจอร์อนุมัติจริง */
  requireApproval: boolean
}

function defaultRule(): BillingRule {
  return {
    allowedJobStatus: ['DELIVERED'],
    requirePOD: false,
    requirePrice: false,
    requireApproval: false,
  }
}

export const useBillingRuleStore = defineStore('billingRule', () => {
  const { data: rule, loading, error } = useFirestoreSettings<BillingRule>('billingRule', defaultRule)

  const hasAllPods = (booking: Booking) =>
    booking.items.length > 0 && booking.items.every((i) => i.deliveryStatus === 'DELIVERED' && !!i.podImage)

  const priceMatches = (booking: Booking) => {
    const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
    return (booking.tripFee || 0) + extras === booking.agreedPrice
  }

  /** เหตุผลที่งานนี้ยังวางบิลไม่ได้ตาม rule ปัจจุบัน — คืนค่า null ถ้าพร้อมวางบิลแล้ว */
  const eligibilityReason = (booking: Booking): string | null => {
    if (!rule.value.allowedJobStatus.includes(booking.status)) {
      return 'สถานะงานยังไม่เข้าเงื่อนไขที่กำหนดให้วางบิลได้'
    }
    if (rule.value.requirePOD && !hasAllPods(booking)) {
      return 'ยังมี POD ไม่ครบทุกรายการ'
    }
    if (rule.value.requirePrice && !priceMatches(booking)) {
      return 'ราคายังไม่ตรงกับที่ตกลงไว้'
    }
    if (rule.value.requireApproval) {
      return 'ยังไม่ผ่านการอนุมัติ (แอปนี้ยังไม่มีระบบอนุมัติ)'
    }
    return null
  }

  const isEligible = (booking: Booking): boolean => eligibilityReason(booking) === null

  return { rule, loading, error, isEligible, eligibilityReason }
})
