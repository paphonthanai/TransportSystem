import type { Booking } from '@/types'

/** ข้อมูลแถวที่ parse มาจากไฟล์ Excel ต้นฉบับ (subset ของ ImportRowResult ใน BookingView.vue) ใช้จับคู่กับ Booking
 *  ที่มีอยู่แล้ว แล้วคำนวณว่าควรเติมค่าอะไรบ้าง */
export interface ReconcileRowInput {
  customer: string
  plate: string
  productCodes: string[]
  productQtyPairs: { product: string; qty: number }[]
  driverName: string
  qty: number
  price: number
  allowance: number
  fuelLiters: number
}

export interface ReconcileMatchResult {
  booking: Booking
  score: number
}

const isSameCalendarDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** ต้องตรงกันอย่างน้อย 4 จาก 5 อย่าง (วันที่/ลูกค้า/ทะเบียนรถ/สินค้าหลัก/คนขับ) ถึงจะถือว่าใช่งานเดียวกัน — กันจับคู่ผิดงาน
 *  ที่ข้อมูลคล้ายกันโดยบังเอิญ (เช่น ลูกค้า+สินค้าเดียวกันคนละวัน) */
export const RECONCILE_MIN_MATCH = 4

export function findReconcileMatches(row: ReconcileRowInput, bookings: Booking[], shipDate?: Date): ReconcileMatchResult[] {
  return bookings
    .map((booking) => {
      let score = 0
      if (shipDate && booking.loadingDate && isSameCalendarDay(new Date(booking.loadingDate), shipDate)) score++
      if (row.customer && booking.customer === row.customer) score++
      if (row.plate && booking.plate === row.plate) score++
      if (row.productCodes[0] && booking.items[0]?.product === row.productCodes[0]) score++
      if (row.driverName && booking.driverName === row.driverName) score++
      return { booking, score }
    })
    .filter((m) => m.score >= RECONCILE_MIN_MATCH)
    .sort((a, b) => b.score - a.score)
}

export interface ReconcilePatch {
  field: string
  from: number
  to: number
}

/** เติมเฉพาะ field ที่ยังว่าง/เป็น 0 อยู่เท่านั้น — ไม่เขียนทับข้อมูลที่มีอยู่แล้วไม่ว่ากรณีใด */
export function computeReconcilePatches(row: ReconcileRowInput, booking: Booking): ReconcilePatch[] {
  const patches: ReconcilePatch[] = []
  const amount = row.qty * row.price
  if ((booking.tripFee || 0) === 0 && amount > 0) patches.push({ field: 'ค่าเที่ยว', from: booking.tripFee || 0, to: amount })
  if (!booking.allowance && row.allowance > 0) patches.push({ field: 'เบี้ยเลี้ยง', from: booking.allowance || 0, to: row.allowance })
  if (!booking.fuelLiters && row.fuelLiters > 0) patches.push({ field: 'น้ำมัน (ลิตร)', from: booking.fuelLiters || 0, to: row.fuelLiters })
  const mainQty = row.productQtyPairs[0]?.qty ?? row.qty
  if (booking.items[0] && !booking.items[0].qty && mainQty > 0) patches.push({ field: 'จำนวนตัน', from: booking.items[0].qty || 0, to: mainQty })
  return patches
}
