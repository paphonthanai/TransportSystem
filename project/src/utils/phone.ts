/**
 * เบอร์โทรไทยในข้อความ — รองรับการจัดกลุ่มตัวเลขทุกแบบ (084-535-8614, 088-8367-888, 095 4218165, 02-123-4567)
 * ตัวเลขในเบอร์เดียวคั่นด้วย "เว้นวรรค/ขีด 1 ตัว" ได้เท่านั้น ไม่ข้ามบรรทัด จุลภาค หรือเครื่องหมายอื่น (จึงไม่ต่อสองเบอร์เป็นเลขเดียว)
 */
const RUN_RE = /0(?:[ \t-]?\d)+/g

const isPhoneLength = (n: number) => n === 9 || n === 10

/** ตัดตัวเลขที่ยาวเกินเบอร์เดียว (สองเบอร์ติดกัน) เป็นเบอร์ละ 10 (หรือ 9) หลัก */
function splitLongRun(run: string): string[] {
  // ถ้าสองเบอร์คั่นด้วยเว้นวรรค แต่ละท่อนที่คั่นด้วยเว้นวรรคเป็นเบอร์ครบเบอร์อยู่แล้ว
  const parts = run.trim().split(/[ \t]+/).map((p) => p.replace(/\D/g, ''))
  if (parts.length > 1 && parts.every((p) => isPhoneLength(p.length))) return parts
  // ไม่งั้นตัดตามจำนวนหลัก (เบอร์ไทยขึ้นต้นด้วย 0 เสมอ)
  const out: string[] = []
  let rest = run.replace(/\D/g, '')
  while (rest.startsWith('0') && rest.length >= 9) {
    if (isPhoneLength(rest.length)) {
      out.push(rest)
      break
    }
    const take = rest.length - 10 >= 9 ? 10 : rest.length - 9 >= 9 ? 9 : 10
    out.push(rest.slice(0, take))
    rest = rest.slice(take)
  }
  return out
}

/** เบอร์ทั้งหมดในข้อความ (เฉพาะตัวเลข ไม่ซ้ำ เรียงตามที่เจอ) — เบอร์ไทยมี 9 (บ้าน) หรือ 10 (มือถือ) หลัก */
export function extractPhones(text: string | undefined | null): string[] {
  const out: string[] = []
  for (const match of String(text ?? '').matchAll(RUN_RE)) {
    const digits = match[0].replace(/\D/g, '')
    const found = isPhoneLength(digits.length) ? [digits] : digits.length > 10 ? splitLongRun(match[0]) : []
    for (const p of found) if (!out.includes(p)) out.push(p)
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
  const fromStored = stored.length > 10 && /^\d+$/.test(stored) ? splitLongRun(stored) : extractPhones(stored)
  for (const p of fromStored) if (!phones.includes(p)) phones.push(p)
  return phones
}

/** แสดงเบอร์ให้อ่านง่าย: 0845358614 → 084-535-8614 (9 หลัก → 02-123-4567) */
export function formatPhone(digits: string): string {
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  return digits
}
