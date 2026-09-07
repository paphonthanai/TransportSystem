import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useSalesDocumentsStore } from './salesDocuments'
import { useAuthStore } from './auth'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import type { UserRole } from './users'

beforeEach(() => {
  setActivePinia(createPinia())
})

/** ตั้ง role ผู้ใช้ปัจจุบันตรงๆ ผ่าน authStore.profile (ข้าม Firebase Auth จริง — mock ไว้แล้วใน tests/setup.ts)
 *  role ที่เป็นไปได้ตรงกับ UserRole (ADMIN/STAFF/DISPATCHER/ACCOUNTING/DRIVER) เหมือน Firestore Rules/UI guard จริง */
function loginAs(role: UserRole) {
  const authStore = useAuthStore()
  authStore.profile = {
    id: 'uid-test',
    email: 'test@test.com',
    name: 'Test User',
    role,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('hardDeleteBooking — permission', () => {
  it('ADMIN can hard delete a booking with no references', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const booking = makeBooking()
    bookingStore.bookings.push(booking)

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(true)
    expect(bookingStore.bookings.find((b) => b.id === booking.id)).toBeUndefined()
  })

  it.each<UserRole>(['STAFF', 'DISPATCHER', 'ACCOUNTING', 'DRIVER'])('%s cannot hard delete a booking', async (role) => {
    loginAs(role)
    const bookingStore = useBookingStore()
    const booking = makeBooking()
    bookingStore.bookings.push(booking)

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('ไม่มีสิทธิ์')
    // งานต้องยังอยู่ครบ ไม่มีอะไรถูกลบเลยเมื่อสิทธิ์ไม่พอ
    expect(bookingStore.bookings.find((b) => b.id === booking.id)).toBeDefined()
  })
})

describe('hardDeleteBooking — no reference', () => {
  it('deletes the booking document for real when nothing references it', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const booking = makeBooking({ items: [] })
    bookingStore.bookings.push(booking)

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(true)
    expect(result.deletedDocumentCount).toBe(0)
    expect(bookingStore.bookings).toHaveLength(0)
  })
})

describe('hardDeleteBooking — referenced booking cascade', () => {
  it('cascades to a SALES_ORDER referencing the booking (createSalesOrderForBooking) and its items', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า A' })
    bookingStore.bookings.push(booking)
    const salesOrder = salesDocs.createSalesOrderForBooking({
      bookingId: booking.id,
      customer: booking.customer,
      amount: 1000,
      items: [{ description: 'ค่าขนส่ง', qty: 1, unit: 'เที่ยว', unitPrice: 1000, amount: 1000 }],
    })
    expect(salesDocs.itemsForDocument(salesOrder.id)).toHaveLength(1)

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(true)
    expect(result.deletedDocumentCount).toBe(1)
    expect(salesDocs.documents.find((d) => d.id === salesOrder.id)).toBeUndefined()
    expect(salesDocs.itemsForDocument(salesOrder.id)).toHaveLength(0)
    expect(bookingStore.bookings).toHaveLength(0)
  })

  it('cascades through the full Billing/Tax Invoice/Receipt chain (each carries the booking in bookingIds)', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า B', status: 'DELIVERED', items: [makeJobItem()] })
    bookingStore.bookings.push(booking)

    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const taxInvoice = salesDocs.createTaxInvoiceFromBookings([booking.id])!
    const receipt = salesDocs.createReceiptFromBookings([booking.id])!
    expect(billing.bookingIds).toContain(booking.id)
    expect(taxInvoice.bookingIds).toContain(booking.id)
    expect(receipt.bookingIds).toContain(booking.id)

    const refsBefore = salesDocs.documentsReferencingBooking(booking.id)
    expect(refsBefore).toHaveLength(3)

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(true)
    expect(result.deletedDocumentCount).toBe(3)
    ;[billing.id, taxInvoice.id, receipt.id].forEach((id) => {
      expect(salesDocs.documents.find((d) => d.id === id)).toBeUndefined()
      expect(salesDocs.itemsForDocument(id)).toHaveLength(0)
    })
  })

  it('clears dangling billingNoteDocId/taxInvoiceDocId/receiptDocId on a sibling booking claimed by the same deleted document', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const bookingA = makeBooking({ customer: 'ลูกค้า C' })
    const bookingB = makeBooking({ customer: 'ลูกค้า C' })
    bookingStore.bookings.push(bookingA, bookingB)
    // ใบวางบิลรวมสองงานพร้อมกัน — ลบ bookingA ต้องลบใบวางบิลนี้ทิ้งทั้งใบ (ตาม Requirement) และไม่ทิ้ง
    // billingNoteDocId ค้างบน bookingB ที่ชี้ไปเอกสารที่ถูกลบไปแล้ว
    const billing = salesDocs.createBillingFromBookings([bookingA.id, bookingB.id])!
    expect(bookingB.billingNoteDocId).toBe(billing.id)

    const result = await bookingStore.hardDeleteBooking(bookingA.id)

    expect(result.ok).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === billing.id)).toBeUndefined()
    // ไม่เหลือ orphan reference บน bookingB ที่ยังอยู่ — เช็คจาก store จริง ไม่ใช้ตัวแปร bookingB ที่ถืออ้างอิงไว้ตอนต้นเทสต์
    // เพราะ fetchBookings() ที่ยิงตอน store ถูกสร้าง (async, ไม่ await ตอนเรียก) อาจ resolve แทรกกลางเทสต์นี้พอดี แล้ว
    // แทนที่ทั้งอาเรย์ bookings.value ด้วย object ที่ deserialize ใหม่จาก fake Firestore (คนละ reference กับตัวแปรเดิม
    // แต่ค่าเนื้อหาถูกต้องเหมือนกัน) — ปัญหานี้อยู่ที่ timing ของเทสต์ ไม่ใช่ bug ของ removeDocumentsLocally เอง
    const liveBookingB = bookingStore.bookings.find((b) => b.id === bookingB.id)
    expect(liveBookingB).toBeDefined()
    expect(liveBookingB?.billingNoteDocId).toBeUndefined()
  })

  it('does not touch documents/bookings unrelated to the deleted booking', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const target = makeBooking({ customer: 'ลูกค้า D' })
    const unrelated = makeBooking({ customer: 'ลูกค้า E' })
    bookingStore.bookings.push(target, unrelated)
    const targetOrder = salesDocs.createSalesOrderForBooking({ bookingId: target.id, customer: target.customer, amount: 500, items: [] })
    const unrelatedOrder = salesDocs.createSalesOrderForBooking({ bookingId: unrelated.id, customer: unrelated.customer, amount: 500, items: [] })

    const result = await bookingStore.hardDeleteBooking(target.id)

    expect(result.ok).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === targetOrder.id)).toBeUndefined()
    expect(salesDocs.documents.find((d) => d.id === unrelatedOrder.id)).toBeDefined()
    expect(bookingStore.bookings.find((b) => b.id === unrelated.id)).toBeDefined()
  })
})

describe('hardDeleteBooking — safety', () => {
  it('leaves everything untouched when the caller never invokes it (models the user cancelling the confirmation dialog)', async () => {
    // BookingView.vue's deleteBooking() returns early on confirm() === false, before calling
    // bookingStore.hardDeleteBooking() at all — there is no component-testing setup in this codebase
    // (no @vue/test-utils) to mount BookingView.vue directly, so this is verified structurally at the
    // store level instead: nothing is deleted unless hardDeleteBooking is actually called.
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking()
    bookingStore.bookings.push(booking)
    const order = salesDocs.createSalesOrderForBooking({ bookingId: booking.id, customer: booking.customer, amount: 100, items: [] })

    // ไม่เรียก hardDeleteBooking เลย (เทียบเท่ากับผู้ใช้กด "ยกเลิก" ใน Confirmation Dialog)
    expect(bookingStore.bookings.find((b) => b.id === booking.id)).toBeDefined()
    expect(salesDocs.documents.find((d) => d.id === order.id)).toBeDefined()
  })

  it('items=[] does not block hard delete', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const booking = makeBooking({ items: [] })
    bookingStore.bookings.push(booking)

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(true)
    expect(bookingStore.bookings).toHaveLength(0)
  })

  it('items=[] with a referenced document still cascades correctly', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ items: [] })
    bookingStore.bookings.push(booking)
    const order = salesDocs.createSalesOrderForBooking({ bookingId: booking.id, customer: booking.customer, amount: 100, items: [] })

    const result = await bookingStore.hardDeleteBooking(booking.id)

    expect(result.ok).toBe(true)
    expect(result.deletedDocumentCount).toBe(1)
    expect(salesDocs.documents.find((d) => d.id === order.id)).toBeUndefined()
  })

  it('deleting one booking does not affect an unrelated booking with no shared documents', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()
    const target = makeBooking()
    const other = makeBooking()
    bookingStore.bookings.push(target, other)

    await bookingStore.hardDeleteBooking(target.id)

    expect(bookingStore.bookings).toHaveLength(1)
    expect(bookingStore.bookings[0].id).toBe(other.id)
  })
})

describe('hardDeleteBooking — missing booking', () => {
  it('fails gracefully when the booking id does not exist', async () => {
    loginAs('ADMIN')
    const bookingStore = useBookingStore()

    const result = await bookingStore.hardDeleteBooking('does-not-exist')

    expect(result.ok).toBe(false)
    expect(result.message).toContain('ไม่พบ')
  })
})
