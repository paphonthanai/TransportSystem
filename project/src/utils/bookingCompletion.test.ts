import { describe, it, expect } from 'vitest'
import { bookingCompletionIssues, maxFuelLitersFor, STATIC_COMPLETION_CODES } from './bookingCompletion'

const complete = {
  plate: '70-1111 สระบุรี',
  driverName: 'สมชาย ใจดี',
  tripFee: 3500,
  fuelLiters: 40,
  fuelRate: 37.52,
  odometerBefore: 1000,
  odometerAfter: 1200,
}
const codes = (b: Parameters<typeof bookingCompletionIssues>[0], o?: Parameters<typeof bookingCompletionIssues>[1]) =>
  bookingCompletionIssues(b, o).map((i) => i.code)

describe('bookingCompletionIssues', () => {
  it('ข้อมูลครบ = ไม่มีปัญหา', () => {
    expect(codes(complete)).toEqual([])
  })

  it('ขาดทะเบียน/คนขับ/ค่าเที่ยว = ปัญหาแบบแก้ที่หน้าแก้ไขงาน', () => {
    const c = codes({ ...complete, plate: undefined, driverName: undefined, tripFee: 0 })
    expect(c).toEqual(['plate', 'driver', 'tripFee'])
    c.forEach((code) => expect(STATIC_COMPLETION_CODES).toContain(code))
  })

  it('คนขับระบุด้วย driverId อย่างเดียวก็ถือว่ามีคนขับ', () => {
    expect(codes({ ...complete, driverName: undefined, driverId: 'd1' })).toEqual([])
  })

  it('ต้องมีเลขไมล์สิ้นสุด และต้องมากกว่าเลขไมล์ก่อนออก', () => {
    expect(codes({ ...complete, odometerAfter: undefined })).toEqual(['odometer'])
    expect(codes({ ...complete, odometerAfter: 0 })).toEqual(['odometer'])
    expect(codes({ ...complete, odometerAfter: 1000 })).toEqual(['odometer'])
    expect(codes({ ...complete, odometerBefore: 0, odometerAfter: 50 })).toEqual([])
  })

  it('ใช้ค่าที่กรอกในไดอะล็อก (overrides) แทนค่าที่บันทึกไว้', () => {
    expect(codes({ ...complete, odometerAfter: undefined }, { odometerAfter: 1300 })).toEqual([])
  })

  it('ลิตร 0 ต้องติ๊ก "ไม่เติมน้ำมัน" ถึงจะครบ (และไม่ต้องมีเรท)', () => {
    expect(codes({ ...complete, fuelLiters: 0, fuelRate: 0 })).toEqual(['fuelLiters'])
    expect(codes({ ...complete, fuelLiters: 0, fuelRate: 0, fuelNotRefilled: true })).toEqual([])
    expect(codes({ ...complete, fuelLiters: 0, fuelRate: 0 }, { fuelNotRefilled: true })).toEqual([])
  })

  it('มีลิตรแต่ไม่มีเรทน้ำมัน = ไม่ครบ', () => {
    expect(codes({ ...complete, fuelRate: 0 })).toEqual(['fuelRate'])
  })

  it('เพดานลิตร 200 ยอมให้ถึงลิตรมาตรฐานของปลายทางถ้าสูงกว่า', () => {
    expect(maxFuelLitersFor(undefined)).toBe(200)
    expect(maxFuelLitersFor(78)).toBe(200)
    expect(maxFuelLitersFor(230)).toBe(230)
    expect(codes({ ...complete, fuelLiters: 46242 })).toEqual(['fuelCap'])
    expect(codes({ ...complete, fuelLiters: 200 })).toEqual([])
    expect(codes({ ...complete, fuelLiters: 220 }, { standardFuelLiters: 230 })).toEqual([])
    expect(codes({ ...complete, fuelLiters: 231 }, { standardFuelLiters: 230 })).toEqual(['fuelCap'])
  })

  it('ช่องน้ำมันจาก Excel อ่านไม่ได้ต้องแก้ลิตรก่อน (หรือติ๊กไม่เติม)', () => {
    const unreadable = { ...complete, fuelLiters: 0, fuelRate: 0, fuelUnreadable: true }
    expect(codes(unreadable)).toEqual(['fuelUnreadable'])
    expect(codes(unreadable, { fuelNotRefilled: true })).toEqual([])
    expect(codes(unreadable, { fuelLiters: 38 })).toEqual(['fuelRate'])
  })
})
