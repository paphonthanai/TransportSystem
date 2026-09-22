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

/** เกณฑ์เทียบแต่ละอย่าง — โชว์ในหน้า preview ได้ว่าตรง/ไม่ตรงอย่างไหนบ้าง ไม่ใช่แค่คะแนนรวมเฉยๆ ผู้ใช้จะได้รู้ว่าทำไม
 *  ถึงจับคู่ไม่ได้ (เช่น ทะเบียนรถไม่ตรง เพราะไฟล์ไม่มีคอลัมน์ "ทะเบียนรถ" เลยใช้ "คอนเฟิร์ม" แทน ซึ่งอาจเป็นคนละค่า) */
export interface ReconcileMatchBreakdown {
  date: boolean
  customer: boolean
  plate: boolean
  product: boolean
  driver: boolean
}

export interface ReconcileMatchResult {
  booking: Booking
  score: number
  breakdown: ReconcileMatchBreakdown
}

const isSameCalendarDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** เทียบข้อความแบบไม่สนตัวพิมพ์เล็ก-ใหญ่/ช่องว่างหัวท้าย — กันจับคู่พลาดเพราะข้อมูลเดียวกันแต่พิมพ์ต่างกันเล็กน้อย
 *  (เช่น "fsm" vs "FSM", หรือช่องว่างติดมาจาก Excel) ไม่ใช้กับทะเบียนรถ เพราะรูปแบบ (มี "-" หรือไม่) เพี้ยนได้มากกว่านั้น
 *  เลยเทียบทะเบียนรถแบบตัดอักขระที่ไม่ใช่ตัวอักษร/ตัวเลขออกก่อนแทน (normalizeCode) */
const normalizeText = (s: string) => s.trim().toLowerCase()
const normalizeCode = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๛]/g, '')

/** ต้องตรงกันอย่างน้อย 4 จาก 5 อย่าง (วันที่/ลูกค้า/ทะเบียนรถ/สินค้าหลัก/คนขับ) ถึงจะถือว่าใช่งานเดียวกัน — กันจับคู่ผิดงาน
 *  ที่ข้อมูลคล้ายกันโดยบังเอิญ (เช่น ลูกค้า+สินค้าเดียวกันคนละวัน) */
export const RECONCILE_MIN_MATCH = 4

/** คืนผู้สมัครทุกคนที่ตรงอย่างน้อย 1 อย่าง (ไม่ใช่แค่ที่ผ่านเกณฑ์) เรียงคะแนนมาก→น้อย — ผู้เรียกเป็นคนตัดสินใจว่าจะ
 *  auto-apply เฉพาะที่ผ่านเกณฑ์ (RECONCILE_MIN_MATCH) หรือจะโชว์ผู้สมัครที่ใกล้เคียงที่สุดให้เลือกยืนยันเองก็ได้ */
export function findReconcileMatches(row: ReconcileRowInput, bookings: Booking[], shipDate?: Date): ReconcileMatchResult[] {
  return bookings
    .map((booking) => {
      const breakdown: ReconcileMatchBreakdown = {
        date: !!(shipDate && booking.loadingDate && isSameCalendarDay(new Date(booking.loadingDate), shipDate)),
        customer: !!(row.customer && booking.customer && normalizeText(booking.customer) === normalizeText(row.customer)),
        plate: !!(row.plate && booking.plate && normalizeCode(booking.plate) === normalizeCode(row.plate)),
        product: !!(row.productCodes[0] && booking.items[0]?.product && normalizeCode(booking.items[0].product) === normalizeCode(row.productCodes[0])),
        driver: !!(row.driverName && booking.driverName && normalizeText(booking.driverName) === normalizeText(row.driverName)),
      }
      const score = Object.values(breakdown).filter(Boolean).length
      return { booking, score, breakdown }
    })
    .filter((m) => m.score > 0)
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
