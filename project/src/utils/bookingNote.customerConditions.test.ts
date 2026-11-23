import { describe, it, expect } from 'vitest'
import { customerConditionsFor } from './bookingNote'
import { IMPORT_HEADERS, parseImportRow } from './importRowParser'

describe('customerConditionsFor — เงื่อนไขลูกค้าที่คนขับเห็น แยกจากหมายเหตุภายใน', () => {
  it('อ่านจากช่องเงื่อนไขลูกค้าอย่างเดียว แยกบรรทัดเป็นข้อ', () => {
    expect(customerConditionsFor({ customerCondition: 'ต้องใส่หมวกนิรภัย\r\n\n ห้ามเข้าก่อน 8 โมง ' })).toEqual(['ต้องใส่หมวกนิรภัย', 'ห้ามเข้าก่อน 8 โมง'])
  })

  it('ไม่มีเงื่อนไขลูกค้า = ว่าง ไม่ดึงหมายเหตุภายในไปให้คนขับเห็น', () => {
    const booking = { customerCondition: undefined, note: 'ลูกค้าจ่ายช้า ห้ามบอกคนขับ' }
    expect(customerConditionsFor(booking)).toEqual([])
  })
})

describe('คอลัมน์ "หมายเหตุ" / "เงื่อนไขลูกค้า" ตอน import', () => {
  const deps = { matchDriver: () => undefined, findFuelRate: () => undefined, matchCustomer: () => undefined }
  const rowOf = (extra: Record<string, unknown>) =>
    parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', ...extra }, 2, deps)

  it('แต่ละคอลัมน์เข้าช่องของตัวเอง ไม่ปนกัน', () => {
    const r = rowOf({ [IMPORT_HEADERS.customerCondition]: 'ต้องใส่หมวกนิรภัย', [IMPORT_HEADERS.note]: 'ย้ำตราประทับ' })
    expect(r.customerCondition).toBe('ต้องใส่หมวกนิรภัย')
    expect(r.note).toContain('ย้ำตราประทับ')
    expect(r.note).not.toContain('หมวกนิรภัย')
  })

  it('ไม่มีคอลัมน์เงื่อนไขลูกค้า = เงื่อนไขว่าง (หมายเหตุไม่ถูกนำไปใช้แทน)', () => {
    const r = rowOf({ [IMPORT_HEADERS.note]: 'ย้ำตราประทับ' })
    expect(r.customerCondition).toBe('')
    expect(customerConditionsFor({ customerCondition: r.customerCondition || undefined })).toEqual([])
  })

  it('หัวคอลัมน์มีช่องว่างเกิน ยังอ่านเข้าช่องที่ถูกต้อง', () => {
    const r = rowOf({ 'เงื่อนไข ลูกค้า ': 'ต้องใส่หมวกนิรภัย', ' หมายเหตุ': 'ย้ำตราประทับ' })
    expect(r.customerCondition).toBe('ต้องใส่หมวกนิรภัย')
    expect(r.note).toContain('ย้ำตราประทับ')
    expect(r.note).not.toContain('หมวกนิรภัย')
  })
})
