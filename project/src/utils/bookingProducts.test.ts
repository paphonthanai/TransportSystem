import { describe, it, expect } from 'vitest'
import { bookingProductNames, bookingProductsText, bookingProductTotals } from './bookingProducts'
import { makeJobItem } from '../../tests/fixtures/booking'

describe('สินค้าหลายชนิดในเที่ยวเดียว', () => {
  it('รวมสินค้าหลัก + extraProducts ทุกตัว แสดงชื่อทุกชนิด ไม่มีจำนวนตัน', () => {
    const b = { items: [makeJobItem({ product: 'M500', qty: 5, unit: 'ตัน', extraProducts: [{ product: 'M400', qty: 3, unit: 'ตัน' }, { product: 'M200', qty: 2, unit: 'ตัน' }] })] }
    expect(bookingProductNames(b)).toEqual(['M500', 'M400', 'M200'])
    expect(bookingProductsText(b)).toBe('M500 + M400 + M200')
  })

  it('ชนิดเดียวแสดงแค่ชื่อเหมือนเดิม — หลายปลายทางชนิดเดียวกันรวมจำนวน', () => {
    const b = { items: [makeJobItem({ product: 'M300', qty: 5, unit: 'ตัน' }), makeJobItem({ product: 'M300', qty: 5, unit: 'ตัน' })] }
    expect(bookingProductsText(b)).toBe('M300')
    expect(bookingProductTotals(b)).toEqual([{ product: 'M300', qty: 10, unit: 'ตัน' }])
  })

  it('extraProducts ไม่มีหน่วยใช้หน่วยของรายการหลัก, ไม่มีจำนวนแสดงแค่ชื่อ, ชื่อว่างข้าม', () => {
    const b = { items: [makeJobItem({ product: '13', qty: 1.85, unit: 'ตัน', extraProducts: [{ product: '23', qty: 1.1, unit: '' }, { product: '52', qty: 0, unit: 'ตัน' }, { product: ' ', qty: 1, unit: 'ตัน' }] })] }
    expect(bookingProductsText(b)).toBe('13 + 23 + 52')
  })
})
