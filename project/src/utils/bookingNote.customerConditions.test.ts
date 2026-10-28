import { describe, it, expect } from 'vitest'
import { customerConditionsFor, customerConditionsOf } from './bookingNote'
import { IMPORT_HEADERS, parseImportRow } from './importRowParser'

describe('customerConditionsOf — เงื่อนไขลูกค้าจากหมายเหตุ (ตัดข้อความระบบ/เบี้ยเลี้ยง/น้ำมัน ออก)', () => {
  it('เหลือเฉพาะข้อความจากลูกค้า/ผู้ใช้', () => {
    const note = [
      'ย้ำตราประทับ',
      'น้ำมัน: ไม่เติม',
      'เรทน้ำมัน: ยังไม่มีราคาน้ำมันของวันที่ 5',
      'ต้องกรอกเพิ่ม: เบี้ยเลี้ยง',
      'ตรวจคนขับ: ชื่อเล่น "ติ๊ก" ไม่ตรงกับรายชื่อคนขับ',
      'เบี้ยเลี้ยงจ่ายครึ่งเดียว',
      'ห้ามเข้าก่อน 8 โมง',
    ].join(' | ')
    expect(customerConditionsOf(note)).toEqual(['ย้ำตราประทับ', 'ห้ามเข้าก่อน 8 โมง'])
  })

  it('ไม่มีหมายเหตุ / มีแต่ข้อความระบบ = ว่าง', () => {
    expect(customerConditionsOf(undefined)).toEqual([])
    expect(customerConditionsOf('ต้องกรอกเพิ่ม: ราคาปูน | น้ำมัน: ก๊าซ')).toEqual([])
  })
})

describe('คอลัมน์ "เงื่อนไขลูกค้า" ตอน import (แผนสำรอง)', () => {
  const deps = { matchDriver: () => undefined, findFuelRate: () => undefined, matchCustomer: () => undefined }
  const rowOf = (extra: Record<string, unknown>) =>
    parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', ...extra }, 2, deps)

  it('มีคอลัมน์ = ใช้ค่าจากคอลัมน์ ไม่ปนลงหมายเหตุ', () => {
    const r = rowOf({ [IMPORT_HEADERS.customerCondition]: 'ต้องใส่หมวกนิรภัย', [IMPORT_HEADERS.note]: 'ย้ำตราประทับ' })
    expect(r.customerCondition).toBe('ต้องใส่หมวกนิรภัย')
    expect(r.note).not.toContain('หมวกนิรภัย')
    expect(customerConditionsFor({ customerCondition: r.customerCondition, note: r.note })).toEqual(['ต้องใส่หมวกนิรภัย'])
  })

  it('ไม่มีคอลัมน์/เซลล์ว่าง = ดึงจากหมายเหตุแทน', () => {
    const r = rowOf({ [IMPORT_HEADERS.note]: 'ย้ำตราประทับ' })
    expect(r.customerCondition).toBe('')
    expect(customerConditionsFor({ customerCondition: r.customerCondition || undefined, note: r.note })).toEqual(['ย้ำตราประทับ'])
  })
})
