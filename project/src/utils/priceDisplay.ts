/**
 * ข้อความอธิบายแทนการโชว์ "฿0" เฉยๆ ในช่องราคา — ยอด 0 ในระบบนี้แทบทุกจุดหมายถึง "ยังไม่ได้กรอกราคา"
 * ไม่ใช่ราคาจริงๆ ที่ตกลงกันคือ 0 บาท (เช่น งาน import จาก Excel ที่ยังไม่มีราคาปูน/จำนวนตัน) — โชว์ "฿0" เฉยๆ
 * ทำให้ผู้ใช้เข้าใจผิดว่าราคาคือ 0 จริง ทั้งที่จริงๆ คือ "ยังไม่มีข้อมูล"
 */
export const PRICE_NOT_SET_LABEL = 'ยังไม่ระบุราคา'

/** ใช้เมื่อค่าที่เช็คกับค่าที่แสดงเป็นตัวเดียวกัน (เช่น booking.tripFee เอง) */
export function priceCellText(value: number, formatBaht: (v: number) => string): string {
  return value > 0 ? formatBaht(value) : PRICE_NOT_SET_LABEL
}
