import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFuelRateStore } from './fuelRates'

beforeEach(() => {
  setActivePinia(createPinia())
})

/** ลูกค้าตั้งอำเภอเดียวกันไว้ 2 พิกัดคนละเรท: "บางพลี" 43 ล. กับ "AP บางพลี" 40 ล. — findRate ต้องคืนแถวของตัวเองเสมอ
 *  ไม่ว่า "AP บางพลี" จะอยู่ลำดับก่อนใน array หรือไม่ (เดิมจับคู่แบบ includes แล้วหยิบแถวแรก ทำให้ "บางพลี" ได้ 40) */
describe('findRate — district matching is exact (normalized), province stays loose', () => {
  const seed = (rates: { province: string; district: string; liters: number }[]) => {
    const fuel = useFuelRateStore()
    fuel.settings.rates = rates
    return fuel
  }

  it('plain "บางพลี" gets its own rate even when "AP บางพลี" is listed first', () => {
    const fuel = seed([
      { province: 'สมุทรปราการ', district: 'AP บางพลี', liters: 40 },
      { province: 'สมุทรปราการ', district: 'บางพลี', liters: 43 },
    ])
    expect(fuel.findRate('สมุทรปราการ', 'บางพลี')?.liters).toBe(43)
    expect(fuel.findRate('สมุทรปราการ', 'AP บางพลี')?.liters).toBe(40)
  })

  it('result does not depend on array order', () => {
    const fuel = seed([
      { province: 'สมุทรปราการ', district: 'บางพลี', liters: 43 },
      { province: 'สมุทรปราการ', district: 'AP บางพลี', liters: 40 },
    ])
    expect(fuel.findRate('สมุทรปราการ', 'บางพลี')?.liters).toBe(43)
    expect(fuel.findRate('สมุทรปราการ', 'AP บางพลี')?.liters).toBe(40)
  })

  it('ignores surrounding/repeated whitespace and letter case', () => {
    const fuel = seed([{ province: 'สมุทรปราการ', district: 'AP บางพลี', liters: 40 }])
    expect(fuel.findRate('สมุทรปราการ', '  AP   บางพลี ')?.liters).toBe(40)
    expect(fuel.findRate('สมุทรปราการ', 'ap บางพลี')?.liters).toBe(40)
  })

  it('returns null (no guessing) when only "AP บางพลี" is configured but "บางพลี" is asked', () => {
    const fuel = seed([{ province: 'สมุทรปราการ', district: 'AP บางพลี', liters: 40 }])
    expect(fuel.findRate('สมุทรปราการ', 'บางพลี')).toBeNull()
  })

  it('province is still matched loosely (e.g. "จ.สมุทรปราการ")', () => {
    const fuel = seed([{ province: 'สมุทรปราการ', district: 'บางพลี', liters: 43 }])
    expect(fuel.findRate('จ.สมุทรปราการ', 'บางพลี')?.liters).toBe(43)
  })

  it('empty province or district returns null', () => {
    const fuel = seed([{ province: 'สมุทรปราการ', district: 'บางพลี', liters: 43 }])
    expect(fuel.findRate('', 'บางพลี')).toBeNull()
    expect(fuel.findRate('สมุทรปราการ', '   ')).toBeNull()
  })
})
