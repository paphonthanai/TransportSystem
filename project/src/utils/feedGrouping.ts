import type { Booking } from '@/types'
import { categoryFeedLabel } from './bookingStatus'

/** สับเซตของ PrintRow (InvoiceDocumentView.vue) ที่ logic นี้ต้องใช้จริง — แยกออกมาเป็น util function ล้วน (ไม่พึ่ง
 *  Vue component/store) เพื่อให้ unit test ได้ตรงๆ โดยไม่ต้อง mount component หรือง้อ Pinia/Firestore */
export interface FeedGroupSourceRow {
  deliveryNo?: string
  shipDate?: Date
  unitPrice: number
  amount: number
}

export interface FeedGroup {
  feed: string
  dateLabel: string
  qty: number
  unitPrice: number
  amount: number
}

export function formatDateSlashFullYear(date: Date): string {
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear() + 543}`
}

/** "Feed" ของรายการหนึ่งแถว = booking.category ของงานขนส่งต้นทาง (Cement/Ceramic) หาโดย join กลับไปที่ Booking ผ่าน
 *  deliveryNo (=booking.docNo เสมอ ดู createBillingFromBookings/createTaxInvoiceFromBookings) — "ห้าม" ใช้ productId/
 *  JobItem.product แทน เพราะเป็น free text ต่อปลายทาง/รหัสงาน (เช่น เลขที่ Site) ไม่ใช่ตัวแบ่งกลุ่มรายได้ที่แท้จริง — หา
 *  Booking ไม่เจอ (เช่น รายการกรอกเอง ไม่มี deliveryNo) ถือว่าไม่ทราบ Feed */
export function feedForRow(row: FeedGroupSourceRow, bookings: Booking[]): string {
  if (!row.deliveryNo) return ''
  const booking = bookings.find((b) => b.docNo === row.deliveryNo)
  return booking ? categoryFeedLabel[booking.category] : ''
}

/**
 * จัดกลุ่มรายการตาม Feed แล้วยุบแต่ละกลุ่มเหลือกลุ่มเดียว (ดู InvoiceDocumentView.vue's feedGroups computed สำหรับ
 * หมายเหตุการออกแบบเต็มๆ) — หา Feed ไม่ได้แม้แต่แถวเดียว (เอกสารกรอกเอง/จากใบเสนอราคา ไม่มี Booking ผูกอยู่) → คืน
 * อาเรย์ว่าง ให้ผู้เรียก fallback เป็นแสดงรายการดิบแทน
 */
export function groupRowsByFeed(rows: FeedGroupSourceRow[], bookings: Booking[]): FeedGroup[] {
  if (rows.length === 0) return []
  const withFeed = rows.map((row) => ({ row, feed: feedForRow(row, bookings) }))
  if (withFeed.some(({ feed }) => !feed)) return []
  const order: string[] = []
  const groups = new Map<string, FeedGroupSourceRow[]>()
  withFeed.forEach(({ row, feed }) => {
    if (!groups.has(feed)) {
      groups.set(feed, [])
      order.push(feed)
    }
    groups.get(feed)!.push(row)
  })
  return order.map((feed) => {
    const groupRows = groups.get(feed)!
    const dates = groupRows
      .map((r) => r.shipDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())
    const start = dates[0]
    const end = dates[dates.length - 1]
    const dateLabel = start ? (end && end.toDateString() !== start.toDateString() ? `${formatDateSlashFullYear(start)} - ${formatDateSlashFullYear(end)}` : formatDateSlashFullYear(start)) : ''
    const qty = groupRows.length
    const amount = Math.round(groupRows.reduce((sum, r) => sum + r.amount, 0))
    /** ราคาต่อหน่วย = ราคาจริงถ้าทุกเที่ยวในกลุ่มเดียวกันเท่ากันหมด (กรณีปกติ) ไม่งั้นเฉลี่ยจาก amount/qty (กรณีราคาไม่เท่ากัน
     *  ในบางเที่ยว) — คงค่า "จำนวน × ราคาต่อหน่วย = ยอดรวม" ให้ตรงเป๊ะเมื่อราคาสม่ำเสมอ (กรณีส่วนใหญ่) */
    const uniquePrices = new Set(groupRows.map((r) => r.unitPrice))
    const unitPrice = uniquePrices.size === 1 ? groupRows[0].unitPrice : Math.round(amount / qty)
    return { feed, dateLabel, qty, unitPrice, amount }
  })
}
