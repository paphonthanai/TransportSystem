import { describe, it, expect } from 'vitest'
import { matchesBookingSearch } from './bookingSearch'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

const b = makeBooking({
  docNo: 'BK-2569-0001',
  reference: 'PO-778899',
  shipmentNo: 'SH12345',
  customer: 'บริษัท วินน์ พีค',
  plate: '72-2837 สระบุรี',
  driverName: 'นายสุรพรชัย เกตุรังษี',
  items: [makeJobItem({ siteName: 'อาคารดูแลผู้สูงอายุ', province: 'แพร่', district: 'เมืองแพร่', siteContactName: 'k.พรชัย', sitePhone: '0818744689' })],
})

describe('matchesBookingSearch', () => {
  it('คำค้นว่าง = ผ่านทุกงาน', () => {
    expect(matchesBookingSearch(b, '  ')).toBe(true)
  })

  it('ค้นคนขับ / ชื่อเล่นที่ส่งเข้ามา', () => {
    expect(matchesBookingSearch(b, 'สุรพรชัย')).toBe(true)
    expect(matchesBookingSearch(b, 'เอก', ['เอก'])).toBe(true)
    expect(matchesBookingSearch(b, 'สมศักดิ์')).toBe(false)
  })

  it('ค้นเลขชิพเม้น / เลข PO ลูกค้า / หน้างาน', () => {
    expect(matchesBookingSearch(b, 'sh12345')).toBe(true)
    expect(matchesBookingSearch(b, 'PO-778899')).toBe(true)
    expect(matchesBookingSearch(b, 'ผู้สูงอายุ')).toBe(true)
  })

  it('หลายคำ = ต้องเจอทุกคำ', () => {
    expect(matchesBookingSearch(b, 'สุรพรชัย แพร่')).toBe(true)
    expect(matchesBookingSearch(b, 'สุรพรชัย เชียงใหม่')).toBe(false)
  })

  it('เบอร์โทรค้นได้ทั้งมีและไม่มีขีด', () => {
    expect(matchesBookingSearch(b, '081-874-4689')).toBe(true)
    expect(matchesBookingSearch(b, '8744689')).toBe(true)
  })
})
