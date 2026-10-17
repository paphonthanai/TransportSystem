import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { defaultCompletedJobsFilters, useCompletedJobs, completedJobPriceOf } from './useCompletedJobs'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('งานเสร็จสิ้น — ตัวกรองราคา', () => {
  it('ราคาที่ใช้กรอง = ราคาตกลง ไม่มีใช้ค่าเที่ยว (ตัวเดียวกับที่ตารางแสดง) และ 0/ไม่มี = ยังไม่ระบุราคา', () => {
    expect(completedJobPriceOf({ agreedPrice: 5000, tripFee: 3000 })).toBe(5000)
    expect(completedJobPriceOf({ tripFee: 3000 })).toBe(3000)
    expect(completedJobPriceOf({ tripFee: 0 })).toBe(0)
  })

  it('NOT_SET เห็นเฉพาะงานที่ยังไม่ระบุราคา, SET เห็นเฉพาะที่ระบุแล้ว, ว่าง = ทั้งหมด', () => {
    const store = useBookingStore()
    const noPrice = makeBooking({ status: 'DELIVERED', docNo: 'A1', tripFee: 0, agreedPrice: undefined })
    const feeOnly = makeBooking({ status: 'DELIVERED', docNo: 'A2', tripFee: 3000, agreedPrice: undefined })
    const agreed = makeBooking({ status: 'DELIVERED', docNo: 'A3', tripFee: 0, agreedPrice: 5000 })
    const notDone = makeBooking({ status: 'IN_TRANSIT', docNo: 'A4', tripFee: 0 })
    store.bookings.push(noPrice, feeOnly, agreed, notDone)

    const filters = ref(defaultCompletedJobsFilters())
    const { completedBookings } = useCompletedJobs(filters)
    const docs = () => completedBookings.value.map((b) => b.docNo).sort()

    expect(docs()).toEqual(['A1', 'A2', 'A3'])
    filters.value.price = 'NOT_SET'
    expect(docs()).toEqual(['A1'])
    filters.value.price = 'SET'
    expect(docs()).toEqual(['A2', 'A3'])
  })
})
