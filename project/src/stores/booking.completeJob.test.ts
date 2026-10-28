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

describe('updateCompletedAt — แก้วันที่ส่งของสำเร็จในหน้ารายละเอียดงาน', () => {
  it('งานที่จบแล้ว แก้เป็นวันย้อนหลังได้', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, status: 'DELIVERED', completedAt: new Date(2026, 9, 27, 9, 0) })
    store.bookings.push(b)
    const picked = new Date(2026, 9, 26, 9, 0)

    expect(store.updateCompletedAt(b.id, picked).ok).toBe(true)
    expect(b.completedAt).toEqual(picked)
  })

  it('วันล่วงหน้า = ไม่บันทึก', () => {
    const store = useBookingStore()
    const original = new Date(2026, 9, 27, 9, 0)
    const b = makeBooking({ ...ready, status: 'DELIVERED', completedAt: original })
    store.bookings.push(b)

    expect(store.updateCompletedAt(b.id, new Date(Date.now() + 3 * 86400000)).ok).toBe(false)
    expect(b.completedAt).toEqual(original)
  })

  it('งานที่ยังไม่จบ = แก้ไม่ได้', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready })
    store.bookings.push(b)

    expect(store.updateCompletedAt(b.id, new Date(2026, 9, 26)).ok).toBe(false)
    expect(b.completedAt).toBeUndefined()
  })
})

describe('ออฟฟิศจบงานเองแต่มีรูป POD จากคนขับ = ต้องตรวจ POD ก่อนวางบิล', () => {
  it('มีรูป POD อย่างน้อย 1 จุด → podReviewStatus = PENDING_REVIEW', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, items: [makeJobItem({ deliveryStatus: 'DELIVERED', podImage: 'pod-a' })] })
    store.bookings.push(b)

    expect(store.completeJob(b.id, [], 1250).ok).toBe(true)
    expect(b.status).toBe('DELIVERED')
    expect(b.podReviewStatus).toBe('PENDING_REVIEW')
  })

  it('ไม่มีรูป POD เลย → ถือว่ายืนยันแล้วเหมือนเดิม (podReviewStatus ว่าง)', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, items: [makeJobItem()] })
    store.bookings.push(b)

    store.completeJob(b.id, [], 1250)
    expect(b.podReviewStatus).toBeUndefined()
  })

  it('POD ที่อนุมัติไปแล้วคงไว้ ไม่ต้องตรวจซ้ำ', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...ready, podReviewStatus: 'APPROVED', items: [makeJobItem({ podImage: 'pod-a' })] })
    store.bookings.push(b)

    store.completeJob(b.id, [], 1250)
    expect(b.podReviewStatus).toBe('APPROVED')
  })
})

describe('requestPodReview — งานเก่าที่ออฟฟิศปิดเองแต่มี POD (ตรวจสอบ POD = "-")', () => {
  const legacy = { ...ready, status: 'DELIVERED' as const, completedAt: new Date(2026, 9, 27), items: [makeJobItem({ deliveryStatus: 'DELIVERED', podImage: 'pod-a' })] }

  it('ยังไม่วางบิล → ส่งเข้าขั้นตรวจ POD ได้', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...legacy })
    store.bookings.push(b)

    expect(store.canRequestPodReview(b)).toBe(true)
    expect(store.requestPodReview(b.id)).toBe(true)
    expect(b.podReviewStatus).toBe('PENDING_REVIEW')
  })

  it('วางบิลแล้ว / ไม่มี POD / ยืนยันจบงานแล้ว → ไม่แตะ', () => {
    const store = useBookingStore()
    const billed = makeBooking({ ...legacy, billingNoteDocId: 'doc-1' })
    const noPod = makeBooking({ ...legacy, items: [makeJobItem({ deliveryStatus: 'DELIVERED' })] })
    const confirmedJob = makeBooking({ ...legacy, completionConfirmedAt: new Date() })
    store.bookings.push(billed, noPod, confirmedJob)

    for (const b of [billed, noPod, confirmedJob]) {
      expect(store.requestPodReview(b.id)).toBe(false)
      expect(b.podReviewStatus).toBeUndefined()
    }
  })
})
