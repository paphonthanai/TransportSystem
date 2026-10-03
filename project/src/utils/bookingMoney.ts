import type { Booking, VehicleType } from '@/types'
import { bookingBillingRow, computeRowAmount } from '@/utils/documentTotals'

export const roundMoney = (x: number) => Math.round(x * 100) / 100

/** หัก 1% จากราคาเต็มทุกประเภทรถ */
export const WITHHOLDING_RATE = 0.01

/** สัดส่วนรายได้บริษัท (คิดจากราคาเต็มหลังหัก 1%) ของรถที่ไม่ใช่รถบริษัท — รถบริษัทคิดจากราคาเต็ม − 1% − (น้ำมัน + ค่าแรง) แทน */
export const COMPANY_SHARE: Partial<Record<VehicleType, number>> = {
  รถหุ้นส่วน: 0.08,
  รถอู่เสริม: 0.08,
  รถร่วม: 0.1,
}

export interface BookingMoney {
  /** ราคาเต็ม/ยอดขาย = ยอดก่อน VAT หลังส่วนลด ตัวเดียวกับที่ออกใบวางบิล (computeRowAmount ∘ bookingBillingRow) */
  sales: number
  /** ค่าแรง = เบี้ยเลี้ยงหลังกระทบยอดเพิ่ม/ลดหนี้ (ตัวเดียวกับที่เงินเดือนคนขับใช้) */
  allowance: number
  /** ค่าน้ำมัน = ลิตร × เรท (เรทตามประเภทรถ) */
  fuelCost: number
  /** รายจ่าย = ค่าแรง + ค่าน้ำมัน */
  expense: number
  /** รายได้บริษัท — null = คิดไม่ได้ (ดู incomeNote) ห้ามนำไปรวมคำนวณ จนกว่าจะแก้ข้อมูลให้ถูกต้อง */
  companyIncome: number | null
  incomeNote?: string
}

type MoneyInput = Pick<
  Booking,
  'tripFee' | 'extraCharges' | 'discountMode' | 'discountPercent' | 'discountAmount' | 'vatRate' | 'allowance' | 'finalAllowance' | 'fuelLiters' | 'fuelRate'
> &
  Partial<Pick<Booking, 'plate'>>

/**
 * คิดเงินของ 1 งาน — ยอดขาย/รายจ่ายคิดได้เสมอ (ไม่ขึ้นกับประเภทรถ) ส่วน "รายได้บริษัท" ขึ้นกับประเภทรถ:
 *  - รถบริษัท: ราคาเต็ม − 1% − (ค่าน้ำมัน + ค่าแรง)
 *  - รถหุ้นส่วน/รถอู่เสริม: (ราคาเต็ม − 1%) × 8%   รถร่วม: (ราคาเต็ม − 1%) × 10%
 *  - ค่าเที่ยวเป็น 0 → คิดไม่ได้ ห้ามคำนวณรายจ่าย (เบี้ยเลี้ยง/น้ำมัน) ของงานนั้นด้วย; ส่วนเบี้ยเลี้ยง 0 หรือลิตรน้ำมัน 0 เป็นค่าที่ถูกต้อง
 *    คิดเงินได้ปกติ (ลิตร 0 = ไม่ได้เติม ค่าน้ำมัน 0 ไม่ต้องมีเรท) แต่ถ้ามีลิตรแล้วไม่มีเรทน้ำมัน → คิดค่าน้ำมันไม่ได้
 *  - ไม่มีทะเบียน/หารถไม่เจอ/ประเภทยังเป็น "รถร่วมใน/รถร่วมนอก" แบบเก่า → คิดไม่ได้ (null + หมายเหตุ) ห้ามนำงานนั้นไปคำนวณทั้ง
 *    รายได้และรายจ่าย จนกว่าจะแก้ข้อมูลให้ถูกต้อง (ทุกประเภทรถ)
 * vehicleType = ประเภทรถที่ผู้เรียกหาจากทะเบียนรถแล้ว (undefined = หาไม่เจอ)
 */
export function computeBookingMoney(b: MoneyInput, vehicleType: VehicleType | undefined): BookingMoney {
  const sales = roundMoney(computeRowAmount(bookingBillingRow(b)))
  const allowance = roundMoney(b.finalAllowance ?? b.allowance ?? 0)
  const fuelCost = roundMoney((b.fuelLiters || 0) * (b.fuelRate || 0))
  const expense = roundMoney(allowance + fuelCost)
  const base = { sales, allowance, fuelCost, expense }
  const unreadableFuel = !!(b as { fuelUnreadable?: boolean }).fuelUnreadable
  const afterWithholding = sales * (1 - WITHHOLDING_RATE)

  if (sales <= 0) return { ...base, companyIncome: null, incomeNote: 'ยังไม่ได้ใส่ราคา/ค่าเที่ยว (ยอดขาย 0) จึงคิดเงินไม่ได้' }
  if (unreadableFuel) return { ...base, companyIncome: null, incomeNote: 'อ่านค่าน้ำมันจาก Excel ไม่ได้ จึงยังไม่นำไปคิดเงิน — แก้ลิตรน้ำมันให้ถูกต้องก่อน' }
  // เบี้ยเลี้ยง 0 / ลิตรน้ำมัน 0 ไม่ใช่เหตุให้คิดไม่ได้ (คิดเป็น 0 ได้) — เรทต้องมีเฉพาะตอนมีลิตรเท่านั้น
  if ((b.fuelLiters || 0) > 0 && !((b.fuelRate || 0) > 0)) return { ...base, companyIncome: null, incomeNote: 'ยังไม่มีเรทน้ำมัน (0) จึงคิดเงินไม่ได้' }
  if (!b.plate) return { ...base, companyIncome: null, incomeNote: 'ยังไม่มีทะเบียนรถ จึงยังไม่ทราบประเภทรถ' }
  if (!vehicleType) return { ...base, companyIncome: null, incomeNote: `ไม่พบรถทะเบียน ${b.plate} ในทะเบียนรถ จึงไม่ทราบประเภทรถ` }
  if (vehicleType === 'รถร่วมใน' || vehicleType === 'รถร่วมนอก') {
    return { ...base, companyIncome: null, incomeNote: `ประเภทรถยังเป็น "${vehicleType}" (แบบเก่า) — กรุณาเลือกประเภทใหม่ในหน้ารถ` }
  }
  if (vehicleType === 'รถบริษัท') {
    return { ...base, companyIncome: roundMoney(afterWithholding - expense) }
  }
  const share = COMPANY_SHARE[vehicleType]
  if (share === undefined) return { ...base, companyIncome: null, incomeNote: `ไม่รู้จักประเภทรถ "${vehicleType}"` }
  return { ...base, companyIncome: roundMoney(afterWithholding * share) }
}

export interface BilledMoneySummary {
  totals: { sales: number; expense: number; companyIncome: number }
  /** จำนวนงานที่คิดรายได้บริษัทไม่ได้ — ไม่ถูกนับในยอดขาย/รายจ่าย/รายได้บริษัททั้งหมด (ห้ามนำไปคำนวณ) จนกว่าจะแก้ข้อมูลให้ถูกต้อง */
  uncomputableCount: number
  monthly: { sales: number[]; expense: number[]; income: number[] }
}

/**
 * สรุปเงินของงานที่ "ส่งของเสร็จสิ้น" (DELIVERED) ตั้งแต่ปิดงาน ไม่ต้องรอวางบิล — จัดเข้าเดือนตามวันที่ส่งของเสร็จ (completedAt) ย้อนหลัง 12 เดือน
 * (เดือนปัจจุบันเป็นช่องสุดท้าย เหมือน monthLabels ของ Dashboard) ยอดรวม (totals) เป็นยอดสะสมทุกงานที่เข้าเกณฑ์ ไม่จำกัด 12 เดือน
 * งานที่คิดไม่ได้ (companyIncome เป็น null เช่น ยังไม่ได้ใส่ราคา/ข้อมูลรถไม่ครบ) ถูกข้ามทั้งหมด ไม่นับในทั้งยอดขาย/รายจ่าย/รายได้บริษัท (นับแค่จำนวนไว้เตือน)
 */
export function summarizeBilledMoney(
  bookings: Array<MoneyInput & Pick<Booking, 'status' | 'completedAt'>>,
  vehicleTypeOf: (plate: string) => VehicleType | undefined,
  now: Date = new Date()
): BilledMoneySummary {
  const monthly = { sales: Array(12).fill(0) as number[], expense: Array(12).fill(0) as number[], income: Array(12).fill(0) as number[] }
  const totals = { sales: 0, expense: 0, companyIncome: 0 }
  let uncomputableCount = 0

  for (const b of bookings) {
    if (b.status !== 'DELIVERED') continue
    const m = computeBookingMoney(b, b.plate ? vehicleTypeOf(b.plate) : undefined)
    if (m.companyIncome === null) {
      uncomputableCount++
      continue
    }
    totals.sales += m.sales
    totals.expense += m.expense
    totals.companyIncome += m.companyIncome

    if (!b.completedAt) continue
    const d = new Date(b.completedAt)
    const idx = 11 - ((now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()))
    if (idx < 0 || idx > 11) continue
    monthly.sales[idx] += m.sales
    monthly.expense[idx] += m.expense
    monthly.income[idx] += m.companyIncome
  }

  return {
    totals: { sales: roundMoney(totals.sales), expense: roundMoney(totals.expense), companyIncome: roundMoney(totals.companyIncome) },
    uncomputableCount,
    monthly: { sales: monthly.sales.map(roundMoney), expense: monthly.expense.map(roundMoney), income: monthly.income.map(roundMoney) },
  }
}
