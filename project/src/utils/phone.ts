/**
 * เบอร์โทรไทยในข้อความ: 0 + 1–2 หลัก (รหัสเครือข่าย/พื้นที่) + 3 หลัก + 3–4 หลัก คั่นด้วยเว้นวรรค/ขีดได้ "ภายในเบอร์เดียว" เท่านั้น
 * (ไม่ข้ามบรรทัด ไม่ต่อสองเบอร์เป็นเลขเดียว) เช่น "084-535-8614", "095 4218165", "02-123-4567"
 */
const PHONE_RE = /0\d{1,2}[ \t-]?\d{3}[ \t-]?\d{3,4}/g

/** เบอร์ทั้งหมดในข้อความ (เฉพาะตัวเลข ไม่ซ้ำ เรียงตามที่เจอ) — เบอร์ไทยมี 9 (บ้าน) หรือ 10 (มือถือ) หลัก */
export function extractPhones(text: string | undefined | null): string[] {
  const out: string[] = []
  for (const match of String(text ?? '').matchAll(PHONE_RE)) {
    const digits = match[0].replace(/\D/g, '')
    if ((digits.length === 9 || digits.length === 10) && !out.includes(digits)) out.push(digits)
  }
  return out
}

/**
 * เบอร์ของจุดส่ง (ใช้กับปุ่มโทรของคนขับ): ดึงจากข้อความผู้ติดต่อก่อน (มีครบทุกเบอร์ที่ออฟฟิศกรอก) ต่อด้วยช่องเบอร์โทร
 * งานเก่าที่เบอร์สองเบอร์ถูกต่อกันเป็นเลขยาวผิดๆ (เช่น 0845358614 + 0954218165) ก็แยกกลับเป็นเบอร์ละ 10 หลักให้
 */
export function phonesOfSite(item: { siteContactName?: string; sitePhone?: string }): string[] {
  const phones = extractPhones(item.siteContactName)
  const stored = String(item.sitePhone ?? '').replace(/[\s-]+/g, '')
  const fromStored = stored.length > 10 && /^\d+$/.test(stored) ? (stored.match(/0\d{9}|0\d{8}/g) ?? []) : extractPhones(stored)
  for (const p of fromStored) if (!phones.includes(p)) phones.push(p)
  return phones
}

/** แสดงเบอร์ให้อ่านง่าย: 0845358614 → 084-535-8614 (9 หลัก → 02-123-4567) */
export function formatPhone(digits: string): string {
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  return digits
}
