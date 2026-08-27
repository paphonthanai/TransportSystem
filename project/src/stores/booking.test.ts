import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import { nextPickup, nextDelivery } from '../utils/driverJobs'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('pickupJobItem', () => {
  it('marks the item PICKED_UP and moves the booking to LOADED once every item is picked up', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a' })
    const itemB = makeJobItem({ id: 'b' })
    const booking = makeBooking({ status: 'LOADING', items: [itemA, itemB] })
    store.bookings.push(booking)

    store.pickupJobItem(booking.id, 'a', 'คนขับทดสอบ')
    expect(booking.items.find((i) => i.id === 'a')?.pickupStatus).toBe('PICKED_UP')
    expect(booking.status).toBe('LOADING') // ยังไม่ครบทุกรายการ

    store.pickupJobItem(booking.id, 'b', 'คนขับทดสอบ')
    expect(booking.items.find((i) => i.id === 'b')?.pickupStatus).toBe('PICKED_UP')
    expect(booking.status).toBe('LOADED') // ครบทุกรายการแล้ว เลื่อนสถานะอัตโนมัติ
  })
})

describe('happy-path state machine: ACCEPTED -> FUEL_RECEIVED -> LOADING -> LOADED -> IN_TRANSIT', () => {
  it('walks through markFuelReceived -> startLoading -> startTransit in order, refusing out-of-order calls', () => {
    const store = useBookingStore()
    const booking = makeBooking({ status: 'ACCEPTED', items: [makeJobItem()] })
    store.bookings.push(booking)

    store.startLoading(booking.id) // ผิดลำดับ (ยังไม่ได้รับน้ำมัน) — ต้องไม่ขยับ
    expect(booking.status).toBe('ACCEPTED')

    store.markFuelReceived(booking.id)
    expect(booking.status).toBe('FUEL_RECEIVED')
    expect(booking.fuelReceivedAt).toBeInstanceOf(Date)

    store.startLoading(booking.id)
    expect(booking.status).toBe('LOADING')

    store.pickupJobItem(booking.id, booking.items[0].id, 'คนขับทดสอบ')
    expect(booking.status).toBe('LOADED')

    store.startTransit(booking.id)
    expect(booking.status).toBe('IN_TRANSIT')
    expect(booking.transitStartedAt).toBeInstanceOf(Date)
  })
})

describe('deliverJobItem', () => {
  it('moves IN_TRANSIT to DELIVERING on the first delivered item and records POD/recipient/time', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a' })
    const booking = makeBooking({ status: 'IN_TRANSIT', items: [itemA] })
    store.bookings.push(booking)

    store.deliverJobItem(booking.id, 'a', 'https://storage/pod-a.jpg', 'สมชาย')

    const item = booking.items.find((i) => i.id === 'a')!
    expect(item.deliveryStatus).toBe('DELIVERED')
    expect(item.podImage).toBe('https://storage/pod-a.jpg')
    expect(item.deliveredBy).toBe('สมชาย')
    expect(item.deliveredAt).toBeInstanceOf(Date)
    expect(booking.status).toBe('DELIVERING')
  })

  /** Test — POD/Delivery Workflow: DELIVERED ต้องไม่บังคับมี POD ก่อนเลย (ดู utils/podImage.ts — ย้ายจาก Firebase
   *  Storage มาเป็น Base64 ฝั่ง Frontend, POD กลายเป็นขั้นตอนแยกที่แนบทีหลังได้ ไม่ใช่เงื่อนไขก่อน DELIVERED อีกต่อไป) */
  it('marks the item DELIVERED with no POD at all when podImage is undefined', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a' })
    const booking = makeBooking({ status: 'IN_TRANSIT', items: [itemA] })
    store.bookings.push(booking)

    store.deliverJobItem(booking.id, 'a', undefined, 'สมชาย')

    const item = booking.items.find((i) => i.id === 'a')!
    expect(item.deliveryStatus).toBe('DELIVERED')
    expect(item.podImage).toBeUndefined()
    expect(item.deliveredBy).toBe('สมชาย')
    expect(booking.status).toBe('DELIVERING')
  })
})

describe('confirmPodImage', () => {
  it('attaches POD to an already-delivered item without touching deliveryStatus', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredBy: 'สมชาย', deliveredAt: new Date() })
    const booking = makeBooking({ status: 'DELIVERING', items: [itemA] })
    store.bookings.push(booking)

    store.confirmPodImage(booking.id, 'a', 'data:image/jpeg;base64,AAAA')

    const item = booking.items.find((i) => i.id === 'a')!
    expect(item.podImage).toBe('data:image/jpeg;base64,AAAA')
    expect(item.deliveryStatus).toBe('DELIVERED')
  })

  it('replaces an existing POD (re-attach/change photo)', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', podImage: 'data:image/jpeg;base64,OLD' })
    const booking = makeBooking({ status: 'DELIVERING', items: [itemA] })
    store.bookings.push(booking)

    store.confirmPodImage(booking.id, 'a', 'data:image/jpeg;base64,NEW')

    expect(booking.items.find((i) => i.id === 'a')?.podImage).toBe('data:image/jpeg;base64,NEW')
  })

  it('refuses to attach POD to an item that has not been delivered yet', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a' }) // deliveryStatus undefined = PENDING
    const booking = makeBooking({ status: 'IN_TRANSIT', items: [itemA] })
    store.bookings.push(booking)

    store.confirmPodImage(booking.id, 'a', 'data:image/jpeg;base64,AAAA')

    expect(booking.items.find((i) => i.id === 'a')?.podImage).toBeUndefined()
  })
})

describe('finishDriverJob', () => {
  it('refuses to finish while any item is still not delivered', () => {
    const store = useBookingStore()
    const booking = makeBooking({
      status: 'DELIVERING',
      items: [makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED' }), makeJobItem({ id: 'b' })],
    })
    store.bookings.push(booking)

    store.finishDriverJob(booking.id)
    expect(booking.status).toBe('DELIVERING') // ยังไม่ครบ ห้ามจบงาน
  })

  it('moves to DELIVERED and PENDING_REVIEW once every item is delivered — even with zero POD attached anywhere', () => {
    const store = useBookingStore()
    const booking = makeBooking({
      status: 'DELIVERING',
      items: [
        makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt: new Date('2026-08-20') }),
        makeJobItem({ id: 'b', deliveryStatus: 'DELIVERED', deliveredAt: new Date('2026-08-21') }),
      ],
    })
    store.bookings.push(booking)

    store.finishDriverJob(booking.id)
    expect(booking.status).toBe('DELIVERED')
    expect(booking.podReviewStatus).toBe('PENDING_REVIEW')
    expect(booking.completedAt).toBeInstanceOf(Date)
    // ไม่มี item ไหนแนบ POD เลยตลอดทั้งงาน — ต้องจบงานได้ปกติ ไม่มีอะไร block, booking.podImage ก็ควรว่างตามจริง
    expect(booking.podImage).toBeUndefined()
  })
})

describe('resetBookingStatus — Partial Delivery Rollback (Business Rule: generic one-step reverse, never destroys delivery history)', () => {
  /** Test 1 (PM spec): 3-item partial delivery, reset from DELIVERING -> IN_TRANSIT (one step back) */
  it('3-item partial delivery: reset lands the job at IN_TRANSIT (one step back from DELIVERING) and preserves the delivered item\'s POD/recipient/time untouched, pending items stay pending', () => {
    const store = useBookingStore()
    const deliveredAt = new Date('2026-08-24T10:00:00Z')
    const itemA = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt, podImage: 'https://storage/pod-a.jpg', deliveredBy: 'สมชาย' })
    const itemB = makeJobItem({ id: 'b' }) // deliveryStatus undefined = PENDING
    const itemC = makeJobItem({ id: 'c' })
    const booking = makeBooking({ status: 'DELIVERING', items: [itemA, itemB, itemC] })
    store.bookings.push(booking)

    const result = store.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.status).toBe('IN_TRANSIT')

    const a = booking.items.find((i) => i.id === 'a')!
    expect(a.deliveryStatus).toBe('DELIVERED')
    expect(a.podImage).toBe('https://storage/pod-a.jpg')
    expect(a.deliveredBy).toBe('สมชาย')
    expect(a.deliveredAt).toEqual(deliveredAt)

    const b = booking.items.find((i) => i.id === 'b')!
    const c = booking.items.find((i) => i.id === 'c')!
    expect(b.deliveryStatus).not.toBe('DELIVERED')
    expect(c.deliveryStatus).not.toBe('DELIVERED')
  })

  /** Test 2 (PM spec): full delivery, reset from DELIVERED -> DELIVERING (one step back, NOT a jump to IN_TRANSIT) */
  it('full delivery reset: DELIVERED -> DELIVERING (one step back), preserves every item\'s delivery history, only completedAt clears', () => {
    const store = useBookingStore()
    const deliveredAtA = new Date('2026-08-24T10:00:00Z')
    const deliveredAtB = new Date('2026-08-24T11:00:00Z')
    const deliveredAtC = new Date('2026-08-24T12:00:00Z')
    const itemA = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt: deliveredAtA, podImage: 'pod-a', deliveredBy: 'สมชาย' })
    const itemB = makeJobItem({ id: 'b', deliveryStatus: 'DELIVERED', deliveredAt: deliveredAtB, podImage: 'pod-b', deliveredBy: 'สมหญิง' })
    const itemC = makeJobItem({ id: 'c', deliveryStatus: 'DELIVERED', deliveredAt: deliveredAtC, podImage: 'pod-c', deliveredBy: 'สมศักดิ์' })
    const booking = makeBooking({ status: 'DELIVERED', items: [itemA, itemB, itemC], completedAt: new Date('2026-08-24T13:00:00Z') })
    store.bookings.push(booking)

    const result = store.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.status).toBe('DELIVERING') // one step back, not a special-cased jump to IN_TRANSIT
    expect(booking.completedAt).toBeUndefined()

    for (const [id, expectedAt, expectedPod, expectedBy] of [
      ['a', deliveredAtA, 'pod-a', 'สมชาย'],
      ['b', deliveredAtB, 'pod-b', 'สมหญิง'],
      ['c', deliveredAtC, 'pod-c', 'สมศักดิ์'],
    ] as const) {
      const item = booking.items.find((i) => i.id === id)!
      expect(item.deliveryStatus).toBe('DELIVERED')
      expect(item.deliveredAt).toEqual(expectedAt)
      expect(item.podImage).toBe(expectedPod)
      expect(item.deliveredBy).toBe(expectedBy)
    }
  })

  /** Test 3 (PM spec): generic reverse transition — every status steps back exactly one, no hard-coded IN_TRANSIT target */
  describe('generic one-step reverse transition (no hard-coded target status)', () => {
    it.each([
      ['DELIVERED', 'DELIVERING'],
      ['DELIVERING', 'IN_TRANSIT'],
      ['IN_TRANSIT', 'LOADED'],
      ['LOADED', 'LOADING'],
      ['FUEL_RECEIVED', 'ACCEPTED'],
    ] as const)('%s resets back to exactly %s', (from, to) => {
      const store = useBookingStore()
      const booking = makeBooking({ status: from, items: [makeJobItem()] })
      store.bookings.push(booking)

      const result = store.resetBookingStatus(booking.id)
      expect(result.ok).toBe(true)
      expect(booking.status).toBe(to)
    })
  })

  it('regression: reset from LOADED still reverses stock/pickup state as before — unaffected by the delivery-preservation fix', () => {
    const store = useBookingStore()
    const itemA = makeJobItem({ id: 'a', pickupStatus: 'PICKED_UP', pickupSequence: 0, pickedUpAt: new Date(), deliverySequence: 0 })
    const booking = makeBooking({ status: 'LOADED', items: [itemA], goodsReceivedAt: new Date(), goodsReceivedBy: 'คนขับทดสอบ' })
    store.bookings.push(booking)

    const result = store.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.status).toBe('LOADING')
    const a = booking.items.find((i) => i.id === 'a')!
    expect(a.pickupStatus).toBeUndefined()
    expect(a.pickedUpAt).toBeUndefined()
    expect(booking.goodsReceivedAt).toBeUndefined()
  })

  it('refuses to reset a booking already at its first status', () => {
    const store = useBookingStore()
    const booking = makeBooking({ status: 'WAITING_DISPATCH', items: [] })
    store.bookings.push(booking)

    const result = store.resetBookingStatus(booking.id)
    expect(result.ok).toBe(false)
    expect(booking.status).toBe('WAITING_DISPATCH')
  })

  it('driver/vehicle reassignment (dispatchBooking on an already-in-progress job) never touches item delivery history', () => {
    const store = useBookingStore()
    const deliveredAt = new Date('2026-08-24T10:00:00Z')
    const itemA = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt, podImage: 'pod-a', deliveredBy: 'สมชาย' })
    const itemB = makeJobItem({ id: 'b' })
    const booking = makeBooking({ status: 'DELIVERING', items: [itemA, itemB], plate: 'เก่า-1234', driverName: 'คนขับเก่า' })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-5678', { driverName: 'คนขับใหม่' })

    expect(booking.status).toBe('DELIVERING') // เปลี่ยนคน/รถไม่กระทบ status งาน
    expect(booking.plate).toBe('ใหม่-5678')
    const a = booking.items.find((i) => i.id === 'a')!
    expect(a.deliveryStatus).toBe('DELIVERED') // งานที่ส่งเสร็จแล้วต้องไม่ถูกดึงกลับมาทำซ้ำ
    expect(a.podImage).toBe('pod-a')
  })
})

describe('Phase E.1 — Change Assignment (Driver/Vehicle) during Pickup/Delivery', () => {
  /** Test 3 — Pickup Reassignment: C/B รับไปแล้ว, A ยังไม่รับ -> เปลี่ยนคน+รถ -> ต้องเหลือแค่ A ให้รับ ห้ามรับ C/B ซ้ำ */
  it('reassigning mid-pickup preserves already-picked-up items — remaining pickup is exactly the untouched ones', () => {
    const store = useBookingStore()
    const c = makeJobItem({ id: 'c', pickupStatus: 'PICKED_UP', pickupSequence: 0, pickedUpAt: new Date('2026-08-24T08:00:00Z') })
    const b = makeJobItem({ id: 'b', pickupStatus: 'PICKED_UP', pickupSequence: 1, pickedUpAt: new Date('2026-08-24T08:10:00Z') })
    const a = makeJobItem({ id: 'a' }) // ยังไม่รับ
    const booking = makeBooking({ status: 'LOADING', items: [c, b, a], plate: 'เก่า-1111', driverName: 'คนขับเก่า' })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })

    expect(booking.status).toBe('LOADING') // เปลี่ยนคน/รถไม่กระทบ status งาน
    expect(nextPickup(booking.items)?.id).toBe('a') // เหลือแค่ A
    expect(c.pickupStatus).toBe('PICKED_UP') // ห้ามรับ C ซ้ำ
    expect(b.pickupStatus).toBe('PICKED_UP') // ห้ามรับ B ซ้ำ
    expect(c.pickedUpAt).toEqual(new Date('2026-08-24T08:00:00Z'))
  })

  /** Test 4 — Delivery Reassignment: A/B ส่งแล้ว, C ยังไม่ส่ง -> เปลี่ยนคน+รถ -> A/B ไม่กลับมา, เหลือแค่ C */
  it('reassigning mid-delivery preserves delivered items — remaining delivery is exactly the undelivered ones', () => {
    const store = useBookingStore()
    const a = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliverySequence: 0, deliveredAt: new Date(), deliveredBy: 'สมชาย', podImage: 'pod-a' })
    const b = makeJobItem({ id: 'b', deliveryStatus: 'DELIVERED', deliverySequence: 1, deliveredAt: new Date(), deliveredBy: 'สมหญิง', podImage: 'pod-b' })
    const c = makeJobItem({ id: 'c', deliverySequence: 2 }) // ยังไม่ส่ง
    const booking = makeBooking({ status: 'DELIVERING', items: [a, b, c], plate: 'เก่า-1111' })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })

    expect(nextDelivery(booking.items)?.id).toBe('c') // เหลือแค่ C
    expect(a.deliveryStatus).toBe('DELIVERED') // A ไม่กลับมา
    expect(b.deliveryStatus).toBe('DELIVERED') // B ไม่กลับมา
  })

  /** Test 5 — Delivered History Preservation: POD/recipient/deliveredAt/deliveredBy/deliveryStatus ต้องอยู่ครบหลังเปลี่ยนคน/รถ */
  it('preserves every field of an already-delivered item after Change Assignment: deliveryStatus, deliveredAt, deliveredBy, podImage', () => {
    const store = useBookingStore()
    const deliveredAt = new Date('2026-08-24T09:00:00Z')
    const a = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt, deliveredBy: 'สมชาย', podImage: 'https://storage/pod-a.jpg' })
    const booking = makeBooking({ status: 'DELIVERING', items: [a], plate: 'เก่า-1111', driverId: 'drv-old' })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverId: 'drv-new', driverName: 'คนขับใหม่' })

    expect(a.deliveryStatus).toBe('DELIVERED')
    expect(a.deliveredAt).toEqual(deliveredAt)
    expect(a.deliveredBy).toBe('สมชาย')
    expect(a.podImage).toBe('https://storage/pod-a.jpg')
  })

  /** Test 6 — Original Job Preservation: Change Assignment ต้องไม่แตะ id ของ Booking หรือของ JobItem ใดๆ เลย
   *  (ไม่มี Split/Clone/Continuation Job ใน Phase E.1 — ทุกอย่างเกิดบน Booking เดิม) */
  it('Change Assignment never changes the Booking id or any JobItem id — same job throughout', () => {
    const store = useBookingStore()
    const a = makeJobItem({ id: 'item-a' })
    const b = makeJobItem({ id: 'item-b' })
    const booking = makeBooking({ id: 'booking-fixed-id', status: 'DELIVERING', items: [a, b] })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-9999', { driverName: 'คนขับใหม่' })

    expect(store.bookings).toHaveLength(1) // ไม่มี Booking ใหม่ถูกสร้าง
    expect(booking.id).toBe('booking-fixed-id')
    expect(booking.items.map((i) => i.id)).toEqual(['item-a', 'item-b'])
  })

  /** Test 7 — Full Completion: A/B/C ส่งครบแล้ว -> เปลี่ยนคน/รถ -> ต้องไม่มีงานเหลือให้ทำซ้ำ ไม่มี action ให้กดอีก */
  it('reassigning a fully-delivered job creates no remaining work and no new booking', () => {
    const store = useBookingStore()
    const items = [
      makeJobItem({ id: 'a', pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliverySequence: 0 }),
      makeJobItem({ id: 'b', pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliverySequence: 1 }),
      makeJobItem({ id: 'c', pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliverySequence: 2 }),
    ]
    const booking = makeBooking({ status: 'DELIVERING', items, plate: 'เก่า-1111' })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })

    expect(nextDelivery(booking.items)).toBeNull()
    expect(nextPickup(booking.items)).toBeNull()
    expect(store.bookings).toHaveLength(1)
  })
})

/**
 * Test 8 — Remaining Cargo after a real vehicle change mid-delivery. A/B already DELIVERED, C still PENDING.
 * Vehicle physically changes (plate differs) while status is DELIVERING — C's cargo is not on the new truck yet,
 * so it must be re-confirmed (confirmRemainingPickup) before it can be delivered. A/B must never be touched.
 */
describe('Phase E.1 Test 8 — Remaining Cargo after vehicle change mid-delivery', () => {
  function makeMidDeliveryBooking() {
    const a = makeJobItem({ id: 'a', pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliverySequence: 0, deliveredAt: new Date('2026-08-24T09:00:00Z'), deliveredBy: 'สมชาย', podImage: 'pod-a' })
    const b = makeJobItem({ id: 'b', pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliverySequence: 1, deliveredAt: new Date('2026-08-24T10:00:00Z'), deliveredBy: 'สมหญิง', podImage: 'pod-b' })
    const c = makeJobItem({ id: 'c', pickupStatus: 'PICKED_UP', pickupSequence: 2, deliverySequence: 2 }) // เคยรับที่ต้นทางแล้วบนรถคันเดิม แต่ยังไม่ส่ง
    const booking = makeBooking({ status: 'DELIVERING', items: [a, b, c], plate: 'เดิม-1111', driverId: 'drv-old', driverName: 'คนขับเดิม' })
    return { a, b, c, booking }
  }

  it('a genuine plate change mid-delivery resets only the not-yet-delivered item back to pending pickup', () => {
    const store = useBookingStore()
    const { a, b, c, booking } = makeMidDeliveryBooking()
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverId: 'drv-new', driverName: 'คนขับใหม่' })

    expect(booking.status).toBe('DELIVERING') // เปลี่ยนรถไม่กระทบ Job status
    expect(a.deliveryStatus).toBe('DELIVERED')
    expect(b.deliveryStatus).toBe('DELIVERED')
    expect(c.pickupStatus).toBeUndefined() // ต้องยืนยันใหม่ก่อนถึงจะส่งได้
    // nextPickup ต้องเจอ C ก่อนเสมอ — DriverJobDetailView.vue เช็ค nextPickup(job) เป็น v-if แรกในสถานะ
    // IN_TRANSIT/DELIVERING (ก่อน nextDelivery) จึงบังคับ UI ให้ยืนยันรับสินค้าก่อนแสดงการ์ดส่งของจริง แม้
    // nextDelivery() เองจะยังคืนค่า C ได้ตามปกติ (มันดู deliveryStatus อย่างเดียวโดยเจตนา ไม่ปนกับ pickupStatus)
    expect(nextPickup(booking.items)?.id).toBe('c')
  })

  it('after confirming remaining pickup, C becomes deliverable — and only then', () => {
    const store = useBookingStore()
    const { a, b, c, booking } = makeMidDeliveryBooking()
    store.bookings.push(booking)
    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })
    expect(nextPickup(booking.items)?.id).toBe('c')

    store.confirmRemainingPickup(booking.id, 'c')

    expect(c.pickupStatus).toBe('PICKED_UP')
    expect(nextPickup(booking.items)).toBeNull()
    expect(nextDelivery(booking.items)?.id).toBe('c')
    // A/B ต้องยังไม่ถูกแตะแม้แต่นิดเดียวตลอด flow นี้
    expect(a.deliveryStatus).toBe('DELIVERED')
    expect(a.deliveredAt).toEqual(new Date('2026-08-24T09:00:00Z'))
    expect(a.deliveredBy).toBe('สมชาย')
    expect(a.podImage).toBe('pod-a')
    expect(b.deliveryStatus).toBe('DELIVERED')
    expect(b.podImage).toBe('pod-b')
  })

  it('delivering C after confirmation completes the job through the existing state machine, unchanged', () => {
    const store = useBookingStore()
    const { booking } = makeMidDeliveryBooking()
    store.bookings.push(booking)
    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })
    store.confirmRemainingPickup(booking.id, 'c')

    store.deliverJobItem(booking.id, 'c', 'https://storage/pod-c.jpg', 'สมศักดิ์')

    const c = booking.items.find((i) => i.id === 'c')!
    expect(c.deliveryStatus).toBe('DELIVERED')
    expect(nextDelivery(booking.items)).toBeNull()
    store.finishDriverJob(booking.id)
    expect(booking.status).toBe('DELIVERED')
  })

  it('original Booking id and every JobItem id are unchanged throughout — no delete/create, no new booking', () => {
    const store = useBookingStore()
    const { booking } = makeMidDeliveryBooking()
    const originalId = booking.id
    const originalItemIds = booking.items.map((i) => i.id)
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })
    store.confirmRemainingPickup(booking.id, 'c')

    expect(booking.id).toBe(originalId)
    expect(booking.items.map((i) => i.id)).toEqual(originalItemIds)
    expect(store.bookings).toHaveLength(1)
  })

  it('reassigning driver name only, on the SAME plate, does not reset any pickup state (not a real vehicle change)', () => {
    const store = useBookingStore()
    const { a, b, c, booking } = makeMidDeliveryBooking()
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, booking.plate!, { driverName: 'คนขับใหม่ แต่รถคันเดิม' })

    expect(c.pickupStatus).toBe('PICKED_UP') // ไม่ถูกล้าง เพราะ plate ไม่เปลี่ยนจริง
    expect(nextPickup(booking.items)).toBeNull()
    expect(nextDelivery(booking.items)?.id).toBe('c')
    expect(a.deliveryStatus).toBe('DELIVERED')
    expect(b.deliveryStatus).toBe('DELIVERED')
  })

  it('a plate change while still mid-pickup (LOADING, not yet all picked up) does not trigger the remaining-cargo gate — Test 3 territory, unaffected', () => {
    const store = useBookingStore()
    const c = makeJobItem({ id: 'c', pickupStatus: 'PICKED_UP', pickupSequence: 0 })
    const b = makeJobItem({ id: 'b', pickupStatus: 'PICKED_UP', pickupSequence: 1 })
    const a = makeJobItem({ id: 'a' })
    const booking = makeBooking({ status: 'LOADING', items: [c, b, a], plate: 'เดิม-1111' })
    store.bookings.push(booking)

    store.dispatchBooking(booking.id, 'ใหม่-2222', { driverName: 'คนขับใหม่' })

    expect(c.pickupStatus).toBe('PICKED_UP') // ไม่ถูกล้าง — gate นี้ใช้เฉพาะ IN_TRANSIT/DELIVERING เท่านั้น
    expect(b.pickupStatus).toBe('PICKED_UP')
    expect(nextPickup(booking.items)?.id).toBe('a')
  })
})
