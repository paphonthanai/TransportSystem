import type { Booking } from '@/types'

/**
 * ตรวจงานซ้ำ — งานที่น่าจะเป็นงานเดียวกันถูกสร้าง 2 ครั้ง (เช่น import ไฟล์เดิมซ้ำ หรือกดสร้างซ้ำ)
 * เกณฑ์ "ลายนิ้วมือ" ของงาน: ประเภทงาน + วันที่ลงงาน + ลูกค้า + เลขที่ PO ลูกค้า + หน้างาน/อำเภอ/จังหวัด + สินค้า/จำนวนทุกรายการ
 * + คนขับ (หรือทะเบียนถ้าไม่มีคนขับ) — ส่งที่เดียวกันวันเดียวกันได้หลายคันจริง จึงนับเป็นงานซ้ำเฉพาะคนขับ/รถเดียวกัน
 * และเลขที่งาน (docNo) ซ้ำกันตรงๆ ผู้ใช้กด "ไม่ใช่งานซ้ำ" เก็บไว้ได้ (ดู duplicateGroupKey)
 */
const norm = (s: string | undefined) => (s || '').replace(/\s+/g, '').toLowerCase()

const dayKey = (date?: Date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

type FingerprintInput = {
  category: string
  date?: Date
  customer: string
  reference?: string
  /** ชื่อคนขับ หรือทะเบียนถ้าไม่มีคนขับ */
  driver?: string
  sites: { siteName: string; district?: string; province?: string; products: { product: string; qty: number }[] }[]
}

export function fingerprintOf(input: FingerprintInput): string {
  const sites = input.sites
    .map((s) => [norm(s.siteName), norm(s.district), norm(s.province), ...s.products.map((p) => `${norm(p.product)}x${p.qty}`).sort()].join('/'))
    .sort()
  return [input.category, dayKey(input.date), norm(input.customer), norm(input.reference), norm(input.driver), ...sites].join('|')
}

export const bookingFingerprint = (b: Booking) =>
  fingerprintOf({
    category: b.category,
    date: b.loadingDate || b.shipDate,
    customer: b.customer,
    reference: b.reference,
    driver: b.driverName || b.plate,
    sites: b.items.map((i) => ({
      siteName: i.siteName,
      district: i.district,
      province: i.province,
      products: [{ product: i.product, qty: i.qty }, ...(i.extraProducts || []).map((p) => ({ product: p.product, qty: p.qty }))],
    })),
  })

export interface DuplicateGroup {
  reason: 'SAME_DOC_NO' | 'SAME_CONTENT'
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
  collect((b) => (b.items.length ? bookingFingerprint(b) : ''), 'SAME_CONTENT')
  // งานที่ซ้ำทั้งเลขที่และเนื้อหา แสดงกลุ่มเดียวพอ
  return groups.filter(
    (g, i) => g.reason === 'SAME_DOC_NO' || !groups.some((o, j) => j !== i && o.reason === 'SAME_DOC_NO' && g.bookings.every((b) => o.bookings.includes(b)))
  )
}

/** key ของกลุ่ม (ใช้จำว่าผู้ใช้กด "ไม่ใช่งานซ้ำ" ไว้แล้ว) — เปลี่ยนเมื่อมีงานเข้า/ออกจากกลุ่ม จึงเตือนใหม่ถ้ามีงานซ้ำเพิ่ม */
export const duplicateGroupKey = (g: DuplicateGroup) => `${g.reason}:${g.bookings.map((b) => b.id).sort().join(',')}`
