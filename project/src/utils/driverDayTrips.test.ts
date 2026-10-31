import { describe, it, expect } from 'vitest'
import { driverDayGroup, driverTripNumber, isSameDriver, tripNumberChoices, MIN_TRIP_CHOICES } from './driverDayTrips'
import { makeBooking } from '../../tests/fixtures/booking'

const day = new Date(2026, 9, 30, 8)

describe('isSameDriver — คนขับคนเดียวกันแม้ชื่อในงานพิมพ์ไม่เหมือนกันเป๊ะ', () => {
  it('ช่องว่างซ้อน/คำนำหน้า/ช่องว่างท้าย = คนเดียวกัน', () => {
    const a = makeBooking({ driverName: 'ณัฐดนัย กอบทรัพย์' })
    expect(isSameDriver(a, makeBooking({ driverName: 'ณัฐดนัย  กอบทรัพย์' }))).toBe(true)
    expect(isSameDriver(a, makeBooking({ driverName: 'นายณัฐดนัย กอบทรัพย์ ' }))).toBe(true)
    expect(isSameDriver(a, makeBooking({ driverName: 'ณัฐดนัย กอบทอง' }))).toBe(false)
  })

  it('มี driverId ทั้งคู่ = ใช้ driverId ตัดสิน', () => {
    expect(isSameDriver(makeBooking({ driverId: 'd1', driverName: 'ก ข' }), makeBooking({ driverId: 'd1', driverName: 'ค ง' }))).toBe(true)
    expect(isSameDriver(makeBooking({ driverId: 'd1', driverName: 'ก ข' }), makeBooking({ driverId: 'd2', driverName: 'ก ข' }))).toBe(false)
  })
})

describe('driverDayGroup / tripNumberChoices', () => {
  const a = makeBooking({ driverName: 'ณัฐดนัย กอบทรัพย์', shipDate: day })
  const b = makeBooking({ driverName: 'ณัฐดนัย  กอบทรัพย์', shipDate: day }) // ช่องว่างซ้อน (ข้อมูลเก่า)
  const c = makeBooking({ driverName: 'ณัฐดนัย กอบทรัพย์', shipDate: new Date(2026, 9, 31) }) // คนละวัน
  const all = [a, b, c]

  it('งานชื่อเดียวกันวันเดียวกันอยู่กลุ่มเดียวกัน (ไม่ขึ้นกับช่องว่างในชื่อ) และไม่รวมงานคนละวัน', () => {
    expect(driverDayGroup(a, all).map((x) => x.id).sort()).toEqual([a.id, b.id].sort())
    expect(driverDayGroup(b, all).map((x) => x.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('ตัวเลือกเที่ยวที่ 1-4 เท่ากันทุกงาน (วันละไม่เกิน 4 เที่ยว) งานเก่าที่ตั้งเลขเกิน 4 ไว้ยังเห็นเลขเดิม', () => {
    expect(tripNumberChoices(a)).toEqual([1, 2, 3, 4])
    expect(tripNumberChoices(b)).toEqual([1, 2, 3, 4])
    expect(tripNumberChoices(c)).toHaveLength(MIN_TRIP_CHOICES)
    expect(tripNumberChoices(makeBooking({ tripSequence: 6 }))).toEqual([1, 2, 3, 4, 6])
  })
})

describe('driverTripNumber — ใช้เลขเที่ยวที่บันทึกไว้ (จากไฟล์ import/ที่เลือก) ตรงๆ', () => {
  it('งานที่มี tripSequence แสดงเลขนั้นเสมอ ไม่ว่าจะมีงานอื่นกี่งาน; งานไม่มีเลขนับตามลำดับเวลาจ่ายงาน', () => {
    const a = makeBooking({ driverName: 'ณัฐดนัย กอบทรัพย์', shipDate: day, tripSequence: 3 })
    const b = makeBooking({ driverName: 'ณัฐดนัย กอบทรัพย์', shipDate: day, tripSequence: 1 })
    const c = makeBooking({ driverName: 'ณัฐดนัย  กอบทรัพย์', shipDate: day, dispatchedAt: new Date(2026, 9, 30, 12) })
    const all = [a, b, c]
    expect(driverTripNumber(a, all)).toBe(3)
    expect(driverTripNumber(b, all)).toBe(1)
    expect(driverTripNumber(c, all)).toBe(3)
  })
})

describe('เลขเที่ยวที่ไม่มีเลข — ใช้วันเป็นตัวตั้ง นับต่อจากงานที่มีเลข', () => {
  it('มีเลข 1,2 แล้ว งานไม่มีเลขนับเป็น 3,4 เรียงตามเวลาลงสินค้า; คนละวันเริ่ม 1 ใหม่', () => {
    const n1 = makeBooking({ driverName: 'ก ข', shipDate: day, tripSequence: 1 })
    const n2 = makeBooking({ driverName: 'ก ข', shipDate: day, tripSequence: 2 })
    const late = makeBooking({ driverName: 'ก ข', shipDate: day, loadingTime: '13:00' })
    const early = makeBooking({ driverName: 'ก  ข', shipDate: day, loadingTime: '9:30' })
    const nextDay = makeBooking({ driverName: 'ก ข', shipDate: new Date(2026, 9, 31) })
    const all = [late, n2, early, n1, nextDay]
    expect(driverTripNumber(early, all)).toBe(3)
    expect(driverTripNumber(late, all)).toBe(4)
    expect(driverTripNumber(nextDay, all)).toBe(1)
  })
})
