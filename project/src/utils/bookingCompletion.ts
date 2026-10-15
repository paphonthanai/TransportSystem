import type { Booking } from '@/types'

/** เพดานลิตรน้ำมันต่อเที่ยวขั้นต่ำ — เกินนี้ถือว่าผิดปกติ ยกเว้นปลายทางที่ลิตรมาตรฐานสูงกว่านี้ (เช่นเชียงใหม่ 220/230 ล.)
 *  ซึ่งยอมให้ถึงค่ามาตรฐานของปลายทางนั้น */
export const MIN_FUEL_LITERS_CAP = 200

/** ลิตรสูงสุดที่รับได้ของงานนี้ = มากกว่าระหว่าง 200 กับลิตรมาตรฐานของปลายทาง */
export const maxFuelLitersFor = (standardFuelLiters?: number | null) => Math.max(MIN_FUEL_LITERS_CAP, standardFuelLiters || 0)

export type CompletionIssueCode = 'plate' | 'driver' | 'tripFee' | 'odometer' | 'fuelLiters' | 'fuelRate' | 'fuelCap' | 'fuelUnreadable'

export interface CompletionIssue {
  code: CompletionIssueCode
  message: string
}

/** ปัญหาที่ต้องไปแก้ที่หน้า "แก้ไขงาน"/จัดรถ (แก้ในไดอะล็อกจบงานไม่ได้) */
export const STATIC_COMPLETION_CODES: CompletionIssueCode[] = ['plate', 'driver', 'tripFee']

type CompletionInput = Pick<
  Booking,
  'plate' | 'driverName' | 'driverId' | 'tripFee' | 'fuelLiters' | 'fuelRate' | 'odometerBefore' | 'odometerAfter'
> &
  Partial<Pick<Booking, 'fuelNotRefilled' | 'fuelUnreadable'>>

export interface CompletionOverrides {
  /** ค่าที่ผู้ใช้กรอกอยู่ในไดอะล็อกจบงาน (ยังไม่ได้บันทึกลงงาน) */
  odometerAfter?: number
  fuelLiters?: number
  fuelNotRefilled?: boolean
  /** ลิตรมาตรฐานรวมของปลายทางทั้งงาน (fuelRateStore.standardFuelLiters) ใช้คิดเพดานลิตร */
  standardFuelLiters?: number | null
}

/**
 * ตรวจว่าข้อมูลของงานครบพอจะ "จบงาน" ไหม — คืนรายการสิ่งที่ยังขาด/ผิด (ว่าง = ครบ ห้ามจบงานถ้ายังไม่ว่าง)
 *  - ต้องมีทะเบียนรถ + คนขับ + ค่าเที่ยว > 0 (เบี้ยเลี้ยง 0 ถือว่าครบ ตามกติกาการคิดเงิน)
 *  - ต้องมีเลขไมล์สิ้นสุด และมากกว่าเลขไมล์ก่อนออก (ถ้ามี)
 *  - น้ำมัน: ต้องมีลิตร > 0 หรือติ๊ก "ไม่เติมน้ำมัน" (ข้อยกเว้นรถที่ไม่ได้เติม) ถ้ามีลิตรต้องมีเรทน้ำมัน และห้ามเกินเพดาน
 *  - ช่องน้ำมันจาก Excel ที่อ่านไม่ได้ (fuelUnreadable) ต้องแก้ลิตรก่อน
 */
export function bookingCompletionIssues(b: CompletionInput, overrides: CompletionOverrides = {}): CompletionIssue[] {
  const issues: CompletionIssue[] = []
  const odometerAfter = overrides.odometerAfter ?? b.odometerAfter
  const liters = overrides.fuelLiters ?? b.fuelLiters ?? 0
  const notRefilled = overrides.fuelNotRefilled ?? !!b.fuelNotRefilled

  if (!b.plate) issues.push({ code: 'plate', message: 'ยังไม่ได้จัดรถ (ไม่มีทะเบียนรถ)' })
  if (!b.driverName && !b.driverId) issues.push({ code: 'driver', message: 'ยังไม่มีชื่อคนขับ' })
  if (!((b.tripFee || 0) > 0)) issues.push({ code: 'tripFee', message: 'ยังไม่ได้ใส่ค่าเที่ยว' })

  if (!odometerAfter || odometerAfter <= 0) {
    issues.push({ code: 'odometer', message: 'ต้องกรอกเลขไมล์สิ้นสุด' })
  } else if ((b.odometerBefore || 0) > 0 && odometerAfter <= (b.odometerBefore || 0)) {
    issues.push({ code: 'odometer', message: 'เลขไมล์สิ้นสุดต้องมากกว่าเลขไมล์ก่อนออก' })
  }

  if (b.fuelUnreadable && !notRefilled && overrides.fuelLiters === undefined) {
    issues.push({ code: 'fuelUnreadable', message: 'อ่านค่าน้ำมันจาก Excel ไม่ได้ ต้องกรอกลิตรน้ำมันหรือติ๊กไม่เติมน้ำมัน' })
  } else if (!notRefilled) {
    if (!(liters > 0)) {
      issues.push({ code: 'fuelLiters', message: 'ต้องกรอกลิตรน้ำมัน หรือติ๊ก "ไม่เติมน้ำมัน"' })
    } else {
      if (!((b.fuelRate || 0) > 0)) issues.push({ code: 'fuelRate', message: 'ยังไม่มีเรทน้ำมัน (ตั้งราคาน้ำมันประจำวันก่อน)' })
      const cap = maxFuelLitersFor(overrides.standardFuelLiters)
      if (liters > cap) issues.push({ code: 'fuelCap', message: `ลิตรน้ำมันเกินเพดาน ${cap} ลิตร` })
    }
  }
  return issues
}

/** รวมข้อความปัญหาเป็นบรรทัดเดียวสำหรับ tooltip/alert */
export const describeCompletionIssues = (issues: CompletionIssue[]) => issues.map((i) => i.message).join(' • ')
