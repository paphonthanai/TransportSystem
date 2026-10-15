import { describe, it, expect } from 'vitest'
import { bangkokDay, lookupFuelPrice } from './fuelPrice'

describe('bangkokDay', () => {
  it('แปลงเป็นวันตามเวลาไทย ไม่ขึ้นกับ timezone เครื่อง', () => {
    expect(bangkokDay('2026-09-24T17:00:00.000Z')).toBe('2026-09-25')
    expect(bangkokDay(new Date('2026-09-24T16:59:59Z'))).toBe('2026-09-24')
  })
  it('ค่าว่าง/ไม่ถูกต้อง = undefined', () => {
    expect(bangkokDay(undefined)).toBeUndefined()
    expect(bangkokDay('')).toBeUndefined()
    expect(bangkokDay('not-a-date')).toBeUndefined()
  })
})

describe('lookupFuelPrice', () => {
  const history = [
    { date: '2026-10-03', prices: { รถร่วม: 37.52 } },
    { date: '2026-09-24', prices: { รถร่วม: 36.83, รถบริษัท: 36.83 } },
    { date: '2026-10-10', prices: { รถร่วม: 0 } }, // 0 = ไม่ได้ตั้ง ไม่ใช่ราคา
  ]
  it('เลือกรายการล่าสุดที่ไม่เกินวันที่ แม้เรียงลำดับในอาร์เรย์สลับกัน', () => {
    expect(lookupFuelPrice(history, 'รถร่วม', '2026-10-15')).toEqual({ rate: 37.52, priceDate: '2026-10-03' })
    expect(lookupFuelPrice(history, 'รถร่วม', '2026-09-30')).toEqual({ rate: 36.83, priceDate: '2026-09-24' })
  })
  it('ราคาของประเภทรถอื่นไม่ถูกยืมมาใช้', () => {
    expect(lookupFuelPrice(history, 'รถบริษัท', '2026-10-15')).toEqual({ rate: 36.83, priceDate: '2026-09-24' })
    expect(lookupFuelPrice(history, 'รถหุ้นส่วน', '2026-10-15').rate).toBe(0)
  })
  it('ไม่ใช้ราคาที่ประกาศหลังวันของงาน', () => {
    const r = lookupFuelPrice(history, 'รถร่วม', '2026-09-01')
    expect(r.rate).toBe(0)
    expect(r.reason).toContain('2026-09-01')
  })
  it('ไม่มีประวัติเลย = เรท 0', () => {
    expect(lookupFuelPrice(undefined, 'รถร่วม', '2026-10-15').rate).toBe(0)
  })
})
