import { describe, it, expect } from 'vitest'
import { parseImportRow, splitDocumentRefs, IMPORT_HEADERS, type ParseImportRowDeps } from './importRowParser'

const deps: ParseImportRowDeps = {
  matchDriver: () => undefined,
  findFuelRate: () => undefined,
  matchCustomer: () => undefined,
}
const base = { [IMPORT_HEADERS.siteName]: 'ไซต์ทดสอบ', [IMPORT_HEADERS.districtProvince]: 'เมือง/นนทบุรี' }

describe('เลขที่เอกสาร / เลขชิพเม้น / เลขตั๋ว ตอน import', () => {
  it('ไฟล์มีคอลัมน์ชิพเม้นแยก: เลขที่เอกสาร = I-..., ชิพเม้น = SH..., เลขตั๋ว', () => {
    const row = parseImportRow({ ...base, 'เลขที่เอกสาร': 'I-1235516026', 'เลขชิปเม้นท์/รับนาม': 'SH20261105-0925', 'เลขตั๋ว': 'T-778' }, 1, deps)
    expect(row.customerDocNo).toBe('I-1235516026')
    expect(row.shipmentNo).toBe('SH20261105-0925')
    expect(row.ticketNo).toBe('T-778')
  })

  it('หัวคอลัมน์สะกดต่างกันได้ (ชิพเม้น / เลขที่ตั๋ว)', () => {
    const row = parseImportRow({ ...base, 'เลขที่เอกสาร': 'P069/27019', 'เลขชิพเม้น': 'M1196511 = คอนสมิกซ์', 'เลขที่ตั๋ว': '555' }, 1, deps)
    expect(row.customerDocNo).toBe('P069/27019')
    expect(row.shipmentNo).toBe('M1196511 = คอนสมิกซ์')
    expect(row.ticketNo).toBe('555')
  })

  it('มีคอลัมน์ชิพเม้นแต่ช่องว่าง: เลขที่เอกสารอย่างเดียว ไม่เดาเป็นชิพเม้น', () => {
    const row = parseImportRow({ ...base, 'เลขที่เอกสาร': 'I-1', 'เลขชิปเม้นท์/รับนาม': '' }, 1, deps)
    expect(row.customerDocNo).toBe('I-1')
    expect(row.shipmentNo).toBe('')
  })

  it('ไฟล์แบบเก่า (ไม่มีคอลัมน์ชิพเม้น) เลขเดียว = เลขชิพเม้นเหมือนเดิม', () => {
    const row = parseImportRow({ ...base, 'เลขที่เอกสาร': 'SH20261106-0724' }, 1, deps)
    expect(row.customerDocNo).toBe('')
    expect(row.shipmentNo).toBe('SH20261106-0724')
    expect(row.ticketNo).toBe('')
  })

  it('ช่องเดียวมี 2 เลข (ขึ้นบรรทัดใหม่/มีเครื่องหมายคำพูด) แยกเป็นเลขที่เอกสาร + ชิพเม้น', () => {
    expect(splitDocumentRefs('"I-1740147164\nSH20261107-0804"', undefined)).toEqual({ customerDocNo: 'I-1740147164', shipmentNo: 'SH20261107-0804' })
  })

  it('ข้อความที่ไม่ใช่ 2 เลข (มีคำไม่มีตัวเลข) ไม่แยก', () => {
    expect(splitDocumentRefs('M1196511 = คอนสมิกซ์', undefined)).toEqual({ customerDocNo: '', shipmentNo: 'M1196511 = คอนสมิกซ์' })
  })
})
