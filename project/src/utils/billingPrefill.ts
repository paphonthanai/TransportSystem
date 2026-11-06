import type { SalesDocument, SalesDocumentItem } from '@/stores/salesDocuments'
import type { DocumentPrefillPayload } from '@/stores/documentPrefill'
import type { Booking, BookingCategory } from '@/types'

/**
 * จัดกลุ่มงานขนส่งของใบวางบิลตามประเภทงาน (Feed = booking.category) เฉพาะงานที่ยังไม่ถูกดึงไปออกใบแจ้งหนี้ (taxInvoiceDocId)
 * ใบวางบิลใหม่มี Feed เดียวเสมอ (บังคับตอนสร้าง) หลายกลุ่มเกิดได้แค่กับใบวางบิลเก่า ต้องออกใบแจ้งหนี้ทีละ Feed
 */
export function unclaimedBillingGroups(doc: Pick<SalesDocument, 'bookingIds'>, bookings: Booking[]): Array<{ category: BookingCategory; bookingIds: string[] }> {
  const groups = new Map<BookingCategory, string[]>()
  doc.bookingIds.forEach((bid) => {
    const b = bookings.find((bk) => bk.id === bid)
    if (!b || b.taxInvoiceDocId) return
    groups.set(b.category, [...(groups.get(b.category) || []), bid])
  })
  return [...groups.entries()].map(([category, bookingIds]) => ({ category, bookingIds }))
}

/**
 * ข้อมูลใบวางบิลสำหรับเติมหน้า "สร้างใบแจ้งหนี้" (/tax-invoices/new) — รายการใช้ของใบวางบิลเดิมเฉพาะงานที่เลือก
 * (จับคู่ด้วย deliveryNo = booking.docNo) ส่วน bookingIds คืองานทั้งหมดที่จะผูกกับใบแจ้งหนี้ รวมงานที่เลือกเพิ่มนอกใบวางบิลด้วย
 * (รายการของงานที่เพิ่มเข้ามา หน้าสร้างใบแจ้งหนี้สร้างแถวเองจากงานนั้น — ดู extraBookingIds ใน TaxInvoiceFormView.vue)
 */
export function buildPrefillFromBilling(
  doc: SalesDocument,
  items: SalesDocumentItem[],
  bookings: Booking[],
  billingBookingIds: string[],
  allBookingIds: string[] = billingBookingIds
): DocumentPrefillPayload {
  const docNos = new Set(billingBookingIds.map((bid) => bookings.find((b) => b.id === bid)?.docNo).filter(Boolean))
  return {
    sourceType: 'BILLING',
    sourceId: doc.id,
    sourceNumber: doc.number,
    customer: doc.customer,
    items: items.filter((i) => !!i.deliveryNo && docNos.has(i.deliveryNo)).map(({ id, documentId, sortOrder, ...rest }) => rest),
    bookingIds: allBookingIds,
    reference: doc.number,
    creditDays: doc.creditDays,
    customerAddress: doc.customerAddress,
    customerZipCode: doc.customerZipCode,
    customerTaxId: doc.customerTaxId,
    customerBranchName: doc.customerBranchName,
    project: doc.project,
    salesperson: doc.salesperson,
    currencyCode: doc.currencyCode,
    warehouse: doc.warehouse,
    priceMode: doc.priceMode,
    description: doc.description,
    note: doc.note,
    internalNote: doc.internalNote,
    attachmentImage: doc.attachmentImage,
    useESignature: doc.useESignature,
    discountTotal: doc.discountTotal,
    vatAmount: doc.vatAmount,
    whtAmount: doc.whtAmount,
  }
}
