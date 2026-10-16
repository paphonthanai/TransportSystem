import { describe, it, expect } from 'vitest'
import { isBookingPaidToDriver, payrollDriverKeyOf, payrollPeriodLabelOf, type DriverPaidLookup } from './driverPaid'
import { makeBooking } from '../../tests/fixtures/booking'

const lookup = (docs: Record<string, 'PAID' | 'UNPAID'> = {}, monthly: Record<string, 'PAID'> = {}): DriverPaidLookup => ({
  payrollDocStatus: (id) => docs[id],
  monthlyStatus: (driver, period) => monthly[`${driver}|${period}`] ?? 'UNPAID',
})

describe('driverPaid', () => {
  it('รอบบัญชีเป็น พ.ศ. จากวันที่ส่ง (ไม่มีใช้วันที่จบงาน) และชื่อใช้ snapshot ก่อน', () => {
    expect(payrollPeriodLabelOf({ shipDate: new Date(2026, 9, 5) })).toBe('2569-10')
    expect(payrollPeriodLabelOf({ completedAt: new Date(2026, 0, 31) })).toBe('2569-01')
    expect(payrollPeriodLabelOf({})).toBeUndefined()
    expect(payrollDriverKeyOf({ driverFirstName: 'สมชาย', driverLastName: 'ใจดี', driverName: 'ชาย' })).toBe('สมชาย ใจดี')
    expect(payrollDriverKeyOf({ driverName: 'ชาย' })).toBe('ชาย')
  })

  it('จ่ายแล้วเมื่อเอกสารรายได้จ่ายแล้ว หรือรอบเดือนของคนขับติ๊กจ่ายแล้ว; เอกสารยังไม่จ่าย/งานยังไม่จบ = ยังไม่จ่าย', () => {
    const base = { status: 'DELIVERED' as const, shipDate: new Date(2026, 9, 5), driverName: 'สมชาย ใจดี' }
    expect(isBookingPaidToDriver(makeBooking({ ...base, driverPayrollDocId: 'a' }), lookup({ a: 'PAID' }))).toBe(true)
    expect(isBookingPaidToDriver(makeBooking({ ...base, driverPayrollDocId: 'a' }), lookup({ a: 'UNPAID' }))).toBe(false)
    expect(isBookingPaidToDriver(makeBooking(base), lookup({}, { 'สมชาย ใจดี|2569-10': 'PAID' }))).toBe(true)
    expect(isBookingPaidToDriver(makeBooking(base), lookup({}, { 'สมชาย ใจดี|2569-09': 'PAID' }))).toBe(false)
    expect(isBookingPaidToDriver(makeBooking({ ...base, status: 'IN_TRANSIT' }), lookup({}, { 'สมชาย ใจดี|2569-10': 'PAID' }))).toBe(false)
  })
})
