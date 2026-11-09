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

/** ข้อความสินค้าในรายละเอียดเอกสาร (วางบิล/ใบกำกับภาษี/ใบเสร็จ) — ชื่อปูนทุกชนิดในเที่ยว ไม่มีจำนวนตัน ตามที่ลูกค้าขอ
 *  ("M500 + M400 + M200") ชนิดเดียวแสดงแค่ชื่อ ("M300") */
export const bookingProductsText = (b: ProductSource): string => bookingProductNames(b).join(' + ')
