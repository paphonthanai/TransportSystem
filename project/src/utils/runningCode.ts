/**
 * รหัสถัดไปแบบรันเลข = เลขท้ายที่มากที่สุดในรหัสที่มีอยู่ + 1 (คงคำนำหน้า/จำนวนหลักของรหัสนั้น — ยังไม่มีรหัสเลย = `width` หลัก)
 * เดิมใช้ "จำนวนรายการ + 1" ทำให้ได้รหัสซ้ำกับของเดิมเมื่อเคยลบรายการหรือรหัสข้ามเลข — ไม่คืนรหัสที่มีอยู่แล้วเด็ดขาด
 */
export function nextRunningCode(codes: string[], width = 4): string {
  const taken = new Set(codes.map((c) => (c || '').trim()))
  let prefix = ''
  let digits = width
  let max = 0
  for (const code of taken) {
    const m = /^(.*?)(\d+)$/.exec(code)
    if (!m) continue
    const n = Number(m[2])
    if (n > max) {
      max = n
      prefix = m[1]
      digits = m[2].length
    }
  }
  let n = max + 1
  let next = `${prefix}${String(n).padStart(digits, '0')}`
  while (taken.has(next)) next = `${prefix}${String(++n).padStart(digits, '0')}`
  return next
}
