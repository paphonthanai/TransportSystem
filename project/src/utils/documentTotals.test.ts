import { describe, it, expect } from 'vitest'
import { computeRowDiscountBaht, computeRowAmount, computeRowVat, computeRowWht } from './documentTotals'
import { bahtText } from './companyInfo'

describe('computeRowDiscountBaht', () => {
  it('percent mode: discounts a percentage of qty*unitPrice', () => {
    const row = { qty: 2, unitPrice: 1000, discountMode: 'percent' as const, discountPercent: 10 }
    expect(computeRowDiscountBaht(row)).toBe(200) // 2*1000*10%
  })

  it('fixed mode: discounts the fixed baht amount', () => {
    const row = { qty: 2, unitPrice: 1000, discountMode: 'fixed' as const, discountAmount: 300 }
    expect(computeRowDiscountBaht(row)).toBe(300)
  })

  it('fixed mode: caps the discount at the row subtotal (cannot go negative)', () => {
    const row = { qty: 1, unitPrice: 100, discountMode: 'fixed' as const, discountAmount: 9999 }
    expect(computeRowDiscountBaht(row)).toBe(100)
  })

  it('no discount fields: returns 0', () => {
    expect(computeRowDiscountBaht({ qty: 3, unitPrice: 500 })).toBe(0)
  })
})

describe('computeRowAmount', () => {
  it('subtracts the discount from qty*unitPrice', () => {
    const row = { qty: 5, unitPrice: 100, discountMode: 'percent' as const, discountPercent: 20 }
    expect(computeRowAmount(row)).toBe(400) // 500 - 20%
  })
})

describe('computeRowVat', () => {
  it('computes VAT on the post-discount amount, not the raw subtotal', () => {
    const row = { qty: 1, unitPrice: 1000, discountMode: 'percent' as const, discountPercent: 10, vatRate: 7 }
    // amount after discount = 900, vat = 900*7% = 63
    expect(computeRowVat(row)).toBeCloseTo(63)
  })

  it('vatRate undefined: no VAT', () => {
    expect(computeRowVat({ qty: 1, unitPrice: 100 })).toBe(0)
  })
})

describe('computeRowWht', () => {
  it('computes WHT on the post-discount amount', () => {
    const row = { qty: 1, unitPrice: 1000, whtRate: 3 }
    expect(computeRowWht(row)).toBeCloseTo(30)
  })
})

describe('bahtText', () => {
  it('whole baht amount uses "ถ้วน" (no satang words)', () => {
    expect(bahtText(3000)).toBe('สามพันบาทถ้วน')
  })

  it('amount with satang spells out the satang portion', () => {
    expect(bahtText(1926.5)).toContain('ห้าสิบสตางค์')
  })

  it('undefined/zero amount does not throw', () => {
    expect(() => bahtText(0)).not.toThrow()
  })
})
