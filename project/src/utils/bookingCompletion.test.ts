import { describe, it, expect } from 'vitest'
import { bookingCompletionIssues, isUnpricedLaterTrip, maxFuelLitersFor, STATIC_COMPLETION_CODES } from './bookingCompletion'

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

  it('เที่ยวที่ 2 ขึ้นไป ค่าเที่ยว 0 และเบี้ยเลี้ยง 0 ทั้งคู่ = จบ/ยืนยันได้; เที่ยวแรกหรือไม่รู้เลขเที่ยว = ยังต้องมีค่าเที่ยว', () => {
    const unpriced = { ...complete, tripFee: 0, allowance: 0 }
    expect(codes(unpriced, { tripNumber: 2 })).toEqual([])
    expect(codes(unpriced, { tripNumber: 3 })).toEqual([])
    expect(codes({ ...unpriced, tripSequence: 2 })).toEqual([]) // ไม่ส่ง tripNumber = ใช้ tripSequence ของงาน
    expect(codes(unpriced, { tripNumber: 1 })).toEqual(['tripFee'])
    expect(codes(unpriced)).toEqual(['tripFee'])
  })

  it('ข้อยกเว้นเที่ยวหลังใช้เฉพาะเมื่อ 0 ทั้งคู่ — ค่าเที่ยว 0 แต่มีเบี้ยเลี้ยง ยังจบไม่ได้; ทะเบียน/คนขับยังต้องมีเสมอ', () => {
    expect(codes({ ...complete, tripFee: 0, allowance: 750 }, { tripNumber: 2 })).toEqual(['tripFee'])
    expect(codes({ ...complete, tripFee: 0, allowance: 0, plate: undefined, driverName: undefined }, { tripNumber: 2 })).toEqual(['plate', 'driver'])
    expect(isUnpricedLaterTrip({ tripFee: 0, allowance: 0 }, 2)).toBe(true)
    expect(isUnpricedLaterTrip({ tripFee: 3500, allowance: 0 }, 2)).toBe(false)
  })

  it('คนขับระบุด้วย driverId อย่างเดียวก็ถือว่ามีคนขับ', () => {
    expect(codes({ ...complete, driverName: undefined, driverId: 'd1' })).toEqual([])
  })

  it('เลขไมล์สิ้นสุดไม่บังคับ แต่ถ้ากรอกต้องมากกว่าเลขไมล์ก่อนออก', () => {
    expect(codes({ ...complete, odometerAfter: undefined })).toEqual([])
    expect(codes({ ...complete, odometerAfter: 0 })).toEqual([])
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
