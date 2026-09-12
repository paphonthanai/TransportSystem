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

/**
 * PM-requested verification pass for the Phase 1 Step 3-5 fix (5 explicit cases, asserted one-by-one so a future
 * regression points at exactly which guarantee broke): create -> next number, cancel -> number not reused in
 * Phase 1, create again -> no collision, unrelated existing documents/items stay untouched, and Document ID
 * references still resolve to the correct (new) document after the cancel+recreate cycle.
 */
describe('Phase 1 verification: create -> cancel -> create cycle preserves everything else', () => {
  it('case 1: creating a document assigns the next sequence number', () => {
    const salesDocs = useSalesDocumentsStore()
    const doc = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    expect(doc.number).toMatch(/^VB\d{8}0001$/)
  })

  it('case 2-3: cancelling a document keeps auto-generated numbers moving forward without colliding', () => {
    const salesDocs = useSalesDocumentsStore()
    const cancelled = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    const cancelledNumber = cancelled.number
    salesDocs.cancelBillingNote(cancelled.id)

    // case 3: ปล่อยให้ระบบออกเลขอัตโนมัติต่อ (ไม่ระบุ number เอง) ต้องได้เลขใหม่ที่ไม่ชนเลขที่ถูกยกเลิกไปแล้ว
    // (ตั้งแต่ Phase 4 เป็นต้นไป "พิมพ์เลขเดิมเองตรงๆ" ไม่ถูกปฏิเสธทันทีอีกต่อไปแล้ว — กลายเป็นกรณี reuse ที่อนุญาตได้
    // ถ้าปลอดภัย ดู salesDocuments.documentNumberReuse.test.ts สำหรับพฤติกรรม reuse โดยละเอียด)
    const next = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    expect(next).not.toBeNull()
    expect(next.number).not.toBe(cancelledNumber)
  })

  it('case 4: an unrelated pre-existing document (and its line items) stay byte-for-byte unchanged', () => {
    const salesDocs = useSalesDocumentsStore()
    const controlDoc = salesDocs.createBillingManual({ customer: 'ลูกค้าควบคุม (ไม่เกี่ยวข้อง)', items: oneItem, reference: 'CONTROL-REF' })!
    const controlSnapshot = JSON.stringify(controlDoc)
    const controlItemsSnapshot = JSON.stringify(salesDocs.itemsForDocument(controlDoc.id))

    // ทำ cycle สร้าง->ยกเลิก->สร้างใหม่ ของเอกสารอื่นที่ไม่เกี่ยวข้องกันเลย
    const other = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    salesDocs.cancelBillingNote(other.id)
    salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })

    const controlDocAfter = salesDocs.documents.find((d) => d.id === controlDoc.id)
    expect(controlDocAfter).toBeDefined()
    expect(JSON.stringify(controlDocAfter)).toBe(controlSnapshot)
    expect(JSON.stringify(salesDocs.itemsForDocument(controlDoc.id))).toBe(controlItemsSnapshot)
  })

  it('case 5: Document ID references still resolve correctly after a cancel + recreate cycle (never fall back to documentNo)', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({ customer: 'ลูกค้า A', status: 'IN_TRANSIT' })
    bookingStore.bookings.push(booking)

    const firstBilling = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, bookingIds: [booking.id] })!
    expect(booking.billingNoteDocId).toBe(firstBilling.id)

    salesDocs.cancelBillingNote(firstBilling.id)
    // ยกเลิกแล้วต้องคืนสถานะการอ้างอิงของ booking กลับเป็นว่าง ไม่ค้างชี้ไปที่ Document ID ที่ถูกลบไปแล้ว
    expect(booking.billingNoteDocId).toBeUndefined()

    const secondBilling = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, bookingIds: [booking.id] })!
    // อ้างอิงใหม่ต้องชี้ไปที่ Document ID ของเอกสารใหม่ (คนละ id กับเอกสารที่ถูกยกเลิกไปแล้วเป๊ะ) แม้จะเป็น booking เดิม
    expect(booking.billingNoteDocId).toBe(secondBilling.id)
    expect(booking.billingNoteDocId).not.toBe(firstBilling.id)
    expect(secondBilling.id).not.toBe(firstBilling.id)
  })
})
