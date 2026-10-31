import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('setTripSequence — วันละไม่เกิน 4 เที่ยว', () => {
  it('ตั้ง 1-4 ได้, เกิน 4 ไม่บันทึก, 0/undefined = ล้างเป็นว่าง', () => {
    const store = useBookingStore()
    const b = makeBooking({})
    store.bookings.push(b)
    store.setTripSequence(b.id, 3)
    expect(b.tripSequence).toBe(3)
    store.setTripSequence(b.id, 5)
    expect(b.tripSequence).toBe(3)
    store.setTripSequence(b.id, 0)
    expect(b.tripSequence).toBeUndefined()
  })
})
