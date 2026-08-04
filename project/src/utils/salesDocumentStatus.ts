import type { SalesDocumentType, SalesDocumentStatus } from '@/stores/salesDocuments'

export const salesDocumentTypeLabel: Record<SalesDocumentType, string> = {
  QUOTATION: 'ใบเสนอราคา',
  SALES_ORDER: 'ใบสั่งสินค้า',
  BILLING: 'ใบวางบิล',
  TAX_INVOICE: 'ใบแจ้งหนี้',
  RECEIPT: 'ใบเสร็จรับเงิน',
  CASH_SALE: 'ขายเงินสด',
  PURCHASE_ORDER: 'ใบสั่งซื้อ',
}

/**
 * ความหมายของสถานะเดียวกัน (เช่น 'PAID') ต่างกันไปตามประเภทเอกสาร จึงต้อง lookup ผ่าน type ก่อน
 * ไม่ใช่ Record<SalesDocumentStatus, string> เดี่ยวๆ
 */
const labelsByType: Record<SalesDocumentType, Partial<Record<SalesDocumentStatus, string>>> = {
  QUOTATION: {
    DRAFT: 'ร่าง',
    WAITING_APPROVAL: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
    CONVERTED: 'แปลงเป็นเอกสารแล้ว',
    PROCESSED: 'ดำเนินการแล้ว',
  },
  SALES_ORDER: {
    WAITING_APPROVAL: 'รออนุมัติ',
    APPROVED: 'อนุมัติแล้ว',
    REJECTED: 'ไม่อนุมัติ',
    CONVERTED: 'สร้าง Booking แล้ว',
  },
  BILLING: {
    BILLING_PENDING: 'รอวางบิล',
    BILLED: 'วางบิลแล้ว',
    WAITING_PAYMENT: 'รอชำระเงิน',
    PAID: 'ชำระแล้ว',
    CLOSED: 'ปิดรายการแล้ว',
  },
  TAX_INVOICE: {
    DRAFT: 'ร่าง',
    SENT: 'ส่งแล้ว',
    PAID: 'ชำระแล้ว',
  },
  RECEIPT: {
    DRAFT: 'รอดำเนินการ',
    PAID: 'เก็บเงินแล้ว',
  },
  CASH_SALE: {
    PAID: 'ชำระแล้ว',
  },
  PURCHASE_ORDER: {
    ISSUED: 'ออกแล้ว',
  },
}

const classesByType: Record<SalesDocumentType, Partial<Record<SalesDocumentStatus, string>>> = {
  QUOTATION: {
    DRAFT: 'bg-gray-100 text-gray-700',
    WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-cyan-100 text-cyan-700',
    REJECTED: 'bg-red-100 text-red-700',
    CONVERTED: 'bg-green-100 text-green-700',
    PROCESSED: 'bg-teal-100 text-teal-700',
  },
  SALES_ORDER: {
    WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-cyan-100 text-cyan-700',
    REJECTED: 'bg-red-100 text-red-700',
    CONVERTED: 'bg-green-100 text-green-700',
  },
  BILLING: {
    BILLING_PENDING: 'bg-amber-100 text-amber-700',
    BILLED: 'bg-blue-100 text-blue-700',
    WAITING_PAYMENT: 'bg-purple-100 text-purple-700',
    PAID: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  },
  TAX_INVOICE: {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
  },
  RECEIPT: {
    DRAFT: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
  },
  CASH_SALE: {
    PAID: 'bg-green-100 text-green-700',
  },
  PURCHASE_ORDER: {
    ISSUED: 'bg-green-100 text-green-700',
  },
}

export const salesDocumentStatusLabel = (type: SalesDocumentType, status: SalesDocumentStatus): string => labelsByType[type][status] ?? status

export const salesDocumentStatusClass = (type: SalesDocumentType, status: SalesDocumentStatus): string =>
  classesByType[type][status] ?? 'bg-gray-100 text-gray-700'
