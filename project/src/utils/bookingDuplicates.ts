import type { Booking } from '@/types'

/**
 * ตรวจงานซ้ำ — งานเดียวกันถูกสร้าง 2 ครั้ง (เช่น import ไฟล์เดิมซ้ำ หรือกดสร้างซ้ำ)
 * เกณฑ์ตามที่ผู้ใช้กำหนด: เลขชิพเม้นของลูกค้าซ้ำกันในลูกค้าเดียวกัน — ลูกค้าออกเลขชิพเม้นให้เที่ยวละเลข
 * เลขชิพเม้นของลูกค้า = "เลข PO ลูกค้า" (Booking.reference — คอลัมน์ "เลขที่เอกสาร" ตอน import) ไม่ใช่ Booking.po ที่ระบบออกเอง
 * (เดิมเทียบเนื้อหางาน วัน/ลูกค้า/PO/คนขับ/หน้างาน/สินค้า ซึ่งงานจริงที่ส่งซ้ำที่เดิมก็ถูกจับเป็นงานซ้ำ) + เลขที่งาน (docNo)
 * ซ้ำกันตรงๆ งานที่ไม่มีเลขชิพเม้นไม่ถูกตรวจ ผู้ใช้กด "ไม่ใช่งานซ้ำ" เก็บไว้ได้ (ดู duplicateGroupKey)
 */
const norm = (s: string | undefined) => (s || '').replace(/\s+/g, '').toLowerCase()

/** key เลขชิพเม้นของลูกค้า — ว่าง = ไม่มีเลขชิพเม้น (ไม่ตรวจซ้ำ) */
export function shipmentKey(customer: string | undefined, shipmentNo: string | undefined): string {
  const no = norm(shipmentNo)
  return no ? `${norm(customer)}|${no}` : ''
}

export const bookingShipmentKey = (b: Pick<Booking, 'customer' | 'reference'>) => shipmentKey(b.customer, b.reference)

export interface DuplicateGroup {
  reason: 'SAME_DOC_NO' | 'SAME_SHIPMENT'
  bookings: Booking[]
}

/** กลุ่มงานที่น่าจะซ้ำ (กลุ่มละ ≥ 2 งาน) เรียงในกลุ่มตามเวลาที่สร้าง เก่า → ใหม่ (งานแรกคืองานต้นฉบับ) */
export function findDuplicateGroups(bookings: Booking[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const byCreated = (a: Booking, b: Booking) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  const collect = (keyOf: (b: Booking) => string, reason: DuplicateGroup['reason']) => {
    const map = new Map<string, Booking[]>()
    bookings.forEach((b) => {
      const key = keyOf(b)
      if (!key) return
      map.set(key, [...(map.get(key) || []), b])
    })
    map.forEach((list) => {
      if (list.length > 1) groups.push({ reason, bookings: [...list].sort(byCreated) })
    })
  }
  collect((b) => b.docNo || '', 'SAME_DOC_NO')
  collect(bookingShipmentKey, 'SAME_SHIPMENT')
  // งานที่ซ้ำทั้งเลขที่งานและเลขชิพเม้น แสดงกลุ่มเดียวพอ
  return groups.filter(
    (g, i) => g.reason === 'SAME_DOC_NO' || !groups.some((o, j) => j !== i && o.reason === 'SAME_DOC_NO' && g.bookings.every((b) => o.bookings.includes(b)))
  )
}

/** key ของกลุ่ม (ใช้จำว่าผู้ใช้กด "ไม่ใช่งานซ้ำ" ไว้แล้ว) — เปลี่ยนเมื่อมีงานเข้า/ออกจากกลุ่ม จึงเตือนใหม่ถ้ามีงานซ้ำเพิ่ม */
export const duplicateGroupKey = (g: DuplicateGroup) => `${g.reason}:${g.bookings.map((b) => b.id).sort().join(',')}`
