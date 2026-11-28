import { describe, it, expect } from 'vitest'
import { parseImportRow, IMPORT_HEADERS, type ParseImportRowDeps } from './importRowParser'

const deps: ParseImportRowDeps = { matchDriver: () => undefined, findFuelRate: () => undefined, matchCustomer: () => undefined }
const row = (product: unknown, qty: unknown) =>
  parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', [IMPORT_HEADERS.product]: product, [IMPORT_HEADERS.qty]: qty }, 1, deps)
const qtyWarnings = (r: ReturnType<typeof row>) => r.warnings.filter((w) => w.includes('ตัน'))

describe('เช็คจำนวนตันเทียบกับสินค้า', () => {
  it('คู่กันครบ ไม่มีคำเตือนเรื่องตัน', () => {
    expect(qtyWarnings(row('23 + 52', '5.2 + 4.8'))).toEqual([])
    expect(qtyWarnings(row('23', 9.6))).toEqual([])
  })
  it('สินค้า 1 ชนิดแต่ตันหลายค่า — เตือน (สินค้าอาจตกหล่น)', () => {
    const r = row('23', '5.2\n4.8')
    expect(r.qty).toBe(10)
    expect(qtyWarnings(r).some((w) => w.includes('ตันมีหลายค่า') && w.includes('กรุณาตรวจสอบข้อมูลก่อนจ่ายงาน'))).toBe(true)
  })
  it('สินค้าหลายชนิดแต่ตันค่าเดียว — เตือนเหมือนเดิม', () => {
    expect(qtyWarnings(row('23 + 52', '10')).some((w) => w.includes('ไม่ตรงกับจำนวนชนิดสินค้า'))).toBe(true)
  })
  it('ตันบางส่วนอ่านไม่ออก — เตือนพร้อมค่าดิบ ไม่ทิ้งเงียบๆ', () => {
    const r = row('23 + 52', '5 + ห้า')
    expect(qtyWarnings(r).some((w) => w.includes('อ่านจำนวนตันไม่ได้') && w.includes('ห้า'))).toBe(true)
  })
  it('สินค้าบางชนิดได้ 0 ตัน — เตือนชื่อสินค้านั้น', () => {
    const r = row('23 + 52', '10 + 0')
    expect(qtyWarnings(r).some((w) => w.includes('"52"') && w.includes('0 ตัน'))).toBe(true)
  })
  it('มีจำนวนตันแต่ไม่มีสินค้า — เตือน', () => {
    expect(row('', '10').warnings.some((w) => w.includes('ไม่มีรหัสสินค้า'))).toBe(true)
  })

  it('ตัวเลขหลัง "/" ในชนิดปูน = จำนวนตันของชนิดนั้น', () => {
    const r = row('23/5.2 + 52/4.8', '')
    expect(r.productCodes).toEqual(['23', '52'])
    expect(r.qty).toBe(10)
    expect(r.productQtyPairs).toEqual([{ product: '23', qty: 5.2 }, { product: '52', qty: 4.8 }])
    expect(qtyWarnings(r)).toEqual([])
  })
  it('"/" แก้กรณีหลายชนิดแต่ช่องจำนวนตันค่าเดียว (ยอดรวมตรงกัน ไม่เตือน)', () => {
    const r = row('23/4 + 52/6 ตัน', '10')
    expect(r.productQtyPairs.map((p) => p.qty)).toEqual([4, 6])
    expect(qtyWarnings(r)).toEqual([])
  })
  it('ยอดตันหลัง "/" ไม่ตรงกับช่องจำนวนตัน — ใช้ตามชนิดปูนและเตือน', () => {
    const r = row('23/4 + 52/5', '10')
    expect(r.qty).toBe(9)
    expect(qtyWarnings(r).some((w) => w.includes('ไม่ตรงกับช่องจำนวนตัน'))).toBe(true)
  })
  it('ระบุ "/" แค่บางชนิด — ใช้ช่องจำนวนตันและเตือน', () => {
    const r = row('23/4 + 52', '4 + 6')
    expect(r.productCodes).toEqual(['23', '52'])
    expect(r.productQtyPairs.map((p) => p.qty)).toEqual([4, 6])
    expect(qtyWarnings(r).some((w) => w.includes('แค่บางชนิด'))).toBe(true)
  })
  it('"/" ที่ได้ 0 ตัน — เตือนชื่อสินค้า', () => {
    expect(qtyWarnings(row('23/10 + 52/0', '')).some((w) => w.includes('"52"') && w.includes('0 ตัน'))).toBe(true)
  })
})
