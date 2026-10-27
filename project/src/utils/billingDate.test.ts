import { describe, it, expect } from 'vitest'
import { billingDateOf, billingMonthKey, billingMonthLabel } from './bookingStatus'

describe('billingDateOf — วันที่ในเอกสารการเงิน', () => {
  it('ใช้วันที่ส่งของสำเร็จก่อนวันที่ลงงาน', () => {
    const d = billingDateOf({ completedAt: new Date(2026, 9, 27), shipDate: new Date(2026, 9, 25) })
    expect(d).toEqual(new Date(2026, 9, 27))
  })

  it('ยังไม่มีวันที่ส่งของสำเร็จ = ใช้วันที่ลงงาน / วันขึ้นสินค้า', () => {
    expect(billingDateOf({ shipDate: new Date(2026, 9, 25) })).toEqual(new Date(2026, 9, 25))
    expect(billingDateOf({ loadingDate: new Date(2026, 9, 24) })).toEqual(new Date(2026, 9, 24))
    expect(billingDateOf({})).toBeUndefined()
  })

  it('คีย์และชื่อเดือนสำหรับกรองรอบวางบิลรายเดือน', () => {
    const key = billingMonthKey({ completedAt: new Date(2026, 9, 31, 23, 0), shipDate: new Date(2026, 10, 1) })
    expect(key).toBe('2026-10')
    expect(billingMonthLabel(key)).toBe('ตุลาคม 2569')
    expect(billingMonthKey({})).toBe('')
  })
})
