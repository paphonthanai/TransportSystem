import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

/**
 * "ยืนยันการจบงาน" (confirmJobCompletion) เป็นขั้นตอนสุดท้ายจริงก่อนนำไปวางบิล แยกออกจาก "ตรวจสอบ POD" (reviewPod)
 * โดยเจตนาตาม Requirement — กดได้เฉพาะงานที่ POD อนุมัติแล้ว (APPROVED) เท่านั้น ดู isBookingConfirmedForBilling
 * ใน utils/bookingStatus.ts ที่ใช้ completionConfirmedAt เป็นเงื่อนไขวางบิลจริง
 */
/** ข้อมูลครบพอยืนยันจบงานได้ (ดู utils/bookingCompletion.ts) */
const completeData = {
  plate: '70-1111 สระบุรี',
  driverName: 'สมชาย ใจดี',
  tripFee: 3500,
  fuelLiters: 40,
  fuelRate: 37.52,
  odometerBefore: 1000,
  odometerAfter: 1200,
}

describe('confirmJobCompletion', () => {
  it('sets completionConfirmedAt/completionConfirmedBy when the booking is DELIVERED with POD already APPROVED', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERED', podReviewStatus: 'APPROVED', ...completeData })
    bookingStore.bookings.push(booking)

    const result = bookingStore.confirmJobCompletion(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.completionConfirmedAt).toBeInstanceOf(Date)
  })

  it('ข้อมูลไม่ครบ (ไม่มีเลขไมล์/ลิตรน้ำมัน) = ยืนยันจบงานไม่ได้ จนกว่าจะแก้ข้อมูลหรือติ๊กไม่เติมน้ำมัน', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({
      status: 'DELIVERED',
      podReviewStatus: 'APPROVED',
      ...completeData,
      odometerAfter: undefined,
      fuelLiters: 0,
      fuelRate: 0,
    })
    bookingStore.bookings.push(booking)

    const blocked = bookingStore.confirmJobCompletion(booking.id)
    expect(blocked.ok).toBe(false)
    expect(blocked.issues.map((i) => i.code)).toEqual(['fuelLiters'])
    expect(booking.completionConfirmedAt).toBeUndefined()

    booking.odometerAfter = 1200
    booking.fuelNotRefilled = true
    expect(bookingStore.confirmJobCompletion(booking.id).ok).toBe(true)
    expect(booking.completionConfirmedAt).toBeInstanceOf(Date)
  })

  it('does nothing when POD is still PENDING_REVIEW — must verify POD first', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERED', podReviewStatus: 'PENDING_REVIEW' })
    bookingStore.bookings.push(booking)

    bookingStore.confirmJobCompletion(booking.id)

    expect(booking.completionConfirmedAt).toBeUndefined()
  })

  it('does nothing when POD was REJECTED', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERED', podReviewStatus: 'REJECTED' })
    bookingStore.bookings.push(booking)

    bookingStore.confirmJobCompletion(booking.id)

    expect(booking.completionConfirmedAt).toBeUndefined()
  })

  it('does nothing when the booking is not DELIVERED yet, even if podReviewStatus were somehow APPROVED', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'IN_TRANSIT', podReviewStatus: 'APPROVED' })
    bookingStore.bookings.push(booking)

    bookingStore.confirmJobCompletion(booking.id)

    expect(booking.completionConfirmedAt).toBeUndefined()
  })

  it('does nothing for a non-existent booking id (no throw)', () => {
    const bookingStore = useBookingStore()
    expect(() => bookingStore.confirmJobCompletion('does-not-exist')).not.toThrow()
  })
})

describe('approvePodAndConfirmCompletion (ยืนยัน POD = ยืนยันการจบงาน)', () => {
  it('งานที่ส่งของเสร็จแล้ว ข้อมูลครบ = อนุมัติ POD และยืนยันการจบงานพร้อมกัน', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERED', podReviewStatus: 'PENDING_REVIEW', ...completeData })
    bookingStore.bookings.push(booking)

    const result = bookingStore.approvePodAndConfirmCompletion(booking.id)

    expect(result).toMatchObject({ ok: true, completed: true })
    expect(booking.podReviewStatus).toBe('APPROVED')
    expect(booking.completionConfirmedAt).toBeInstanceOf(Date)
  })

  it('ข้อมูลไม่ครบ = ไม่แตะอะไรเลย POD ยังรอตรวจ', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERED', podReviewStatus: 'PENDING_REVIEW', ...completeData, fuelLiters: 0, fuelRate: 0 })
    bookingStore.bookings.push(booking)

    const result = bookingStore.approvePodAndConfirmCompletion(booking.id)

    expect(result.ok).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(booking.podReviewStatus).toBe('PENDING_REVIEW')
    expect(booking.completionConfirmedAt).toBeUndefined()
  })

  it('งานยังไม่ DELIVERED = อนุมัติ POD อย่างเดียว ยังไม่ยืนยันการจบงาน', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERING', podReviewStatus: 'PENDING_REVIEW', ...completeData })
    bookingStore.bookings.push(booking)

    expect(bookingStore.approvePodAndConfirmCompletion(booking.id)).toMatchObject({ ok: true, completed: false })
    expect(booking.podReviewStatus).toBe('APPROVED')
    expect(booking.completionConfirmedAt).toBeUndefined()
  })
})
