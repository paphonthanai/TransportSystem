import { describe, it, expect } from 'vitest'
import { feedForRow, groupRowsByFeed } from './feedGrouping'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

/**
 * Regression suite สำหรับบั๊กจริงที่เกิดในโปรเจกต์นี้ (commit 387cd97 -> a7d0894): เดิม Feed ถูกหาจาก
 * items[].product ซึ่งในข้อมูลจริงเป็นรหัสเส้นทาง/ไซต์ (เช่น "13", "NO.11") ไม่ใช่ชื่อสินค้าที่อ่านออก — ต้องหาจาก
 * booking.category เท่านั้น ทดสอบด้วย fixture ที่มี items[].product เป็นรหัสมั่วๆ ตั้งใจให้พิสูจน์ว่าไม่กระทบผลลัพธ์
 */
describe('feedForRow', () => {
  it('resolves Feed from booking.category, ignoring items[].product entirely (even when it looks like a route/site code)', () => {
    const bookings = [makeBooking({ docNo: 'B-1', category: 'cements', items: [makeJobItem({ product: '13' })] })]
    expect(feedForRow({ deliveryNo: 'B-1', unitPrice: 1500, amount: 1500 }, bookings)).toBe('Cement')
  })

  it('returns empty string when the row has no deliveryNo (manually-entered row, not booking-derived)', () => {
    expect(feedForRow({ unitPrice: 1000, amount: 1000 }, [])).toBe('')
  })

  it('returns empty string when no booking matches the deliveryNo', () => {
    expect(feedForRow({ deliveryNo: 'MISSING', unitPrice: 1000, amount: 1000 }, [])).toBe('')
  })
})

describe('groupRowsByFeed', () => {
  it('splits a mixed Cement + Ceramic Billing Note into two separate Feed groups on the Tax Invoice/Receipt', () => {
    const bookings = [
      makeBooking({ docNo: 'CEM-1', category: 'cements', items: [makeJobItem({ product: '13' })] }),
      makeBooking({ docNo: 'CEM-2', category: 'cements', items: [makeJobItem({ product: '23' })] }),
      makeBooking({ docNo: 'CER-1', category: 'ceramics', items: [makeJobItem({ product: 'NO.11' })] }),
    ]
    const rows = [
      { deliveryNo: 'CEM-1', shipDate: new Date('2026-08-21'), unitPrice: 1500, amount: 1500 },
      { deliveryNo: 'CEM-2', shipDate: new Date('2026-08-22'), unitPrice: 1500, amount: 1500 },
      { deliveryNo: 'CER-1', shipDate: new Date('2026-08-21'), unitPrice: 1800, amount: 1800 },
    ]

    const groups = groupRowsByFeed(rows, bookings)

    expect(groups).toHaveLength(2)
    const cement = groups.find((g) => g.feed === 'Cement')!
    const ceramic = groups.find((g) => g.feed === 'Ceramic')!
    expect(cement.qty).toBe(2)
    expect(cement.amount).toBe(3000)
    expect(cement.dateLabel).toBe('21/08/2569 - 22/08/2569')
    expect(ceramic.qty).toBe(1)
    expect(ceramic.amount).toBe(1800)
    expect(ceramic.dateLabel).toBe('21/08/2569') // วันเดียว ไม่แสดงเป็นช่วง
  })

  it('single-day group does not repeat the date as a range', () => {
    const bookings = [makeBooking({ docNo: 'B-1', category: 'ceramics' })]
    const rows = [{ deliveryNo: 'B-1', shipDate: new Date('2026-08-21'), unitPrice: 1800, amount: 1800 }]

    const [group] = groupRowsByFeed(rows, bookings)
    expect(group.dateLabel).toBe('21/08/2569')
  })

  it('returns an empty array (fallback signal) when any row cannot be traced back to a booking', () => {
    const bookings = [makeBooking({ docNo: 'B-1', category: 'cements' })]
    const rows = [
      { deliveryNo: 'B-1', shipDate: new Date('2026-08-21'), unitPrice: 1500, amount: 1500 },
      { unitPrice: 500, amount: 500 }, // แถวกรอกเอง ไม่มี deliveryNo
    ]
    expect(groupRowsByFeed(rows, bookings)).toEqual([])
  })

  it('a Billing Note that only contains one Feed (post Round-B guard) always yields exactly one group', () => {
    const bookings = [
      makeBooking({ docNo: 'B-1', category: 'cements' }),
      makeBooking({ docNo: 'B-2', category: 'cements' }),
    ]
    const rows = [
      { deliveryNo: 'B-1', shipDate: new Date('2026-08-21'), unitPrice: 1500, amount: 1500 },
      { deliveryNo: 'B-2', shipDate: new Date('2026-08-21'), unitPrice: 1500, amount: 1500 },
    ]
    expect(groupRowsByFeed(rows, bookings)).toHaveLength(1)
  })
})
