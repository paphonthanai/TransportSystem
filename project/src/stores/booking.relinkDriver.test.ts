import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useAuthStore } from './auth'
import { makeBooking } from '../../tests/fixtures/booking'
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

const target = { id: 'drv-new', firstName: 'แสง', lastName: 'ตั้งภูมิ' }

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('relinkMissingDriverId — ผูกงานจากรหัสคนขับที่ไม่มีในทะเบียนเข้ากับคนขับในทะเบียน', () => {
  it('ย้ายเฉพาะงานของรหัสเดิม คง Snapshot ชื่อเดิม และเติมชื่อให้งานที่ยังไม่มี', () => {
    loginAs('ADMIN')
    const store = useBookingStore()
    const a = makeBooking({ driverId: 'drv-old', driverFirstName: 'แสง', driverLastName: 'ตั้งภูมิ' })
    const b = makeBooking({ driverId: 'drv-old', driverName: 'แสง ตั้งภูมิ' })
    const other = makeBooking({ driverId: 'drv-x' })
    store.bookings.push(a, b, other)

    const result = store.relinkMissingDriverId('drv-old', target, ['drv-new', 'drv-x'])

    expect(result).toEqual({ ok: true, count: 2 })
    expect(a.driverId).toBe('drv-new')
    expect(b.driverId).toBe('drv-new')
    expect(b.driverFirstName).toBe('แสง')
    expect(other.driverId).toBe('drv-x')
  })

  it('รหัสเดิมยังอยู่ในทะเบียน / ปลายทางไม่มีในทะเบียน / ไม่ใช่ ADMIN = ไม่ย้าย', () => {
    loginAs('ADMIN')
    const store = useBookingStore()
    const a = makeBooking({ driverId: 'drv-old' })
    store.bookings.push(a)
    expect(store.relinkMissingDriverId('drv-old', target, ['drv-old', 'drv-new']).ok).toBe(false)
    expect(store.relinkMissingDriverId('drv-old', target, []).ok).toBe(false)
    loginAs('ACCOUNTING')
    expect(store.relinkMissingDriverId('drv-old', target, ['drv-new']).ok).toBe(false)
    expect(a.driverId).toBe('drv-old')
  })
})
