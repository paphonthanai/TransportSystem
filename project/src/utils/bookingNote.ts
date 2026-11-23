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

/** เงื่อนไขลูกค้าที่แสดงให้คนขับเห็น — อ่านจากช่อง customerCondition อย่างเดียว (แยกบรรทัดเป็นข้อ)
 *  ห้ามดึงจากหมายเหตุ (note) เด็ดขาด: หมายเหตุเป็นข้อความภายในของออฟฟิศ คนขับต้องไม่เห็น
 *  (เดิม fallback ไปหมายเหตุเมื่อไม่มีเงื่อนไข ทำให้หมายเหตุภายในไปโผล่ในแอปคนขับแทนเงื่อนไขลูกค้า) */
export function customerConditionsFor(booking: Pick<Booking, 'customerCondition'>): string[] {
  return (booking.customerCondition || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
