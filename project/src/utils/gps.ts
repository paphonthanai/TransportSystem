/**
 * แปลงข้อความ/ลิงก์พิกัดที่ผู้ใช้วางไว้ เป็นตัวเลข latitude/longitude ถ้าอ่านได้
 * รองรับลิงก์ Google Maps รูปแบบ @lat,lng, ?q=lat,lng, ?ll=lat,lng หรือคู่ตัวเลข "lat,lng" ตรงๆ
 * ไม่ว่าจะ parse ได้หรือไม่ ข้อความดิบจะถูกเก็บแยกไว้เป็น mapUrl เสมอที่จุดเรียกใช้
 */
export function parseGpsInput(raw: string): { latitude?: number; longitude?: number } {
  if (!raw) return {}
  const patterns = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/]
  for (const p of patterns) {
    const m = raw.match(p)
    if (m) return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) }
  }
  const bare = raw.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/)
  if (bare) return { latitude: parseFloat(bare[1]), longitude: parseFloat(bare[2]) }
  return {}
}
