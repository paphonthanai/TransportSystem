import { describe, it, expect } from 'vitest'
import { insertRowsByDate } from './billingRowOrder'

const row = (name: string, date?: string) => ({ name, shipDate: date ? new Date(date) : undefined })
const names = (rows: { name: string }[]) => rows.map((r) => r.name)

describe('insertRowsByDate — งานที่ติ๊กเพิ่มเข้าใบวางบิลเรียงตามวันที่', () => {
  const base = [row('a', '2026-11-14'), row('c', '2026-11-16'), row('e', '2026-11-18')]

  it('แทรกตามวันที่ ไม่ต่อท้าย', () => {
    expect(names(insertRowsByDate(base, [row('d', '2026-11-17'), row('b', '2026-11-15')]))).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('เก่ากว่าทุกแถวไปหัว ใหม่กว่าทุกแถวไปท้าย', () => {
    expect(names(insertRowsByDate(base, [row('z', '2026-11-20'), row('0', '2026-11-01')]))).toEqual(['0', 'a', 'c', 'e', 'z'])
  })

  it('วันที่เท่ากันต่อหลังแถวเดิม, ไม่มีวันที่ไปท้าย, ไม่แก้ array เดิม', () => {
    const out = insertRowsByDate(base, [row('c2', '2026-11-16'), row('x')])
    expect(names(out)).toEqual(['a', 'c', 'c2', 'e', 'x'])
    expect(names(base)).toEqual(['a', 'c', 'e'])
  })

  it('แถวกรอกเองที่ไม่มีวันที่อยู่ตำแหน่งเดิม', () => {
    const withManual = [row('a', '2026-11-14'), row('manual'), row('e', '2026-11-18')]
    expect(names(insertRowsByDate(withManual, [row('c', '2026-11-16')]))).toEqual(['a', 'manual', 'c', 'e'])
  })
})
