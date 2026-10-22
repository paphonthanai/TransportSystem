import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('updateBookingFull — ลบข้อความจนว่าง', () => {
  it('ส่งหมายเหตุว่าง ("") = ลบหมายเหตุทิ้ง (ปุ่ม "!" หาย) ส่ง undefined = ไม่แตะ', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({ status: 'ASSIGNED', note: 'ย้ำตราประทับ | เช้า', po: 'PO-1' })
    bookingStore.bookings.push(booking)

    bookingStore.updateBookingFull(booking.id, {})
    expect(booking.note).toBe('ย้ำตราประทับ | เช้า')

    bookingStore.updateBookingFull(booking.id, { note: '', po: '' })
    expect(booking.note).toBeUndefined()
    expect(booking.po).toBeUndefined()
  })
})
