import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useAuthStore } from './auth'
import { useVehiclesStore } from './vehicles'
import { makeBooking } from '../../tests/fixtures/booking'
import type { Vehicle } from '@/types'
import type { UserRole } from './users'

function loginAs(role: UserRole) {
  useAuthStore().profile = {
    id: 'uid-test',
    email: 'test@test.com',
    name: 'Test User',
    role,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ใส่รถหลังสร้าง store ในแต่ละเทสต์ (fetchVehicles ตอนสร้าง store ทับ vehicles ทีหลังถ้าใส่ไว้ก่อน)
const seedVehicle = async () => {
  const vehicles = useVehiclesStore()
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
  vehicles.vehicles.push({ id: 'v1', plate: '72-2284', plateProvince: 'สระบุรี', department: 'รถร่วม' } as Vehicle)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ทะเบียนในงานเป็นมาตรฐานเดียว — เลขทะเบียนล้วน ไม่มีจังหวัด', () => {
  it('สร้างงาน/จัดรถด้วยทะเบียนที่มีจังหวัด เก็บเป็นเลขทะเบียนล้วน ทะเบียนที่ไม่อยู่ในทะเบียนรถเก็บตามที่พิมพ์', async () => {
    const bookingStore = useBookingStore()
    await seedVehicle()
    const { id: _id, status: _s, createdAt: _c, ...data } = makeBooking({ plate: '72-2284 สระบุรี' })
    expect(bookingStore.addBooking(data).plate).toBe('72-2284')

    const b = makeBooking({ status: 'WAITING_DISPATCH', plate: undefined })
    bookingStore.bookings.push(b)
    bookingStore.dispatchBooking(b.id, '72-2284 สระบุรี')
    expect(b.plate).toBe('72-2284')

    const c = makeBooking({ status: 'WAITING_DISPATCH', plate: undefined })
    bookingStore.bookings.push(c)
    bookingStore.dispatchBooking(c.id, '99-9999 ลพบุรี')
    expect(c.plate).toBe('99-9999 ลพบุรี')
  })

  it('ตัดจังหวัดออกจากงานเก่าได้เฉพาะผู้ดูแลระบบ/ผู้จัดรถ', async () => {
    const bookingStore = useBookingStore()
    await seedVehicle()
    const old = makeBooking({ plate: '72-2284 สระบุรี' })
    const ok = makeBooking({ plate: '72-2284' })
    bookingStore.bookings.push(old, ok)
    expect(bookingStore.bookingsWithNonStandardPlate().map((b) => b.id)).toEqual([old.id])

    loginAs('STAFF')
    expect(bookingStore.normalizeBookingPlates().ok).toBe(false)
    expect(old.plate).toBe('72-2284 สระบุรี')

    loginAs('DISPATCHER')
    expect(bookingStore.normalizeBookingPlates()).toEqual({ ok: true, count: 1 })
    expect(old.plate).toBe('72-2284')
    expect(bookingStore.bookingsWithNonStandardPlate()).toHaveLength(0)
  })

  it('plateKey: งานที่มี/ไม่มีจังหวัดถือเป็นรถคันเดียวกัน', () => {
    const vehicles = useVehiclesStore()
    expect(vehicles.plateKey('72-2284 สระบุรี')).toBe(vehicles.plateKey('72-2284'))
  })
})
