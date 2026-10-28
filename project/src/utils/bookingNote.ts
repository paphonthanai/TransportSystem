import type { Booking } from '@/types'

/** ท่อนหมายเหตุ "ต้องกรอกเพิ่ม: …" ที่ import แปะไว้ (ดู importRowParser.ts) — แต่ละท่อนหายเองเมื่อกรอกข้อมูลนั้นแล้ว */
const MISSING_FIELD_RESOLVED: Record<string, (b: Booking) => boolean> = {
  'ต้องกรอกเพิ่ม: เบี้ยเลี้ยง': (b) => (b.allowance || 0) > 0,
  'ต้องกรอกเพิ่ม: ราคาปูน': (b) => (b.tripFee || 0) > 0 || b.items.some((i) => (i.tripFee || 0) > 0),
  'ต้องกรอกเพิ่ม: จำนวนตัน': (b) => b.items.some((i) => (i.qty || 0) > 0),
  'ต้องกรอกเพิ่ม: อำเภอ/จังหวัด': (b) => b.items.length > 0 && b.items.every((i) => !!i.province && !!i.district),
}

/** หมายเหตุของงานหลังตัดท่อน "ต้องกรอกเพิ่ม: …" ที่กรอกครบแล้วออก (หมายเหตุที่ผู้ใช้พิมพ์เองไม่ถูกแตะ) — ว่าง = undefined */
export function pruneResolvedNote(booking: Booking): string | undefined {
  if (!booking.note) return undefined
  const kept = booking.note
    .split(' | ')
    .filter((part) => {
      if (!part) return false
      const resolved = MISSING_FIELD_RESOLVED[part.trim()]
      return !(resolved && resolved(booking))
    })
  return kept.length ? kept.join(' | ') : undefined
}

/** ท่อนหมายเหตุที่ระบบแปะเอง (ตอน import / ตั้งเรทน้ำมัน) — ไม่ใช่เงื่อนไขจากลูกค้า ดู importRowParser.ts และ applyFuelRate ใน stores/booking.ts */
const SYSTEM_NOTE_PREFIXES = [
  'ต้องกรอกเพิ่ม:',
  'เรทน้ำมัน:',
  'คอนเฟิร์มมีทะเบียนรถ',
  'ชื่อลูกค้าจาก Excel',
  'ตรวจคนขับ:',
  'ตรวจทะเบียน:',
  'ชื่อเล่นคนขับ',
  'สินค้าหลายชนิดในเที่ยวเดียว',
  'อ่านค่าน้ำมัน',
  'ยังไม่มีปลายทางน้ำมัน',
  'ประเภทงานจาก Excel',
  'ราคาปูน (',
]

/**
 * "เงื่อนไขลูกค้า" สำหรับแสดงให้คนขับดู = ท่อนหมายเหตุของงานที่ไม่ใช่ข้อความระบบ และไม่เกี่ยวกับเบี้ยเลี้ยง/ค่าน้ำมัน
 * (หมายเหตุเก็บรวมกันเป็นข้อความเดียวคั่นด้วย " | " — ใช้ได้ทั้งงานเก่าและงานใหม่ ไม่ต้องมี field แยก)
 */
/** เงื่อนไขลูกค้าของงาน — ใช้คอลัมน์ "เงื่อนไขลูกค้า" จาก import ก่อน ถ้าไม่มีค่อยดึงจากหมายเหตุ (customerConditionsOf) */
export function customerConditionsFor(booking: Pick<Booking, 'customerCondition' | 'note'>): string[] {
  const own = booking.customerCondition?.trim()
  return own ? [own] : customerConditionsOf(booking.note)
}

export function customerConditionsOf(note?: string): string[] {
  if (!note) return []
  return note
    .split(' | ')
    .map((part) => part.trim())
    .filter((part) => part && !SYSTEM_NOTE_PREFIXES.some((prefix) => part.startsWith(prefix)) && !part.includes('เบี้ยเลี้ยง') && !part.includes('น้ำมัน'))
}
