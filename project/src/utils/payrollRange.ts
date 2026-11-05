/** ช่วงวันของรอบเงินเดือน — วันที่แบบ "YYYY-MM-DD" (ค.ศ. ตามเวลาในเครื่อง) รวมวันแรกและวันสุดท้าย */
export interface PayrollRange {
  from: string
  to: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export const dateKey = (date: Date | string) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "YYYY-MM" -> วันแรกถึงวันสุดท้ายของเดือนนั้น */
export function monthRange(monthValue: string): PayrollRange {
  const [y, m] = monthValue.split('-').map(Number)
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` }
}

export const currentMonthRange = () => monthRange(dateKey(new Date()).slice(0, 7))

/** เดือน "YYYY-MM" ถ้าช่วงนี้คือเต็มเดือนพอดี ไม่ใช่คืน null — สถานะจ่ายรายเดือนใช้ได้เฉพาะเต็มเดือน */
export function wholeMonthOf(range: PayrollRange): string | null {
  const month = range.from.slice(0, 7)
  const whole = monthRange(month)
  return whole.from === range.from && whole.to === range.to ? month : null
}

export const inPayrollRange = (date: Date | string | undefined, range: PayrollRange) => {
  if (!date) return false
  const key = dateKey(date)
  return key >= range.from && key <= range.to
}

/** เดือน ค.ศ. "YYYY-MM" ของรอบนี้ (ใช้เดือนของวันเริ่มต้น) */
export const payrollRangeMonth = (range: PayrollRange) => range.from.slice(0, 7)

/** "YYYY-MM" (ค.ศ.) -> รอบบัญชี พ.ศ. เช่น "2026-08" -> "2569-08" ใช้เป็น key จับคู่กับ PayrollDeduction.periodLabel */
export function toBEPeriodLabel(monthValue: string): string {
  const [y, m] = monthValue.split('-')
  return `${Number(y) + 543}-${m}`
}

const shortThaiDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`
}

/** ป้ายรอบ: เต็มเดือน = "ตุลาคม 2569", ช่วงวัน = "1 ต.ค. 2569 - 15 ต.ค. 2569" */
export function payrollRangeLabel(range: PayrollRange): string {
  const month = wholeMonthOf(range)
  if (!month) return `${shortThaiDate(range.from)} - ${shortThaiDate(range.to)}`
  const [y, m] = month.split('-').map(Number)
  return `${THAI_MONTHS[m - 1]} ${y + 543}`
}

/** ส่วนท้ายชื่อไฟล์ Excel */
export const payrollRangeFileKey = (range: PayrollRange) => wholeMonthOf(range) || `${range.from}_${range.to}`

/** ช่วงเริ่มต้นจาก query ของ URL (?from&to) รองรับลิงก์เดิม ?period=YYYY-MM ไม่มีใช้เดือนปัจจุบัน */
export function payrollRangeFromQuery(query: Record<string, unknown>): PayrollRange {
  const { from, to, period } = query
  if (typeof from === 'string' && typeof to === 'string' && DATE_KEY.test(from) && DATE_KEY.test(to)) return { from, to }
  if (typeof period === 'string' && /^\d{4}-\d{2}$/.test(period)) return monthRange(period)
  return currentMonthRange()
}

/** รอบที่แสดงบนเอกสารรายได้ — เอกสารที่ออกแบบช่วงวันมี periodFrom/periodTo เอกสารรายเดือนมีแค่ period "YYYY-MM" */
export function documentPeriodLabel(doc: { period: string; periodFrom?: string; periodTo?: string }): string {
  return payrollRangeLabel(doc.periodFrom && doc.periodTo ? { from: doc.periodFrom, to: doc.periodTo } : monthRange(doc.period))
}

/**
 * วันที่ที่ใช้นับรายการหัก/รายได้อื่นๆ เข้าช่วงวัน = วันที่ของรายการ (ไม่มีใช้วันที่บันทึก) แต่ไม่ออกนอกเดือนของรอบบัญชีที่รายการผูกอยู่
 * รายการที่วันที่อยู่นอกเดือนจึงนับที่ต้น/ท้ายเดือนนั้น — ทุกรายการอยู่วันเดียวเสมอ ตัดรอบ 1-15 กับ 16-31 แล้วครบและไม่ซ้ำ
 * และเลือกเต็มเดือนได้ผลเท่ากับการกรองด้วยรอบบัญชี (periodLabel) แบบเดิม
 */
export function payrollLineDateKey(line: { periodLabel: string; date?: Date; createdAt: Date }): string {
  const key = dateKey(line.date || line.createdAt)
  const match = /^(\d{4})-(\d{2})$/.exec(line.periodLabel)
  if (!match) return key
  const month = monthRange(`${Number(match[1]) - 543}-${match[2]}`)
  return key < month.from ? month.from : key > month.to ? month.to : key
}

export const payrollLineInRange = (line: { periodLabel: string; date?: Date; createdAt: Date }, range: PayrollRange) => {
  const key = payrollLineDateKey(line)
  return key >= range.from && key <= range.to
}
