import { describe, it, expect } from 'vitest'
import { rangeFor, inRange, toDateInputValue, fromDateInputValue } from './dateRanges'

// พุธ 14 ต.ค. 2026
const now = new Date(2026, 9, 14, 15, 30)

describe('rangeFor', () => {
  it('สัปดาห์นี้ = จันทร์ 12 – อาทิตย์ 18 ต.ค.', () => {
    const r = rangeFor('week', now)
    expect(r.from).toEqual(new Date(2026, 9, 12))
    expect(r.to).toEqual(new Date(2026, 9, 18, 23, 59, 59, 999))
  })

  it('วันอาทิตย์นับเป็นสัปดาห์ที่เริ่มวันจันทร์ก่อนหน้า', () => {
    const r = rangeFor('week', new Date(2026, 9, 18, 9))
    expect(r.from).toEqual(new Date(2026, 9, 12))
  })

  it('เดือนนี้ / ไตรมาสนี้ / ปีนี้', () => {
    expect(rangeFor('month', now)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59, 999) })
    expect(rangeFor('quarter', now)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 11, 31, 23, 59, 59, 999) })
    expect(rangeFor('year', now)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31, 23, 59, 59, 999) })
  })

  it('ว่าง/ทั้งหมด = ไม่จำกัด', () => {
    expect(rangeFor('', now)).toEqual({ from: null, to: null })
    expect(rangeFor('all', now)).toEqual({ from: null, to: null })
  })
})

describe('inRange', () => {
  const week = rangeFor('week', now)
  it('นับงานที่เสร็จภายในช่วง รวมวันสุดท้ายทั้งวัน', () => {
    expect(inRange({ completedAt: new Date(2026, 9, 18, 22, 0) }, week)).toBe(true)
    expect(inRange({ completedAt: new Date(2026, 9, 11, 23, 0) }, week)).toBe(false)
    expect(inRange({ completedAt: new Date(2026, 9, 19, 0, 1) }, week)).toBe(false)
  })

  it('ช่วงไม่จำกัดผ่านทุกงาน แม้ยังไม่มีวันที่เสร็จ แต่ช่วงที่กำหนดไม่ผ่านงานที่ไม่มีวันที่เสร็จ', () => {
    expect(inRange({}, { from: null, to: null })).toBe(true)
    expect(inRange({}, week)).toBe(false)
  })

  it('ช่วงกำหนดเองที่มีแค่ด้านเดียว', () => {
    const from = new Date(2026, 8, 1)
    expect(inRange({ completedAt: new Date(2026, 9, 1) }, { from, to: null })).toBe(true)
    expect(inRange({ completedAt: new Date(2026, 7, 31) }, { from, to: null })).toBe(false)
  })
})

describe('toDateInputValue / fromDateInputValue', () => {
  it('แปลงเป็น YYYY-MM-DD ตามเวลาท้องถิ่น', () => {
    expect(toDateInputValue(new Date(2026, 9, 14, 23, 59))).toBe('2026-10-14')
  })

  it('เลือกวันนี้ = เวลาปัจจุบันตรงๆ', () => {
    expect(fromDateInputValue('2026-10-14', now)).toBe(now)
  })

  it('เลือกวันย้อนหลัง = วันนั้น เวลาเดียวกับตอนนี้', () => {
    expect(fromDateInputValue('2026-10-12', now)).toEqual(new Date(2026, 9, 12, 15, 30, 0))
  })

  it('วันในอนาคต / รูปแบบผิด / วันไม่มีจริง = null', () => {
    expect(fromDateInputValue('2026-10-15', now)).toBeNull()
    expect(fromDateInputValue('', now)).toBeNull()
    expect(fromDateInputValue('2026-02-30', now)).toBeNull()
  })
})
