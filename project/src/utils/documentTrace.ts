import type { SalesDocument } from '@/stores/salesDocuments'
import type { Booking } from '@/types'

export interface ReceiptTraceResult {
  taxInvoices: SalesDocument[]
  billingNotes: SalesDocument[]
  bookings: Booking[]
  salesOrders: SalesDocument[]
}

/**
 * ไล่ย้อนสายเอกสารจากใบเสร็จรับเงินกลับไปจนถึงงานขนส่ง/ใบสั่งสินค้าต้นทาง โดยใช้ความสัมพันธ์ที่มีอยู่แล้วในข้อมูล
 * ล้วนๆ (sourceDocumentIds/parentDocumentId/bookingIds) ไม่มีการอ่าน Firestore เพิ่ม — ใช้ข้อมูลที่ store โหลดไว้แล้ว
 * Receipt → (sourceDocumentIds) → TaxInvoice → (parentDocumentId) → BillingNote → (bookingIds) → Booking → (bookingIds ร่วมกัน) → SalesOrder
 */
export function traceReceiptChain(receipt: SalesDocument, documents: SalesDocument[], bookings: Booking[]): ReceiptTraceResult {
  const taxInvoices = documents.filter((d) => d.type === 'TAX_INVOICE' && (receipt.sourceDocumentIds || []).includes(d.id))

  // ใบวางบิลที่ไปถึงผ่านใบแจ้งหนี้ (เส้นทางเดิม) รวมกับใบวางบิลที่ใบเสร็จอ้างอิงตรง (ข้าม Tax Invoice ไปเลย)
  const billingNoteIds = new Set(taxInvoices.map((inv) => inv.parentDocumentId).filter((id): id is string => !!id))
  const directBillingIds = (receipt.sourceDocumentIds || []).filter((id) => documents.find((d) => d.id === id)?.type === 'BILLING')
  directBillingIds.forEach((id) => billingNoteIds.add(id))
  const billingNotes = documents.filter((d) => d.type === 'BILLING' && billingNoteIds.has(d.id))

  const bookingIds = new Set([...taxInvoices.flatMap((d) => d.bookingIds), ...billingNotes.flatMap((d) => d.bookingIds), ...receipt.bookingIds])
  const chainBookings = bookings.filter((b) => bookingIds.has(b.id))

  const salesOrders = documents.filter((d) => d.type === 'SALES_ORDER' && d.bookingIds.some((id) => bookingIds.has(id)))

  return { taxInvoices, billingNotes, bookings: chainBookings, salesOrders }
}
