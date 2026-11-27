import { describe, it, expect } from 'vitest'
import { parseImportRow, IMPORT_HEADERS, type ParseImportRowDeps } from './importRowParser'

const deps: ParseImportRowDeps = { matchDriver: () => undefined, findFuelRate: () => undefined, matchCustomer: () => undefined }
const row = (product: unknown, qty: unknown) =>
  parseImportRow({ [IMPORT_HEADERS.siteName]: 'ไซต์', [IMPORT_HEADERS.districtProvince]: 'เมือง/นครสวรรค์', [IMPORT_HEADERS.product]: product, [IMPORT_HEADERS.qty]: qty }, 1, deps)

describe('สินค้าหลายชนิด — จำนวนตันต่อชนิด', () => {
  it('แยกด้วย + (แบบเดิม)', () => {
    const r = row('23 + 13', '0.40 + 9.60')
    expect(r.qty).toBe(10)
    expect(r.productQtyPairs).toEqual([{ product: '23', qty: 0.4 }, { product: '13', qty: 9.6 }])
  })
  it('ขึ้นบรรทัดใหม่ในเซลล์เดียวกัน (Alt+Enter) ไม่กลายเป็น 0', () => {
    const r = row('23\n52', '5.20\n4.80')
    expect(r.qty).toBe(10)
    expect(r.productQtyPairs).toEqual([{ product: '23', qty: 5.2 }, { product: '52', qty: 4.8 }])
  })
  it('มีหน่วย "ตัน" ต่อท้ายก็ยังอ่านได้', () => {
    const r = row('23 + 52', '5 ตัน + 5 ตัน')
    expect(r.qty).toBe(10)
    expect(r.productQtyPairs.map((p) => p.qty)).toEqual([5, 5])
  })
  it('ตัวเลขจาก Excel (number) ชนิดเดียว', () => {
    const r = row('23', 9.6)
    expect(r.qty).toBe(9.6)
    expect(r.productQtyPairs).toEqual([{ product: '23', qty: 9.6 }])
  })
})
