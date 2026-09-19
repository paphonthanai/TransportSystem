import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

const now = new Date()
const yyyy = now.getFullYear()
const datePart = `${yyyy}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

describe('nextPoNo', () => {
  it('starts at 0001 (4-digit) when no PO exists yet this year', () => {
    const store = useBookingStore()
    expect(store.nextPoNo()).toBe(`PO${datePart}0001`)
  })

  it('picks the smallest free 4-digit number in the current year, ignoring gaps and other years', () => {
    const store = useBookingStore()
    store.bookings.push(makeBooking({ po: `PO${datePart}0001` }))
    store.bookings.push(makeBooking({ po: `PO${datePart}0002` }))
    // เลขปีอื่น (เก่ากว่า) ต้องไม่ถูกนับเป็นเลขที่ถูกใช้ของปีนี้
    store.bookings.push(makeBooking({ po: `PO${yyyy - 1}09190001` }))
    // เลขที่ถูกเว้น (0003) ต้องถูกเติมก่อนเสมอ ไม่ใช่ตัวนับเดินหน้าเรื่อยๆ
    store.bookings.push(makeBooking({ po: `PO${datePart}0005` }))

    expect(store.nextPoNo()).toBe(`PO${datePart}0003`)
  })

  it('rolls over to 5-digit width starting at 00001 only once 0001-9999 are all taken', () => {
    const store = useBookingStore()
    for (let n = 1; n <= 9999; n++) {
      store.bookings.push(makeBooking({ po: `PO${datePart}${String(n).padStart(4, '0')}` }))
    }
    expect(store.nextPoNo()).toBe(`PO${datePart}00001`)
  })

  it('keeps the 4-digit and 5-digit pools independent (a used 5-digit number does not block a free 4-digit one)', () => {
    const store = useBookingStore()
    store.bookings.push(makeBooking({ po: `PO${datePart}00001` }))
    expect(store.nextPoNo()).toBe(`PO${datePart}0001`)
  })
})
