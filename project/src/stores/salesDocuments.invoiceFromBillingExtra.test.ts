import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import { buildPrefillFromBilling, unclaimedBillingGroups } from '@/utils/billingPrefill'

beforeEach(() => {
  setActivePinia(createPinia())
})

const oneItem = [{ description: 'ค่าขนส่ง', qty: 1, unit: 'เที่ยว', unitPrice: 1000, amount: 1000, discountMode: 'percent' as const, discountPercent: 0, discountAmount: 0 }]
const job = (over: Record<string, unknown> = {}) => makeBooking({ customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', items: [makeJobItem()], ...over })

/** ใบแจ้งหนี้จากใบวางบิล + เลือกงานเพิ่มนอกใบวางบิลในหน้าเลือกงาน (TaxInvoiceBookingSelectView.vue) */
function setup() {
  const bookingStore = useBookingStore()
  const salesDocs = useSalesDocumentsStore()
  const inBilling = job()
  const extra = job()
  bookingStore.bookings.push(inBilling, extra)
  const billing = salesDocs.createBillingFromBookings([inBilling.id])!
  return { bookingStore, salesDocs, inBilling, extra, billing }
}

describe('createTaxInvoiceManual — จากใบวางบิลพร้อมงานที่เลือกเพิ่ม', () => {
  it('ผูกทั้งงานในใบวางบิลและงานที่เพิ่ม ใบวางบิลปิดเป็นวางบิลแล้วเมื่องานของใบวางบิลถูกดึงครบ', () => {
    const { salesDocs, inBilling, extra, billing } = setup()
    const invoice = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem, sourceBillingId: billing.id, bookingIds: [inBilling.id, extra.id] })

    expect(invoice).not.toBeNull()
    expect(inBilling.taxInvoiceDocId).toBe(invoice!.id)
    expect(extra.taxInvoiceDocId).toBe(invoice!.id)
    expect(invoice!.parentDocumentId).toBe(billing.id)
    expect(billing.status).toBe('BILLED')
  })

  it('ไม่รับงานเพิ่มที่เป็นลูกค้าอื่น ประเภทงานอื่น ยังไม่ยืนยันจบงาน หรืออยู่ในใบวางบิลอื่น', () => {
    const { bookingStore, salesDocs, inBilling, billing } = setup()
    const otherCustomer = job({ customer: 'ลูกค้า B' })
    const otherFeed = job({ category: 'ceramics' })
    const notConfirmed = job({ podReviewStatus: 'APPROVED' })
    const inOtherBilling = job({ billingNoteDocId: 'other-billing' })
    bookingStore.bookings.push(otherCustomer, otherFeed, notConfirmed, inOtherBilling)

    for (const bad of [otherCustomer, otherFeed, notConfirmed, inOtherBilling]) {
      expect(salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem, sourceBillingId: billing.id, bookingIds: [inBilling.id, bad.id] })).toBeNull()
    }
    expect(inBilling.taxInvoiceDocId).toBeUndefined()
    expect(billing.status).toBe('BILLING_PENDING')
  })

  it('prefill ใช้รายการของใบวางบิลเฉพาะงานที่เลือก และ bookingIds รวมงานที่เพิ่ม', () => {
    const { bookingStore, salesDocs, inBilling, extra, billing } = setup()
    expect(unclaimedBillingGroups(billing, bookingStore.bookings)).toEqual([{ category: 'cements', bookingIds: [inBilling.id] }])
    const prefill = buildPrefillFromBilling(billing, salesDocs.itemsForDocument(billing.id), bookingStore.bookings, [inBilling.id], [inBilling.id, extra.id])
    expect(prefill.items.map((i) => i.deliveryNo)).toEqual([inBilling.docNo])
    expect(prefill.bookingIds).toEqual([inBilling.id, extra.id])
    expect(prefill.sourceId).toBe(billing.id)
  })
})
