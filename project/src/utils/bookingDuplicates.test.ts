import { describe, it, expect } from 'vitest'
import { findDuplicateGroups, shipmentKey, bookingShipmentKey } from './bookingDuplicates'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

const job = (over: Record<string, unknown> = {}) =>
  makeBooking({
    category: 'cements',
    customer: 'บจก. เอ',
    reference: 'SH-001',
    driverName: 'สมชาย ใจดี',
    loadingDate: new Date(2026, 9, 5, 8),
    items: [makeJobItem({ siteName: 'ไซต์ A', product: '23', qty: 10 })],
    ...over,
  })

describe('findDuplicateGroups — ตรวจซ้ำด้วยเลข PO ลูกค้า (เลขชิพเม้น)', () => {
  it('ลูกค้าเดียวกัน เลขชิพเม้นเดียวกัน = กลุ่มซ้ำ (ไม่สนคนขับ/วัน/หน้างาน) เรียงงานเก่าก่อน', () => {
    const a = job({ docNo: 'A', createdAt: new Date(2026, 9, 5, 9) })
    const b = job({ docNo: 'B', createdAt: new Date(2026, 9, 5, 10), driverName: 'อื่น', reference: ' sh-001 ', loadingDate: new Date(2026, 9, 6) })
    const groups = findDuplicateGroups([b, a])
    expect(groups).toHaveLength(1)
    expect(groups[0].reason).toBe('SAME_SHIPMENT')
    expect(groups[0].bookings.map((x) => x.docNo)).toEqual(['A', 'B'])
  })

  it('เนื้อหาเหมือนกันทุกอย่างแต่เลขชิพเม้นต่างกัน/ไม่มีเลข = ไม่ใช่งานซ้ำ', () => {
    const a = job({ docNo: 'A' })
    expect(findDuplicateGroups([a, job({ docNo: 'B', reference: 'SH-002' })])).toHaveLength(0)
    expect(findDuplicateGroups([job({ docNo: 'C', reference: undefined }), job({ docNo: 'D', reference: undefined })])).toHaveLength(0)
  })

  it('เลขชิพเม้นเดียวกันแต่คนละลูกค้า = ไม่ใช่งานซ้ำ', () => {
    expect(findDuplicateGroups([job({ docNo: 'A' }), job({ docNo: 'B', customer: 'บจก. บี' })])).toHaveLength(0)
  })

  it('เลขที่งานซ้ำ = กลุ่มเดียว (ไม่นับกลุ่มชิพเม้นซ้ำอีก)', () => {
    const groups = findDuplicateGroups([job({ docNo: 'X' }), job({ docNo: 'X' })])
    expect(groups.map((g) => g.reason)).toEqual(['SAME_DOC_NO'])
  })

  it('key ของแถว import ตรงกับงานที่มีเลขชิพเม้นเดียวกัน (ไม่สนช่องว่าง/ตัวพิมพ์)', () => {
    expect(shipmentKey('บจก.  เอ', 'sh-001')).toBe(bookingShipmentKey(job()))
    expect(shipmentKey('บจก. เอ', '')).toBe('')
  })
})
