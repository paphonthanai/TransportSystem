export type DiscountableRow = {
  qty: number
  unitPrice: number
  discountMode?: 'percent' | 'fixed'
  discountPercent?: number
  discountAmount?: number
}

/** ส่วนลดรายการนี้เป็นบาท ไม่ว่าจะตั้งเป็นโหมด % หรือจำนวนเงินตายตัว — โหมด fixed ถูกจำกัดไม่ให้เกินยอดก่อนหักส่วนลดของรายการนั้น */
export function computeRowDiscountBaht(row: DiscountableRow): number {
  const subtotal = row.qty * row.unitPrice
  return row.discountMode === 'fixed' ? Math.min(row.discountAmount || 0, subtotal) : subtotal * ((row.discountPercent || 0) / 100)
}

export function computeRowAmount(row: DiscountableRow): number {
  return row.qty * row.unitPrice - computeRowDiscountBaht(row)
}

export function computeRowVat(row: DiscountableRow & { vatRate?: number }): number {
  return (computeRowAmount(row) * (row.vatRate || 0)) / 100
}

export function computeRowWht(row: DiscountableRow & { whtRate?: number }): number {
  return (computeRowAmount(row) * (row.whtRate || 0)) / 100
}

export type TaxableRow = DiscountableRow & { vatRate?: number; whtRate?: number }

export interface DocumentTotals {
  /** ผลรวมยอดหลังหักส่วนลดของทุกรายการ (ก่อนภาษี) */
  amount: number
  /** ผลรวมส่วนลดของทุกรายการเป็นบาท */
  discountTotal: number
  /** ผลรวม VAT ของทุกรายการ (แต่ละรายการคิดจาก vatRate ของตัวเอง ไม่ใช่อัตราเดียวคูณยอดรวม) */
  vatAmount: number
  /** อัตรา VAT ไว้แสดงผลเท่านั้น — มีค่าต่อเมื่อทุกรายการที่ "เลือกคิดภาษี" ใช้อัตราเดียวกัน ไม่งั้นปล่อยว่าง (ผสมหลายอัตรา ไม่มีอัตราเดียวที่ถูกต้อง) */
  vatRate?: number
  /** ผลรวมหัก ณ ที่จ่ายของทุกรายการ */
  whtAmount: number
}

/**
 * รวมยอด/ส่วนลด/VAT/WHT จากรายการทั้งหมดของเอกสาร ที่เดียวที่ใช้ร่วมกันทุก Create/Edit — แทนที่การ reduce ซ้ำๆ ที่
 * กระจายอยู่หลายจุดใน stores/salesDocuments.ts และหน้าฟอร์มต่างๆ (BillingFormView/TaxInvoiceFormView/
 * ReceiptFormView) ทุกรายการ VAT คิดจาก vatRate ของตัวเอง (แถวที่ไม่ได้ติ๊กเลือกภาษี ต้องส่ง vatRate เป็น
 * undefined/0 มา — computeRowVat จะคิดเป็น 0 ให้อัตโนมัติ) ผลรวมจึงถูกต้องเสมอไม่ว่าจะผสมรายการที่คิด/ไม่คิดภาษีกัน
 * กี่รายการก็ตาม (ดู Tax (%) Checkbox ใน BillingFormView.vue/TaxInvoiceFormView.vue/ReceiptFormView.vue/
 * QuotationFormView.vue/DocumentConvertView.vue)
 */
export function computeDocumentTotals(rows: TaxableRow[]): DocumentTotals {
  const amount = Math.round(rows.reduce((sum, r) => sum + computeRowAmount(r), 0))
  const discountTotal = Math.round(rows.reduce((sum, r) => sum + computeRowDiscountBaht(r), 0))
  const vatAmount = Math.round(rows.reduce((sum, r) => sum + computeRowVat(r), 0))
  const whtAmount = Math.round(rows.reduce((sum, r) => sum + computeRowWht(r), 0))
  const taxedRates = new Set(rows.filter((r) => r.vatRate).map((r) => r.vatRate))
  const vatRate = taxedRates.size === 1 ? [...taxedRates][0] : undefined
  return { amount, discountTotal, vatAmount, vatRate, whtAmount }
}
