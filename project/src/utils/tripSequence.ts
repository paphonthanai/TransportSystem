/**
 * ลำดับเที่ยวของคนขับ/รถในวันขนส่งเดียวกัน (เที่ยวที่ 1, 2, 3…) — เป็นข้อมูลจริง (Booking.tripSequence) ไม่ผูกกับลำดับที่เสมียนกดจ่ายงาน
 * เพื่อให้จ่ายเที่ยว 1/เที่ยว 2 ลำดับไหนก็ได้ แล้วแอปคนขับยังรู้ว่าเที่ยวไหนต้องกดยืนยันก่อน
 * งานเก่า/งานที่ยังไม่ระบุ (tripSequence = undefined) fallback ไปใช้ลำดับเวลาจ่ายงานเดิม (dispatchedAt → createdAt) เหมือนที่เคยเป็น
 */
export interface TripOrderable {
  tripSequence?: number
  dispatchedAt?: Date | string
  createdAt: Date | string
}

const timeOf = (b: TripOrderable) => new Date(b.dispatchedAt || b.createdAt).getTime()

/** เรียงเที่ยวแรก→ท้าย: มีเลขเที่ยวมาก่อนไม่มีเลข, เลขเท่ากัน/ไม่มีทั้งคู่ เรียงตามเวลาจ่ายงานเดิม */
export function compareByTrip(a: TripOrderable, b: TripOrderable): number {
  const sa = a.tripSequence
  const sb = b.tripSequence
  if (sa !== undefined && sb !== undefined && sa !== sb) return sa - sb
  if (sa !== undefined && sb === undefined) return -1
  if (sa === undefined && sb !== undefined) return 1
  return timeOf(a) - timeOf(b)
}

/** เลขเที่ยวของงานนี้ภายในกลุ่มงานของคนขับ/วันเดียวกัน (sameGroup ต้องรวมตัวงานนี้เองด้วย) — ใช้ tripSequence ก่อน ไม่มีค่อยนับตามลำดับ */
export function resolveTripNumber<T extends TripOrderable & { id: string }>(booking: T, sameGroup: T[]): number {
  if (booking.tripSequence !== undefined) return booking.tripSequence
  const idx = [...sameGroup].sort(compareByTrip).findIndex((b) => b.id === booking.id)
  return idx === -1 ? 1 : idx + 1
}

/** เลขเที่ยวถัดไปของกลุ่ม (others = งานอื่นของคนขับ/วันเดียวกัน ไม่รวมตัวที่กำลังจัด) */
export function nextTripSequence(others: TripOrderable[]): number {
  const sorted = [...others].sort(compareByTrip)
  let max = 0
  sorted.forEach((b, i) => {
    max = Math.max(max, b.tripSequence !== undefined ? b.tripSequence : i + 1)
  })
  return max + 1
}

/** ตรวจเลขเที่ยวต่อกลุ่ม (key = คนขับ/ทะเบียน): เลขซ้ำ หรือข้ามเลข/ไม่เริ่มที่ 1 → ข้อความเตือนต่อ key (ไม่มีปัญหา = ไม่มี key นั้น) */
export function validateTripSequences(rows: { key: string; tripSequence?: number }[]): Record<string, string[]> {
  const groups = new Map<string, number[]>()
  rows.forEach((r) => {
    if (!r.key || r.tripSequence === undefined) return
    groups.set(r.key, [...(groups.get(r.key) || []), r.tripSequence])
  })
  const out: Record<string, string[]> = {}
  groups.forEach((seqs, key) => {
    const msgs: string[] = []
    const dup = [...new Set(seqs.filter((s, i) => seqs.indexOf(s) !== i))]
    if (dup.length) msgs.push(`เลขเที่ยวซ้ำ: ${dup.join(', ')}`)
    const uniq = [...new Set(seqs)].sort((a, b) => a - b)
    if (uniq[0] !== 1 || uniq.some((s, i) => s !== i + 1)) msgs.push('เลขเที่ยวไม่ต่อเนื่อง/ไม่เริ่มที่ 1')
    if (msgs.length) out[key] = msgs
  })
  return out
}
