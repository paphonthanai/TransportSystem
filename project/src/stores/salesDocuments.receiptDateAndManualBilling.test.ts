import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'
import { buildPrefillFromBilling } from '@/utils/billingPrefill'

beforeEach(() => {
  setActivePinia(createPinia())
})

const invoiceForReceipt = () => {
  const bookingStore = useBookingStore()
  const salesDocs = useSalesDocumentsStore()
  const booking = makeBooking({ status: 'DELIVERED' })
  bookingStore.bookings.push(booking)
  const billing = salesDocs.createBillingFromBookings([booking.id])!
  return salesDocs.createInvoiceFromBilling(billing.id)!
}

/** บั๊กจริง: หน้าสร้างใบเสร็จเปลี่ยนวันที่แล้ว เอกสารยังเป็นวันที่วันนี้ (ช่องวันที่ไม่ถูกส่งไปบันทึกเลย) */
describe('วันที่ใบเสร็จตามที่เลือกในฟอร์ม', () => {
  it('สร้างใบเสร็จใช้วันที่ที่เลือก', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = invoiceForReceipt()
    const picked = new Date('2026-11-25')
    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE', { date: picked })!
    expect(receipt.doc.date.getTime()).toBe(picked.getTime())
  })

  it('แก้ไขใบเสร็จเปลี่ยนวันที่ได้', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = invoiceForReceipt()
    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')!
    const picked = new Date('2026-11-30')
    const updated = salesDocs.updateReceiptFromSourceDocs(receipt.doc.id, [invoice.id], 'TAX_INVOICE', { date: picked })!
    expect(updated.doc.date.getTime()).toBe(picked.getTime())
  })
})

/** บั๊กจริง: ช่องอื่นในหน้าสร้างใบเสร็จ (ที่อยู่/รหัสไปรษณีย์/เลขผู้เสียภาษี/พนักงานขาย/หมายเหตุ/หมายเหตุภายใน/ลายเซ็น) กรอกแล้วไม่ถูกบันทึก */
describe('ช่องอื่นในหน้าสร้างใบเสร็จถูกบันทึก', () => {
  const fields = {
    customerAddress: '99 ถนนทดสอบ',
    customerZipCode: '18000',
    customerTaxId: '0105555555555',
    salesperson: 'พนักงาน ข',
    useESignature: false,
    note: 'หมายเหตุลูกค้า',
    internalNote: 'หมายเหตุภายใน',
  }

  it('สร้างใบเสร็จเก็บทุกช่อง', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = invoiceForReceipt()
    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE', fields)!
    expect(receipt.doc).toMatchObject(fields)
  })

  it('แก้ไขใบเสร็จเปลี่ยนทุกช่องได้', () => {
    const salesDocs = useSalesDocumentsStore()
    const invoice = invoiceForReceipt()
    const receipt = salesDocs.createReceiptFromSourceDocs([invoice.id], 'TAX_INVOICE')!
    const updated = salesDocs.updateReceiptFromSourceDocs(receipt.doc.id, [invoice.id], 'TAX_INVOICE', fields)!
    expect(updated.doc).toMatchObject(fields)
  })
})

/** บั๊กจริง: ใบวางบิลแบบกรอกรายการเอง (ไม่มีงานขนส่ง) กด "สร้างใบกำกับภาษี" ขึ้นว่างานถูกดึงไปออกใบแจ้งหนี้หมดแล้ว */
describe('สร้างใบกำกับภาษีจากใบวางบิลที่กรอกรายการเอง', () => {
  it('prefill เอารายการทั้งหมดของใบวางบิลไป และบันทึกแล้วใบวางบิลปิดเป็น "วางบิลแล้ว"', () => {
    const salesDocs = useSalesDocumentsStore()
    const billing = salesDocs.createBillingManual({
      customer: 'ลูกค้า ก',
      items: [
        { description: 'ค่าขนส่ง TMS', qty: 3, unit: 'เที่ยว', unitPrice: 1000, amount: 3000, discountMode: 'percent', discountPercent: 0, discountAmount: 0 },
        { description: 'ค่ารอสินค้า', qty: 1, unit: 'ครั้ง', unitPrice: 500, amount: 500, discountMode: 'percent', discountPercent: 0, discountAmount: 0 },
      ],
    } as any)!
    expect(billing.bookingIds).toEqual([])

    const prefill = buildPrefillFromBilling(billing, salesDocs.itemsForDocument(billing.id), useBookingStore().bookings, [])
    expect(prefill.items.map((i) => i.description)).toEqual(['ค่าขนส่ง TMS', 'ค่ารอสินค้า'])

    const invoice = salesDocs.createTaxInvoiceManual({
      customer: prefill.customer,
      items: prefill.items,
      sourceBillingId: billing.id,
      bookingIds: prefill.bookingIds,
    } as any)
    expect(invoice).not.toBeNull()
    expect(invoice!.amount).toBe(3500)
    expect(billing.status).toBe('BILLED')
    expect(billing.convertedToDocumentIds).toContain(invoice!.id)
  })
})
