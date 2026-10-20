import { describe, it, expect } from 'vitest'
import { assignImportTripSequences, applySheetHyperlinks, matchCustomerForImport, matchDriverForImport, parseImportRow, parseFuelCell, IMPORT_HEADERS, type ParseImportRowDeps } from './importRowParser'

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

  it('ชื่อเล่นพิมพ์เพี้ยนแค่วรรณยุกต์/ไม้ไต่คู้ ("แจ๊ค" กับ "แจ็ค") ยังจับคู่ได้ ตามทะเบียนเดิม', () => {
    const list = [{ code: 'D004', nickname: 'แจ็ค' }]
    const plateOf = (code: string) => (code === 'D004' ? { plate: '72-2337' } : undefined)
    expect(matchDriverForImport('แจ๊ค', '72-2337', list, plateOf)?.code).toBe('D004')
    // ทะเบียนไม่ตรงกับรถที่ประจำคนขับคนนั้น = ไม่เดา
    expect(matchDriverForImport('แจ๊ค', '70-0000', list, plateOf)).toBeUndefined()
  })

  it('ทะเบียนในไฟล์ต่อท้ายด้วยชื่อจังหวัด ("72-3825 สระบุรี") ยังจับคู่กับทะเบียนรถในระบบ (เลขล้วน) ได้', () => {
    const list = [{ code: 'D012', nickname: 'หนุ่ม' }]
    const plateOf = (code: string) => (code === 'D012' ? { plate: '72-3825' } : undefined)
    expect(matchDriverForImport('หนุ่ม', '72-3825 สระบุรี', list, plateOf)?.code).toBe('D012')
    expect(matchDriverForImport('หนุ่ม', '72-3826 สระบุรี', list, plateOf)).toBeUndefined()
  })

  it('จับคู่ตรงตัวก่อนเสมอ แม้จะมีคนที่ชื่อเล่นใกล้เคียงอยู่ด้วย', () => {
    const list = [
      { code: 'A', nickname: 'แจ็ค' },
      { code: 'B', nickname: 'แจ๊ค' },
    ]
    expect(matchDriverForImport('แจ๊ค', '', list, () => undefined)?.code).toBe('B')
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

/** มีงานต้องมีทะเบียน มีทะเบียนต้องมีคนขับ (ผูกกันอยู่แล้ว) — ถ้าขาดอย่างใดอย่างหนึ่งให้เติมจากรถ/คนขับประจำ พร้อมคำเตือนให้ตรวจ */
describe('parseImportRow — ทะเบียน ↔ คนขับ ผูกกัน', () => {
  const baseRow = {
    [IMPORT_HEADERS.siteName]: 'ไซต์',
    [IMPORT_HEADERS.districtProvince]: 'เมือง/สระบุรี',
  }
  const mk = (matchDriver: ParseImportRowDeps['matchDriver']): ParseImportRowDeps => ({
    matchDriver,
    findFuelRate: () => undefined,
    matchCustomer: () => undefined,
  })

  it('ชื่อเล่นจับคู่ไม่ได้แต่ทะเบียนมีคนขับประจำ (viaPlate) → ใช้คนขับประจำรถ + เตือนให้ตรวจ', () => {
    const row = parseImportRow(
      { ...baseRow, [IMPORT_HEADERS.driverName]: 'เดช', [IMPORT_HEADERS.plate]: '72-9836' },
      1,
      mk(() => ({ id: 'd1', fullName: 'วิทวัฒน์ สายกระสุน', viaPlate: true }))
    )
    expect(row.driverName).toBe('วิทวัฒน์ สายกระสุน')
    expect(row.driverId).toBe('d1')
    expect(row.warnings.join(' ')).toContain('ตรวจคนขับ')
    expect(row.warnings.join(' ')).toContain('เดช')
  })

  it('ไม่ได้ใส่ชื่อเล่นเลยแต่มีทะเบียน → ถามหาคนขับจากทะเบียนด้วย', () => {
    let called: [string, string] | null = null
    const row = parseImportRow(
      { ...baseRow, [IMPORT_HEADERS.plate]: '73-1124 สระบุรี' },
      1,
      mk((nick, plate) => {
        called = [nick, plate]
        return { id: 'd2', fullName: 'สายยนตร์ ภู่ถนนนอก', viaPlate: true }
      })
    )
    expect(called).toEqual(['', '73-1124 สระบุรี'])
    expect(row.driverName).toBe('สายยนตร์ ภู่ถนนนอก')
  })

  it('มีคนขับแต่ไม่ได้ใส่ทะเบียน → ใช้ทะเบียนรถประจำคนขับ + เตือนให้ตรวจ', () => {
    const row = parseImportRow(
      { ...baseRow, [IMPORT_HEADERS.driverName]: 'แจ็ค' },
      1,
      mk(() => ({ id: 'd4', fullName: 'ปัญญา เอี่ยมสะอาด', plate: '72-2337 สระบุรี' }))
    )
    expect(row.plate).toBe('72-2337 สระบุรี')
    expect(row.driverName).toBe('ปัญญา เอี่ยมสะอาด')
    expect(row.warnings.join(' ')).toContain('ตรวจทะเบียน')
  })

  it('ระบุทะเบียนมาเองแล้ว ไม่ถูกทับด้วยทะเบียนประจำคนขับ', () => {
    const row = parseImportRow(
      { ...baseRow, [IMPORT_HEADERS.driverName]: 'แจ็ค', [IMPORT_HEADERS.plate]: '72-0000' },
      1,
      mk(() => ({ id: 'd4', fullName: 'ปัญญา เอี่ยมสะอาด', plate: '72-2337 สระบุรี' }))
    )
    expect(row.plate).toBe('72-0000')
  })
})

/** หัวคอลัมน์จริงจากไฟล์ลูกค้า: "พิกัด/ลิ้งก์ Google maps หน้างาน" (ลิ้งก์ มีไม้โท, maps ตัวเล็ก) เคยไม่ถูกอ่านเลยเพราะเทียบชื่อตรงเป๊ะ */
describe('parseImportRow — หัวคอลัมน์ลิงก์ GPS/เที่ยวที่ ที่ชื่อต่างจากระบบ', () => {
  const deps: ParseImportRowDeps = { matchDriver: () => undefined, findFuelRate: () => undefined, matchCustomer: () => undefined }
  const base: Record<string, unknown> = { [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์' }

  it('หัวคอลัมน์จริง "พิกัด/ลิ้งก์ Google maps หน้างาน" + ลิงก์สั้น → เก็บเป็น mapUrl', () => {
    const row = parseImportRow({ ...base, 'พิกัด/ลิ้งก์ Google maps หน้างาน': 'https://maps.app.goo.gl/TeiWqRmaq9Tciyw98' }, 1, deps)
    expect(row.mapUrl).toBe('https://maps.app.goo.gl/TeiWqRmaq9Tciyw98')
    expect(row.latitude).toBeUndefined()
  })
  it.each(['GPS', 'ลิ้งก์ GPS', 'ลิงค์แผนที่', 'Google Map', 'พิกัด'])('หัวคอลัมน์ "%s" ถูกอ่านเป็นลิงก์ GPS', (h) => {
    expect(parseImportRow({ ...base, [h]: 'https://maps.google.com/?q=13.7,100.5' }, 1, deps).latitude).toBe(13.7)
  })
  it('หัวคอลัมน์อื่นที่ระบบรู้จักไม่ถูกดึงไปเป็นลิงก์ (เช่น สถานที่ส่งสินค้า)', () => {
    expect(parseImportRow({ ...base }, 1, deps).mapUrl).toBeUndefined()
  })
  it('อ่านเลขเที่ยวจากคอลัมน์ "เที่ยวที่" หลายรูปแบบ', () => {
    expect(parseImportRow({ ...base, 'เที่ยวที่': 2 }, 1, deps).tripSequence).toBe(2)
    expect(parseImportRow({ ...base, เที่ยว: 'เที่ยว 3' }, 1, deps).tripSequence).toBe(3)
    expect(parseImportRow({ ...base, 'เที่ยวที่': '' }, 1, deps).tripSequence).toBeUndefined()
  })
})

describe('assignImportTripSequences', () => {
  const r = (driverName: string, tripSequence?: number) => ({ driverName, plate: '', tripSequence, isEmpty: false })
  it('แถวซ้ำคนขับเดียวกัน เรียงเป็นเที่ยว 1,2 ตามแถว; คนขับอื่นเริ่ม 1 ใหม่', () => {
    const rows = assignImportTripSequences([r('ก'), r('ข'), r('ก'), r('ก')])
    expect(rows.map((x) => x.tripSequence)).toEqual([1, 1, 2, 3])
  })
  it('เลขที่ระบุเองในไฟล์ไม่ถูกทับ และแถวที่ไม่ระบุต่อจากเลขสูงสุด', () => {
    const rows = assignImportTripSequences([r('ก', 2), r('ก')])
    expect(rows.map((x) => x.tripSequence)).toEqual([2, 3])
  })
})

describe('applySheetHyperlinks', () => {
  it('ดึง URL จริงจาก hyperlink ของเซลล์ที่แสดงเป็นข้อความป้าย', () => {
    const sheet = { B3: { v: 'ดูแผนที่', l: { Target: 'https://maps.app.goo.gl/abc' } } } as Record<string, any>
    const rows: Record<string, unknown>[] = [{ 'ลิ้งก์ GPS': 'ดูแผนที่' }]
    applySheetHyperlinks(sheet, 1, ['พขร.', 'ลิ้งก์ GPS'], rows)
    expect(rows[0]['ลิ้งก์ GPS']).toBe('https://maps.app.goo.gl/abc')
  })
})
