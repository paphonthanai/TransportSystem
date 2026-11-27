import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => setActivePinia(createPinia()))

describe('เวลาจบงานคงเดิมหลัง Reset', () => {
  it('Reset งานที่จบแล้ว แล้วคนขับจบงานใหม่ → completedAt = เวลาจบครั้งแรก', () => {
    const store = useBookingStore()
    const first = new Date('2026-11-20T09:30:00Z')
    const items = [makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt: first, podImage: 'pod-a' })]
    const booking = makeBooking({ status: 'DELIVERED', items, completedAt: first })
    store.bookings.push(booking)

    store.resetBookingStatus(booking.id)
    expect(booking.completedAt).toBeUndefined()
    expect(booking.originalCompletedAt).toEqual(first)

    store.finishDriverJob(booking.id)
    expect(booking.status).toBe('DELIVERED')
    expect(booking.completedAt).toEqual(first)
    expect(booking.originalCompletedAt).toBeUndefined()

    // Reset ซ้ำอีกรอบก็ยังได้เวลาเดิม
    store.resetBookingStatus(booking.id)
    store.finishDriverJob(booking.id)
    expect(booking.completedAt).toEqual(first)
  })

  it('งานที่ไม่เคยจบ → completedAt = เวลาตอนกดจบ', () => {
    const store = useBookingStore()
    const items = [makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), podImage: 'pod-a' })]
    const booking = makeBooking({ status: 'DELIVERING', items })
    store.bookings.push(booking)
    const before = Date.now()
    store.finishDriverJob(booking.id)
    expect(new Date(booking.completedAt!).getTime()).toBeGreaterThanOrEqual(before)
  })
})
