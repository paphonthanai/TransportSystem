import { describe, it, expect } from 'vitest'
import { documentPeriodLabel, inPayrollRange, monthRange, payrollLineDateKey, payrollLineInRange, payrollRangeFileKey, payrollRangeFromQuery, payrollRangeLabel, wholeMonthOf } from './payrollRange'

describe('ช่วงวันของรอบเงินเดือน', () => {
  it('monthRange/wholeMonthOf รู้จักเดือนเต็ม รวมกุมภาพันธ์', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(wholeMonthOf({ from: '2026-10-01', to: '2026-10-31' })).toBe('2026-10')
    expect(wholeMonthOf({ from: '2026-10-01', to: '2026-10-15' })).toBeNull()
    expect(wholeMonthOf({ from: '2026-10-01', to: '2026-11-30' })).toBeNull()
  })

  it('inPayrollRange รวมทั้งวันแรกและวันสุดท้ายทั้งวัน', () => {
    const range = { from: '2026-10-01', to: '2026-10-15' }
    expect(inPayrollRange(new Date(2026, 9, 1, 0, 0), range)).toBe(true)
    expect(inPayrollRange(new Date(2026, 9, 15, 23, 59), range)).toBe(true)
    expect(inPayrollRange(new Date(2026, 9, 16, 0, 0), range)).toBe(false)
    expect(inPayrollRange(undefined, range)).toBe(false)
  })

  it('ป้าย/ชื่อไฟล์ แยกเต็มเดือนกับช่วงวัน', () => {
    expect(payrollRangeLabel({ from: '2026-10-01', to: '2026-10-31' })).toBe('ตุลาคม 2569')
    expect(payrollRangeLabel({ from: '2026-10-01', to: '2026-10-15' })).toBe('1 ต.ค. 2569 - 15 ต.ค. 2569')
    expect(payrollRangeFileKey({ from: '2026-10-01', to: '2026-10-31' })).toBe('2026-10')
    expect(payrollRangeFileKey({ from: '2026-10-01', to: '2026-10-15' })).toBe('2026-10-01_2026-10-15')
  })

  it('เอกสารรายเดือนเดิมแสดงชื่อเดือน เอกสารช่วงวันแสดงช่วงวัน', () => {
    expect(documentPeriodLabel({ period: '2026-10' })).toBe('ตุลาคม 2569')
    expect(documentPeriodLabel({ period: '2026-10', periodFrom: '2026-10-16', periodTo: '2026-10-31' })).toBe('16 ต.ค. 2569 - 31 ต.ค. 2569')
  })

  it('query: ?from&to ก่อน, รองรับลิงก์เดิม ?period', () => {
    expect(payrollRangeFromQuery({ from: '2026-10-01', to: '2026-10-15' })).toEqual({ from: '2026-10-01', to: '2026-10-15' })
    expect(payrollRangeFromQuery({ period: '2026-09' })).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })
})

describe('รายการหัก/รายได้อื่นๆ นับตามวันที่รายการ', () => {
  const line = (date: Date | undefined, periodLabel = '2569-10') => ({ periodLabel, date, createdAt: new Date(2026, 9, 20) })
  const first = { from: '2026-10-01', to: '2026-10-15' }
  const second = { from: '2026-10-16', to: '2026-10-31' }
  const whole = { from: '2026-10-01', to: '2026-10-31' }

  it('อยู่รอบเดียว ตัด 1-15 / 16-31 แล้วไม่นับซ้ำ', () => {
    const l = line(new Date(2026, 9, 5))
    expect(payrollLineInRange(l, first)).toBe(true)
    expect(payrollLineInRange(l, second)).toBe(false)
  })

  it('ไม่มีวันที่ใช้วันที่บันทึก', () => {
    expect(payrollLineDateKey(line(undefined))).toBe('2026-10-20')
  })

  it('วันที่นอกเดือนของรอบบัญชี นับที่ต้น/ท้ายเดือนนั้น เต็มเดือนจึงเท่าเดิม', () => {
    const late = line(new Date(2026, 10, 5))
    expect(payrollLineDateKey(late)).toBe('2026-10-31')
    expect(payrollLineInRange(late, whole)).toBe(true)
    expect(payrollLineInRange(late, second)).toBe(true)
    expect(payrollLineInRange(late, { from: '2026-11-01', to: '2026-11-15' })).toBe(false)
    expect(payrollLineDateKey(line(new Date(2026, 8, 28)))).toBe('2026-10-01')
  })
})
