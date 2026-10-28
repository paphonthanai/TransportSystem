import type { BookingJobType } from '@/types'
import { normalizePlateCode } from '@/utils/importReconciliation'
import { parseGpsInput } from '@/utils/gps'
import { extractPhones } from '@/utils/phone'
import { parseJobType } from '@/utils/jobType'

// --- นำเข้า Booking จากไฟล์ Excel งานจริง (Requirement: "Import Excel เพื่อสร้างงาน" ตามคอลัมน์ที่หน้างานใช้อยู่จริง) ---
// 1 แถว Excel = 1 Booking เสมอ (ไม่มีคอลัมน์กลุ่มงานแล้วเหมือนเทมเพลตเดิม) — เจตนาของฟีเจอร์นี้เปลี่ยนจาก "สร้างงานใหม่
// จากข้อมูลที่ครบถ้วน" เป็น "นำข้อมูลงานจริง (ที่อาจกรอกไม่ครบ/มีสถานะไปไกลแล้ว) เข้าระบบให้ได้ก่อน" ตามที่ตกลงกันไว้:
// ห้ามข้าม/บล็อกแถวเด็ดขาดแม้ข้อมูลน้ำมัน/ปลายทาง/ราคาจะไม่ครบ ให้สร้างงานได้เสมอแล้วแปะหมายเหตุ (note) ไว้ให้ไปกรอกเพิ่มทีหลัง
//
// ไฟล์จริงของลูกค้า (16 คอลัมน์ ยืนยันแล้ว) ไม่มีคอลัมน์ "ทะเบียนรถ" เลย — "คอนเฟิร์ม" คือทะเบียนรถจริงที่ใช้ยืนยันงาน
// เสมอ (ไม่ใช่แค่รหัสยืนยันคิวเบื้องต้นตามที่เข้าใจผิดไว้เดิม) จึงใช้คอลัมน์นี้ตรงๆ เป็นทะเบียนรถของ Booking โดยไม่มี
// fallback คอลัมน์อื่นอีก (ไฟล์รุ่นเก่าบางไฟล์มีคอลัมน์ "ทะเบียนรถ" แต่เก็บเป็นรายการรถหลายคันคั่นจุลภาค ใช้แทนไม่ได้)
//
// ไม่มีคอลัมน์ "สถานะขนส่งสินค้า" ด้วยเช่นกัน (ของเดิมเคยมีแล้วเอาไปตั้ง status ของ Booking ให้ แต่ไฟล์จริงไม่มีคอลัมน์
// นี้อยู่แล้ว และเป็นการตัดสินใจของระบบว่า "สถานะงาน" ต้องเป็นสิ่งที่ระบบ/ผู้ใช้กำหนดเองเสมอ ไม่ใช่ไฟล์ที่ import เข้ามา —
// งานที่ import มาทุกงานจึงเริ่มที่ WAITING_DISPATCH เสมอ ไม่มีทางถูกตั้งเป็น "จบงานแล้ว" จากไฟล์ได้อีก)
// ไฟล์ล่าสุดบางไฟล์เริ่มมีคอลัมน์ "ประเภทงาน" เพิ่มมาด้วย (ค่าที่เจอ เช่น "ลงมือ"/"พาเรท") — เดาคอลัมน์ตามชื่อที่ลูกค้า
// พิมพ์มาตรงๆ เพราะไม่มีไฟล์จริงมายืนยัน pattern แน่ชัด ถ้าไม่เจอคอลัมน์นี้เลยหรืออ่านค่าไม่ตรงกับ BookingJobType ที่ระบบ
// รู้จัก (ลงมือ/พาเลทโรงงาน/พาเลทฟรี) ห้ามบล็อกการสร้างงาน แค่เว้นว่างไว้แล้วเตือนให้ไปตรวจสอบเอง (ดู jobType ด้านล่าง)
/** หัวคอลัมน์ประเภทงานแบบเดิม — ยังรับอยู่ถ้าไฟล์ไม่มีคอลัมน์ "ประเภท" */
const LEGACY_JOB_TYPE_HEADER = 'ประเภทงาน'

export const IMPORT_HEADERS = {
  driverName: 'พขร.',
  plate: 'คอนเฟิร์ม',
  docRef: 'เลขที่เอกสาร',
  customer: 'บมจ./บจก./ร้าน/หจก.',
  ticketChecked: 'เช็คตั๋ว',
  time: 'time',
  siteName: 'สถานที่ส่งสินค้า',
  districtProvince: 'อำเภอ/จังหวัด',
  phone: 'เบอร์',
  product: 'ชนิดปูน',
  qty: 'จำนวนตัน',
  allowance: 'เบี้ยเลี้ยง',
  price: 'ราคาปูน',
  fuel: 'น้ำมัน',
  /** ค่า d1 (ลงมือ) / d2 (พาเลทโรงงาน) / d3 (พาเลทฟรี) หรือชื่อไทยเต็มก็ได้ — ไฟล์เก่าที่ใช้หัว "ประเภทงาน" ยังอ่านได้ (LEGACY_JOB_TYPE_HEADER) */
  jobType: 'ประเภท',
  mapLink: 'พิกัด/ลิงก์ Google Maps หน้างาน',
  tripNo: 'เที่ยวที่',
  note: 'หมายเหตุ',
  /** ไม่บังคับ — ไม่มีคอลัมน์/เซลล์ว่าง = แอปคนขับดึงเงื่อนไขลูกค้าจากหมายเหตุแทน */
  customerCondition: 'เงื่อนไขลูกค้า',
} as const

/**
 * อ่านช่อง "น้ำมัน" จาก Excel — ลูกค้ากรอกมาทั้งตัวเลขล้วนและข้อความปนกัน:
 *  - ตัวเลขล้วน/ว่าง → อ่านตรงๆ (ว่าง = ไม่มีข้อมูล ผู้เรียกใช้ลิตรมาตรฐานแทนตามเดิม)
 *  - "ไม่เติม"/"No" → 0 ลิตรโดยตั้งใจ (explicitZero) ไม่ fallback ไปใช้ลิตรมาตรฐาน และคิดเงินได้
 *  - "38 ก๊าซ" → 38 พร้อมหมายเหตุ "ก๊าซ" (ข้อความที่เหลือหลังตัดตัวเลขออก)
 *  - "30 - 30"/"38-21"/"20+10" → คำนวณก่อนบันทึก (30-30 = 0 ถือเป็น 0 โดยตั้งใจ, 38-21 = 17) ผลลัพธ์ติดลบ = อ่านไม่ได้
 *  - ข้อความที่ไม่มีตัวเลขเลย (และไม่ใช่ไม่เติม) → invalid ให้ผู้เรียกเตือนแล้วใช้ลิตรมาตรฐานแทน
 */
export interface FuelCell {
  liters?: number
  explicitZero?: boolean
  remark?: string
  invalid?: string
}
export function parseFuelCell(raw: unknown): FuelCell {
  if (raw === undefined || raw === null) return {}
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? { liters: raw, explicitZero: raw === 0 } : { invalid: String(raw) }
  const text = String(raw).replace(/\s+/g, ' ').trim()
  if (!text) return {}
  if (/ไม่เติม/.test(text) || /^no$/i.test(text)) return { liters: 0, explicitZero: true, remark: text }
  const expr = text.match(/\d+(?:\.\d+)?(?:\s*[-+]\s*\d+(?:\.\d+)?)*/)
  if (!expr) return { invalid: text }
  const terms = expr[0].match(/[-+]?\s*\d+(?:\.\d+)?/g) || []
  let total = 0
  terms.forEach((t, i) => {
    const sign = t.trim().startsWith('-') ? -1 : 1
    total += (i === 0 ? 1 : sign) * Number(t.replace(/[-+\s]/g, ''))
  })
  total = Math.round(total * 100) / 100
  if (!Number.isFinite(total) || total < 0) return { invalid: text }
  const leftover = text.replace(expr[0], ' ').replace(/\s+/g, ' ').replace(/^[\s,;:()\-]+|[\s,;:()\-]+$/g, '').trim()
  const remarks: string[] = []
  if (leftover) remarks.push(leftover)
  if (terms.length > 1) remarks.push(`คำนวณจาก ${expr[0].replace(/\s+/g, '')} = ${total}`)
  return { liters: total, explicitZero: total === 0, remark: remarks.join(' ') || undefined }
}

/** เทียบหัวคอลัมน์แบบหลวม: ตัดวรรณยุกต์/ไม้ไต่คู้/การันต์/ช่องว่าง ไม่สนตัวพิมพ์ และ "ลิงค์"≈"ลิงก์" — ลูกค้าพิมพ์หัวคอลัมน์เองหลายแบบ
 *  (เช่น "พิกัด/ลิ้งก์ Google maps หน้างาน" ต่างจากชื่อที่ระบบรู้จักแค่ไม้โท/ตัวพิมพ์) */
export const normalizeHeader = (s: unknown) =>
  String(s ?? '')
    .normalize('NFC')
    .replace(/[็-์]/g, '')
    .replace(/\s+/g, '')
    .replace(/ลิงค/g, 'ลิงก')
    .toLowerCase()

const MAP_LINK_KEYWORDS = ['gps', 'googlemap', 'ลิงก', 'แผนที่', 'พิกัด', 'location']
const TRIP_NO_HEADERS = ['เที่ยวที่', 'เที่ยว', 'ลำดับเที่ยว', 'trip', 'tripno'].map(normalizeHeader)

/** หาชื่อคอลัมน์จริงในไฟล์ของคอลัมน์ลิงก์ GPS / เที่ยวที่ — ชื่อตรงเป๊ะมาก่อน แล้วค่อยเทียบแบบหลวม (ไม่ชนกับหัวคอลัมน์ที่ระบบรู้จักอื่น) */
export function resolveImportColumns(headers: string[]): { mapLink?: string; tripNo?: string } {
  const known = new Set(Object.values(IMPORT_HEADERS).map(normalizeHeader))
  const out: { mapLink?: string; tripNo?: string } = {}
  const exactMap = headers.find((h) => h === IMPORT_HEADERS.mapLink)
  const exactTrip = headers.find((h) => h === IMPORT_HEADERS.tripNo)
  out.mapLink = exactMap ?? headers.find((h) => {
    const n = normalizeHeader(h)
    return n && (n === normalizeHeader(IMPORT_HEADERS.mapLink) || (!known.has(n) && MAP_LINK_KEYWORDS.some((k) => n.includes(k))))
  })
  out.tripNo = exactTrip ?? headers.find((h) => TRIP_NO_HEADERS.includes(normalizeHeader(h)))
  return out
}

/** แถวดิบ → ใส่ค่าในคีย์หัวคอลัมน์มาตรฐาน (IMPORT_HEADERS.mapLink/tripNo) ถ้าไฟล์ใช้ชื่ออื่น — ไม่แตะแถวที่ใช้ชื่อมาตรฐานอยู่แล้ว */
export function withColumnAliases(raw: Record<string, unknown>): Record<string, unknown> {
  const cols = resolveImportColumns(Object.keys(raw))
  const out = { ...raw }
  if (cols.mapLink && cols.mapLink !== IMPORT_HEADERS.mapLink && !str0(out[IMPORT_HEADERS.mapLink])) out[IMPORT_HEADERS.mapLink] = raw[cols.mapLink]
  if (cols.tripNo && cols.tripNo !== IMPORT_HEADERS.tripNo && !str0(out[IMPORT_HEADERS.tripNo])) out[IMPORT_HEADERS.tripNo] = raw[cols.tripNo]
  return out
}
const str0 = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())

/** อ่านเลขเที่ยวจากเซลล์ "เที่ยวที่" — "1", 2, "เที่ยว 2", "เที่ยวที่2", "T1" → ตัวเลขตัวแรก (ต้อง ≥ 1) ไม่มี/อ่านไม่ได้ = undefined */
export function parseTripNumber(raw: unknown): number | undefined {
  const m = str0(raw).match(/\d+/)
  if (!m) return undefined
  const n = parseInt(m[0], 10)
  return n >= 1 ? n : undefined
}

/** ไฟล์ไม่มีคอลัมน์ "เที่ยวที่"/เซลล์ว่าง → ตั้งเลขเที่ยวจากลำดับแถวของ พขร./ทะเบียนเดียวกัน (ต่อจากเลขสูงสุดที่ระบุแล้วในกลุ่ม) */
export function assignImportTripSequences<T extends { driverName: string; plate: string; tripSequence?: number; isEmpty: boolean }>(rows: T[]): T[] {
  const maxByKey = new Map<string, number>()
  const keyOf = (r: T) => r.driverName || r.plate
  rows.forEach((r) => {
    const k = keyOf(r)
    if (!k || r.isEmpty || r.tripSequence === undefined) return
    maxByKey.set(k, Math.max(maxByKey.get(k) || 0, r.tripSequence))
  })
  const counter = new Map<string, number>()
  rows.forEach((r) => {
    const k = keyOf(r)
    if (!k || r.isEmpty || r.tripSequence !== undefined) return
    const next = Math.max(counter.get(k) ?? 0, maxByKey.get(k) ?? 0) + 1
    counter.set(k, next)
    r.tripSequence = next
  })
  return rows
}

/** ไฟล์ Excel ที่ลิงก์ GPS เป็น hyperlink (ข้อความป้าย + URL ฝังในเซลล์) sheet_to_json ได้แค่ข้อความ → ดึง URL จริงจาก cell.l.Target
 *  แล้วใส่แทนค่าในคอลัมน์ลิงก์ (ใช้ชื่อคอลัมน์ที่ resolveImportColumns หาได้) — headerRowIndex = แถว (0-based) ของหัวคอลัมน์ในชีท */
export function applySheetHyperlinks(sheet: Record<string, any>, headerRowIndex: number, headers: string[], rows: Record<string, unknown>[]): void {
  const mapCol = resolveImportColumns(headers).mapLink
  if (!mapCol) return
  const c = headers.indexOf(mapCol)
  if (c < 0) return
  const colName = (n: number) => {
    let s = ''
    for (let x = n + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s
    return s
  }
  rows.forEach((row, i) => {
    const cell = sheet[`${colName(c)}${headerRowIndex + 2 + i}`]
    const target = cell?.l?.Target
    if (target && typeof target === 'string' && !/^https?:\/\//.test(str0(row[mapCol]))) row[mapCol] = target
  })
}

export interface ImportRowResult {
  /** ชื่อเล่นคนขับตามที่เขียนใน Excel (ดิบ) — ใช้แสดงผลการ map "ชื่อเล่น → ชื่อจริง" ในพรีวิว (driverName = ชื่อจริงที่จับคู่ได้ ว่าง = ยังไม่ได้ map) */
  driverNickname: string
  rowNumber: number
  isEmpty: boolean
  driverName: string
  driverId?: string
  /** snapshot ชื่อ/นามสกุลคนขับ ณ ตอนจับคู่ (เหมือนที่จัดรถบันทึกไว้ — เงินเดือนใช้ field นี้) */
  driverFirstName?: string
  driverLastName?: string
  plate: string
  docRef: string
  customer: string
  ticketChecked: boolean
  time: string
  siteName: string
  district: string
  province: string
  siteContactName: string
  phone: string
  /** ข้อความ/ลิงก์ Google Maps ดิบจากคอลัมน์ "พิกัด/ลิงก์ Google Maps หน้างาน" (ไม่บังคับ) — เก็บไว้เป็น JobItem.mapUrl
   *  เสมอไม่ว่าจะ parse พิกัดได้หรือไม่ (เหมือน pattern เดียวกับหน้ากรอกเอง ดู utils/gps.ts) undefined = ไม่มีคอลัมน์/เซลล์ว่าง */
  mapUrl?: string
  latitude?: number
  longitude?: number
  /** เที่ยวที่ของคนขับ/รถนี้ในวันเดียวกัน (จากคอลัมน์ "เที่ยวที่" หรือเรียงตามแถวซ้ำคนขับ ดู assignImportTripSequences) */
  tripSequence?: number
  product: string
  /** แยกจาก product ด้วยเครื่องหมาย "+" (เช่น "23 + 52" → ["23","52"]) — กรณีแถวเดียวมีหลายชนิดสินค้าปนกัน
   *  ตัวแรกใช้เป็นสินค้าหลักของ Item เดิม ตัวที่เหลือไปเป็น extraProducts (ดู confirmImport) */
  productCodes: string[]
  /** สินค้าแต่ละชนิดคู่กับจำนวนตันของตัวเอง (จับคู่ตามตำแหน่งกับคอลัมน์จำนวนตันที่แยกด้วย + เหมือนกัน) — ใช้สร้าง
   *  extraProducts ตอน confirmImport แทนการเดาแบ่ง qty รวมเท่าๆ กันทุกชนิด */
  productQtyPairs: { product: string; qty: number }[]
  qty: number
  allowance: number
  price: number
  fuelLiters: number
  /** ช่องน้ำมันอ่านค่าไม่ได้ — ลิตรเว้นเป็น 0 ไม่ใช้ลิตรมาตรฐาน และยังไม่ถูกนำไปคิดเงิน (ดู Booking.fuelUnreadable) */
  fuelUnreadable?: boolean
  /** ช่องน้ำมันเขียนว่า "ไม่เติม"/คำนวณได้ 0 โดยตั้งใจ — งานนี้ติ๊ก "ไม่เติมน้ำมัน" ให้เอง (ข้อมูลน้ำมันครบ จบงานได้) */
  fuelNotRefilled?: boolean
  jobType?: BookingJobType
  note: string
  /** คอลัมน์ "เงื่อนไขลูกค้า" (ไม่บังคับ) ว่าง = '' */
  customerCondition: string
  warnings: string[]
  /** ข้อควรตรวจก่อนนำเข้า (พิกัด/ลิงก์ GPS, เลขเที่ยวอ่านไม่ได้) — แสดงในพรีวิวให้ตรวจก่อนยืนยัน ไม่ถูกแปะลง note ของงาน และไม่บล็อกการสร้างงาน
   *  (ต่างจาก warnings ที่ข้อมูลขาด/จับคู่ไม่ได้ซึ่งแปะลง note) */
  checks: string[]
}

/** คอลัมน์แรกสุดของชีทงานจริงเสมอ (ทั้งไฟล์ที่มี Row หัวเรื่อง+วันที่ และไฟล์ที่ไม่มี) ใช้เช็คว่า Row แรกของไฟล์ที่
 *  อัปโหลดเป็นหัวคอลัมน์เลย (ไม่มีหัวเรื่อง) หรือเป็นหัวเรื่อง/วันที่ส่งงานที่ต้องข้ามไปอีก 1 แถว */
export const IMPORT_HEADER_MARKER = 'ลำดับ'

/** หาคนขับจาก "ชื่อเล่น" (ใช้เฉพาะตอนนำเข้า Excel — ไฟล์จัดคิวจริงกรอกชื่อเล่นแทนชื่อจริงเสมอ) ต้องเชื่อมกับทะเบียนรถ
 *  ที่ประจำคนขับคนนั้นด้วยเสมอกันชื่อเล่นซ้ำกัน — ถ้าเจอชื่อเล่นตรงกันคนเดียวและไม่มีทะเบียนรถมาเทียบเลย ก็ยังเชื่อ
 *  ชื่อเล่นได้ (ไม่มีอะไรให้ขัดแย้ง) แต่ถ้ามีทะเบียนรถมาด้วย ต้องตรงกับรถที่ประจำคนขับคนนั้นจริงเท่านั้น ไม่งั้นถือว่า
 *  ข้อมูลไม่ตรงกับที่ผูกในระบบ คืน undefined (ให้ผู้เรียกเว้นว่างไว้ ไม่เดาสุ่ม) — เทียบทะเบียนด้วย normalizePlateCode
 *  (ตัดขีด/ช่องว่าง) แทนการเทียบตัวอักษรตรงๆ กันพลาดเพราะรูปแบบเขียนต่างกันนิดหน่อย (มี/ไม่มีขีด) */
/** ชื่อเล่นแบบหลวม: ตัดวรรณยุกต์ (่ ้ ๊ ๋) ไม้ไต่คู้ (็) การันต์ (์) และช่องว่าง แล้วเทียบแบบไม่สนตัวพิมพ์ */
export const looseNickname = (s: string | undefined) =>
  (s || '')
    .normalize('NFC')
    .replace(/[\u0E47-\u0E4C]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()

export function matchDriverForImport<D extends { code: string; nickname: string }>(
  nickname: string,
  plate: string,
  drivers: D[],
  vehicleForDriver: (driverCode: string) => { plate: string } | undefined
): D | undefined {
  // (d.nickname || '') กันพัง — คนขับที่บันทึกไว้ก่อนฟีเจอร์นี้มีอยู่ใน Firestore จริงโดยไม่มี field นี้เลย (undefined
  // ไม่ใช่ '') เพราะ driverRepository.getAll() ไม่ได้ผ่าน sanitizeDriver() (ต่างจากตอนแก้ไขผ่านฟอร์มที่ผ่านเสมอ)
  // จับคู่ชื่อเล่นตรงตัวก่อน ถ้าไม่เจอค่อยจับคู่แบบหลวม (ไม่สนวรรณยุกต์/ไม้ไต่คู้/การันต์/ช่องว่าง/ตัวพิมพ์เล็ก-ใหญ่) เพราะ
  // ไฟล์ Excel พิมพ์ชื่อเล่นเพี้ยนนิดเดียวบ่อย เช่น "แจ๊ค" กับ "แจ็ค" ทั้งที่เป็นคนเดียวกัน — ผ่านเงื่อนไขทะเบียนเดิมต่อ ไม่เดาข้ามคน
  const exact = drivers.filter((d) => (d.nickname || '').trim() === nickname.trim())
  const candidates = exact.length ? exact : drivers.filter((d) => looseNickname(d.nickname) !== '' && looseNickname(d.nickname) === looseNickname(nickname))
  if (candidates.length === 0) return undefined
  const plateNorm = normalizePlateCode(plate)
  // ทะเบียนในไฟล์มักต่อท้ายด้วยชื่อจังหวัด ("72-3825 สระบุรี") ขณะที่ทะเบียนรถในระบบเก็บเลขทะเบียนล้วน ("72-3825") จึงเทียบทั้งแบบเต็ม
  // และแบบตัดจังหวัด (ส่วนหน้าช่องว่างแรก) — เดิมเทียบแบบเต็มอย่างเดียว ทำให้ชื่อเล่นที่ถูกต้องจับคู่ไม่ได้เพราะจังหวัดต่อท้าย
  const plateHeadNorm = normalizePlateCode(plate.trim().split(/\s+/)[0] || '')
  const samePlate = (vehiclePlate: string) => {
    const v = normalizePlateCode(vehiclePlate)
    return v === plateNorm || (!!plateHeadNorm && v === plateHeadNorm)
  }
  // ชื่อเล่นตรงกับคนขับ "คนเดียว" = ใช้คนนั้นเลย ไม่ว่าทะเบียนในแถวจะเป็นรถประจำของเขาหรือไม่ (คนขับขับรถคันอื่นแทนได้ — ออฟฟิศเขียนชื่อเล่น
  // คือบอกว่าใครขับ) ถ้าทะเบียนต่างจากรถประจำ parseImportRow แปะคำเตือนให้ตรวจ — เดิมไม่จับคู่แล้วเว้นคนขับว่าง + หมายเหตุ "ไม่ตรงกับที่ผูกไว้" ค้างในงาน
  if (candidates.length === 1) return candidates[0]
  // ชื่อเล่นซ้ำหลายคน → ต้องใช้ทะเบียนตัดสิน ไม่เจอคู่ที่ตรงก็ไม่เดา
  if (!plateNorm) return undefined
  return candidates.find((d) => {
    const vehicle = vehicleForDriver(d.code)
    return vehicle && samePlate(vehicle.plate)
  })
}

/** หาลูกค้าจากข้อความในไฟล์ (มักกรอกแบบย่อ เช่น "Sccc") — จับคู่กับ "รหัสผู้ติดต่อ" (ชื่อย่อ) ก่อนเสมอ ถ้าไม่เจอค่อยลอง
 *  จับคู่กับชื่อเต็มตรงๆ (เผื่อไฟล์บางไฟล์กรอกชื่อเต็มมาแทน) เทียบแบบ trim + ไม่สนตัวพิมพ์เล็ก-ใหญ่ทั้งคู่ ไม่เจอคืน
 *  undefined ให้ผู้เรียกใช้ข้อความดิบไปก่อนแล้วเตือน (ไม่เดาสุ่มจับคู่บางส่วน กันจับคู่ผิดลูกค้า) */
export function matchCustomerForImport<C extends { code: string; name: string }>(raw: string, customers: C[]): C | undefined {
  const norm = raw.trim().toLowerCase()
  if (!norm) return undefined
  return customers.find((c) => c.code.trim().toLowerCase() === norm) || customers.find((c) => c.name.trim().toLowerCase() === norm)
}

/** อ่านวันที่แรกที่เจอในข้อความหัวเรื่อง รูปแบบ DD-MM-YY/YYYY (พ.ศ.) เช่น "19-09-69" หรือ "19/09/2569" — เอาแค่วันที่แรก
 *  แม้หัวเรื่องจะมีช่วงวันที่ (เช่น "(ศุกร์ >> เสาร์)") ต่อท้ายก็ตาม ปีที่กรอก 2 หลักถือเป็น พ.ศ. ย่อ (69 = 2569) */
export const parseShipDateFromTitle = (text: string): Date | undefined => {
  const match = text.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{2,4})/)
  if (!match) return undefined
  const day = Number(match[1])
  const month = Number(match[2])
  const beYear = Number(match[3]) < 100 ? Number(match[3]) + 2500 : Number(match[3])
  const date = new Date(beYear - 543, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** ดึงช่วง/จุดเวลา (เช่น "08.00 - 17.00" หรือ "07:14") ออกจากข้อความที่อาจมีข้อความอื่นปนมาด้วย (เช่น "ย้ำ!! ตราประทับ")
 *  คืนทั้งเวลาที่เจอ (ถ้ามี) และข้อความส่วนที่เหลือ (ไม่รวมเวลา) ไว้ไปต่อเป็นหมายเหตุแทนการทิ้งไป */
export const extractTimeAndText = (raw: string): { time: string; text: string } => {
  const match = raw.match(/\d{1,2}[.:]\d{2}(?:\s*-\s*\d{1,2}[.:]\d{2})?/)
  const time = match ? match[0].replace(/\s+/g, '') : ''
  const text = (match ? raw.replace(match[0], '') : raw).replace(/[\r\n]+/g, ' ').trim()
  return { time, text }
}

/** แยกชื่อผู้ติดต่อออกจากเบอร์โทร ในกรณีที่ Excel กรอกปนกันมาในช่องเดียว (เช่น "ผรม.กรวีวัลย์ โฮมเวิร์ค\nช่างจอม 086-3347315")
 *  เก็บเบอร์แรกที่เจอไว้ที่ sitePhone (ไว้ใช้กดโทรได้ตรงๆ) ส่วน contactName เก็บข้อความเต็มทั้งหมด (ขึ้นบรรทัดใหม่แทนด้วย ", ")
 *  ไว้เผื่อมีมากกว่า 1 ชื่อ/เบอร์ในช่องเดียว — ไม่ทิ้งข้อมูลไหนไป แค่แยกเบอร์แรกออกมาเป็นฟิลด์ที่ใช้งานง่ายเพิ่ม */
export const splitContactPhone = (raw: string): { contactName: string; phone: string } => {
  // เบอร์แรกที่เจอ (ดู utils/phone.ts) — เดิมใช้ regex ที่ให้ "ขึ้นบรรทัดใหม่" เป็นส่วนของเบอร์ ทำให้สองเบอร์ที่คั่นด้วยบรรทัดใหม่
  // (084-535-8614⏎095-4218165) ถูกต่อกันเป็นเลขเดียว 20 หลักที่โทรไม่ได้
  const phone = extractPhones(raw)[0] ?? ''
  const contactName = raw.replace(/[\r\n]+/g, ', ').trim()
  return { contactName, phone }
}

export interface ParseImportRowDeps {
  /** คืนคนขับที่จับคู่ได้ (จากชื่อเล่น+ทะเบียนรถ) แค่ id/fullName พอ — ตัวหา match จริงคือ matchDriverForImport
   *  ด้านบน ผู้เรียก (BookingView.vue) เป็นคนต่อกับ driversStore/vehiclesStore เพราะโมดูลนี้ไม่ผูกกับ Pinia store ตรงๆ */
  matchDriver: (
    nickname: string,
    plate: string
  ) => { id?: string; fullName: string; firstName?: string; lastName?: string; viaPlate?: boolean; plate?: string } | undefined
  findFuelRate: (province: string, district: string) => { liters: number } | undefined
  /** คืนลูกค้าที่จับคู่ได้ (จากรหัสผู้ติดต่อ/ชื่อย่อ หรือชื่อเต็ม) แค่ name (ชื่อเต็ม) พอ — ตัวหา match จริงคือ
   *  matchCustomerForImport ด้านบน ผู้เรียกเป็นคนต่อกับ customerStore เพราะโมดูลนี้ไม่ผูกกับ Pinia store ตรงๆ */
  matchCustomer: (raw: string) => { name: string } | undefined
}

/** โดเมนของลิงก์แผนที่ที่รู้จัก (Google Maps/ลิงก์สั้น, Waze, Apple Maps) */
const KNOWN_MAP_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page|waze\.com|maps\.apple\.com)$/i

/**
 * ตรวจช่อง "พิกัด/ลิงก์ Google Maps" ก่อนนำเข้า — คืนข้อความเตือน (ว่าง = ปกติ/ไม่ได้กรอก) ไม่บล็อกการนำเข้า:
 *  - มีหลายลิงก์ในช่องเดียว · ลิงก์ที่ไม่ใช่แผนที่ · ข้อความที่ไม่ใช่ลิงก์/ตัวเลขพิกัด (ปุ่มนำทางจะค้นหาจากข้อความ ซึ่งอาจไม่ตรงหน้างาน)
 *  - พิกัดอยู่นอกประเทศไทย (มักสลับละติจูด/ลองจิจูดหรือพิมพ์ผิด)
 */
export function checkMapLink(raw: string): string[] {
  const text = raw.trim()
  if (!text) return []
  const out: string[] = []
  const urls = text.match(/https?:\/\/[^\s,;]+/gi) || []
  const gps = parseGpsInput(text)
  if (urls.length > 1) out.push('ช่องพิกัด/ลิงก์มีมากกว่า 1 ลิงก์ — ปุ่มนำทางของคนขับจะเปิดทั้งข้อความนี้ ควรเหลือลิงก์เดียวต่อแถว')
  if (urls.length >= 1) {
    let host = ''
    try {
      host = new URL(urls[0] as string).hostname
    } catch {
      out.push('ลิงก์พิกัดรูปแบบไม่ถูกต้อง — ตรวจว่าวางลิงก์ครบ')
      return out
    }
    if (!KNOWN_MAP_HOSTS.test(host)) out.push(`ลิงก์พิกัดไม่ใช่ลิงก์แผนที่ที่รู้จัก (${host}) — ตรวจว่าเปิดแล้วถึงหน้างานจริง`)
  } else if (gps.latitude === undefined) {
    out.push('ช่องพิกัด/ลิงก์ไม่ใช่ลิงก์หรือตัวเลขพิกัด — ปุ่มนำทางของคนขับจะค้นหาจากข้อความนี้ ซึ่งอาจไม่ตรงหน้างาน')
  }
  if (gps.latitude !== undefined && gps.longitude !== undefined) {
    if (gps.latitude < 5 || gps.latitude > 21 || gps.longitude < 97 || gps.longitude > 106) {
      out.push(`พิกัด (${gps.latitude}, ${gps.longitude}) อยู่นอกประเทศไทย — ตรวจว่าสลับละติจูด/ลองจิจูด หรือพิมพ์ผิดหรือไม่`)
    }
  }
  return out
}

/** ข้อความเตือน/หมายเหตุเรื่องคนขับที่เกิดจากการจับคู่ชื่อเล่น (ลบออกเมื่อผู้ใช้เลือกคนขับในพรีวิวเอง) */
const isDriverMatchMessage = (m: string) => m.startsWith('ชื่อเล่นคนขับ') || m.startsWith('ตรวจคนขับ')

/**
 * ผู้ใช้เลือกคนขับให้แถวในพรีวิวเอง (กรณีชื่อเล่นจับคู่ไม่ได้/จับคู่ผิด) — ตั้งชื่อ/รหัส/ชื่อ-นามสกุลแยกของคนขับ, ใช้ทะเบียนรถประจำถ้าแถวไม่ได้ระบุทะเบียน
 * (มีคนขับต้องรู้ทะเบียน) และลบคำเตือน/หมายเหตุเรื่องการจับคู่ชื่อเล่นที่ไม่เป็นจริงแล้วออก
 */
export function mapImportRowToDriver(
  row: ImportRowResult,
  driver: { id?: string; firstName: string; lastName: string; plate?: string }
): void {
  row.driverName = `${driver.firstName} ${driver.lastName}`.trim()
  row.driverId = driver.id
  row.driverFirstName = driver.firstName
  row.driverLastName = driver.lastName
  if (!row.plate && driver.plate) row.plate = driver.plate
  row.warnings = row.warnings.filter((w) => !isDriverMatchMessage(w))
  row.note = row.note
    .split(' | ')
    .filter((part) => part && !isDriverMatchMessage(part))
    .join(' | ')
}

/** แปลงแถว Excel ดิบเป็นข้อมูลที่ใช้สร้าง Booking ได้ทันที — ไม่มี error ที่บล็อกการสร้างงานอีกต่อไป (ตามที่ตกลง)
 *  ข้อมูลส่วนไหนขาด/จับคู่ไม่ได้ (คนขับไม่พบในทะเบียน, น้ำมัน/ปลายทางไม่มีเรท, สถานะไม่ตรง ฯลฯ) จะถูกสะสมไว้ใน warnings
 *  แล้วต่อท้ายเข้า note ของ Booking ให้ออฟฟิศไปตรวจ/กรอกเพิ่มทีหลัง แถวที่ไม่มีข้อมูลอะไรเลย (isEmpty) จะถูกข้ามตอนสร้างจริง
 *  เพราะถือเป็นแถวว่างท้ายชีท ไม่ใช่ข้อมูลที่ตั้งใจกรอก */
export function parseImportRow(rawInput: Record<string, unknown>, rowNumber: number, deps: ParseImportRowDeps): ImportRowResult {
  const raw = withColumnAliases(rawInput)
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(str(v))
    return Number.isFinite(n) ? n : 0
  }

  const driverName = str(raw[IMPORT_HEADERS.driverName])
  const plateRaw = str(raw[IMPORT_HEADERS.plate])
  const docRef = str(raw[IMPORT_HEADERS.docRef])
  const customerRaw = str(raw[IMPORT_HEADERS.customer])
  // คอลัมน์ "time" ในไฟล์จริงมักมีข้อความอื่นปนมากับเวลา (เช่น "ย้ำ!! ตราประทับ") — แยกเวลาไว้ใช้เป็น loadingTime
  // จริงๆ ส่วนข้อความที่เหลือไปต่อแถวหมายเหตุแทนที่จะทิ้ง
  const { time, text: timeExtraText } = extractTimeAndText(str(raw[IMPORT_HEADERS.time]))
  const siteName = str(raw[IMPORT_HEADERS.siteName])
  // คอลัมน์ "เบอร์" มักกรอกชื่อผู้ติดต่อ+เบอร์โทรปนกันมาในช่องเดียว — แยกเบอร์ออกมาเป็น field ใช้งานง่าย
  // (sitePhone) ส่วนข้อความเต็มเก็บไว้ที่ siteContactName ไม่ให้ข้อมูลหาย
  const { contactName: siteContactName, phone } = splitContactPhone(str(raw[IMPORT_HEADERS.phone]))
  // ไม่บังคับมีคอลัมน์นี้/ไม่บังคับกรอก — ไม่มีค่าก็ใส่ว่างไว้เหมือนเดิม ไม่เตือนอะไร (เหมือนหน้ากรอกเองที่แค่ขึ้น
  // ข้อความเตือนเบาๆ ใต้ช่องถ้า parse พิกัดไม่ได้ ไม่ใช่ warning ที่ไปต่อท้าย note ของ Booking)
  const mapLinkRaw = str(raw[IMPORT_HEADERS.mapLink])
  const mapGps = parseGpsInput(mapLinkRaw)
  const tripSequence = parseTripNumber(raw[IMPORT_HEADERS.tripNo])
  const product = str(raw[IMPORT_HEADERS.product])
  // "23 + 52" หรือ "52 + 13 + 23" หมายถึงหลายชนิดสินค้าปนมาในเที่ยวเดียว ไม่ใช่ชื่อสินค้าชื่อเดียวที่มีเครื่องหมาย +
  // อยู่ในชื่อ — แยกออกเป็นรายการเดี่ยวๆ ไปแสดงแบบคอลัมน์ (ดู productColumns + JobItem.extraProducts) ยืนยันจากไฟล์จริง
  // แล้วว่า "จำนวนตัน" ก็แยกด้วย + คู่กันตำแหน่งต่อตำแหน่งเช่นกัน (เช่น "23 + 13" คู่กับ "0.40 + 9.60")
  const productCodes = product
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  // เดิม num() พาร์สค่าดิบทั้งก้อนตรงๆ ("0.40 + 9.60") ได้ NaN แล้ว fallback เป็น 0 เงียบๆ — เป็นสาเหตุจริงที่ทำให้
  // งานที่มีสินค้าหลายชนิดในเที่ยวเดียว (จำนวนตันเขียนแบบ "0.40 + 9.60") ได้ tripFee/ยอดใบสั่งสินค้าเป็น 0 ทั้งที่ราคา
  // ปูนกรอกมาถูกต้อง (ไม่มีคำเตือนราคาให้สังเกตด้วย) — แก้ด้วยการแยกตามเครื่องหมาย + แล้วรวมยอดจริงแทน (ค่าปกติที่ไม่มี +
  // เลยก็ยังพาร์สได้ผลลัพธ์เดิมทุกประการ เพราะ split บนสตริงไม่มี + ได้ array 1 ตัวเท่ากับค่าเดิม)
  const qtyStr = str(raw[IMPORT_HEADERS.qty])
  const qtyParts = qtyStr
    .split('+')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
  const qty = qtyParts.length ? Math.round(qtyParts.reduce((sum, n) => sum + n, 0) * 100) / 100 : 0
  /** จับคู่สินค้ากับจำนวนตันเป็นรายชนิด — ใช้ได้เฉพาะตอนจำนวนชิ้นตรงกันเป๊ะ (กรณีปกติ) ถ้าจำนวนไม่ตรงกัน (ข้อมูลกรอกมา
   *  ไม่สมบูรณ์ เช่น เขียนโค้ดสินค้าปนเครื่องหมาย "-" จนแยกจำนวนชนิดผิด) ให้ยกยอดรวมทั้งหมดไปไว้ที่สินค้าตัวแรกก่อน
   *  แทนการเดาแบ่งเอง แล้วเตือนให้ไปตรวจสอบเอง (ดู warnings ด้านล่าง) */
  const productQtyPairs =
    productCodes.length > 0 && productCodes.length === qtyParts.length
      ? productCodes.map((p, i) => ({ product: p, qty: qtyParts[i] }))
      : productCodes.map((p, i) => ({ product: p, qty: i === 0 ? qty : 0 }))
  const allowance = num(raw[IMPORT_HEADERS.allowance])
  const price = num(raw[IMPORT_HEADERS.price])
  const noteRaw = str(raw[IMPORT_HEADERS.note])

  const [districtRaw, provinceRaw] = str(raw[IMPORT_HEADERS.districtProvince]).split('/')
  const district = (districtRaw || '').trim()
  const province = (provinceRaw || '').trim()

  const isEmpty = !driverName && !customerRaw && !siteName && !product

  const warnings: string[] = []

  // "คอนเฟิร์ม" ต้องเป็นทะเบียนรถเดี่ยวเสมอ (ยืนยันจากไฟล์จริงแล้วว่าคือทะเบียนรถจริงที่ใช้ยืนยันงาน) — ถ้าเจอเครื่องหมาย
  // "," แปลว่ามีมากกว่า 1 คันปนกันมาในช่องเดียว (แบบเดียวกับที่คอลัมน์ "ทะเบียนรถ" รุ่นเก่าเคยเป็น เช่น
  // "70-6826 , 72-6467, 73-0388") ไม่รู้ว่าจริงๆ ยืนยันด้วยคันไหนกันแน่ เว้นทะเบียนว่างไว้ก่อนแทนการเดา/เก็บทั้งก้อนดิบ
  const plate = plateRaw.includes(',') ? '' : plateRaw
  if (plateRaw.includes(',')) warnings.push(`คอนเฟิร์มมีทะเบียนรถมากกว่า 1 คัน ("${plateRaw}") ไม่สามารถระบุได้แน่ชัด — เว้นทะเบียนว่างไว้ก่อน ตรวจสอบเองภายหลัง`)

  // ไฟล์จริงมักกรอกชื่อลูกค้าแบบย่อ (เช่น "Sccc" แทน "บริษัท ปูนซีเมนต์นครหลวง จำกัด (มหาชน)") — จับคู่กับรหัสผู้ติดต่อ
  // (ชื่อย่อ) ก่อน ถ้าไม่เจอลองจับคู่กับชื่อเต็มตรงๆ (ไม่สนตัวพิมพ์เล็ก-ใหญ่) เจอแล้วใช้ชื่อเต็มเสมอ เพราะเอกสารที่พิมพ์
  // ออกไปหาลูกค้า/สรรพากรต้องเป็นชื่อเต็มตามกฎหมาย ไม่ใช่ชื่อย่อที่กรอกมาในไฟล์ — จับคู่ไม่ได้ก็ไม่บล็อกการสร้างงาน
  // ใช้ข้อความดิบไปก่อนแล้วเตือนให้ไปตรวจสอบเอง (เหมือน pattern เดียวกับคนขับ)
  const matchedCustomer = customerRaw ? deps.matchCustomer(customerRaw) : undefined
  const customer = matchedCustomer ? matchedCustomer.name : customerRaw
  if (customerRaw && !matchedCustomer) warnings.push(`ชื่อลูกค้าจาก Excel "${customerRaw}" ไม่ตรงกับรหัสผู้ติดต่อ/ชื่อเต็มในสมุดรายชื่อ — ใช้ข้อความดิบไปก่อน ตรวจสอบเองภายหลัง`)

  // มีทะเบียนต้องมีคนขับ: ชื่อเล่นจับคู่ไม่ได้/ไม่ได้กรอกมา แต่ทะเบียนเป็นรถที่มีคนขับประจำ → ใช้คนขับประจำรถ (viaPlate) พร้อมคำเตือนให้ตรวจ
  const matchedDriver = driverName || plate ? deps.matchDriver(driverName, plate) : undefined
  if (matchedDriver?.viaPlate) {
    warnings.push(
      `ตรวจคนขับ: ${driverName ? `ชื่อเล่น "${driverName}" ไม่ตรงกับรายชื่อคนขับ` : 'ไม่ได้ระบุคนขับ'} — ใช้คนขับประจำรถทะเบียน ${plate} (${matchedDriver.fullName}) กรุณาตรวจสอบว่าถูกต้อง`
    )
  } else if (matchedDriver && plate && matchedDriver.plate && normalizePlateCode(plate.trim().split(/\s+/)[0] || '') !== normalizePlateCode(matchedDriver.plate.trim().split(/\s+/)[0] || '')) {
    // จับคู่ด้วยชื่อเล่น แต่แถวนี้ใช้รถคนละคันกับรถประจำของคนขับ (ขับแทน/สลับรถ) — ใช้คนขับตามชื่อเล่น เตือนให้ตรวจ
    warnings.push(`ตรวจทะเบียน: ${matchedDriver.fullName} ปกติขับรถ ${matchedDriver.plate} แต่แถวนี้ใช้ทะเบียน ${plate} — ใช้คนขับตามชื่อเล่น กรุณาตรวจสอบว่าถูกต้อง`)
  } else if (matchedDriver && !plate && matchedDriver.plate) {
    // มีคนขับต้องรู้ทะเบียน: คนขับผูกกับรถประจำอยู่แล้ว → ใช้ทะเบียนรถประจำคนขับ
    warnings.push(`ตรวจทะเบียน: ไม่ได้ระบุทะเบียน — ใช้ทะเบียนรถประจำของ ${matchedDriver.fullName} (${matchedDriver.plate}) กรุณาตรวจสอบว่าถูกต้อง`)
  } else if (driverName && !matchedDriver) warnings.push(`ชื่อเล่นคนขับ "${driverName}" ไม่ตรงกับที่ผูกไว้ในระบบ (เทียบกับทะเบียนรถแล้ว) — เว้นคนขับว่างไว้ก่อน`)

  if (!allowance) warnings.push('ต้องกรอกเพิ่ม: เบี้ยเลี้ยง')
  if (!price) warnings.push('ต้องกรอกเพิ่ม: ราคาปูน')
  // เดิมไม่เช็คว่าขาดจำนวนตันเลย — งานที่ Excel ไม่กรอกจำนวนตันมาจะเงียบๆ กลายเป็น 0 ตันโดยไม่มีคำเตือนใดๆ
  // (ต่างจากราคา/เบี้ยเลี้ยงที่เตือนอยู่แล้ว) ทำให้ผู้ใช้งงว่าทำไมน้ำหนัก/ราคาเป็น 0 ทั้งที่สินค้ากรอกมาถูกต้อง
  if (!qty) warnings.push('ต้องกรอกเพิ่ม: จำนวนตัน')
  if (productCodes.length > 1 && productCodes.length !== qtyParts.length) {
    warnings.push(`สินค้าหลายชนิดในเที่ยวเดียว (${productCodes.join(' + ')}) แต่จำนวนตันแยกไม่ตรงกับจำนวนชนิดสินค้า — ยกยอดรวมไปไว้ที่ "${productCodes[0]}" ก่อน ตรวจสอบแยกจำนวนตันต่อชนิดเองภายหลัง`)
  }

  const fuelCell = parseFuelCell(raw[IMPORT_HEADERS.fuel])
  const fuelFromExcel = fuelCell.liters ?? 0
  const configuredFuelRate = province && district ? deps.findFuelRate(province, district)?.liters : undefined
  // "ไม่เติม"/ผลคำนวณ 0 = 0 ลิตรโดยตั้งใจ ไม่ fallback ไปใช้ลิตรมาตรฐาน (เดิม 0 ถูกมองเป็น "ไม่มีข้อมูล" แล้วเติมมาตรฐานให้เงียบๆ)
  const fuelNoRefill = !!fuelCell.explicitZero
  // อ่านค่าไม่ได้ (ข้อความไม่มีตัวเลข/ผลคำนวณติดลบ) = ห้ามเดา ห้ามใช้ลิตรมาตรฐานแทน เว้นลิตรไว้ (0) แล้วเตือน
  const fuelUnreadable = !!fuelCell.invalid
  const fuelLiters = fuelUnreadable || fuelNoRefill ? 0 : fuelFromExcel || configuredFuelRate || 0
  if (fuelUnreadable) {
    warnings.push(`อ่านค่าน้ำมันจาก Excel ไม่ได้ ("${fuelCell.invalid}") — เว้นลิตรไว้ (ไม่ใช้ลิตรมาตรฐาน) งานนี้ยังไม่ถูกนำไปคิดเงินจนกว่าจะแก้ลิตรให้ถูกต้อง`)
  } else if (fuelNoRefill) {
    // ไม่มีอะไรให้เตือน — ตั้งใจไม่เติม
  } else if (!province || !district) {
    warnings.push('ต้องกรอกเพิ่ม: อำเภอ/จังหวัด')
  } else if (!fuelLiters) {
    // ไม่มีค่าน้ำมันจาก Excel และปลายทาง (อำเภอ/จังหวัด) นี้ก็ยังไม่เคยตั้งค่าลิตรมาตรฐานไว้ในหน้าตั้งค่าน้ำมันเลย —
    // บอกตรงๆ ว่า "ยังไม่มีปลายทางน้ำมัน" แทนข้อความกว้างๆ เดิม เพื่อให้รู้ทันทีว่าต้องไปเพิ่มอำเภอนี้ในหน้าตั้งค่าน้ำมัน
    warnings.push(`ยังไม่มีปลายทางน้ำมัน (${district}/${province}) ในระบบ — ไปเพิ่มในหน้าตั้งค่าน้ำมัน หรือกรอกลิตรน้ำมันเองภายหลัง`)
  } else if (fuelFromExcel && configuredFuelRate && fuelFromExcel !== configuredFuelRate) {
    // น้ำมันจาก Excel ไม่ตรงกับเรทที่ตั้งค่าไว้สำหรับปลายทางนี้ — ยังใช้ค่าจาก Excel ตามเดิม (ไม่ใช้เรทตั้งค่าทับ) แค่เตือนให้ตรวจสอบ
    warnings.push(`น้ำมันจาก Excel (${fuelFromExcel} ล.) ไม่ตรงกับเรทที่ตั้งไว้สำหรับ ${district}/${province} (${configuredFuelRate} ล.)`)
  }

  // คอลัมน์ "ประเภท" (d1/d2/d3 หรือชื่อไทยเต็ม ดู parseJobType) — ไฟล์เก่าใช้หัว "ประเภทงาน" ก็ยังอ่านได้ ช่องว่างไม่ต้องเตือน
  // แต่ถ้ามีค่าแล้วจับคู่ไม่ได้ (เช่น "พาเรท" แยกไม่ออกว่าโรงงานหรือฟรี) ให้เว้นว่างไว้ก่อนแล้วเตือนแทนการเดา
  const jobTypeRaw = str(raw[IMPORT_HEADERS.jobType]) || str(raw[LEGACY_JOB_TYPE_HEADER])
  const jobType = parseJobType(jobTypeRaw)
  if (jobTypeRaw && !jobType) warnings.push(`ประเภทจาก Excel "${jobTypeRaw}" ไม่ตรงกับระบบ (ใช้ d1 ลงมือ / d2 พาเลทโรงงาน / d3 พาเลทฟรี) — เว้นว่างไว้ก่อน ตรวจสอบเองภายหลัง`)

  const fuelRemark = fuelCell.remark ? `น้ำมัน: ${fuelCell.remark}` : ''
  // ข้อควรตรวจก่อนนำเข้า (ไม่แปะลง note) — พิกัด/ลิงก์ GPS และเลขเที่ยวที่อ่านไม่ได้ (เลขเที่ยวชนกับงานเดิมของวันตรวจในพรีวิว)
  const checks: string[] = [...checkMapLink(mapLinkRaw)]
  const tripCell = str(raw[IMPORT_HEADERS.tripNo])
  if (tripCell && tripSequence === undefined) checks.push(`เลขเที่ยว "${tripCell}" อ่านไม่ได้ (ต้องเป็นตัวเลข 1 ขึ้นไป) — ระบบจะเรียงเลขเที่ยวให้ตามลำดับแถวของคนขับ แก้เลขในพรีวิวได้`)
  const note = [timeExtraText, noteRaw, fuelRemark, ...warnings].filter(Boolean).join(' | ')

  return {
    rowNumber,
    isEmpty,
    driverNickname: driverName,
    // ถ้าจับคู่ชื่อเล่น+ทะเบียนรถไม่ได้ ให้เว้นชื่อคนขับว่างไว้เลย (ไม่ใช้ชื่อเล่นดิบจากไฟล์ตรงๆ เพราะ driverName ของ
    // Booking ใช้คำนวณเงินเดือนจริง ต้องเป็นชื่อ-นามสกุลที่ยืนยันแล้วเท่านั้น) — ชื่อเล่นดิบยังอยู่ใน warnings/note ด้านบน
    driverName: matchedDriver ? matchedDriver.fullName : '',
    driverId: matchedDriver?.id,
    driverFirstName: matchedDriver?.firstName,
    driverLastName: matchedDriver?.lastName,
    plate: plate || matchedDriver?.plate || '',
    docRef,
    customer,
    ticketChecked: !!str(raw[IMPORT_HEADERS.ticketChecked]),
    time,
    siteName,
    district,
    province,
    siteContactName,
    phone,
    mapUrl: mapLinkRaw || undefined,
    latitude: mapGps.latitude,
    longitude: mapGps.longitude,
    tripSequence,
    product,
    productCodes,
    productQtyPairs,
    qty,
    allowance,
    price,
    fuelLiters,
    fuelUnreadable: fuelUnreadable || undefined,
    fuelNotRefilled: fuelNoRefill || undefined,
    jobType,
    note,
    customerCondition: str(raw[IMPORT_HEADERS.customerCondition]),
    warnings,
    checks,
  }
}

/**
 * เตือนแถวที่ "ราคาปูน" (ราคาต่อเที่ยว — ไม่คูณจำนวนตันแล้ว) ต่างจากราคาปกติของสินค้าเดียวกันในไฟล์เดียวกันมากผิดปกติ
 * (เช่น พิมพ์ตัวเลขผิด/เผลอใส่หน่วยอื่นมา) เทียบแบบ "ราคามัธยฐานของสินค้าเดียวกันในไฟล์นี้เอง" ไม่ใช่เกณฑ์ราคาตายตัว
 * เพราะระบบไม่รู้ราคาจริงของแต่ละสินค้าล่วงหน้า — เป็นแค่คำเตือนให้ผู้ import ไปตรวจสอบเองก่อนยืนยัน ไม่ auto-แก้ราคาให้
 * (import ยังสร้างงานต่อได้ตามปกติ เหมือนคำเตือนอื่นๆ ที่มีอยู่แล้วในฟังก์ชันนี้)
 */
export function flagPriceOutliers(rows: ImportRowResult[]): void {
  const groups = new Map<string, ImportRowResult[]>()
  rows
    .filter((r) => !r.isEmpty && r.price > 0 && r.qty > 0)
    .forEach((r) => {
      const key = r.productCodes[0] || r.product
      if (!key) return
      const list = groups.get(key) || []
      list.push(r)
      groups.set(key, list)
    })

  groups.forEach((groupRows) => {
    // ต้องมีอย่างน้อย 3 แถวถึงจะเทียบมัธยฐานได้อย่างมีความหมาย (2 แถวขึ้นไปมัธยฐานจะเอนเอียงไปทางค่าใดค่าหนึ่งง่ายเกินไป)
    if (groupRows.length < 3) return
    const sortedPrices = groupRows.map((r) => r.price).sort((a, b) => a - b)
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)]
    if (!median) return
    groupRows.forEach((r) => {
      const ratio = r.price / median
      if (ratio > 3 || ratio < 1 / 3) {
        const warning = `ราคาปูน (${r.price.toLocaleString('th-TH')}) ต่างจากราคาปกติของสินค้านี้ในไฟล์นี้มาก (~${median.toLocaleString('th-TH')}) — ตรวจสอบว่ากรอกราคาถูกต้องหรือไม่`
        r.warnings.push(warning)
        r.note = [r.note, warning].filter(Boolean).join(' | ')
      }
    })
  })
}
