import type { Booking } from '@/types'

type ProductSource = Pick<Booking, 'items'>

export interface ProductTotal {
  product: string
  qty: number
  unit: string
}

/** สินค้าทุกชนิดในงาน = สินค้าหลักของแต่ละปลายทาง + สินค้าอื่นที่ติดไปด้วย (JobItem.extraProducts เช่นปูน 3 ชนิดในเที่ยวเดียว)
 *  รวมจำนวนของชนิด+หน่วยเดียวกันเข้าด้วยกัน เรียงตามลำดับที่เจอ */
export function bookingProductTotals(b: ProductSource): ProductTotal[] {
  const totals = new Map<string, ProductTotal>()
  const add = (product: string | undefined, qty: number | undefined, unit: string | undefined) => {
    const name = product?.trim()
    if (!name) return
    const key = `${name}|${unit || ''}`
    const row = totals.get(key) || { product: name, qty: 0, unit: unit || '' }
    row.qty = Math.round((row.qty + (Number(qty) || 0)) * 1000) / 1000
    totals.set(key, row)
  }
  for (const item of b.items || []) {
    add(item.product, item.qty, item.unit)
    for (const ep of item.extraProducts || []) add(ep.product, ep.qty, ep.unit || item.unit)
  }
  return [...totals.values()]
}

/** ชื่อสินค้าทุกชนิดในงาน (ไม่ซ้ำ) */
export const bookingProductNames = (b: ProductSource): string[] => [...new Set(bookingProductTotals(b).map((p) => p.product))]

/** ข้อความสินค้าในรายละเอียดเอกสาร — ชนิดเดียวแสดงแค่ชื่อเหมือนเดิม ("M300") หลายชนิดแสดงทุกตัวพร้อมจำนวนแยกต่อชนิด
 *  ("M500 5 ตัน + M400 3 ตัน + M200 2 ตัน") ชนิดที่ไม่มีจำนวนแสดงแค่ชื่อ */
export function bookingProductsText(b: ProductSource): string {
  const totals = bookingProductTotals(b)
  if (new Set(totals.map((p) => p.product)).size <= 1) return totals[0]?.product || ''
  return totals.map((p) => (p.qty > 0 ? `${p.product} ${p.qty}${p.unit ? ' ' + p.unit : ''}` : p.product)).join(' + ')
}
