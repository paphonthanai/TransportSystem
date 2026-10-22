import { describe, it, expect } from 'vitest'
import { nextRunningCode } from './runningCode'

describe('nextRunningCode', () => {
  it('ไม่มีรหัสเลย = 0001', () => {
    expect(nextRunningCode([])).toBe('0001')
  })
  it('ใช้เลขมากสุด + 1 ไม่ใช่จำนวนรายการ + 1 (เคยลบ/ข้ามเลข)', () => {
    expect(nextRunningCode(['0002', '0005', '0003'])).toBe('0006')
  })
  it('คงคำนำหน้าและจำนวนหลัก ข้ามรหัสที่ไม่มีตัวเลข', () => {
    expect(nextRunningCode(['D009', 'D010', 'abc'])).toBe('D011')
    expect(nextRunningCode(['00031'])).toBe('00032')
  })
})
