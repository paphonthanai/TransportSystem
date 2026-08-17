import type { JobItem } from '@/types'

/**
 * ข้อความรายละเอียดงานของใบสั่งสินค้า (SALES_ORDER) — ใช้ร่วมกันทั้งตอนสร้างงานใหม่ (BookingCreateView.vue) และตอนซ่อม
 * ย้อนหลัง (backfillMissingSalesOrders ใน salesDocuments.ts) ให้ได้ฟอร์แมตเดียวกันเป๊ะ
 * รูปแบบ: 1 บรรทัดต่อ 1 รายการสินค้า "{สินค้า} — {ปลายทาง} ({จำนวน} {หน่วย})" ไม่มีวันที่ในข้อความ ปิดท้ายด้วย
 * บรรทัดสรุปจำนวนรวมต่อหน่วย (แยกกลุ่มถ้าหน่วยไม่ตรงกัน เช่น งานเดียวมีทั้งตันและเที่ยว)
 */
export function salesOrderLineDescription(items: JobItem[]): string {
  if (!items.length) return '-'
  const lines = items.map((i) => `${i.product} — ${i.siteName} (${i.qty} ${i.unit})`)
  const totalsByUnit = new Map<string, number>()
  items.forEach((i) => totalsByUnit.set(i.unit, (totalsByUnit.get(i.unit) || 0) + i.qty))
  const totalLine = [...totalsByUnit.entries()].map(([unit, qty]) => `รวม ${qty} ${unit}`).join(', ')
  return [...lines, totalLine].join('\n')
}
