import { describe, it, expect } from 'vitest'
import { localDateFromInput, createdAtFromInput, toDateInputValue } from './dateRanges'

/** บั๊กจริง (เวลาไทย UTC+7): แก้งานที่ import แล้วกดบันทึก วันที่ขนส่ง/ลงสินค้าถอยไป 1 วัน (อ่านด้วย toISOString = UTC)
 *  และหน้าสร้างงานบันทึกเวลาสร้างเป็น 07:00 ทุกงาน งานใหม่ไปเรียงใต้งานที่ลงทีหลังในวันเดียวกัน */
describe('วันที่จากช่อง <input type="date"> ตามเวลาท้องถิ่น', () => {
  it('อ่านเป็นเที่ยงคืนเวลาท้องถิ่น แล้วแปลงกลับได้วันเดิม', () => {
    const d = localDateFromInput('2026-11-22')!
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 22, 0])
    expect(toDateInputValue(d)).toBe('2026-11-22')
  })

  it('งาน import (เที่ยงคืนเวลาท้องถิ่น) เปิดแก้แล้วบันทึกซ้ำ วันที่ไม่เลื่อน', () => {
    const imported = new Date(2026, 10, 22)
    let d: Date = imported
    for (let i = 0; i < 3; i++) d = localDateFromInput(toDateInputValue(d))!
    expect(d.getTime()).toBe(imported.getTime())
  })

  it('ค่าว่าง/ผิดรูปแบบ = undefined', () => {
    expect(localDateFromInput('')).toBeUndefined()
    expect(localDateFromInput('2026-02-30')).toBeUndefined()
  })

  it('วันที่ลงงาน = วันนี้ ใช้เวลาจริงตอนนี้ / วันอื่นใช้วันนั้นที่เวลาเดียวกับตอนนี้', () => {
    const now = new Date(2026, 10, 24, 15, 20, 5)
    expect(createdAtFromInput('2026-11-24', now)).toBe(now)
    expect(createdAtFromInput('2026-11-22', now)).toEqual(new Date(2026, 10, 22, 15, 20, 5))
    expect(createdAtFromInput('', now)).toBeUndefined()
  })

  it('ช่วงตี 1 เวลาไทย ค่าเริ่มต้นวันที่เป็นวันนี้ (ไม่ใช่เมื่อวานแบบ UTC)', () => {
    const lateNight = new Date(2026, 10, 24, 1, 0)
    expect(toDateInputValue(lateNight)).toBe('2026-11-24')
  })
})
