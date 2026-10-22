import { describe, it, expect } from 'vitest'
import { checkMapLink, parseImportRow, IMPORT_HEADERS, type ParseImportRowDeps } from './importRowParser'

describe('checkMapLink — ตรวจพิกัด/ลิงก์ GPS ก่อนนำเข้า', () => {
  it('ลิงก์ Google Maps ปกติ / ลิงก์สั้น / ตัวเลขพิกัดในไทย = ไม่มีข้อควรตรวจ; ว่าง = ไม่ตรวจ', () => {
    expect(checkMapLink('https://www.google.com/maps/@15.70,100.13,17z')).toEqual([])
    expect(checkMapLink('https://maps.app.goo.gl/abc123')).toEqual([])
    expect(checkMapLink('13.7563, 100.5018')).toEqual([])
    expect(checkMapLink('   ')).toEqual([])
  })

  it('มีหลายลิงก์ในช่องเดียว / ลิงก์ที่ไม่ใช่แผนที่ / ข้อความที่ไม่ใช่ลิงก์หรือพิกัด', () => {
    expect(checkMapLink('https://maps.app.goo.gl/a https://maps.app.goo.gl/b')[0]).toContain('มากกว่า 1 ลิงก์')
    expect(checkMapLink('https://line.me/ti/p/abc')[0]).toContain('ไม่ใช่ลิงก์แผนที่')
    expect(checkMapLink('หน้าโรงเรียนบ้านหนองแก')[0]).toContain('ไม่ใช่ลิงก์หรือตัวเลขพิกัด')
  })

  it('พิกัดนอกประเทศไทย (มักสลับละติจูด/ลองจิจูด) เตือน', () => {
    expect(checkMapLink('100.5018, 13.7563')[0]).toContain('นอกประเทศไทย')
    expect(checkMapLink('https://www.google.com/maps/@48.85,2.35,12z')[0]).toContain('นอกประเทศไทย')
  })
})

const deps: ParseImportRowDeps = {
  matchDriver: () => undefined,
  findFuelRate: () => undefined,
  matchCustomer: () => undefined,
}
const rowOf = (extra: Record<string, unknown>) =>
  parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', ...extra }, 2, deps)

describe('parseImportRow — checks ระดับแถว (ไม่แปะลง note)', () => {
  it('ลิงก์ที่น่าสงสัยขึ้นใน checks แต่ไม่ปนเข้า note/warnings ของงาน', () => {
    const r = rowOf({ [IMPORT_HEADERS.mapLink]: 'ข้างวัด' })
    expect(r.checks.length).toBe(1)
    expect(r.note).not.toContain('ข้างวัด')
    expect(r.warnings.join(' ')).not.toContain('ข้างวัด')
  })

  it('ลิงก์ปกติ/ไม่กรอก = ไม่มี checks', () => {
    expect(rowOf({ [IMPORT_HEADERS.mapLink]: 'https://maps.app.goo.gl/x' }).checks).toEqual([])
    expect(rowOf({}).checks).toEqual([])
  })

  it('เลขเที่ยวอ่านไม่ได้ขึ้นใน checks; อ่านได้ = ไม่เตือน', () => {
    expect(rowOf({ [IMPORT_HEADERS.tripNo]: 'abc' }).checks[0]).toContain('อ่านไม่ได้')
    expect(rowOf({ [IMPORT_HEADERS.tripNo]: 2 }).checks).toEqual([])
    expect(rowOf({ [IMPORT_HEADERS.tripNo]: 'เที่ยว 3' }).checks).toEqual([])
  })
})
