import { describe, it, expect } from 'vitest'
import { findDuplicateGroups, fingerprintOf, bookingFingerprint } from './bookingDuplicates'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

const job = (over: Record<string, unknown> = {}, item: Record<string, unknown> = {}) =>
  makeBooking({
    category: 'cements',
    customer: 'บจก. เอ',
    reference: 'PO-1',
    driverName: 'สมชาย ใจดี',
    loadingDate: new Date(2026, 9, 5, 8),
    items: [makeJobItem({ siteName: 'ไซต์ A', district: 'เมือง', province: 'นครสวรรค์', product: '23', qty: 10, ...item })],
    ...over,
  })

describe('findDuplicateGroups', () => {
  it('เนื้อหาเดียวกัน (วัน/ลูกค้า/PO/คนขับ/หน้างาน/สินค้า) = กลุ่มซ้ำ เรียงงานเก่าก่อน', () => {
    const a = job({ docNo: 'A', createdAt: new Date(2026, 9, 5, 9) })
    const b = job({ docNo: 'B', createdAt: new Date(2026, 9, 5, 10), loadingDate: new Date(2026, 9, 5, 15) })
    const groups = findDuplicateGroups([b, a])
    expect(groups).toHaveLength(1)
    expect(groups[0].reason).toBe('SAME_CONTENT')
    expect(groups[0].bookings.map((x) => x.docNo)).toEqual(['A', 'B'])
  })

  it('คนขับต่างกัน / จำนวนต่างกัน / วันต่างกัน = ไม่ใช่งานซ้ำ', () => {
    const a = job({ docNo: 'A' })
    expect(findDuplicateGroups([a, job({ docNo: 'B', driverName: 'อื่น' })])).toHaveLength(0)
    expect(findDuplicateGroups([a, job({ docNo: 'C' }, { qty: 12 })])).toHaveLength(0)
    expect(findDuplicateGroups([a, job({ docNo: 'D', loadingDate: new Date(2026, 9, 6) })])).toHaveLength(0)
  })

  it('เลขที่งานซ้ำ = กลุ่มเดียว (ไม่นับกลุ่มเนื้อหาซ้ำอีก)', () => {
    const groups = findDuplicateGroups([job({ docNo: 'X' }), job({ docNo: 'X' })])
    expect(groups.map((g) => g.reason)).toEqual(['SAME_DOC_NO'])
  })

  it('ลายนิ้วมือของแถว import ตรงกับงานที่สร้างจากแถวเดียวกัน', () => {
    const b = job()
    const fp = fingerprintOf({
      category: 'cements',
      date: new Date(2026, 9, 5),
      customer: 'บจก.  เอ',
      reference: 'PO-1',
      driver: 'สมชาย ใจดี',
      sites: [{ siteName: 'ไซต์ A', district: 'เมือง', province: 'นครสวรรค์', products: [{ product: '23', qty: 10 }] }],
    })
    expect(fp).toBe(bookingFingerprint(b))
  })
})
