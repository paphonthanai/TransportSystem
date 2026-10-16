import type { Booking, DriverPaymentStatusValue } from '@/types'

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

export interface DriverPaidLookup {
  /** สถานะจ่ายของเอกสารรายได้คนขับตาม id (ไม่พบเอกสาร = undefined) */
  payrollDocStatus: (docId: string) => DriverPaymentStatusValue | undefined
  /** สถานะจ่ายรายเดือนของคนขับ (driverName, periodLabel พ.ศ.) — ไม่มีระเบียน = 'UNPAID' */
  monthlyStatus: (driverName: string, periodLabel: string) => DriverPaymentStatusValue
}

/**
 * งานนี้ "จ่ายรายได้ให้คนขับแล้ว" ไหม — จ่ายแล้วเมื่อ
 *  1) งานอยู่ในเอกสารรายได้คนขับที่สถานะจ่ายแล้ว หรือ
 *  2) คนขับคนนี้ถูกติ๊ก "จ่ายแล้ว" ของรอบเดือนที่งานนี้อยู่ (หน้าพนักงานขับรถ/รถร่วม)
 * งานที่ยังไม่จบ (ยังไม่ DELIVERED) ยังไม่เข้ารอบจ่ายเงินเลย ถือว่ายังไม่จ่าย
 */
export function isBookingPaidToDriver(booking: Booking, lookup: DriverPaidLookup): boolean {
  if (booking.status !== 'DELIVERED') return false
  if (booking.driverPayrollDocId && lookup.payrollDocStatus(booking.driverPayrollDocId) === 'PAID') return true
  const period = payrollPeriodLabelOf(booking)
  const driver = payrollDriverKeyOf(booking)
  return !!period && !!driver && lookup.monthlyStatus(driver, period) === 'PAID'
}
