import { describe, it, expect } from 'vitest'
import { compareByTrip, resolveTripNumber, nextTripSequence, validateTripSequences } from './tripSequence'

const b = (id: string, tripSequence: number | undefined, t: number) => ({ id, tripSequence, createdAt: new Date(t) })

describe('tripSequence', () => {
  it('เที่ยวที่มีเลขมาก่อน ไม่ขึ้นกับลำดับเวลาจ่ายงาน (จ่ายเที่ยว 2 ก่อนก็ยังเป็นรองเที่ยว 1)', () => {
    const t2 = b('t2', 2, 1000)
    const t1 = b('t1', 1, 2000)
    expect([t2, t1].sort(compareByTrip).map((x) => x.id)).toEqual(['t1', 't2'])
  })
  it('งานเก่าไม่มีเลข fallback ตามเวลาเดิม และตามหลังงานที่มีเลข', () => {
    const old1 = b('o1', undefined, 1)
    const old2 = b('o2', undefined, 2)
    const n = b('n', 1, 99)
    expect([old2, old1, n].sort(compareByTrip).map((x) => x.id)).toEqual(['n', 'o1', 'o2'])
  })
  it('resolveTripNumber ใช้ tripSequence ก่อน ไม่มีค่อยนับตามลำดับ', () => {
    const list = [b('a', undefined, 1), b('c', undefined, 2)]
    expect(resolveTripNumber(list[1], list)).toBe(2)
    expect(resolveTripNumber(b('x', 5, 1), list)).toBe(5)
  })
  it('nextTripSequence = สูงสุด+1 (ว่าง = 1)', () => {
    expect(nextTripSequence([])).toBe(1)
    expect(nextTripSequence([b('a', 1, 1), b('b', 3, 2)])).toBe(4)
    expect(nextTripSequence([b('a', undefined, 1), b('b', undefined, 2)])).toBe(3)
  })
  it('validateTripSequences จับเลขซ้ำ/ข้ามเลข ต่อคนขับ', () => {
    const r = validateTripSequences([
      { key: 'ก', tripSequence: 1 },
      { key: 'ก', tripSequence: 1 },
      { key: 'ข', tripSequence: 1 },
      { key: 'ข', tripSequence: 3 },
      { key: 'ค', tripSequence: 1 },
      { key: 'ค', tripSequence: 2 },
    ])
    expect(r['ก'][0]).toContain('ซ้ำ')
    expect(r['ข'][0]).toContain('ไม่ต่อเนื่อง')
    expect(r['ค']).toBeUndefined()
  })
})
