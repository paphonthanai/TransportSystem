import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

/** Sales Document Flow refactor — เอกสารเลขที่แก้ไขได้ทุกสถานะ พร้อมกันเลขซ้ำ (item 2.1/3) */
describe('changeDocumentNumber', () => {
  it('renames a BILLED billing note to a new, unused number', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า A', status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    billing.status = 'BILLED'

    const result = salesDocs.changeDocumentNumber(billing.id, 'VB-CUSTOM-001')

    expect(result.ok).toBe(true)
    expect(billing.number).toBe('VB-CUSTOM-001')
  })

  it('rejects a number that is already used by another document', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const b1 = makeBooking({ customer: 'ลูกค้า A', status: 'DELIVERED' })
    const b2 = makeBooking({ customer: 'ลูกค้า B', status: 'DELIVERED' })
    bookingStore.bookings.push(b1, b2)
    const billing1 = salesDocs.createBillingFromBookings([b1.id])!
    const billing2 = salesDocs.createBillingFromBookings([b2.id])!

    const result = salesDocs.changeDocumentNumber(billing2.id, billing1.number)

    expect(result.ok).toBe(false)
    expect(result.message).toContain(billing1.number)
    expect(billing2.number).not.toBe(billing1.number)
  })

  it('rejects an empty number', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!

    const result = salesDocs.changeDocumentNumber(billing.id, '   ')

    expect(result.ok).toBe(false)
  })

  it('is a no-op success when the number is unchanged', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!

    const result = salesDocs.changeDocumentNumber(billing.id, billing.number)

    expect(result.ok).toBe(true)
  })
})

/** ลบใบวางบิล/ใบแจ้งหนี้ได้ไม่ว่าสถานะใด ตามสิทธิ์ผู้ใช้ (item 6) — ห้าม cascade ลบเอกสารปลายทางอัตโนมัติ */
describe('deleteBillingNote', () => {
  it('deletes a BILLED billing note with no downstream documents and frees the booking claim', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    billing.status = 'BILLED'

    const result = salesDocs.deleteBillingNote(billing.id)

    expect(result.ok).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === billing.id)).toBeUndefined()
    expect(booking.billingNoteDocId).toBeUndefined()
  })

  it('refuses to delete when a downstream document (Tax Invoice) already exists — no cascade', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const invoice = salesDocs.createInvoiceFromBilling(billing.id)!
    expect(invoice).not.toBeNull()

    const result = salesDocs.deleteBillingNote(billing.id)

    expect(result.ok).toBe(false)
    expect(result.message).toContain(billing.number)
    expect(salesDocs.documents.find((d) => d.id === billing.id)).toBeDefined()
  })

  it('returns a not-found error for an unknown id', () => {
    const salesDocs = useSalesDocumentsStore()
    const result = salesDocs.deleteBillingNote('does-not-exist')
    expect(result.ok).toBe(false)
  })
})

describe('deleteTaxInvoice', () => {
  it('deletes a SENT tax invoice and reverts its parent billing note back to BILLING_PENDING', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const invoice = salesDocs.createInvoiceFromBilling(billing.id)!
    invoice.status = 'SENT'

    const result = salesDocs.deleteTaxInvoice(invoice.id)

    expect(result.ok).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === invoice.id)).toBeUndefined()
    expect(billing.status).toBe('BILLING_PENDING')
    expect(booking.taxInvoiceDocId).toBeUndefined()
  })

  it('refuses to delete when a receipt already claims this invoice as a source document', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const invoice = salesDocs.createInvoiceFromBilling(billing.id)!
    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')
    expect(receipt).not.toBeNull()

    const result = salesDocs.deleteTaxInvoice(invoice.id)

    expect(result.ok).toBe(false)
    expect(salesDocs.documents.find((d) => d.id === invoice.id)).toBeDefined()
  })
})

/** Receipt เริ่มที่ DRAFT ("รอเก็บเงิน") เสมอไม่ว่าจะสร้างผ่านเส้นทางไหน — Uniform ตามข้อกำหนดใหม่ (PM-confirmed) */
describe('Receipt creation always starts DRAFT', () => {
  it('createReceiptFromBookings starts DRAFT with no paidDate, not PAID', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)

    const receipt = salesDocs.createReceiptFromBookings([booking.id])!

    expect(receipt.status).toBe('DRAFT')
    expect(receipt.paidDate).toBeUndefined()
  })

  it('createReceiptManual starts DRAFT with no paidDate/paymentMethod', () => {
    const salesDocs = useSalesDocumentsStore()

    const receipt = salesDocs.createReceiptManual({
      customer: 'ลูกค้า A',
      items: [{ description: 'ค่าบริการ', qty: 1, unit: 'งาน', unitPrice: 500, amount: 500, discountMode: 'percent', discountPercent: 0, discountAmount: 0 }],
    })!

    expect(receipt.status).toBe('DRAFT')
    expect(receipt.paidDate).toBeUndefined()
    expect(receipt.paymentMethod).toBeUndefined()
  })

  it('createReceiptFromSourceDocs starts DRAFT even when the source Tax Invoice is already PAID', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const invoice = salesDocs.createInvoiceFromBilling(billing.id)!
    invoice.status = 'PAID'

    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')!

    expect(receipt.doc.status).toBe('DRAFT')
  })
})

/** เก็บเงินที่ใบเสร็จแล้วต้องไล่ปิดใบแจ้งหนี้ต้นทางให้ครบ (status + ข้อมูลการชำระเงิน) ไม่ใช่แค่ status เฉยๆ —
 *  ใบแจ้งหนี้ไม่มีการ "บันทึกการชำระเงิน" ของตัวเองอีกต่อไป (item 1.5) ความรับผิดชอบย้ายมาที่ใบเสร็จทั้งหมด */
describe('recordReceiptPayment cascades to the source Tax Invoice', () => {
  it('marks the linked Tax Invoice PAID with matching payment details when the receipt is collected', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ status: 'DELIVERED' })
    bookingStore.bookings.push(booking)
    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const invoice = salesDocs.createInvoiceFromBilling(billing.id)!
    invoice.status = 'SENT'
    const { doc: receipt } = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')!
    expect(receipt.status).toBe('DRAFT')

    const paidDate = new Date('2026-01-15')
    salesDocs.recordReceiptPayment(receipt.id, { paidDate, paymentMethod: 'โอนเงิน', paymentBankName: 'กสิกรไทย', paymentReference: 'REF-001' })

    expect(receipt.status).toBe('PAID')
    expect(invoice.status).toBe('PAID')
    expect(invoice.paidDate).toEqual(paidDate)
    expect(invoice.paymentMethod).toBe('โอนเงิน')
    expect(invoice.paymentBankName).toBe('กสิกรไทย')
    expect(invoice.paymentReference).toBe('REF-001')
  })
})
