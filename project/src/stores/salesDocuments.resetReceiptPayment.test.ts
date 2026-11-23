import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

const job = () => makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', items: [makeJobItem()] })

/** ใบแจ้งหนี้ (ส่งแล้ว) → ใบเสร็จ → กดเก็บเงิน */
function paidReceipt() {
  const bookingStore = useBookingStore()
  const salesDocs = useSalesDocumentsStore()
  const b = job()
  bookingStore.bookings.push(b)
  const invoice = salesDocs.createTaxInvoiceFromBookings([b.id])!
  salesDocs.sendInvoice(invoice.id)
  const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')!.doc
  salesDocs.recordReceiptPayment(receipt.id, {
    paidDate: new Date('2026-11-20'),
    whtAmount: 30,
    paymentMethod: 'โอนเงิน',
    paymentBankName: 'ธนาคารตัวอย่าง',
    paymentReference: 'TX1',
    receivedAmount: 2970,
    paymentAdjustment: 0,
  })
  return { salesDocs, invoice, receipt }
}

describe('recordReceiptPayment — ยอดรับสุทธิ', () => {
  it('เก็บยอดรับจริงไว้ที่ใบเสร็จ และปิดใบแจ้งหนี้เป็นชำระแล้วโดยจำสถานะเดิมไว้', () => {
    const { invoice, receipt } = paidReceipt()
    expect(receipt.status).toBe('PAID')
    expect(receipt.receivedAmount).toBe(2970)
    expect(receipt.whtAmount).toBe(30)
    expect(invoice.status).toBe('PAID')
    expect(invoice.statusBeforeReceiptPaid).toBe('SENT')
  })
})

describe('resetReceiptPayment — รีเซ็ตใบเสร็จที่เก็บเงินแล้วกลับเป็นรอเก็บเงิน', () => {
  it('ล้างข้อมูลการรับชำระ ใบเสร็จยังอยู่ และใบแจ้งหนี้กลับเป็นสถานะเดิมก่อนชำระ', () => {
    const { salesDocs, invoice, receipt } = paidReceipt()
    expect(salesDocs.resetReceiptPayment(receipt.id)).toEqual({ ok: true })

    expect(salesDocs.documents.some((d) => d.id === receipt.id)).toBe(true)
    expect(receipt.status).toBe('DRAFT')
    expect(receipt.paidDate).toBeUndefined()
    expect(receipt.paymentMethod).toBeUndefined()
    expect(receipt.receivedAmount).toBeUndefined()
    expect(invoice.status).toBe('SENT')
    expect(invoice.paidDate).toBeUndefined()
    expect(invoice.statusBeforeReceiptPaid).toBeUndefined()
  })

  it('เก็บเงินใหม่ได้หลังรีเซ็ต', () => {
    const { salesDocs, invoice, receipt } = paidReceipt()
    salesDocs.resetReceiptPayment(receipt.id)
    expect(salesDocs.recordReceiptPayment(receipt.id, { paidDate: new Date('2026-11-22'), receivedAmount: 3000 })).not.toBeNull()
    expect(receipt.status).toBe('PAID')
    expect(invoice.status).toBe('PAID')
  })

  it('ใบที่ยังไม่ได้เก็บเงิน รีเซ็ตไม่ได้', () => {
    const { salesDocs, receipt } = paidReceipt()
    salesDocs.resetReceiptPayment(receipt.id)
    expect(salesDocs.resetReceiptPayment(receipt.id).ok).toBe(false)
  })
})
