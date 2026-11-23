import { defineStore } from 'pinia'
import { useFirestoreSettings } from '@/composables/useFirestoreSettings'
import type { Booking, BookingStatus } from '@/types'

export interface BillingRule {
  /** เลิกใช้แล้ว — เดิมเป็นสถานะที่แอดมินเปิดให้วางบิลเพิ่มได้ ตอนนี้วางบิลได้เฉพาะงานที่จบงานแล้ว (ดู MANDATORY_BILLING_STATUSES) */
  allowedJobStatus: BookingStatus[]
  /** ต้องมี POD ครบทุกรายการก่อนจึงจะวางบิลได้ */
  requirePOD: boolean
  /** ราคาต้องตรงกับที่ตกลงไว้ก่อนจึงจะวางบิลได้ (ปกติปิดไว้ เพราะระบบให้ตรวจสอบราคาตอนอยู่ในรายการวางบิลแทนอยู่แล้ว) */
  requirePrice: boolean
  /** ต้องผ่านการอนุมัติก่อน — แอปนี้ยังไม่มีระบบอนุมัติ เปิดใช้แล้วจะไม่มีงานผ่านเงื่อนไขนี้ได้เลยจนกว่าจะมีฟีเจอร์อนุมัติจริง */
  requireApproval: boolean
}

/** สถานะเดียวที่วางบิลได้ = ส่งของสำเร็จ (กดจบงานแล้ว) — กติกาตายตัวของระบบ (เดิมเปิดให้งาน "อยู่ระหว่างขนส่ง" ที่ยังไม่จบงาน
 *  วางบิลได้ด้วย และแอดมินเปิดสถานะอื่นเพิ่มได้ ตอนนี้ยกเลิกทั้งคู่ตามที่ลูกค้าขอ) ค่า allowedJobStatus ที่บันทึกไว้เดิมไม่มีผลแล้ว */
export const MANDATORY_BILLING_STATUSES: BookingStatus[] = ['DELIVERED']

function defaultRule(): BillingRule {
  return {
    allowedJobStatus: [],
    requirePOD: false,
    requirePrice: false,
    requireApproval: false,
  }
}

export const useBillingRuleStore = defineStore('billingRule', () => {
  const { data: rule, loading, error } = useFirestoreSettings<BillingRule>('billingRule', defaultRule)

  /** สถานะนี้วางบิลได้ไหม — เฉพาะงานที่จบงานแล้ว (MANDATORY_BILLING_STATUSES) ไม่ขึ้นกับสถานะที่เคยตั้งเพิ่มไว้ในหน้าตั้งค่า */
  const isStatusBillable = (status: BookingStatus): boolean => MANDATORY_BILLING_STATUSES.includes(status)

  const hasAllPods = (booking: Booking) =>
    booking.items.length > 0 && booking.items.every((i) => i.deliveryStatus === 'DELIVERED' && !!i.podImage)

  const priceMatches = (booking: Booking) => {
    const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
    return (booking.tripFee || 0) + extras === booking.agreedPrice
  }

  /** เหตุผลที่งานนี้ยังวางบิลไม่ได้ตาม rule ปัจจุบัน — คืนค่า null ถ้าพร้อมวางบิลแล้ว */
  const eligibilityReason = (booking: Booking): string | null => {
    if (!isStatusBillable(booking.status)) {
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

  return { rule, loading, error, isEligible, eligibilityReason, isStatusBillable, hasAllPods, priceMatches }
})
