import { describe, it, expect } from 'vitest'
import { computeBookingMoney, summarizeBilledMoney } from './bookingMoney'
import type { VehicleType } from '@/types'

const base = {
  tripFee: 10000,
  allowance: 1000,
  fuelLiters: 50,
  fuelRate: 40,
  plate: '70-1111 สระบุรี',
}

describe('computeBookingMoney — ยอดขาย/ค่าแรง/ค่าน้ำมัน/รายจ่าย', () => {
  it('ยอดขาย = ยอดก่อน VAT หลังส่วนลด (ตรงกับใบวางบิล) ไม่รวม VAT', () => {
    const m = computeBookingMoney({ ...base, discountMode: 'percent', discountPercent: 10, vatRate: 7 }, 'รถบริษัท')
    expect(m.sales).toBe(9000)
  })

  it('ค่าแรงใช้ finalAllowance ก่อน allowance, ค่าน้ำมัน = ลิตร × เรท ปัด 2 ตำแหน่ง, รายจ่ายรวมสองอย่าง', () => {
    const m = computeBookingMoney({ ...base, finalAllowance: 950.5, fuelLiters: 33.333, fuelRate: 36.86 }, 'รถร่วม')
    expect(m.allowance).toBe(950.5)
    expect(m.fuelCost).toBe(1228.65)
    expect(m.expense).toBe(2179.15)
  })
})

describe('computeBookingMoney — รายได้บริษัทตามประเภทรถ', () => {
  it('รถบริษัท: ราคาเต็ม − 1% − (น้ำมัน + ค่าแรง)', () => {
    // 10000 − 100 − (50×40=2000 + 1000) = 6900
    expect(computeBookingMoney(base, 'รถบริษัท').companyIncome).toBe(6900)
  })
  it('รถหุ้นส่วน/รถอู่เสริม: (ราคาเต็ม − 1%) × 8%', () => {
    expect(computeBookingMoney(base, 'รถหุ้นส่วน').companyIncome).toBe(792) // 9900 × 0.08
    expect(computeBookingMoney(base, 'รถอู่เสริม').companyIncome).toBe(792)
  })
  it('รถร่วม: (ราคาเต็ม − 1%) × 10%', () => {
    expect(computeBookingMoney(base, 'รถร่วม').companyIncome).toBe(990)
  })
})

describe('computeBookingMoney — คิดรายได้บริษัทไม่ได้ (null + หมายเหตุ ห้ามนำไปคำนวณ)', () => {
  it('ยังไม่ได้ใส่ราคา', () => {
    const m = computeBookingMoney({ ...base, tripFee: 0 }, 'รถบริษัท')
    expect(m.companyIncome).toBeNull()
    expect(m.incomeNote).toContain('ยังไม่ได้ใส่ราคา')
  })
  it('ไม่มีทะเบียนรถ', () => {
    const m = computeBookingMoney({ ...base, plate: undefined }, undefined)
    expect(m.companyIncome).toBeNull()
    expect(m.incomeNote).toContain('ยังไม่มีทะเบียนรถ')
  })
  it('หารถไม่เจอในทะเบียนรถ', () => {
    const m = computeBookingMoney(base, undefined)
    expect(m.companyIncome).toBeNull()
    expect(m.incomeNote).toContain('ไม่พบรถทะเบียน')
  })
  it.each(['รถร่วมใน', 'รถร่วมนอก'] as VehicleType[])('ประเภทแบบเก่า %s', (t) => {
    const m = computeBookingMoney(base, t)
    expect(m.companyIncome).toBeNull()
    expect(m.incomeNote).toContain(t)
  })
  it.each(['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม'] as VehicleType[])('%s: มีลิตรน้ำมันแต่เรทน้ำมันเป็น 0 → คิดไม่ได้', (t) => {
    const m = computeBookingMoney({ ...base, fuelRate: 0 }, t)
    expect(m.companyIncome).toBeNull()
    expect(m.incomeNote).toContain('เรทน้ำมัน')
  })
  it('ช่องน้ำมันจาก Excel อ่านไม่ได้ (fuelUnreadable) → คิดไม่ได้ ไม่เดาเป็นลิตร 0', () => {
    const m = computeBookingMoney({ ...base, fuelLiters: 0, fuelRate: 0, fuelUnreadable: true } as never, 'รถบริษัท')
    expect(m.companyIncome).toBeNull()
    expect(m.incomeNote).toContain('อ่านค่าน้ำมันจาก Excel ไม่ได้')
  })
  it('เบี้ยเลี้ยง = 0 คิดเงินได้ปกติ (ค่าแรง 0)', () => {
    const m = computeBookingMoney({ ...base, allowance: 0, finalAllowance: undefined }, 'รถบริษัท')
    expect(m.allowance).toBe(0)
    expect(m.companyIncome).toBe(7900) // 10000 − 1% − (2000 + 0)
  })
  it('ลิตรน้ำมัน = 0 คิดเงินได้ปกติ ค่าน้ำมัน 0 และไม่ต้องมีเรท', () => {
    const m = computeBookingMoney({ ...base, fuelLiters: 0, fuelRate: 0 }, 'รถบริษัท')
    expect(m.fuelCost).toBe(0)
    expect(m.companyIncome).toBe(8900) // 10000 − 1% − (0 + 1000)
  })
  it('ตัวเลขดิบของงาน (ยอดขาย/รายจ่าย) ยังคำนวณให้ดูได้ แต่รายได้เป็น null เพื่อให้ผู้เรียกข้ามงานนี้ทั้งหมด', () => {
    const m = computeBookingMoney(base, undefined)
    expect(m.sales).toBe(10000)
    expect(m.expense).toBe(3000)
    expect(m.companyIncome).toBeNull()
  })
})

describe('summarizeBilledMoney', () => {
  const now = new Date('2026-10-15T00:00:00')
  const typeOf = (plate: string): VehicleType | undefined => ({ '70-1111 สระบุรี': 'รถร่วม' as VehicleType })[plate]
  const job = (over: Record<string, unknown>) => ({ ...base, status: 'DELIVERED' as const, billingNoteDocId: 'doc1', completedAt: new Date('2026-10-02'), ...over })

  it('นับทุกงานที่ DELIVERED ตั้งแต่ปิดงาน ไม่ต้องรอวางบิล แต่ไม่นับงานที่ยังไม่จบ', () => {
    const s = summarizeBilledMoney(
      [job({}), job({ billingNoteDocId: undefined }), job({ status: 'IN_TRANSIT' as const })] as never,
      typeOf,
      now
    )
    expect(s.totals.sales).toBe(20000)
    expect(s.totals.companyIncome).toBe(1980)
  })

  it('ค่าเที่ยว = 0 → ไม่นับงานนั้นเลย (รวมเบี้ยเลี้ยง/น้ำมันที่มี) ส่วนเบี้ยเลี้ยง/ลิตร = 0 นับได้ปกติ', () => {
    const s = summarizeBilledMoney(
      [job({ tripFee: 0 }), job({ allowance: 0 }), job({ fuelLiters: 0, fuelRate: 0 }), job({ fuelRate: 0 })] as never,
      typeOf,
      now
    )
    expect(s.uncomputableCount).toBe(2) // ค่าเที่ยว 0 และมีลิตรแต่ไม่มีเรท
    expect(s.totals.sales).toBe(20000)
    expect(s.totals.expense).toBe(2000 + 1000) // งาน allowance=0: น้ำมัน 2000 / งานลิตร=0: ค่าแรง 1000
  })

  it('งานที่ยังไม่ได้ใส่ราคา คิดไม่ได้ ไม่ถูกนับเลย (ไม่ทำให้รายได้ติดลบ) จนกว่าจะใส่ราคา', () => {
    const s = summarizeBilledMoney([job({ tripFee: 0, plate: '70-1111 สระบุรี' })] as never, () => 'รถบริษัท', now)
    expect(s.uncomputableCount).toBe(1)
    expect(s.totals).toEqual({ sales: 0, expense: 0, companyIncome: 0 })
  })

  it('จัดเดือนตามวันที่ส่งของเสร็จ (เดือนปัจจุบันเป็นช่องสุดท้าย) และข้ามงานที่เก่ากว่า 12 เดือนจากกราฟแต่ยังอยู่ในยอดรวม', () => {
    const s = summarizeBilledMoney(
      [job({ completedAt: new Date('2026-10-02') }), job({ completedAt: new Date('2026-09-20') }), job({ completedAt: new Date('2025-01-05') })] as never,
      typeOf,
      now
    )
    expect(s.monthly.sales[11]).toBe(10000)
    expect(s.monthly.sales[10]).toBe(10000)
    expect(s.monthly.sales.reduce((a, b) => a + b, 0)).toBe(20000)
    expect(s.totals.sales).toBe(30000)
  })

  it('งานที่คิดรายได้ไม่ได้ ไม่ถูกนับในยอดขาย/รายจ่าย/รายได้บริษัท ทั้งยอดรวมและกราฟรายเดือน มีแค่จำนวนไว้เตือน', () => {
    const s = summarizeBilledMoney([job({}), job({ plate: '99-9999 ที่อื่น' })] as never, typeOf, now)
    expect(s.uncomputableCount).toBe(1)
    expect(s.totals.sales).toBe(10000)
    expect(s.totals.expense).toBe(3000)
    expect(s.totals.companyIncome).toBe(990)
    expect(s.monthly.sales[11]).toBe(10000)
    expect(s.monthly.expense[11]).toBe(3000)
  })
})
