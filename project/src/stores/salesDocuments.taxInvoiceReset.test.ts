import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'

beforeEach(() => {
  setActivePinia(createPinia())
})

const oneItem = [{ description: 'ค่าบริการ', qty: 1, unit: 'งาน', unitPrice: 1000, amount: 1000, discountMode: 'percent' as const, discountPercent: 0, discountAmount: 0 }]

/**
 * Phase 2 — resetTaxInvoice เอง (salesDocuments.ts:2193) ไม่ได้ถูกแก้ในรอบนี้ (แค่ UX ของ TaxInvoiceListView.vue)
 * แต่ยังไม่เคยมี test คุมพฤติกรรมนี้เลยสักเคส — เพิ่มไว้ป้องกัน regression: reset ต้องทำให้แก้ไขข้อมูลต่อได้จริง
 * (ไม่ใช่แค่เปลี่ยน status เฉยๆ) และต้องยังบล็อกกรณี PAID/มีใบเสร็จอ้างอิงแล้วเหมือนเดิมทุกประการ
 */
describe('resetTaxInvoice: reset back to DRAFT must leave the document genuinely editable', () => {
  it('resets a SENT invoice to DRAFT, and the document can then be edited and saved via updateTaxInvoiceManual', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    salesDocs.sendInvoice(invoice.id)
    expect(invoice.status).toBe('SENT')

    const result = salesDocs.resetTaxInvoice(invoice.id)

    expect(result.ok).toBe(true)
    expect(invoice.status).toBe('DRAFT')

    // ต้องแก้ไขข้อมูลต่อได้จริง ไม่ใช่แค่สถานะเปลี่ยนเฉยๆ (นี่คือสิ่งที่ PM รายงานว่า "reset แล้วแก้ไม่ได้")
    const updated = salesDocs.updateTaxInvoiceManual(invoice.id, {
      customer: 'ลูกค้า A (แก้ไขแล้ว)',
      items: oneItem,
      reference: 'แก้ไขหลัง Reset',
    })

    expect(updated).not.toBeNull()
    expect(updated!.customer).toBe('ลูกค้า A (แก้ไขแล้ว)')
    expect(updated!.reference).toBe('แก้ไขหลัง Reset')
  })

  it('does not touch items/amount/bookingIds when resetting — only status changes', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    salesDocs.sendInvoice(invoice.id)
    const amountBefore = invoice.amount
    const itemsBefore = JSON.stringify(salesDocs.itemsForDocument(invoice.id))
    const bookingIdsBefore = JSON.stringify(invoice.bookingIds)

    salesDocs.resetTaxInvoice(invoice.id)

    expect(invoice.amount).toBe(amountBefore)
    expect(JSON.stringify(salesDocs.itemsForDocument(invoice.id))).toBe(itemsBefore)
    expect(JSON.stringify(invoice.bookingIds)).toBe(bookingIdsBefore)
  })

  it('refuses to reset a PAID invoice (guard unchanged)', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    salesDocs.sendInvoice(invoice.id)
    salesDocs.recordTaxInvoicePayment(invoice.id, {})
    expect(invoice.status).toBe('PAID')

    const result = salesDocs.resetTaxInvoice(invoice.id)

    expect(result.ok).toBe(false)
    expect(invoice.status).toBe('PAID')
  })

  it('refuses to reset when a receipt already references this invoice as a source document', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    salesDocs.sendInvoice(invoice.id)
    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')
    expect(receipt).not.toBeNull()

    const result = salesDocs.resetTaxInvoice(invoice.id)

    expect(result.ok).toBe(false)
    expect(invoice.status).toBe('SENT')
  })
})
