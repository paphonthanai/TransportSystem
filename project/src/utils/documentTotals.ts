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
