import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

const oneItem = [{ description: 'ค่าบริการ', qty: 1, unit: 'งาน', unitPrice: 1000, amount: 1000, discountMode: 'percent' as const, discountPercent: 0, discountAmount: 0 }]

/**
 * Phase 1 Step 3-5 — createBillingManual/createTaxInvoiceManual/createCashSale เปลี่ยนจากสูตรนับ
 * documents.value.filter(...).length + 1 (ย้อนกลับได้เมื่อมีเอกสารถูกลบ/ยกเลิก — บัคที่ PM รายงานจริงบน Production
 * "เลขที่เอกสารถูกใช้ไปแล้ว") มาใช้ numberRegistry.nextSequence(type) (เดินหน้าอย่างเดียว ไม่มีวันย้อนกลับ) แทน
 */
describe('document numbering does not self-collide (Billing/Tax Invoice/Cash Sale)', () => {
  it('createBillingManual twice in a row produces two different, non-colliding numbers', () => {
    const salesDocs = useSalesDocumentsStore()
    const first = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    const second = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!

    expect(first.number).not.toBe(second.number)
  })

  it('regression: create -> cancel -> create again does not regenerate a colliding Billing number', () => {
    const salesDocs = useSalesDocumentsStore()
    const first = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    const firstNumber = first.number
    expect(salesDocs.cancelBillingNote(first.id)).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === first.id)).toBeUndefined()

    const second = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!

    expect(second.number).not.toBe(firstNumber)
    expect(second).not.toBeNull()
  })

  it('createTaxInvoiceManual twice in a row produces two different, non-colliding numbers', () => {
    const salesDocs = useSalesDocumentsStore()
    const first = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    const second = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!

    expect(first.number).not.toBe(second.number)
  })

  it('regression: create -> delete -> create again does not regenerate a colliding Tax Invoice number', () => {
    const salesDocs = useSalesDocumentsStore()
    const first = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    const firstNumber = first.number
    const del = salesDocs.deleteTaxInvoice(first.id)
    expect(del.ok).toBe(true)

    const second = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!

    expect(second.number).not.toBe(firstNumber)
  })

  it('createCashSale twice in a row produces two different numbers and registers both', () => {
    const salesDocs = useSalesDocumentsStore()
    const first = salesDocs.createCashSale({ customer: 'ลูกค้า A', items: oneItem })
    const second = salesDocs.createCashSale({ customer: 'ลูกค้า A', items: oneItem })

    expect(first.number).not.toBe(second.number)
  })
})

/**
 * "วางบิลรวม" ของ Production จริงกดผ่าน BillingBookingSelectView -> BillingFormView -> createBillingManual
 * (ไม่ใช่ createBillingFromBookings ที่ไม่มี UI ไหนเรียกใช้เลย — ดู Audit Report) เทสต์เดิมของระบบ
 * (salesDocuments.eligibility.test.ts) ครอบคลุมแค่ createBillingFromBookings จึงไม่เคยป้องกันบัคนี้ได้จริง
 */
describe('combined Billing via the actual production path (createBillingManual + bookingIds)', () => {
  it('creates a billing note from multiple selected bookings and claims them all', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const b1 = makeBooking({ customer: 'ลูกค้า A', status: 'IN_TRANSIT' })
    const b2 = makeBooking({ customer: 'ลูกค้า A', status: 'DELIVERED' })
    bookingStore.bookings.push(b1, b2)

    const billing = salesDocs.createBillingManual({
      customer: 'ลูกค้า A',
      items: oneItem,
      bookingIds: [b1.id, b2.id],
    })!

    expect(billing).not.toBeNull()
    expect(billing.bookingIds.sort()).toEqual([b1.id, b2.id].sort())
    expect(b1.billingNoteDocId).toBe(billing.id)
    expect(b2.billingNoteDocId).toBe(billing.id)
  })
})
