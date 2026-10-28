import { describe, it, expect } from 'vitest'
import { matchesSearchFields } from './searchFields'

const row = ['27/10/2569', 'BL202610-0001', 'บริษัท วินน์ พีค', 'WPI', '฿3,250.00', 'รอวางบิล']

describe('matchesSearchFields', () => {
  it('คำค้นว่าง = ผ่าน', () => {
    expect(matchesSearchFields('', row)).toBe(true)
  })

  it('ค้นได้ทุกคอลัมน์ที่ส่งเข้ามา', () => {
    expect(matchesSearchFields('27/10/2569', row)).toBe(true)
    expect(matchesSearchFields('bl202610', row)).toBe(true)
    expect(matchesSearchFields('วินน์', row)).toBe(true)
    expect(matchesSearchFields('รอวางบิล', row)).toBe(true)
    expect(matchesSearchFields('ชำระแล้ว', row)).toBe(false)
  })

  it('ยอดเงินพิมพ์มี/ไม่มีจุลภาคก็ได้', () => {
    expect(matchesSearchFields('3,250', row)).toBe(true)
    expect(matchesSearchFields('3250', row)).toBe(true)
  })

  it('หลายคำ = ต้องเจอทุกคำ', () => {
    expect(matchesSearchFields('วินน์ รอวางบิล', row)).toBe(true)
    expect(matchesSearchFields('วินน์ ชำระแล้ว', row)).toBe(false)
  })
})
