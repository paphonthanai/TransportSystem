import { describe, it, expect } from 'vitest'
import { jobTypeCode, parseJobType } from './jobType'
import { IMPORT_HEADERS, parseImportRow } from './importRowParser'

describe('ประเภท d1/d2/d3', () => {
  it('รหัสที่แสดง', () => {
    expect(jobTypeCode('ลงมือ')).toBe('d1')
    expect(jobTypeCode('พาเลทโรงงาน')).toBe('d2')
    expect(jobTypeCode('พาเลทฟรี')).toBe('d3')
    expect(jobTypeCode(undefined)).toBe('')
  })

  it('อ่านได้ทั้งรหัส (ตัวเล็ก/ใหญ่) และชื่อไทยเต็ม', () => {
    expect(parseJobType('d1')).toBe('ลงมือ')
    expect(parseJobType(' D2 ')).toBe('พาเลทโรงงาน')
    expect(parseJobType('พาเลทฟรี')).toBe('พาเลทฟรี')
    expect(parseJobType('พาเรท')).toBeUndefined()
    expect(parseJobType('')).toBeUndefined()
  })
})

describe('import คอลัมน์ "ประเภท"', () => {
  const deps = { matchDriver: () => undefined, findFuelRate: () => undefined, matchCustomer: () => undefined }
  const rowOf = (extra: Record<string, unknown>) =>
    parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', ...extra }, 2, deps)

  it('หัวคอลัมน์ใหม่ "ประเภท" รับ d3', () => {
    expect(IMPORT_HEADERS.jobType).toBe('ประเภท')
    expect(rowOf({ ประเภท: 'd3' }).jobType).toBe('พาเลทฟรี')
  })

  it('ไฟล์เก่าหัว "ประเภทงาน" ยังอ่านได้', () => {
    expect(rowOf({ ประเภทงาน: 'ลงมือ' }).jobType).toBe('ลงมือ')
  })

  it('ค่าไม่ตรง = เว้นว่าง + เตือน', () => {
    const row = rowOf({ ประเภท: 'd9' })
    expect(row.jobType).toBeUndefined()
    expect(row.warnings.some((w) => w.includes('d9'))).toBe(true)
  })
})
