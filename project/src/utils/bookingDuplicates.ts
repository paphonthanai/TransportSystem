import type { Booking } from '@/types'

/**
 * ตรวจงานซ้ำ — งานเดียวกันถูกสร้าง 2 ครั้ง (เช่น import ไฟล์เดิมซ้ำ หรือกดสร้างซ้ำ)
 * เกณฑ์ตามที่ผู้ใช้กำหนด: "เลขที่เอกสาร" ของลูกค้า (Booking.customerDocNo เช่น I-1235516026) ซ้ำกันในลูกค้าเดียวกัน
 * (เดิมใช้เลขชิพเม้น/รับนาม — 1 ชิพเม้นมีได้หลายเอกสาร งานจริงคนละเอกสารจึงถูกจับเป็นงานซ้ำ)
 * ไม่ใช้ docNo ที่ระบบรันเอง งานที่ไม่มีเลขที่เอกสารลูกค้าไม่ถูกตรวจ
 * ผู้ใช้กด "ไม่ใช่งานซ้ำ" แล้ว ระบบจำไว้ที่ตัวงาน (Booking.notDuplicateKey) บนเซิร์ฟเวอร์ — เห็นตรงกันทุกเครื่อง
 */
const norm = (s: string | undefined) => (s || '').replace(/\s+/g, '').toLowerCase()

/** key เลขที่เอกสารของลูกค้า — ว่าง = ไม่มีเลขที่เอกสาร (ไม่ตรวจซ้ำ) */
export function docNoKey(customer: string | undefined, customerDocNo: string | undefined): string {
  const no = norm(customerDocNo)
  return no ? `${norm(customer)}|${no}` : ''
}

export const bookingDocNoKey = (b: Pick<Booking, 'customer' | 'customerDocNo'>) => docNoKey(b.customer, b.customerDocNo)

export interface DuplicateGroup {
  /** key เลขที่เอกสาร (ลูกค้า|เลขที่เอกสาร) ของกลุ่ม */
  key: string
  bookings: Booking[]
}

/** กลุ่มงานที่น่าจะซ้ำ (กลุ่มละ ≥ 2 งาน) เรียงในกลุ่มตามเวลาที่สร้าง เก่า → ใหม่ (งานแรกคืองานต้นฉบับ) */
export function findDuplicateGroups(bookings: Booking[]): DuplicateGroup[] {
  const byCreated = (a: Booking, b: Booking) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  const map = new Map<string, Booking[]>()
  bookings.forEach((b) => {
    const key = bookingDocNoKey(b)
    if (!key) return
    map.set(key, [...(map.get(key) || []), b])
  })
  return [...map.entries()].filter(([, list]) => list.length > 1).map(([key, list]) => ({ key, bookings: [...list].sort(byCreated) }))
}

/**
 * กลุ่มที่ผู้ใช้ยืนยัน "ไม่ใช่งานซ้ำ" แล้ว = ทุกงานในกลุ่มถูกกดไว้ด้วยเลขที่เอกสารเดียวกับตอนนี้
 * มีงานใหม่เลขเดียวกันเข้ามา (ยังไม่ถูกกด) หรือแก้เลขที่เอกสาร → เตือนใหม่ เพราะเป็นงานที่ยังไม่ได้ตรวจจริง
 */
export const isDuplicateGroupDismissed = (g: DuplicateGroup) => g.bookings.every((b) => b.notDuplicateKey === g.key)
