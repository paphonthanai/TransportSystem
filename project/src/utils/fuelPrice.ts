import type { VehicleType } from '@/types'

/** ราคาน้ำมันของ "หนึ่งวัน" แยกตามประเภทรถ (บาท/ลิตร) — date เป็นวันตามเวลาไทย รูปแบบ YYYY-MM-DD
 *  ประเภทรถที่ไม่ได้ใส่ราคาในวันนั้น = ใช้ราคาล่าสุดก่อนหน้าของประเภทนั้น (ราคายังมีผลต่อจนกว่าจะประกาศราคาใหม่) */
export interface FuelPriceEntry {
  date: string
  prices: Partial<Record<VehicleType, number>>
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

/** วันที่ตามเวลาไทย (YYYY-MM-DD) ของ Date/ISO string — ไม่ขึ้นกับ timezone ของเครื่อง
 *  (วันที่ใน Firestore เก็บเป็น UTC เช่น "2026-09-24T17:00:00Z" = 25 ก.ย. เวลาไทย) */
export function bangkokDay(value: Date | string | number | undefined | null): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (!Number.isFinite(t)) return undefined
  return new Date(t + BANGKOK_OFFSET_MS).toISOString().slice(0, 10)
}

export interface FuelPriceLookup {
  rate: number
  /** วันที่ของราคาที่นำมาใช้ (วันที่ประกาศราคา ไม่ใช่วันของงาน) — undefined เมื่อไม่พบราคา */
  priceDate?: string
  reason?: string
}

/**
 * หาราคาน้ำมันของประเภทรถนี้ ณ วันที่ day (YYYY-MM-DD): ใช้รายการล่าสุดที่วันที่ไม่เกิน day และมีราคาของประเภทนี้ (> 0)
 * ไม่มีราคาเลย = เรท 0 พร้อมสาเหตุ (ไม่เดา ไม่ใช้ราคาของวันอื่นที่อยู่หลังวันของงาน)
 */
export function lookupFuelPrice(
  history: FuelPriceEntry[] | undefined,
  vehicleType: VehicleType | undefined,
  day: string | undefined
): FuelPriceLookup {
  if (!vehicleType) return { rate: 0, reason: 'ยังไม่ทราบประเภทรถ (ยังไม่ได้จัดรถ/ไม่พบรถในทะเบียนรถ) จึงยังไม่มีเรทน้ำมัน' }
  if (!day) return { rate: 0, reason: 'งานนี้ไม่มีวันที่ จึงยังหาราคาน้ำมันประจำวันไม่ได้' }
  let best: { date: string; price: number } | undefined
  for (const entry of history || []) {
    const price = entry.prices?.[vehicleType]
    if (!(price && price > 0) || entry.date > day) continue
    if (!best || entry.date > best.date) best = { date: entry.date, price }
  }
  if (!best) return { rate: 0, reason: `ยังไม่มีราคาน้ำมันของ${vehicleType} ณ วันที่ ${day} ในหน้าตั้งค่าน้ำมัน` }
  return { rate: best.price, priceDate: best.date }
}
