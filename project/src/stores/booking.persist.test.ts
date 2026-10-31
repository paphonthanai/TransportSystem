import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { bookingRepository } from '@/repositories/bookingRepository'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('บันทึกงานลง Firestore เฉพาะงานที่ถูกแก้', () => {
  it('งานใหม่บันทึกครั้งเดียว และแก้งานหนึ่ง = บันทึกเฉพาะงานนั้น', async () => {
    const store = useBookingStore()
    await vi.waitFor(() => expect(store.bookingsLoading).toBe(false))
    const update = vi.spyOn(bookingRepository, 'update').mockResolvedValue()

    const a = makeBooking({ docNo: 'A' })
    const b = makeBooking({ docNo: 'B' })
    store.bookings.push(a, b)
    await nextTick()
    expect(update.mock.calls.map((c) => c[0]).sort()).toEqual([a.id, b.id].sort())

    update.mockClear()
    store.bookings.find((x) => x.id === a.id)!.note = 'แก้หมายเหตุ'
    await nextTick()
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0]).toBe(a.id)

    update.mockClear()
    await nextTick()
    expect(update).not.toHaveBeenCalled()
  })
})
