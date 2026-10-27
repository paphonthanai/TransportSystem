import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useFuelRateStore } from './fuelRates'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

const ready = {
  status: 'IN_TRANSIT' as const,
  plate: '70-1111 สระบุรี',
  driverName: 'สมชาย ใจดี',
  tripFee: 3500,
  allowance: 750,
  fuelLiters: 40,
  fuelRate: 37.52,
  odometerBefore: 1000,
  items: [makeJobItem()],
}

describe('completeJob — ข้อมูลไม่ครบจบงานไม่ได้', () => {
  it('ไม่มีเลขไมล์สิ้นสุดก็จบงานได้ (เลขไมล์ไม่บังคับ)', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, items: [makeJobItem()] })
    store.bookings.push(b)

    const result = store.completeJob(b.id, [], undefined)

    expect(result.ok).toBe(true)
    expect(b.status).toBe('DELIVERED')
    expect(b.odometerAfter).toBeUndefined()
  })

  it('เลขไมล์สิ้นสุดที่กรอกแต่ไม่มากกว่าเลขไมล์ก่อนออก = ไม่จบงาน และไม่แตะข้อมูลงาน', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready })
    store.bookings.push(b)

    const result = store.completeJob(b.id, [], 900)

    expect(result.ok).toBe(false)
    expect(result.issues.map((i) => i.code)).toEqual(['odometer'])
    expect(b.status).toBe('IN_TRANSIT')
    expect(b.completedAt).toBeUndefined()
    expect(b.items[0].deliveryStatus).not.toBe('DELIVERED')
  })

  it('ข้อมูลครบ + กรอกเลขไมล์ = จบงานได้ เบี้ยเลี้ยง 0 ก็ครบ', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, allowance: 0 })
    store.bookings.push(b)

    const result = store.completeJob(b.id, [], 1250)

    expect(result.ok).toBe(true)
    expect(b.status).toBe('DELIVERED')
    expect(b.odometerAfter).toBe(1250)
  })

  it('ลิตร 0 ต้องติ๊กไม่เติมน้ำมัน — ติ๊กแล้วบันทึก fuelNotRefilled และจบงานได้', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, fuelLiters: 0, fuelRate: 0 })
    store.bookings.push(b)

    const blocked = store.completeJob(b.id, [], 1250)
    expect(blocked.ok).toBe(false)
    expect(blocked.issues.map((i) => i.code)).toEqual(['fuelLiters'])

    const done = store.completeJob(b.id, [], 1250, { notRefilled: true })
    expect(done.ok).toBe(true)
    expect(b.fuelNotRefilled).toBe(true)
    expect(b.fuelLiters).toBe(0)
    expect(b.status).toBe('DELIVERED')
  })

  it('กรอกลิตรในขั้นจบงาน = บันทึกลิตรให้ และต้องมีเรทน้ำมัน', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, fuelLiters: 0, fuelRate: 0 })
    store.bookings.push(b)

    expect(store.completeJob(b.id, [], 1250, { liters: 38 }).issues.map((i) => i.code)).toEqual(['fuelRate'])
    b.fuelRate = 37.52
    expect(store.completeJob(b.id, [], 1250, { liters: 38 }).ok).toBe(true)
    expect(b.fuelLiters).toBe(38)
  })

  it('ไม่มีทะเบียน/คนขับ/ค่าเที่ยว = จบงานไม่ได้', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, plate: undefined, driverName: undefined, tripFee: 0 })
    store.bookings.push(b)

    const result = store.completeJob(b.id, [], 1250)
    expect(result.issues.map((i) => i.code)).toEqual(['plate', 'driver', 'tripFee'])
  })
})

describe('เพดานลิตรน้ำมัน 200 (ยอมให้ถึงลิตรมาตรฐานของปลายทางถ้าสูงกว่า)', () => {
  it('updateBookingFull ตัดลิตรที่เกินเพดานลงมา', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready })
    store.bookings.push(b)

    store.updateBookingFull(b.id, { fuelLiters: 46242 })

    expect(b.fuelLiters).toBe(200)
  })

  it('ปลายทางที่ลิตรมาตรฐานสูงกว่า 200 (เช่น เชียงใหม่ 230) ใช้ได้ถึงค่ามาตรฐาน', () => {
    const fuel = useFuelRateStore()
    fuel.settings.rates = [{ province: 'เชียงใหม่', district: 'พาเลท 3 จุด', liters: 230 }]
    const store = useBookingStore()
    const b = makeBooking({ ...ready, items: [makeJobItem({ province: 'เชียงใหม่', district: 'พาเลท 3 จุด' })] })
    store.bookings.push(b)

    store.updateBookingFull(b.id, { fuelLiters: 225 })
    expect(b.fuelLiters).toBe(225)
    store.updateBookingFull(b.id, { fuelLiters: 500 })
    expect(b.fuelLiters).toBe(230)
  })

  it('ติ๊กไม่เติมน้ำมันในหน้าแก้ไข = ลิตร 0 และยกเลิกการติ๊กเมื่อใส่ลิตรใหม่', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready })
    store.bookings.push(b)

    store.updateBookingFull(b.id, { fuelNotRefilled: true })
    expect(b.fuelNotRefilled).toBe(true)
    expect(b.fuelLiters).toBe(0)

    store.updateBookingFull(b.id, { fuelLiters: 30 })
    expect(b.fuelNotRefilled).toBeUndefined()
    expect(b.fuelLiters).toBe(30)
  })
})

describe('วันที่ส่งของสำเร็จ (เลือกได้ตอนจบงาน)', () => {
  it('ออฟฟิศเลือกวันย้อนหลัง = completedAt และ deliveredAt ของจุดที่ยังไม่ส่งเป็นวันนั้น', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, items: [makeJobItem()] })
    store.bookings.push(b)
    const picked = new Date(2026, 9, 26, 10, 0)

    expect(store.completeJob(b.id, [], 1250, undefined, picked).ok).toBe(true)
    expect(b.completedAt).toEqual(picked)
    expect(b.items[0].deliveredAt).toEqual(picked)
  })

  it('วันในอนาคต = ใช้เวลาปัจจุบันแทน', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready })
    store.bookings.push(b)
    const before = Date.now()

    store.completeJob(b.id, [], 1250, undefined, new Date(Date.now() + 3 * 86400000))
    expect(new Date(b.completedAt!).getTime()).toBeGreaterThanOrEqual(before)
    expect(new Date(b.completedAt!).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('คนขับเลือกวันย้อนหลังตอนดำเนินการเสร็จสิ้น', () => {
    const store = useBookingStore()
    const b = makeBooking({
      status: 'DELIVERING',
      items: [makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt: new Date(2026, 9, 26), podImage: 'pod-a' })],
    })
    store.bookings.push(b)
    const picked = new Date(2026, 9, 26, 18, 0)

    store.finishDriverJob(b.id, undefined, picked)
    expect(b.status).toBe('DELIVERED')
    expect(b.completedAt).toEqual(picked)
  })
})
