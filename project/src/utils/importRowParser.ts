import type { BookingJobType } from '@/types'
import { normalizePlateCode } from '@/utils/importReconciliation'

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
  jobType: 'ประเภทงาน',
  note: 'หมายเหตุ',
} as const

export interface ImportRowResult {
  rowNumber: number
  isEmpty: boolean
  driverName: string
  driverId?: string
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
  jobType?: BookingJobType
  note: string
  warnings: string[]
}

/** คอลัมน์แรกสุดของชีทงานจริงเสมอ (ทั้งไฟล์ที่มี Row หัวเรื่อง+วันที่ และไฟล์ที่ไม่มี) ใช้เช็คว่า Row แรกของไฟล์ที่
 *  อัปโหลดเป็นหัวคอลัมน์เลย (ไม่มีหัวเรื่อง) หรือเป็นหัวเรื่อง/วันที่ส่งงานที่ต้องข้ามไปอีก 1 แถว */
export const IMPORT_HEADER_MARKER = 'ลำดับ'

/** หาคนขับจาก "ชื่อเล่น" (ใช้เฉพาะตอนนำเข้า Excel — ไฟล์จัดคิวจริงกรอกชื่อเล่นแทนชื่อจริงเสมอ) ต้องเชื่อมกับทะเบียนรถ
 *  ที่ประจำคนขับคนนั้นด้วยเสมอกันชื่อเล่นซ้ำกัน — ถ้าเจอชื่อเล่นตรงกันคนเดียวและไม่มีทะเบียนรถมาเทียบเลย ก็ยังเชื่อ
 *  ชื่อเล่นได้ (ไม่มีอะไรให้ขัดแย้ง) แต่ถ้ามีทะเบียนรถมาด้วย ต้องตรงกับรถที่ประจำคนขับคนนั้นจริงเท่านั้น ไม่งั้นถือว่า
 *  ข้อมูลไม่ตรงกับที่ผูกในระบบ คืน undefined (ให้ผู้เรียกเว้นว่างไว้ ไม่เดาสุ่ม) — เทียบทะเบียนด้วย normalizePlateCode
 *  (ตัดขีด/ช่องว่าง) แทนการเทียบตัวอักษรตรงๆ กันพลาดเพราะรูปแบบเขียนต่างกันนิดหน่อย (มี/ไม่มีขีด) */
export function matchDriverForImport<D extends { code: string; nickname: string }>(
  nickname: string,
  plate: string,
  drivers: D[],
  vehicleForDriver: (driverCode: string) => { plate: string } | undefined
): D | undefined {
  // (d.nickname || '') กันพัง — คนขับที่บันทึกไว้ก่อนฟีเจอร์นี้มีอยู่ใน Firestore จริงโดยไม่มี field นี้เลย (undefined
  // ไม่ใช่ '') เพราะ driverRepository.getAll() ไม่ได้ผ่าน sanitizeDriver() (ต่างจากตอนแก้ไขผ่านฟอร์มที่ผ่านเสมอ)
  const candidates = drivers.filter((d) => (d.nickname || '').trim() === nickname.trim())
  if (candidates.length === 0) return undefined
  const plateNorm = normalizePlateCode(plate)
  if (candidates.length === 1) {
    if (!plateNorm) return candidates[0]
    const vehicle = vehicleForDriver(candidates[0].code)
    return vehicle && normalizePlateCode(vehicle.plate) === plateNorm ? candidates[0] : undefined
  }
  if (!plateNorm) return undefined
  return candidates.find((d) => {
    const vehicle = vehicleForDriver(d.code)
    return vehicle && normalizePlateCode(vehicle.plate) === plateNorm
  })
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
  const phoneMatch = raw.match(/0[\d\-\s]{7,}\d/)
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s-]+/g, '') : ''
  const contactName = raw.replace(/[\r\n]+/g, ', ').trim()
  return { contactName, phone }
}

export interface ParseImportRowDeps {
  /** คืนคนขับที่จับคู่ได้ (จากชื่อเล่น+ทะเบียนรถ) แค่ id/fullName พอ — ตัวหา match จริงคือ matchDriverForImport
   *  ด้านบน ผู้เรียก (BookingView.vue) เป็นคนต่อกับ driversStore/vehiclesStore เพราะโมดูลนี้ไม่ผูกกับ Pinia store ตรงๆ */
  matchDriver: (nickname: string, plate: string) => { id?: string; fullName: string } | undefined
  findFuelRate: (province: string, district: string) => { liters: number } | undefined
}

/** แปลงแถว Excel ดิบเป็นข้อมูลที่ใช้สร้าง Booking ได้ทันที — ไม่มี error ที่บล็อกการสร้างงานอีกต่อไป (ตามที่ตกลง)
 *  ข้อมูลส่วนไหนขาด/จับคู่ไม่ได้ (คนขับไม่พบในทะเบียน, น้ำมัน/ปลายทางไม่มีเรท, สถานะไม่ตรง ฯลฯ) จะถูกสะสมไว้ใน warnings
 *  แล้วต่อท้ายเข้า note ของ Booking ให้ออฟฟิศไปตรวจ/กรอกเพิ่มทีหลัง แถวที่ไม่มีข้อมูลอะไรเลย (isEmpty) จะถูกข้ามตอนสร้างจริง
 *  เพราะถือเป็นแถวว่างท้ายชีท ไม่ใช่ข้อมูลที่ตั้งใจกรอก */
export function parseImportRow(raw: Record<string, unknown>, rowNumber: number, deps: ParseImportRowDeps): ImportRowResult {
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(str(v))
    return Number.isFinite(n) ? n : 0
  }

  const driverName = str(raw[IMPORT_HEADERS.driverName])
  const plateRaw = str(raw[IMPORT_HEADERS.plate])
  const docRef = str(raw[IMPORT_HEADERS.docRef])
  const customer = str(raw[IMPORT_HEADERS.customer])
  // คอลัมน์ "time" ในไฟล์จริงมักมีข้อความอื่นปนมากับเวลา (เช่น "ย้ำ!! ตราประทับ") — แยกเวลาไว้ใช้เป็น loadingTime
  // จริงๆ ส่วนข้อความที่เหลือไปต่อแถวหมายเหตุแทนที่จะทิ้ง
  const { time, text: timeExtraText } = extractTimeAndText(str(raw[IMPORT_HEADERS.time]))
  const siteName = str(raw[IMPORT_HEADERS.siteName])
  // คอลัมน์ "เบอร์" มักกรอกชื่อผู้ติดต่อ+เบอร์โทรปนกันมาในช่องเดียว — แยกเบอร์ออกมาเป็น field ใช้งานง่าย
  // (sitePhone) ส่วนข้อความเต็มเก็บไว้ที่ siteContactName ไม่ให้ข้อมูลหาย
  const { contactName: siteContactName, phone } = splitContactPhone(str(raw[IMPORT_HEADERS.phone]))
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

  const isEmpty = !driverName && !customer && !siteName && !product

  const warnings: string[] = []

  // "คอนเฟิร์ม" ต้องเป็นทะเบียนรถเดี่ยวเสมอ (ยืนยันจากไฟล์จริงแล้วว่าคือทะเบียนรถจริงที่ใช้ยืนยันงาน) — ถ้าเจอเครื่องหมาย
  // "," แปลว่ามีมากกว่า 1 คันปนกันมาในช่องเดียว (แบบเดียวกับที่คอลัมน์ "ทะเบียนรถ" รุ่นเก่าเคยเป็น เช่น
  // "70-6826 , 72-6467, 73-0388") ไม่รู้ว่าจริงๆ ยืนยันด้วยคันไหนกันแน่ เว้นทะเบียนว่างไว้ก่อนแทนการเดา/เก็บทั้งก้อนดิบ
  const plate = plateRaw.includes(',') ? '' : plateRaw
  if (plateRaw.includes(',')) warnings.push(`คอนเฟิร์มมีทะเบียนรถมากกว่า 1 คัน ("${plateRaw}") ไม่สามารถระบุได้แน่ชัด — เว้นทะเบียนว่างไว้ก่อน ตรวจสอบเองภายหลัง`)

  const matchedDriver = driverName ? deps.matchDriver(driverName, plate) : undefined
  if (driverName && !matchedDriver) warnings.push(`ชื่อเล่นคนขับ "${driverName}" ไม่ตรงกับที่ผูกไว้ในระบบ (เทียบกับทะเบียนรถแล้ว) — เว้นคนขับว่างไว้ก่อน`)

  if (!allowance) warnings.push('ต้องกรอกเพิ่ม: เบี้ยเลี้ยง')
  if (!price) warnings.push('ต้องกรอกเพิ่ม: ราคาปูน')
  // เดิมไม่เช็คว่าขาดจำนวนตันเลย — งานที่ Excel ไม่กรอกจำนวนตันมาจะเงียบๆ กลายเป็น 0 ตันโดยไม่มีคำเตือนใดๆ
  // (ต่างจากราคา/เบี้ยเลี้ยงที่เตือนอยู่แล้ว) ทำให้ผู้ใช้งงว่าทำไมน้ำหนัก/ราคาเป็น 0 ทั้งที่สินค้ากรอกมาถูกต้อง
  if (!qty) warnings.push('ต้องกรอกเพิ่ม: จำนวนตัน')
  if (productCodes.length > 1 && productCodes.length !== qtyParts.length) {
    warnings.push(`สินค้าหลายชนิดในเที่ยวเดียว (${productCodes.join(' + ')}) แต่จำนวนตันแยกไม่ตรงกับจำนวนชนิดสินค้า — ยกยอดรวมไปไว้ที่ "${productCodes[0]}" ก่อน ตรวจสอบแยกจำนวนตันต่อชนิดเองภายหลัง`)
  }

  const fuelFromExcel = num(raw[IMPORT_HEADERS.fuel])
  const configuredFuelRate = province && district ? deps.findFuelRate(province, district)?.liters : undefined
  let fuelLiters = fuelFromExcel || configuredFuelRate || 0
  if (!fuelLiters || !province || !district) {
    warnings.push('ตรวจสอบข้อมูลน้ำมัน/ปลายทาง')
  } else if (fuelFromExcel && configuredFuelRate && fuelFromExcel !== configuredFuelRate) {
    // น้ำมันจาก Excel ไม่ตรงกับเรทที่ตั้งค่าไว้สำหรับปลายทางนี้ — ยังใช้ค่าจาก Excel ตามเดิม (ไม่ใช้เรทตั้งค่าทับ) แค่เตือนให้ตรวจสอบ
    warnings.push(`น้ำมันจาก Excel (${fuelFromExcel} ล.) ไม่ตรงกับเรทที่ตั้งไว้สำหรับ ${district}/${province} (${configuredFuelRate} ล.)`)
  }

  // "ประเภทงาน" เป็นคอลัมน์ที่ไฟล์บางไฟล์เพิ่งเริ่มมี ต้องตรงกับ BookingJobType เป๊ะเท่านั้นถึงจะใส่ให้ (เทียบแบบ trim
  // ไม่สนตัวพิมพ์เล็ก-ใหญ่เพราะเป็นภาษาไทยอยู่แล้วไม่มีผล) ถ้าช่องนี้ว่างเปล่าไม่ต้องเตือนอะไร (ไฟล์เก่าไม่มีคอลัมน์นี้อยู่
  // แล้วเป็นปกติ) แต่ถ้ามีค่าแต่จับคู่ไม่ได้ (เช่น "พาเรท" ไม่ตรงกับ "พาเลทโรงงาน"/"พาเลทฟรี" เป๊ะ แยกไม่ออกว่าหมายถึง
  // อันไหน) ให้เว้นว่างไว้ก่อนแล้วเตือนแทนการเดา
  const jobTypeRaw = str(raw[IMPORT_HEADERS.jobType])
  const JOB_TYPE_OPTIONS: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']
  const jobType = JOB_TYPE_OPTIONS.find((t) => t === jobTypeRaw)
  if (jobTypeRaw && !jobType) warnings.push(`ประเภทงานจาก Excel "${jobTypeRaw}" ไม่ตรงกับระบบเป๊ะ (มี "ลงมือ"/"พาเลทโรงงาน"/"พาเลทฟรี") — เว้นว่างไว้ก่อน ตรวจสอบเองภายหลัง`)

  const note = [timeExtraText, noteRaw, ...warnings].filter(Boolean).join(' | ')

  return {
    rowNumber,
    isEmpty,
    // ถ้าจับคู่ชื่อเล่น+ทะเบียนรถไม่ได้ ให้เว้นชื่อคนขับว่างไว้เลย (ไม่ใช้ชื่อเล่นดิบจากไฟล์ตรงๆ เพราะ driverName ของ
    // Booking ใช้คำนวณเงินเดือนจริง ต้องเป็นชื่อ-นามสกุลที่ยืนยันแล้วเท่านั้น) — ชื่อเล่นดิบยังอยู่ใน warnings/note ด้านบน
    driverName: matchedDriver ? matchedDriver.fullName : '',
    driverId: matchedDriver?.id,
    plate,
    docRef,
    customer,
    ticketChecked: !!str(raw[IMPORT_HEADERS.ticketChecked]),
    time,
    siteName,
    district,
    province,
    siteContactName,
    phone,
    product,
    productCodes,
    productQtyPairs,
    qty,
    allowance,
    price,
    fuelLiters,
    jobType,
    note,
    warnings,
  }
}
