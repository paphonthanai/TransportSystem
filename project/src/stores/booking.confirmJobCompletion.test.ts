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
describe('confirmJobCompletion', () => {
  it('sets completionConfirmedAt/completionConfirmedBy when the booking is DELIVERED with POD already APPROVED', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'DELIVERED', podReviewStatus: 'APPROVED' })
    bookingStore.bookings.push(booking)

    bookingStore.confirmJobCompletion(booking.id)

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
