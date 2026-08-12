import type { SalesDocument } from '@/stores/salesDocuments'
import type { Booking } from '@/types'

export interface DocumentTraceResult {
  salesOrders: SalesDocument[]
  billingNotes: SalesDocument[]
  taxInvoices: SalesDocument[]
  receipts: SalesDocument[]
  bookings: Booking[]
}

/**
 * ไล่ Trace เอกสารทั้งสาย (Sales Order ↔ Billing Note ↔ Tax Invoice ↔ Receipt ↔ Booking) จากเอกสารเริ่มต้นที่เป็น
 * "จุดไหนของสาย" ก็ได้ ไม่จำกัดแค่ Receipt เหมือน traceReceiptChain เดิม — ใช้ Reference จริงที่มีอยู่แล้วในข้อมูล
 * เท่านั้น (bookingIds/parentDocumentId/sourceDocumentIds/convertedToDocumentIds/Booking.sourceDocumentId) ไม่มีการ
 * เดาความสัมพันธ์จากชื่อหรือเลขที่เอกสารเลย ไม่มีการอ่าน Firestore เพิ่ม (ใช้ข้อมูลที่ store โหลดไว้แล้ว)
 *
 * หมายเหตุ: Sales Order ที่สร้างจาก Booking (createSalesOrderForBooking/createBillingFromBookings) ไม่มี field
 * ID ใดๆ เชื่อมตรงจาก Billing กลับไปยัง Sales Order เลย (Billing เก็บแค่ bookingIds) — เชื่อมได้ทางเดียวคือผ่าน
 * Booking ร่วมกัน (Booking.sourceDocumentId ชี้กลับไปยัง Sales Order) จึงต้อง Trace ผ่าน Booking เป็นตัวกลางเสมอ
 * สำหรับเส้นทางนี้ — ไม่ใช่การเดา เพราะ Booking.sourceDocumentId เป็น Reference จริงที่บันทึกไว้ตอนสร้างงาน
 */
export function traceDocumentChain(doc: SalesDocument, documents: SalesDocument[], bookings: Booking[]): DocumentTraceResult {
  const byId = (id?: string) => (id ? documents.find((d) => d.id === id) : undefined)

  let billing: SalesDocument | undefined
  let taxInvoice: SalesDocument | undefined
  let receipt: SalesDocument | undefined
  let salesOrderSelf: SalesDocument | undefined

  if (doc.type === 'RECEIPT') {
    receipt = doc
    taxInvoice = documents.find((d) => d.type === 'TAX_INVOICE' && (doc.sourceDocumentIds || []).includes(d.id))
    billing = taxInvoice ? byId(taxInvoice.parentDocumentId) : documents.find((d) => d.type === 'BILLING' && (doc.sourceDocumentIds || []).includes(d.id))
  } else if (doc.type === 'TAX_INVOICE') {
    taxInvoice = doc
    billing = byId(doc.parentDocumentId)
    receipt = documents.find((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(doc.id))
  } else if (doc.type === 'BILLING') {
    billing = doc
  } else if (doc.type === 'SALES_ORDER') {
    salesOrderSelf = doc
    /*
     * เดินหน้าจาก Sales Order ไปยัง Billing — ไม่มี field ID ตรงจาก Sales Order ไปยัง Billing เลย (ดูหมายเหตุด้านบน)
     * เชื่อมได้ทางเดียวคือผ่าน Booking ร่วมกัน (bookingIds ที่ทั้งสองเอกสารเก็บ id ของ Booking เดียวกันจริง — Reference
     * จริง ไม่ใช่การเดา) เอา Billing ที่ bookingIds ทับซ้อนกับของ Sales Order นี้
     */
    const soBookingIds = new Set(doc.bookingIds || [])
    billing = documents.find((d) => d.type === 'BILLING' && (d.bookingIds || []).some((id) => soBookingIds.has(id)))
  }

  // ต่อจาก Billing (ไม่ว่าจะเป็นจุดเริ่มต้นเอง หรือเดินหน้ามาจาก Sales Order ข้างบน) ไปยัง Tax Invoice/Receipt ต่อด้วย Reference จริงเสมอ
  if (billing && !taxInvoice) {
    taxInvoice = documents.find((d) => d.type === 'TAX_INVOICE' && d.parentDocumentId === billing!.id)
  }
  if (billing && !receipt) {
    receipt =
      documents.find((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(billing!.id)) ||
      (taxInvoice ? documents.find((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(taxInvoice!.id)) : undefined)
  }

  // Booking ที่เกี่ยวข้อง — รวม bookingIds จากทุกเอกสารในสายที่เจอ (ปกติจะเป็นชุดเดียวกัน เพราะเอกสารต่อเนื่องกันมาจาก Booking เดียวกันเสมอ)
  const bookingIds = new Set<string>([
    ...(doc.bookingIds || []),
    ...(billing?.bookingIds || []),
    ...(taxInvoice?.bookingIds || []),
    ...(receipt?.bookingIds || []),
  ])
  const chainBookings = bookings.filter((b) => bookingIds.has(b.id))

  // Sales Order เชื่อมผ่าน Booking.sourceDocumentId (Reference จริง) — ไม่มี doc-to-doc id ตรงจาก Billing/TaxInvoice/Receipt กลับไปยัง Sales Order เลย
  const salesOrders = salesOrderSelf
    ? [salesOrderSelf]
    : documents.filter((d) => d.type === 'SALES_ORDER' && chainBookings.some((b) => b.sourceDocumentId === d.id))

  return {
    salesOrders,
    billingNotes: billing ? [billing] : [],
    taxInvoices: taxInvoice ? [taxInvoice] : [],
    receipts: receipt ? [receipt] : [],
    bookings: chainBookings,
  }
}
