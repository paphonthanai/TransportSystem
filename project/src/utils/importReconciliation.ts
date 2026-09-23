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
 *  (เช่น "fsm" vs "FSM", หรือช่องว่างติดมาจาก Excel) ไม่ใช้กับทะเบียนรถ/รหัสสินค้า เพราะรูปแบบ (มี "-" หรือไม่) เพี้ยน
 *  ได้มากกว่านั้น เลยเทียบแบบตัดอักขระที่ไม่ใช่ตัวอักษร/ตัวเลขออกก่อนแทน (normalizePlateCode — ใช้ทั้งกับทะเบียนรถและ
 *  รหัสสินค้า เพราะทั้งคู่มีปัญหารูปแบบเขียนต่างกันแบบเดียวกัน คือมี/ไม่มีขีดหรือช่องว่างคั่น) */
const normalizeText = (s: string) => s.trim().toLowerCase()
export const normalizePlateCode = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๛]/g, '')

/** booking.plate เก็บทะเบียน+จังหวัดต่อท้ายเสมอหลังจัดรถจริงจริง (เช่น "70-8821 สระบุรี" ดู vehiclesStore.fullPlate)
 *  แต่คอลัมน์ "คอนเฟิร์ม" ในไฟล์ Excel มีแค่เลขทะเบียนเดี่ยวๆ ไม่มีจังหวัด ("70-8821") — ต้องตัดจังหวัดออกก่อนเทียบ ไม่งั้น
 *  จะไม่มีทางตรงกันได้เลยไม่ว่าเลขทะเบียนจะตรงกันจริงแค่ไหน ตัดที่ช่องว่างตัวแรกได้ปลอดภัย เพราะ fullPlate ต่อด้วย
 *  เว้นวรรคตัวเดียวเสมอ และ Vehicle.plate เองไม่เคยมีช่องว่างในตัว (ดู stores/vehicles.ts) */
const stripPlateProvince = (s: string) => s.split(' ')[0]

/** ต้องตรงกันอย่างน้อย 4 จาก 5 อย่าง (วันที่/ลูกค้า/ทะเบียนรถ/สินค้าหลัก/คนขับ) ถึงจะถือว่าใช่งานเดียวกัน — กันจับคู่ผิดงาน
 *  ที่ข้อมูลคล้ายกันโดยบังเอิญ (เช่น ลูกค้า+สินค้าเดียวกันคนละวัน) */
export const RECONCILE_MIN_MATCH = 4

/** งานที่ import ไว้ก่อนจะแก้ให้แยกสินค้าหลายชนิดเป็น item หลัก + extraProducts (ดู BookingView.vue confirmImport)
 *  จะมี booking.items[0].product เก็บเป็นสตริงดิบไม่ได้แยก เช่น "23 + 52" ทั้งก้อน — ต่างจากไฟล์ที่เพิ่ง parse ใหม่ที่ได้
 *  productCodes แยกเป็น ["23","52"] เทียบแค่ตัวแรกอย่างเดียวจึงพลาดกับงานเก่ากลุ่มนี้เสมอ (คือไม่ตรง "23" ตัวเดียว) —
 *  เทียบทั้ง 2 แบบ: ตัวแรกอย่างเดียว (งานใหม่ที่แยกแล้ว) หรือรวมทุกตัวเป็นก้อนเดียว (งานเก่าที่ยังไม่แยก) */
function productMatches(booking: Booking, productCodes: string[]): boolean {
  const bookingProduct = booking.items[0]?.product
  if (!bookingProduct || productCodes.length === 0) return false
  const bookingNorm = normalizePlateCode(bookingProduct)
  if (normalizePlateCode(productCodes[0]) === bookingNorm) return true
  return normalizePlateCode(productCodes.join('')) === bookingNorm
}

/** คืนผู้สมัครทุกคนที่ตรงอย่างน้อย 1 อย่าง (ไม่ใช่แค่ที่ผ่านเกณฑ์) เรียงคะแนนมาก→น้อย — ผู้เรียกเป็นคนตัดสินใจว่าจะ
 *  auto-apply เฉพาะที่ผ่านเกณฑ์ (RECONCILE_MIN_MATCH) หรือจะโชว์ผู้สมัครที่ใกล้เคียงที่สุดให้เลือกยืนยันเองก็ได้ */
export function findReconcileMatches(row: ReconcileRowInput, bookings: Booking[], shipDate?: Date): ReconcileMatchResult[] {
  return bookings
    .map((booking) => {
      const breakdown: ReconcileMatchBreakdown = {
        date: !!(shipDate && booking.loadingDate && isSameCalendarDay(new Date(booking.loadingDate), shipDate)),
        customer: !!(row.customer && booking.customer && normalizeText(booking.customer) === normalizeText(row.customer)),
        plate: !!(row.plate && booking.plate && normalizePlateCode(stripPlateProvince(booking.plate)) === normalizePlateCode(row.plate)),
        product: productMatches(booking, row.productCodes),
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
  // "ราคาปูน" คือราคาต่อเที่ยวอยู่แล้ว ไม่ใช่ราคาต่อตัน — ห้ามคูณกับจำนวนตัน (ดู confirmImport ใน BookingView.vue
  // ที่แก้จุดเดียวกันไปแล้ว) ใช้ row.price ตรงๆ เป็นค่าเที่ยวเสมอ
  const amount = Math.round(row.price * 100) / 100
  if ((booking.tripFee || 0) === 0 && amount > 0) patches.push({ field: 'ค่าเที่ยว', from: booking.tripFee || 0, to: amount })
  if (!booking.allowance && row.allowance > 0) patches.push({ field: 'เบี้ยเลี้ยง', from: booking.allowance || 0, to: row.allowance })
  if (!booking.fuelLiters && row.fuelLiters > 0) patches.push({ field: 'น้ำมัน (ลิตร)', from: booking.fuelLiters || 0, to: row.fuelLiters })
  const mainQty = row.productQtyPairs[0]?.qty ?? row.qty
  if (booking.items[0] && !booking.items[0].qty && mainQty > 0) patches.push({ field: 'จำนวนตัน', from: booking.items[0].qty || 0, to: mainQty })
  return patches
}
