import { describe, it, expect } from 'vitest'
import { isBookingPaidToDriver, monthlyPaidCheck, payrollDriverKeyOf, payrollPeriodLabelOf, type DriverPaidLookup, type MonthlyPaymentLike } from './driverPaid'
import { makeBooking } from '../../tests/fixtures/booking'

const lookup = (docs: Record<string, 'PAID' | 'UNPAID'> = {}, monthly: Record<string, MonthlyPaymentLike[]> = {}): DriverPaidLookup => ({
  payrollDocStatus: (id) => docs[id],
  monthlyRecords: (period) => monthly[period] ?? [],
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
    const paidOct = { '2569-10': [{ driverName: 'สมชาย ใจดี', status: 'PAID' as const }] }
    expect(isBookingPaidToDriver(makeBooking({ ...base, driverPayrollDocId: 'a' }), lookup({ a: 'PAID' }))).toBe(true)
    expect(isBookingPaidToDriver(makeBooking({ ...base, driverPayrollDocId: 'a' }), lookup({ a: 'UNPAID' }))).toBe(false)
    expect(isBookingPaidToDriver(makeBooking(base), lookup({}, paidOct))).toBe(true)
    expect(isBookingPaidToDriver(makeBooking(base), lookup({}, { '2569-09': paidOct['2569-10'] }))).toBe(false)
    expect(isBookingPaidToDriver(makeBooking({ ...base, status: 'IN_TRANSIT' }), lookup({}, paidOct))).toBe(false)
  })

  describe('monthlyPaidCheck — driverId เป็นหลัก ตรวจชื่อประกอบ', () => {
    const job = { driverId: 'drv-1', driverFirstName: 'สมชาย', driverLastName: 'ใจดี' }

    it('ระเบียนเก่า (ไม่มี driverId) ชื่อมีคำนำหน้า = จับคู่ได้ ล็อกจ่ายแล้ว (regression: เดิมเทียบตรงตัวจึงไม่ล็อก)', () => {
      expect(monthlyPaidCheck(job, [{ driverName: 'นายสมชาย ใจดี', status: 'PAID' }])).toEqual({ paid: true, conflict: '' })
      expect(monthlyPaidCheck({ driverName: 'สมชาย ใจดี' }, [{ driverName: 'นายสมชาย  ใจดี', status: 'PAID' }]).paid).toBe(true)
    })

    it('ระเบียนใหม่มี driverId ตรง + ชื่อตรง = ใช้สถานะล่าสุด', () => {
      const records: MonthlyPaymentLike[] = [
        { driverId: 'drv-1', driverName: 'นายสมชาย ใจดี', status: 'UNPAID', updatedAt: new Date(2026, 9, 20) },
        { driverName: 'สมชาย ใจดี', status: 'PAID', updatedAt: new Date(2026, 9, 10) },
      ]
      expect(monthlyPaidCheck(job, records)).toEqual({ paid: false, conflict: '' })
    })

    it('driverId ตรงแต่ชื่อไม่ตรง = เตือน และถ้าจ่ายแล้วคงล็อกไว้ ไม่ปลดอัตโนมัติ', () => {
      const result = monthlyPaidCheck(job, [{ driverId: 'drv-1', driverName: 'นายสมศักดิ์ ใจดี', status: 'PAID' }])
      expect(result.paid).toBe(true)
      expect(result.conflict).toContain('สมศักดิ์')
    })

    it('ชื่อตรงแต่ driverId เป็นคนอื่น = เตือน (จ่ายแล้วยังล็อก / ยังไม่จ่ายไม่ล็อก)', () => {
      const paid = monthlyPaidCheck(job, [{ driverId: 'drv-9', driverName: 'นายสมชาย ใจดี', status: 'PAID' }])
      expect(paid).toMatchObject({ paid: true })
      expect(paid.conflict).toContain('drv-9')
      const unpaid = monthlyPaidCheck(job, [{ driverId: 'drv-9', driverName: 'นายสมชาย ใจดี', status: 'UNPAID' }])
      expect(unpaid.paid).toBe(false)
      expect(unpaid.conflict).not.toBe('')
    })

    it('คนละคน (ทั้ง id และชื่อไม่ตรง) = ไม่เกี่ยวข้อง', () => {
      expect(monthlyPaidCheck(job, [{ driverId: 'drv-2', driverName: 'นายสมศักดิ์ รักดี', status: 'PAID' }])).toEqual({ paid: false, conflict: '' })
    })
  })
})
