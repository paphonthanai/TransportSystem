export interface DateRange {
  from: Date | null
  to: Date | null
}

export type RangeKind = 'all' | 'week' | 'month' | 'quarter' | 'year' | ''

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

/**
 * ช่วงวันที่ตามชนิดตัวกรองของ Dashboard (เวลาท้องถิ่นของเครื่อง):
 * สัปดาห์นี้ = จันทร์–อาทิตย์ของสัปดาห์ปัจจุบัน, เดือนนี้, ไตรมาสนี้ (ม.ค.-มี.ค./เม.ย.-มิ.ย./ก.ค.-ก.ย./ต.ค.-ธ.ค.), ปีนี้
 * ชนิดอื่น/ว่าง/all = ไม่จำกัด (from/to เป็น null)
 */
export function rangeFor(kind: string, now: Date): DateRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  if (kind === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7
    const from = startOfDay(new Date(y, m, now.getDate() - mondayOffset))
    return { from, to: endOfDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6)) }
  }
  if (kind === 'month') return { from: new Date(y, m, 1), to: endOfDay(new Date(y, m + 1, 0)) }
  if (kind === 'quarter') {
    const q = Math.floor(m / 3) * 3
    return { from: new Date(y, q, 1), to: endOfDay(new Date(y, q + 3, 0)) }
  }
  if (kind === 'year') return { from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)) }
  return { from: null, to: null }
}

/** งานอยู่ในช่วงไหม ตามวันที่ส่งของเสร็จ — ช่วงไม่จำกัด = ผ่านทุกงาน, มีช่วงแต่ไม่มีวันที่เสร็จ = ไม่ผ่าน */
export function inRange(b: { completedAt?: Date | string }, r: DateRange): boolean {
  if (!r.from && !r.to) return true
  if (!b.completedAt) return false
  const t = new Date(b.completedAt).getTime()
  return (!r.from || t >= r.from.getTime()) && (!r.to || t <= r.to.getTime())
}
