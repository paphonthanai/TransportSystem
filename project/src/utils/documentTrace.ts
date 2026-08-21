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
 *
 * ใบวางบิลหนึ่งใบอาจถูกแยกออกใบแจ้งหนี้ได้มากกว่า 1 ใบ (สินค้าหลาย Feed ต้องแยกออกคนละใบ ดู BillingListView.vue) และ
 * ใบแจ้งหนี้แต่ละใบอาจมีใบเสร็จของตัวเอง — ตอน Trace จากใบวางบิลจึงต้องเก็บ "ทุกใบ" ที่พบ ไม่ใช่ใบแรกที่เจอ (.find) เท่านั้น
 * ไม่งั้นเอกสารปลายทางที่ออกไปแล้วบางใบจะหายไปจากพาแนล Source Chain ที่แสดงบนหน้าใบวางบิลต้นทาง
 */
export function traceDocumentChain(doc: SalesDocument, documents: SalesDocument[], bookings: Booking[]): DocumentTraceResult {
  const byId = (id?: string) => (id ? documents.find((d) => d.id === id) : undefined)

  let billing: SalesDocument | undefined
  let taxInvoices: SalesDocument[] = []
  let receipts: SalesDocument[] = []
  let salesOrderSelf: SalesDocument | undefined

  if (doc.type === 'RECEIPT') {
    receipts = [doc]
    const taxInvoice = documents.find((d) => d.type === 'TAX_INVOICE' && (doc.sourceDocumentIds || []).includes(d.id))
    if (taxInvoice) taxInvoices = [taxInvoice]
    billing = taxInvoice ? byId(taxInvoice.parentDocumentId) : documents.find((d) => d.type === 'BILLING' && (doc.sourceDocumentIds || []).includes(d.id))
  } else if (doc.type === 'TAX_INVOICE') {
    taxInvoices = [doc]
    billing = byId(doc.parentDocumentId)
    receipts = documents.filter((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(doc.id))
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

  // ต่อจาก Billing (ไม่ว่าจะเป็นจุดเริ่มต้นเอง หรือเดินหน้ามาจาก Sales Order ข้างบน) ไปยัง Tax Invoice/Receipt ทุกใบที่พบ
  if (billing && taxInvoices.length === 0) {
    taxInvoices = documents.filter((d) => d.type === 'TAX_INVOICE' && d.parentDocumentId === billing!.id)
  }
  if (billing && receipts.length === 0) {
    const directFromBilling = documents.filter((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(billing!.id))
    const viaTaxInvoices = taxInvoices.flatMap((ti) => documents.filter((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(ti.id)))
    receipts = [...directFromBilling, ...viaTaxInvoices]
  }

  /** Booking ที่เกี่ยวข้อง — ถ้ากำลังดูใบวางบิลเองให้โชว์ทุกงานของใบวางบิลนั้นครบ (เป็นเอกสารต้นทางจริง) ถ้ากำลังดูเอกสาร
   *  ปลายทาง (ใบแจ้งหนี้/ใบเสร็จ) ให้ใช้ bookingIds ของเอกสารปลายทางที่เจาะจงที่สุดเท่านั้น (Receipt > Tax Invoice) ไม่ใช่
   *  ของใบวางบิลทั้งใบ เพราะใบวางบิลที่มีสินค้าหลาย Feed ถูกแยกออกใบแจ้งหนี้หลายใบ แต่ละใบมีแค่ส่วนของตัวเอง */
  const bookingIds = new Set<string>(
    doc.type === 'BILLING'
      ? billing?.bookingIds || []
      : receipts.length
        ? receipts.flatMap((r) => r.bookingIds)
        : taxInvoices.length
          ? taxInvoices.flatMap((t) => t.bookingIds)
          : billing?.bookingIds || doc.bookingIds || []
  )
  const chainBookings = bookings.filter((b) => bookingIds.has(b.id))

  // Sales Order เชื่อมผ่าน Booking.sourceDocumentId (Reference จริง) — ไม่มี doc-to-doc id ตรงจาก Billing/TaxInvoice/Receipt กลับไปยัง Sales Order เลย
  const salesOrders = salesOrderSelf
    ? [salesOrderSelf]
    : documents.filter((d) => d.type === 'SALES_ORDER' && chainBookings.some((b) => b.sourceDocumentId === d.id))

  return {
    salesOrders,
    billingNotes: billing ? [billing] : [],
    taxInvoices,
    receipts,
    bookings: chainBookings,
  }
}
