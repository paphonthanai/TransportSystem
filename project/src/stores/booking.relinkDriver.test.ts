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

describe('linkMissingDriverIds — งานที่ไม่ขึ้นในแอปคนขับ (ไม่มีรหัสคนขับ/รหัสไม่อยู่ในทะเบียน)', () => {
  const registry = [target, { id: 'drv-x', firstName: 'สมชาย', lastName: 'ใจดี' }]

  it('ผูกเฉพาะงานที่จัดรถแล้วยังไม่จบ และชื่อตรงทะเบียนคนเดียว (ไม่สนช่องว่าง/คำนำหน้า)', () => {
    loginAs('DISPATCHER')
    const store = useBookingStore()
    const noId = makeBooking({ status: 'ASSIGNED', driverName: 'นายแสง  ตั้งภูมิ' })
    const staleId = makeBooking({ status: 'ACCEPTED', driverId: 'drv-gone', driverName: 'สมชาย ใจดี' })
    const unknown = makeBooking({ status: 'ASSIGNED', driverName: 'ไม่มี ในทะเบียน' })
    const done = makeBooking({ status: 'DELIVERED', driverName: 'แสง ตั้งภูมิ' })
    const ok = makeBooking({ status: 'ASSIGNED', driverId: 'drv-x', driverName: 'สมชาย ใจดี' })
    store.bookings.push(noId, staleId, unknown, done, ok)

    expect(store.bookingsMissingDriverLink(registry).map((p) => p.booking.id).sort()).toEqual([noId.id, staleId.id, unknown.id].sort())
    expect(store.linkMissingDriverIds(registry)).toEqual({ ok: true, count: 2 })
    expect(noId.driverId).toBe('drv-new')
    expect(staleId.driverId).toBe('drv-x')
    expect(unknown.driverId).toBeUndefined()
    expect(done.driverId).toBeUndefined()
  })

  it('เสมียน (STAFF) ผูกไม่ได้', () => {
    loginAs('STAFF')
    const store = useBookingStore()
    const b = makeBooking({ status: 'ASSIGNED', driverName: 'แสง ตั้งภูมิ' })
    store.bookings.push(b)
    expect(store.linkMissingDriverIds(registry).ok).toBe(false)
    expect(b.driverId).toBeUndefined()
  })
})
