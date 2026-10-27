import type { Booking, DriverPaymentRecord, DriverPaymentStatusValue } from '@/types'
import { normalizeDriverName } from './driverIdentity'

/** รอบบัญชี พ.ศ. "YYYY-MM" ของงาน — ใช้เกณฑ์เดียวกับหน้ารายได้คนขับ (วันที่ส่ง shipDate, ไม่มีใช้วันที่จบงาน) */
export function payrollPeriodLabelOf(booking: Pick<Booking, 'shipDate' | 'completedAt'>): string | undefined {
  const date = booking.shipDate || booking.completedAt
  if (!date) return undefined
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return undefined
  return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** ชื่อคนขับที่ใช้เป็น key ของสถานะจ่ายรายเดือน (snapshot ชื่อ/นามสกุลบนงานก่อน ไม่มีค่อยใช้ driverName) — ตรงกับ useDriverPayroll */
export function payrollDriverKeyOf(booking: Pick<Booking, 'driverFirstName' | 'driverLastName' | 'driverName'>): string {
  if (booking.driverFirstName || booking.driverLastName) return `${booking.driverFirstName || ''} ${booking.driverLastName || ''}`.trim()
  return booking.driverName || ''
}

export type MonthlyPaymentLike = Pick<DriverPaymentRecord, 'driverName' | 'status'> & Partial<Pick<DriverPaymentRecord, 'driverId' | 'updatedAt'>>

export interface DriverPaidLookup {
  /** สถานะจ่ายของเอกสารรายได้คนขับตาม id (ไม่พบเอกสาร = undefined) */
  payrollDocStatus: (docId: string) => DriverPaymentStatusValue | undefined
  /** ระเบียนสถานะจ่ายรายเดือนทั้งหมดของรอบนี้ (periodLabel พ.ศ.) — ไม่มีระเบียน = ยังไม่จ่าย */
  monthlyRecords: (periodLabel: string) => MonthlyPaymentLike[]
}

export interface MonthlyPaidCheck {
  paid: boolean
  /** ข้อความเตือนเมื่อระเบียนสถานะจ่ายขัดกับข้อมูลคนขับในงาน (driverId/ชื่อไม่ตรงกัน) ว่าง = ไม่มีปัญหา */
  conflict: string
}

/**
 * สถานะจ่ายรายเดือนของงานนี้ — ยึด driverId เป็นหลักและตรวจชื่อประกอบ (เทียบแบบไม่สนคำนำหน้า เพราะหน้ารายละเอียดคนขับบันทึก
 * ด้วยชื่อตามทะเบียนที่มีคำนำหน้า ส่วนงานเก็บชื่อ Snapshot ไม่มีคำนำหน้า):
 *  - ระเบียนที่มี driverId ตรงกับงาน หรือชื่อตรงกัน (ระเบียน/งานเก่าที่ไม่มี driverId จับคู่ด้วยชื่ออย่างเดียว) ถือว่าเกี่ยวข้อง
 *    ใช้สถานะของระเบียนล่าสุด
 *  - ระเบียนที่ driverId ตรงแต่ชื่อไม่ตรง หรือชื่อตรงแต่ driverId เป็นคนอื่น = ข้อมูลขัดกัน คืนคำเตือน และถ้าระเบียนที่ขัดกันนั้น
 *    "จ่ายแล้ว" ถือว่ายังล็อกอยู่ (ไม่ปลดล็อกให้อัตโนมัติ ต้องให้ผู้ใช้ตรวจสอบก่อน)
 */
export function monthlyPaidCheck(booking: Pick<Booking, 'driverId' | 'driverFirstName' | 'driverLastName' | 'driverName'>, records: MonthlyPaymentLike[]): MonthlyPaidCheck {
  const bookingName = payrollDriverKeyOf(booking)
  const nameOk = (r: MonthlyPaymentLike) => !!bookingName && normalizeDriverName(r.driverName) === normalizeDriverName(bookingName)
  const idOk = (r: MonthlyPaymentLike) => !!booking.driverId && r.driverId === booking.driverId
  const idConflict = (r: MonthlyPaymentLike) => !!booking.driverId && !!r.driverId && r.driverId !== booking.driverId
  const relevant = records
    .filter((r) => idOk(r) || nameOk(r))
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
  const conflicts = relevant.filter((r) => (idOk(r) && !nameOk(r)) || (nameOk(r) && idConflict(r)))
  const clean = relevant.filter((r) => !conflicts.includes(r))
  const paid = clean[0]?.status === 'PAID' || conflicts.some((r) => r.status === 'PAID')
  const c = conflicts[0]
  const conflict = c
    ? `สถานะจ่ายรายเดือนบันทึกไว้ให้ "${c.driverName}"${c.driverId ? ` (รหัส ${c.driverId})` : ''} ไม่ตรงกับคนขับในงาน "${bookingName || '-'}"${booking.driverId ? ` (รหัส ${booking.driverId})` : ''} — กรุณาตรวจสอบ`
    : ''
  return { paid, conflict }
}

/**
 * งานนี้ "จ่ายรายได้ให้คนขับแล้ว" ไหม — จ่ายแล้วเมื่อ
 *  1) งานอยู่ในเอกสารรายได้คนขับที่สถานะจ่ายแล้ว หรือ
 *  2) คนขับคนนี้ถูกติ๊ก "จ่ายแล้ว" ของรอบเดือนที่งานนี้อยู่ (ดู monthlyPaidCheck — ข้อมูลขัดกันที่จ่ายแล้วถือว่าล็อก)
 * งานที่ยังไม่จบ (ยังไม่ DELIVERED) ยังไม่เข้ารอบจ่ายเงินเลย ถือว่ายังไม่จ่าย
 */
export function isBookingPaidToDriver(booking: Booking, lookup: DriverPaidLookup): boolean {
  if (booking.status !== 'DELIVERED') return false
  if (booking.driverPayrollDocId && lookup.payrollDocStatus(booking.driverPayrollDocId) === 'PAID') return true
  const period = payrollPeriodLabelOf(booking)
  if (!period) return false
  return monthlyPaidCheck(booking, lookup.monthlyRecords(period)).paid
}
