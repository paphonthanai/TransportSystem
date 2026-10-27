import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { useBookingStore } from './booking'
import { useDriverPaymentsStore } from './driverPayments'
import { driverPaymentRepository } from '@/repositories/driverPaymentRepository'
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

/** งานของ drv-1 รอบ ต.ค. 2026 (2569-10) — Snapshot ชื่อในงานไม่มีคำนำหน้า */
const jobOf = (overrides: Record<string, unknown> = {}) =>
  makeBooking({
    status: 'DELIVERED',
    driverId: 'drv-1',
    driverFirstName: 'สมชาย',
    driverLastName: 'ใจดี',
    driverName: 'สมชาย ใจดี',
    allowance: 500,
    finalAllowance: 500,
    shipDate: new Date(2026, 9, 5),
    ...overrides,
  })

async function setup() {
  const payments = useDriverPaymentsStore()
  await vi.waitFor(() => expect(payments.loading).toBe(false))
  const bookings = useBookingStore()
  await vi.waitFor(() => expect(bookings.bookingsLoading).toBe(false))
  return { payments, bookings }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('สถานะจ่ายรายเดือน — ชื่อมีคำนำหน้า/driverId', () => {
  it('ติ๊กจ่ายแล้วจากหน้ารายละเอียดคนขับ (ชื่อมีคำนำหน้า + driverId) → งานที่ชื่อไม่มีคำนำหน้าถูกล็อกแก้รายได้ (regression)', async () => {
    loginAs('ADMIN')
    const { payments, bookings } = await setup()
    const job = jobOf()
    bookings.bookings.push(job)
    expect(bookings.driverIncomeEditBlockedReason(job)).toBe('')

    expect((await payments.setStatus('นายสมชาย ใจดี', '2569-10', 'PAID', 'drv-1')).ok).toBe(true)

    expect(bookings.driverIncomeEditBlockedReason(job)).toContain('จ่ายรายได้')
    expect(bookings.updateDriverIncome(job.id, 900, []).ok).toBe(false)
    expect(payments.statusFor('สมชาย ใจดี', '2569-10')).toBe('PAID')
    expect(bookings.logs.some((l) => l.action.startsWith('ตั้งสถานะจ่ายรายเดือน'))).toBe(true)
  })

  it('ระเบียนเก่า (ไม่มี driverId) ชื่อมีคำนำหน้า ยังล็อกงานได้ และตั้งสถานะซ้ำจากหน้าเงินเดือน = อัปเดตระเบียนเดิม + เติม driverId ไม่สร้างซ้ำ', async () => {
    loginAs('ADMIN')
    const { payments, bookings } = await setup()
    const job = jobOf()
    bookings.bookings.push(job)
    payments.payments.push({ id: 'p-old', driverName: 'นายสมชาย ใจดี', periodLabel: '2569-10', status: 'PAID', updatedAt: new Date(2026, 9, 1) })
    expect(bookings.driverIncomeEditBlockedReason(job)).toContain('จ่ายรายได้')

    expect((await payments.setStatus('สมชาย ใจดี', '2569-10', 'UNPAID', 'drv-1')).ok).toBe(true)

    expect(payments.payments).toHaveLength(1)
    expect(payments.payments[0]).toMatchObject({ id: 'p-old', driverName: 'นายสมชาย ใจดี', driverId: 'drv-1', status: 'UNPAID' })
    expect(bookings.driverIncomeEditBlockedReason(job)).toBe('')
  })

  it('ข้อมูลขัดกัน (ชื่อตรงแต่ driverId เป็นคนอื่น และจ่ายแล้ว) = เตือน + คงล็อก ไม่ปลดอัตโนมัติ และ setStatus ไม่แตะระเบียนนั้น', async () => {
    loginAs('ADMIN')
    const { payments, bookings } = await setup()
    const job = jobOf()
    bookings.bookings.push(job)
    payments.payments.push({ id: 'p-x', driverId: 'drv-9', driverName: 'นายสมชาย ใจดี', periodLabel: '2569-10', status: 'PAID', updatedAt: new Date() })

    expect(bookings.driverPaymentConflict(job)).toContain('drv-9')
    expect(bookings.driverIncomeEditBlockedReason(job)).toContain('ล็อกไว้ก่อน')

    await payments.setStatus('นายสมชาย ใจดี', '2569-10', 'UNPAID', 'drv-1')
    expect(payments.payments.find((p) => p.id === 'p-x')?.status).toBe('PAID')
    expect(bookings.driverIncomeEditBlockedReason(job)).toContain('ล็อกไว้ก่อน')
  })

  it('driverId ตรงแต่ชื่อในงานไม่ตรง = เตือน', async () => {
    loginAs('ADMIN')
    const { payments, bookings } = await setup()
    const job = jobOf({ driverFirstName: 'สมศักดิ์', driverName: 'สมศักดิ์ ใจดี' })
    bookings.bookings.push(job)
    payments.payments.push({ id: 'p1', driverId: 'drv-1', driverName: 'นายสมชาย ใจดี', periodLabel: '2569-10', status: 'PAID', updatedAt: new Date() })
    expect(bookings.driverPaymentConflict(job)).toContain('สมศักดิ์')
    expect(bookings.updateDriverIncome(job.id, 900, []).ok).toBe(false)
  })

  it.each(['ACCOUNTING', 'DISPATCHER', 'STAFF'] as UserRole[])('%s ตั้งสถานะจ่ายรายเดือนไม่ได้ (Rules ให้เขียนเฉพาะ ADMIN)', async (role) => {
    loginAs(role)
    const { payments } = await setup()
    const create = vi.spyOn(driverPaymentRepository, 'create')
    expect((await payments.setStatus('นายสมชาย ใจดี', '2569-10', 'PAID', 'drv-1')).ok).toBe(false)
    expect(create).not.toHaveBeenCalled()
    expect(payments.canEdit()).toBe(false)
  })
})
