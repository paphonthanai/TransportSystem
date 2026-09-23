import { describe, it, expect } from 'vitest'
import { matchCustomerForImport, matchDriverForImport } from './importRowParser'

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
