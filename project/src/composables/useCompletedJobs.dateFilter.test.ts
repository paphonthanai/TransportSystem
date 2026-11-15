import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { defaultCompletedJobsFilters, useCompletedJobs } from './useCompletedJobs'
import { makeBooking } from '../../tests/fixtures/booking'

// ผู้ใช้อยู่ไทย (UTC+7) — new Date('2026-11-07') คือเที่ยงคืน UTC = 07:00 เวลาไทย ทำให้งานที่ส่งสำเร็จช่วง 00:00–06:59 หลุดไป
vi.stubEnv('TZ', 'Asia/Bangkok')

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('งานเสร็จสิ้น — ตัวกรองวันที่ส่งสำเร็จ', () => {
  it('กรองวันที่ 7 ถึง 7 ได้ทุกงานที่ส่งสำเร็จวันที่ 7 ตั้งแต่ 00:00 ถึง 23:59 ตามเวลาไทย', () => {
    const store = useBookingStore()
    store.bookings.push(
      makeBooking({ status: 'DELIVERED', docNo: 'EARLY', completedAt: new Date(2026, 10, 7, 0, 30) }),
      makeBooking({ status: 'DELIVERED', docNo: 'MORNING', completedAt: new Date(2026, 10, 7, 6, 59) }),
      makeBooking({ status: 'DELIVERED', docNo: 'NIGHT', completedAt: new Date(2026, 10, 7, 23, 59) }),
      makeBooking({ status: 'DELIVERED', docNo: 'DAY6', completedAt: new Date(2026, 10, 6, 23, 59) }),
      makeBooking({ status: 'DELIVERED', docNo: 'DAY8', completedAt: new Date(2026, 10, 8, 0, 0) }),
    )
    const filters = ref({ ...defaultCompletedJobsFilters(), dateFrom: '2026-11-07', dateTo: '2026-11-07' })
    const { completedBookings } = useCompletedJobs(filters)
    expect(completedBookings.value.map((b) => b.docNo).sort()).toEqual(['EARLY', 'MORNING', 'NIGHT'])
  })
})
