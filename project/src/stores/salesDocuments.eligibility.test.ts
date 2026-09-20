import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

/** ใบวางบิลหนึ่งใบต้องมีสินค้า Feed (booking.category) เดียว, ลูกค้าเดียว, งานต้อง DELIVERED/IN_TRANSIT และยังไม่เคยถูกวางบิล
 *  — นี่คือด่านที่กันไม่ให้ใบวางบิลปนกันหลาย Feed (regression ของบั๊กจริงที่เจอในโปรเจกต์นี้ ดู commit a7d0894) จึงเป็นจุด
 *  ที่ต้องมี regression test คุมไว้ POD ไม่ใช่เงื่อนไขของใบวางบิล (เงื่อนไข POD อยู่ที่ใบเสร็จ/รับชำระเงินแทน) */
describe('createBillingFromBookings — eligibility guards', () => {
  it('creates a billing note when every booking shares the same customer, category, is DELIVERED, and unclaimed', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const b1 = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', items: [makeJobItem()] })
    const b2 = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', items: [makeJobItem()] })
    bookingStore.bookings.push(b1, b2)

    const result = salesDocs.createBillingFromBookings([b1.id, b2.id])

    expect(result).not.toBeNull()
    expect(result?.bookingIds).toEqual([b1.id, b2.id])
    expect(b1.billingNoteDocId).toBe(result?.id)
    expect(b2.billingNoteDocId).toBe(result?.id)
  })

  it('rejects (returns null) when bookings belong to different customers', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const b1 = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED' })
    const b2 = makeBooking({ customer: 'ลูกค้า B', category: 'cements', status: 'DELIVERED' })
    bookingStore.bookings.push(b1, b2)

    expect(salesDocs.createBillingFromBookings([b1.id, b2.id])).toBeNull()
    expect(b1.billingNoteDocId).toBeUndefined()
  })

  it('rejects (returns null) when bookings mix different Feed categories (cements + ceramics)', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const cement = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED' })
    const ceramic = makeBooking({ customer: 'ลูกค้า A', category: 'ceramics', status: 'DELIVERED' })
    bookingStore.bookings.push(cement, ceramic)

    expect(salesDocs.createBillingFromBookings([cement.id, ceramic.id])).toBeNull()
  })

  it('rejects (returns null) when a booking has not yet reached IN_TRANSIT (e.g. still LOADED)', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const notYetInTransit = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'LOADED' })
    bookingStore.bookings.push(notYetInTransit)

    expect(salesDocs.createBillingFromBookings([notYetInTransit.id])).toBeNull()
  })

  it('rejects (returns null) when a booking already belongs to another billing note', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const claimed = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', billingNoteDocId: 'sdoc-other' })
    bookingStore.bookings.push(claimed)

    expect(salesDocs.createBillingFromBookings([claimed.id])).toBeNull()
  })

  it('allows billing even when POD review is still pending or was rejected — POD is not a billing-note condition', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const pending = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', podReviewStatus: 'PENDING_REVIEW' })
    bookingStore.bookings.push(pending)
    expect(salesDocs.createBillingFromBookings([pending.id])).not.toBeNull()

    const rejected = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', podReviewStatus: 'REJECTED' })
    bookingStore.bookings.push(rejected)
    expect(salesDocs.createBillingFromBookings([rejected.id])).not.toBeNull()
  })

  it('allows a booking whose POD was office-completed (podReviewStatus undefined) — treated as implicitly approved', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const officeCompleted = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', podReviewStatus: undefined })
    bookingStore.bookings.push(officeCompleted)

    expect(salesDocs.createBillingFromBookings([officeCompleted.id])).not.toBeNull()
  })
})

/** Business Rule: "IN_TRANSIT สามารถออกใบวางบิลได้ UNIVERSALLY" — ไม่จำกัดแค่งานที่เคย DELIVERED แล้วถูก Reset
 *  กลับมา ครอบคลุมงานปกติที่ยังไม่ถึงปลายทาง, งาน Reset-derived, และงาน partial delivery ทั้งหมดเท่ากัน — และต้อง
 *  ไม่ทำลาย eligibility rule อื่น (customer/category/claim) ที่มีอยู่แล้ว */
describe('createBillingFromBookings — universal IN_TRANSIT eligibility', () => {
  it('allows a normal IN_TRANSIT booking with zero items delivered yet', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'IN_TRANSIT', items: [makeJobItem(), makeJobItem()] })
    bookingStore.bookings.push(booking)

    expect(salesDocs.createBillingFromBookings([booking.id])).not.toBeNull()
  })

  it('allows a reset-derived IN_TRANSIT booking that still carries preserved partial-delivery history', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const delivered = makeJobItem({ id: 'a', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), podImage: 'pod-a', deliveredBy: 'สมชาย' })
    const pending = makeJobItem({ id: 'b' })
    const booking = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERING', items: [delivered, pending] })
    bookingStore.bookings.push(booking)

    // Reset ก่อน (DELIVERING -> IN_TRANSIT) ตาม generic one-step-back — จำลองสถานการณ์จริงที่ PM อธิบาย
    const resetResult = bookingStore.resetBookingStatus(booking.id)
    expect(resetResult.ok).toBe(true)
    expect(booking.status).toBe('IN_TRANSIT')

    const billingResult = salesDocs.createBillingFromBookings([booking.id])
    expect(billingResult).not.toBeNull()
    // ออกใบวางบิลแล้วต้องไม่แตะข้อมูลการส่งของที่ preserve ไว้เลย
    expect(booking.items.find((i) => i.id === 'a')?.deliveryStatus).toBe('DELIVERED')
    expect(booking.items.find((i) => i.id === 'a')?.podImage).toBe('pod-a')
    expect(booking.items.find((i) => i.id === 'b')?.deliveryStatus).not.toBe('DELIVERED')
  })

  it('customer/category guards still apply to IN_TRANSIT bookings exactly as they do for DELIVERED ones', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const cement = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'IN_TRANSIT' })
    const ceramic = makeBooking({ customer: 'ลูกค้า A', category: 'ceramics', status: 'IN_TRANSIT' })
    bookingStore.bookings.push(cement, ceramic)

    expect(salesDocs.createBillingFromBookings([cement.id, ceramic.id])).toBeNull()

    const otherCustomer = makeBooking({ customer: 'ลูกค้า B', category: 'cements', status: 'IN_TRANSIT' })
    bookingStore.bookings.push(otherCustomer)
    expect(salesDocs.createBillingFromBookings([cement.id, otherCustomer.id])).toBeNull()
  })

  it('a booking still in LOADING/LOADED (before IN_TRANSIT) remains ineligible', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const loading = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'LOADING' })
    bookingStore.bookings.push(loading)

    expect(salesDocs.createBillingFromBookings([loading.id])).toBeNull()
  })
})
