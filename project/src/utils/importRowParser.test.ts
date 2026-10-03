import { describe, it, expect } from 'vitest'
import { matchCustomerForImport, matchDriverForImport, parseImportRow, parseFuelCell, IMPORT_HEADERS, type ParseImportRowDeps } from './importRowParser'

/** ลูกค้าในไฟล์ Excel มักกรอกแบบย่อ (เช่น "Sccc") ต้องจับคู่กับ "รหัสผู้ติดต่อ" ก่อนเสมอ ถ้าไม่เจอค่อยลองชื่อเต็ม
 *  เจอแล้วต้องได้ record คืนมา (ผู้เรียกจะเอา .name ไปใช้เป็นชื่อเต็มบน booking.customer เสมอ) */
describe('matchCustomerForImport', () => {
  const customers = [
    { code: 'Sccc', name: 'บริษัท ปูนซีเมนต์ นครหลวง จำกัด (มหาชน)' },
    { code: 'FSM', name: 'บริษัท โฟร์ซัมมิท จำกัด' },
  ]

  it('จับคู่กับรหัสผู้ติดต่อ (ชื่อย่อ) ก่อน', () => {
    expect(matchCustomerForImport('Sccc', customers)?.name).toBe('บริษัท ปูนซีเมนต์ นครหลวง จำกัด (มหาชน)')
  })

  it('ไม่สนตัวพิมพ์เล็ก-ใหญ่/ช่องว่างหัวท้าย', () => {
    expect(matchCustomerForImport('  sccc  ', customers)?.name).toBe('บริษัท ปูนซีเมนต์ นครหลวง จำกัด (มหาชน)')
  })

  it('จับคู่ไม่เจอรหัสก็ลองชื่อเต็มตรงๆ แทน', () => {
    expect(matchCustomerForImport('บริษัท โฟร์ซัมมิท จำกัด', customers)?.code).toBe('FSM')
  })

  it('จับคู่ไม่ได้เลยคืน undefined ไม่เดาสุ่ม', () => {
    expect(matchCustomerForImport('ลูกค้าที่ไม่มีในสมุดรายชื่อ', customers)).toBeUndefined()
  })

  it('ข้อความว่างคืน undefined ทันทีไม่ต้องสแกน', () => {
    expect(matchCustomerForImport('', customers)).toBeUndefined()
  })
})

/** เทสเดิมของ matchDriverForImport (ยังไม่เคยมีเทสตรงๆ มาก่อน) — ครอบคลุม Bug C ที่แก้ไปแล้วในเซสชันนี้: เทียบทะเบียน
 *  แบบ normalize (ตัดขีด/ช่องว่าง) แทนเทียบตัวอักษรตรงๆ */
describe('matchDriverForImport', () => {
  const drivers = [
    { code: 'D001', nickname: 'หนึ่ง' },
    { code: 'D002', nickname: 'สอง' },
  ]
  const vehicleForDriver = (code: string) => ({ D001: { plate: '70-8821' }, D002: { plate: '72-3819' } })[code]

  it('ชื่อเล่นตรงกันคนเดียว ไม่มีทะเบียนมาเทียบ ก็เชื่อชื่อเล่นได้เลย', () => {
    expect(matchDriverForImport('หนึ่ง', '', drivers, vehicleForDriver)?.code).toBe('D001')
  })

  it('เทียบทะเบียนแบบ normalize ไม่สนขีด/ช่องว่างต่างกัน (Bug C)', () => {
    expect(matchDriverForImport('หนึ่ง', '708821', drivers, vehicleForDriver)?.code).toBe('D001')
  })

  it('ชื่อเล่นตรงแต่ทะเบียนไม่ตรงกับที่ผูกในระบบ คืน undefined ไม่เดา', () => {
    expect(matchDriverForImport('หนึ่ง', '72-3819', drivers, vehicleForDriver)).toBeUndefined()
  })

  it('ชื่อเล่นไม่ตรงเลยคืน undefined', () => {
    expect(matchDriverForImport('สาม', '', drivers, vehicleForDriver)).toBeUndefined()
  })
})

/** คอลัมน์ "พิกัด/ลิงก์ Google Maps หน้างาน" (ไม่บังคับ) — reuse parseGpsInput เดียวกับหน้ากรอกเองทุกประการ
 *  ไม่เคยมีเทสตรงของ parseImportRow เองมาก่อนเลย (เทสเดิมมีแค่ helper ย่อยด้านบน) นี่คือเทสแรกของฟังก์ชันนี้โดยตรง */
describe('parseImportRow — คอลัมน์พิกัด/ลิงก์ Google Maps หน้างาน', () => {
  const deps: ParseImportRowDeps = {
    matchDriver: () => undefined,
    findFuelRate: () => undefined,
    matchCustomer: () => undefined,
  }
  const baseRow: Record<string, unknown> = {
    [IMPORT_HEADERS.siteName]: 'ไซต์ทดสอบ',
    [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์',
  }

  it('ลิงก์ Google Maps ที่ parse พิกัดได้ — เก็บ mapUrl ดิบ + latitude/longitude ตรงกับที่ parse ได้', () => {
    const row = parseImportRow(
      { ...baseRow, [IMPORT_HEADERS.mapLink]: 'https://maps.google.com/?q=13.736717,100.523186' },
      1,
      deps
    )
    expect(row.mapUrl).toBe('https://maps.google.com/?q=13.736717,100.523186')
    expect(row.latitude).toBe(13.736717)
    expect(row.longitude).toBe(100.523186)
  })

  it('มีข้อความแต่ parse พิกัดไม่ได้ — ยังเก็บ mapUrl ไว้ใช้เป็นลิงก์อ้างอิง แต่ latitude/longitude เป็น undefined', () => {
    const row = parseImportRow({ ...baseRow, [IMPORT_HEADERS.mapLink]: 'หน้าโรงงาน ประตู 2' }, 1, deps)
    expect(row.mapUrl).toBe('หน้าโรงงาน ประตู 2')
    expect(row.latitude).toBeUndefined()
    expect(row.longitude).toBeUndefined()
  })

  it('ไม่มีคอลัมน์นี้ในไฟล์เลย/เซลล์ว่าง — ทั้ง mapUrl/latitude/longitude เป็น undefined ไม่มี warning ติดไปใน note', () => {
    const row = parseImportRow(baseRow, 1, deps)
    expect(row.mapUrl).toBeUndefined()
    expect(row.latitude).toBeUndefined()
    expect(row.longitude).toBeUndefined()
    expect(row.note).not.toContain('พิกัด')
    expect(row.note).not.toContain('Google Maps')
  })
})

/** ช่อง "น้ำมัน" ที่ลูกค้ากรอกมามีทั้งตัวเลขล้วนและข้อความปน (ตัวอย่างจริงจากไฟล์: 38, 30, ว่าง, 38-21, ไม่เติม ฯลฯ) */
describe('parseFuelCell', () => {
  it.each([
    [38, 38],
    ['30', 30],
    [' 59 ', 59],
    ['43', 43],
  ])('ตัวเลขล้วน %s → %s ลิตร ไม่มีหมายเหตุ', (raw, liters) => {
    expect(parseFuelCell(raw)).toEqual({ liters, explicitZero: false, remark: undefined })
  })

  it('เซลล์ว่าง/ไม่มีค่า → ไม่มีข้อมูล (ผู้เรียกใช้ลิตรมาตรฐานแทน)', () => {
    expect(parseFuelCell('')).toEqual({})
    expect(parseFuelCell(undefined)).toEqual({})
    expect(parseFuelCell('   ')).toEqual({})
  })

  it('"ไม่เติม" และ "No" → 0 ลิตรโดยตั้งใจ', () => {
    expect(parseFuelCell('ไม่เติม')).toMatchObject({ liters: 0, explicitZero: true })
    expect(parseFuelCell('No')).toMatchObject({ liters: 0, explicitZero: true })
  })

  it('"38 ก๊าซ" → 38 ลิตร หมายเหตุ "ก๊าซ"', () => {
    expect(parseFuelCell('38 ก๊าซ')).toMatchObject({ liters: 38, explicitZero: false, remark: 'ก๊าซ' })
  })

  it('"30 - 30" คำนวณก่อนบันทึก = 0 (ถือเป็น 0 โดยตั้งใจ), "38-21" = 17, "20+10" = 30 พร้อมหมายเหตุวิธีคำนวณ', () => {
    expect(parseFuelCell('30 - 30')).toMatchObject({ liters: 0, explicitZero: true, remark: 'คำนวณจาก 30-30 = 0' })
    expect(parseFuelCell('38-21')).toMatchObject({ liters: 17, explicitZero: false, remark: 'คำนวณจาก 38-21 = 17' })
    expect(parseFuelCell('20+10')).toMatchObject({ liters: 30 })
  })

  it('ข้อความที่ไม่มีตัวเลขเลย หรือผลคำนวณติดลบ → invalid (ไม่เดา)', () => {
    expect(parseFuelCell('รอเติม')).toEqual({ invalid: 'รอเติม' })
    expect(parseFuelCell('10-30')).toEqual({ invalid: '10-30' })
  })
})

describe('parseImportRow — น้ำมัน', () => {
  const deps: ParseImportRowDeps = {
    matchDriver: () => undefined,
    findFuelRate: () => ({ liters: 43 }),
    matchCustomer: () => undefined,
  }
  const row = (fuel: unknown) => ({
    [IMPORT_HEADERS.siteName]: 'ไซต์',
    [IMPORT_HEADERS.districtProvince]: 'เมือง/สระบุรี',
    [IMPORT_HEADERS.fuel]: fuel,
  })

  it('"ไม่เติม" ได้ 0 ลิตร ไม่ถูกแทนด้วยลิตรมาตรฐาน', () => {
    const r = parseImportRow(row('ไม่เติม'), 1, deps)
    expect(r.fuelLiters).toBe(0)
    expect(r.note).toContain('น้ำมัน: ไม่เติม')
  })

  it('"38 ก๊าซ" ได้ 38 ลิตร หมายเหตุก๊าซอยู่ใน note', () => {
    const r = parseImportRow(row('38 ก๊าซ'), 1, deps)
    expect(r.fuelLiters).toBe(38)
    expect(r.note).toContain('น้ำมัน: ก๊าซ')
  })

  it('ช่องว่างใช้ลิตรมาตรฐานตามเดิม', () => {
    expect(parseImportRow(row(''), 1, deps).fuelLiters).toBe(43)
  })

  it.each(['รอเติม', '10-30'])('อ่านไม่ได้ (%s) → ห้ามใช้ลิตรมาตรฐาน เว้นลิตร 0 + ธง fuelUnreadable + คำเตือน ไม่เดา', (text) => {
    const bad = parseImportRow(row(text), 1, deps)
    expect(bad.fuelLiters).toBe(0)
    expect(bad.fuelUnreadable).toBe(true)
    expect(bad.warnings.join(' ')).toContain('อ่านค่าน้ำมันจาก Excel ไม่ได้')
  })
})
