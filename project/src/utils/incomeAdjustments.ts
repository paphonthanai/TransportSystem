/**
 * รายการที่ผู้ใช้พิมพ์เองตอนออกเอกสารรายได้ (คนขับ/รถร่วม): "รายได้ส่วนเพิ่ม" และ "หักค่าใช้จ่าย" — ระบุรายละเอียด + จำนวนเงินเอง
 * เพิ่มได้หลายรายการ (ปุ่ม +) แถวที่ว่างทั้งชื่อและยอดถูกข้ามไป ไม่นับเป็นข้อผิดพลาด
 */
export interface IncomeAdjustmentLine {
  label: string
  amount: number
}

export interface IncomeAdjustments {
  additions: IncomeAdjustmentLine[]
  deductions: IncomeAdjustmentLine[]
}

export const emptyAdjustments = (): IncomeAdjustments => ({ additions: [], deductions: [] })

const roundMoney = (n: number) => Math.round(n * 100) / 100

const isBlank = (l: IncomeAdjustmentLine) => !l.label.trim() && !Number(l.amount)

/** ตัดแถวว่าง + trim ชื่อ + ปัดสตางค์ — ใช้ก่อนบันทึกลงเอกสาร */
export function cleanAdjustmentLines(lines: IncomeAdjustmentLine[]): IncomeAdjustmentLine[] {
  return lines.filter((l) => !isBlank(l)).map((l) => ({ label: l.label.trim(), amount: roundMoney(Number(l.amount)) }))
}

/** ข้อความผิดพลาดของรายการ (ว่าง = ใช้ได้) — ทุกแถวที่ไม่ว่างต้องมีรายละเอียดและยอดมากกว่า 0 */
export function adjustmentIssue(adjustments: IncomeAdjustments): string {
  const all = [...adjustments.additions, ...adjustments.deductions].filter((l) => !isBlank(l))
  if (all.some((l) => !l.label.trim())) return 'กรุณาระบุรายละเอียดของรายได้ส่วนเพิ่ม/หักค่าใช้จ่ายให้ครบทุกรายการ'
  if (all.some((l) => !Number.isFinite(Number(l.amount)) || Number(l.amount) <= 0)) return 'จำนวนเงินของรายได้ส่วนเพิ่ม/หักค่าใช้จ่ายต้องมากกว่า 0'
  return ''
}

export const sumAdjustmentLines = (lines: IncomeAdjustmentLine[]) => roundMoney(cleanAdjustmentLines(lines).reduce((sum, l) => sum + l.amount, 0))
