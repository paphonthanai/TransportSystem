/**
 * ค้นหาจากค่าที่แสดงในแต่ละคอลัมน์ของตาราง (ส่งค่าที่ format แล้วตามที่ผู้ใช้เห็น เช่น วันที่ "27/10/2569", ยอด "฿3,000.00")
 * ไม่สนตัวพิมพ์เล็กใหญ่ · เว้นวรรคหลายคำ = ต้องเจอทุกคำ (คนละคอลัมน์ก็ได้) · ตัวเลขพิมพ์มี/ไม่มีจุลภาคก็ได้ ("3000" เจอ "3,000")
 */
export function matchesSearchFields(query: string, fields: (string | number | null | undefined)[]): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = fields
    .filter((f) => f !== null && f !== undefined && f !== '')
    .map((f) => String(f))
    .join(' | ')
    .toLowerCase()
  const hayNoComma = hay.replace(/,/g, '')
  return words.every((w) => hay.includes(w) || hayNoComma.includes(w.replace(/,/g, '')))
}
