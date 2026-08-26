import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

/**
 * Business Rule (PM-confirmed): Booking มีสถานะ/ความคืบหน้า 2 มิติที่เป็นอิสระต่อกันโดยเจตนา — Transport Status
 * (booking.status) กับ Billing Progress (billingNoteDocId/taxInvoiceDocId/receiptDocId) เดินไม่พร้อมกันได้
 * (IN_TRANSIT+BILLED, DELIVERED+WAITING_BILLING, DELIVERED+BILLED ล้วนเป็น state ที่ถูกต้อง) ดังนั้น Reset Transport
 * Status ต้องไม่แตะ/ไม่ยกเลิก/ไม่ลบเอกสารฝั่ง Billing เลย — regression suite นี้พิสูจน์ตรงๆ ว่าแก้ coupling ใน
 * SalesOrderListView.vue แล้วจริง (ก่อนแก้: reset จาก DELIVERED จะยกเลิกใบวางบิลที่ยัง BILLING_PENDING ทิ้งทันที)
 */
describe('Transport Status vs Billing Progress — independence', () => {
  it('DELIVERED + WAITING_BILLING (no billing note yet): Reset Transport works normally, nothing spuriously created', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({
      status: 'DELIVERED',
      items: [makeJobItem({ pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), deliveredBy: 'สมชาย', podImage: 'pod-a' })],
    })
    bookingStore.bookings.push(booking)

    const result = bookingStore.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.status).toBe('DELIVERING')
    expect(booking.billingNoteDocId).toBeUndefined()
    expect(salesDocs.documents).toHaveLength(0)
  })

  it('DELIVERED + BILLED: Reset Transport preserves the Billing Note completely — this is the exact bug that was fixed', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({
      customer: 'ลูกค้า A',
      category: 'cements',
      status: 'DELIVERED',
      items: [makeJobItem({ pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), deliveredBy: 'สมชาย', podImage: 'pod-a' })],
    })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])
    expect(billing).not.toBeNull()
    expect(booking.billingNoteDocId).toBe(billing!.id)

    const result = bookingStore.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.status).toBe('DELIVERING')
    // ก่อนแก้: บรรทัดนี้จะเป็น undefined เพราะ SalesOrderListView.vue เคยเรียก cancelBillingNote() ทันทีตอน reset
    expect(booking.billingNoteDocId).toBe(billing!.id)
    const stillExists = salesDocs.documents.find((d) => d.id === billing!.id)
    expect(stillExists).toBeDefined()
    expect(stillExists?.status).toBe('BILLING_PENDING')
  })

  it('IN_TRANSIT + BILLED: Reset Transport preserves the Billing Note completely', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'IN_TRANSIT', items: [makeJobItem()] })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])
    expect(billing).not.toBeNull()

    const result = bookingStore.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.status).toBe('LOADED') // IN_TRANSIT ถอยกลับ 1 ขั้นตาม state machine ทั่วไป
    expect(booking.billingNoteDocId).toBe(billing!.id)
    expect(salesDocs.documents.find((d) => d.id === billing!.id)).toBeDefined()
  })

  it('Reset Transport never touches taxInvoiceDocId or receiptDocId either, regardless of value', () => {
    const bookingStore = useBookingStore()
    const booking = makeBooking({
      status: 'DELIVERED',
      items: [makeJobItem({ pickupStatus: 'PICKED_UP', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), deliveredBy: 'สมชาย', podImage: 'pod-a' })],
      billingNoteDocId: 'billing-1',
      taxInvoiceDocId: 'invoice-1',
      receiptDocId: 'receipt-1',
    })
    bookingStore.bookings.push(booking)

    const result = bookingStore.resetBookingStatus(booking.id)

    expect(result.ok).toBe(true)
    expect(booking.billingNoteDocId).toBe('billing-1')
    expect(booking.taxInvoiceDocId).toBe('invoice-1')
    expect(booking.receiptDocId).toBe('receipt-1')
  })

  it('negative test: Billing-side cancel (cancelBillingNote, e.g. from BillingListView.vue) still works, independent of Transport Status', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', items: [makeJobItem()] })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])
    expect(billing).not.toBeNull()

    const cancelled = salesDocs.cancelBillingNote(billing!.id)

    expect(cancelled).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === billing!.id)).toBeUndefined()
    expect(booking.billingNoteDocId).toBeUndefined()
    // ยกเลิกฝั่ง Billing ต้องไม่แตะ Transport Status เลย (อิสระต่อกันทั้งสองทาง)
    expect(booking.status).toBe('DELIVERED')
  })
})
