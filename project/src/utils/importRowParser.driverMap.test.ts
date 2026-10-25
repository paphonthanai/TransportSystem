import { describe, it, expect } from 'vitest'
import { IMPORT_HEADERS, mapImportRowToDriver, parseImportRow, type ParseImportRowDeps } from './importRowParser'

const deps = (match?: { id: string; fullName: string }): ParseImportRowDeps => ({
  matchDriver: (nickname) => (nickname && match ? { ...match } : undefined),
  findFuelRate: () => undefined,
  matchCustomer: () => undefined,
})
const rowOf = (extra: Record<string, unknown>, d: ParseImportRowDeps) =>
  parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', ...extra }, 2, d)

describe('ผล map ชื่อเล่น → ชื่อจริง ในพรีวิวนำเข้า', () => {
  it('เก็บชื่อเล่นดิบจาก Excel ไว้คู่กับชื่อจริงที่จับคู่ได้', () => {
    const r = rowOf({ [IMPORT_HEADERS.driverName]: 'ติ๊ก' }, deps({ id: 'd10', fullName: 'สมพิศ หลงศรีภูมิ' }))
    expect(r.driverNickname).toBe('ติ๊ก')
    expect(r.driverName).toBe('สมพิศ หลงศรีภูมิ')
  })

  it('จับคู่ไม่ได้: driverName ว่าง แต่ยังรู้ว่าชื่อเล่นใน Excel คืออะไร และมีคำเตือน', () => {
    const r = rowOf({ [IMPORT_HEADERS.driverName]: 'ติ๊ก' }, deps())
    expect(r.driverNickname).toBe('ติ๊ก')
    expect(r.driverName).toBe('')
    expect(r.warnings.some((w) => w.startsWith('ชื่อเล่นคนขับ'))).toBe(true)
  })
})

describe('mapImportRowToDriver — เลือกคนขับเองในพรีวิว', () => {
  it('ตั้งคนขับ/ชื่อ-นามสกุลแยก ใช้ทะเบียนรถประจำถ้าแถวไม่มีทะเบียน และลบคำเตือน/หมายเหตุเรื่องชื่อเล่นที่ไม่เป็นจริงแล้ว', () => {
    const r = rowOf({ [IMPORT_HEADERS.driverName]: 'ติ๊ก', [IMPORT_HEADERS.note]: 'ย้ำตราประทับ' }, deps())
    expect(r.note).toContain('ชื่อเล่นคนขับ')

    mapImportRowToDriver(r, { id: 'd10', firstName: 'สมพิศ', lastName: 'หลงศรีภูมิ', plate: '72-2837 สระบุรี' })

    expect(r.driverName).toBe('สมพิศ หลงศรีภูมิ')
    expect(r.driverId).toBe('d10')
    expect(r.driverFirstName).toBe('สมพิศ')
    expect(r.driverLastName).toBe('หลงศรีภูมิ')
    expect(r.plate).toBe('72-2837 สระบุรี')
    expect(r.warnings.some((w) => w.startsWith('ชื่อเล่นคนขับ'))).toBe(false)
    expect(r.note).not.toContain('ชื่อเล่นคนขับ')
    expect(r.note).toContain('ย้ำตราประทับ') // หมายเหตุอื่นของผู้ใช้อยู่ครบ
  })

  it('แถวมีทะเบียนอยู่แล้ว ไม่ทับทะเบียนด้วยรถประจำ', () => {
    const r = rowOf({ [IMPORT_HEADERS.driverName]: 'ติ๊ก', [IMPORT_HEADERS.plate]: '72-4665' }, deps())
    mapImportRowToDriver(r, { id: 'd10', firstName: 'สมพิศ', lastName: 'หลงศรีภูมิ', plate: '72-2837' })
    expect(r.plate).toBe('72-4665')
  })
})
