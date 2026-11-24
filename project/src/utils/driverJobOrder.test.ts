import { describe, it, expect } from 'vitest'
import { compareDriverJobs } from './driverJobOrder'

const job = (id: string, status: string, tripSequence?: number) => ({ id, status, tripSequence }) as any

describe('ลำดับงานที่ได้รับมอบหมาย (แอปคนขับ)', () => {
  it('งานที่ทำอยู่ เที่ยว 1-2 ขึ้นก่อน งานรอตอบรับไว้ล่าง (เดิม: เที่ยว 1, เที่ยว 1, เที่ยว 2, เที่ยว 2)', () => {
    const jobs = [job('a1', 'ASSIGNED', 1), job('w1', 'IN_TRANSIT', 1), job('a2', 'ASSIGNED', 2), job('w2', 'ACCEPTED', 2)]
    expect([...jobs].sort(compareDriverJobs).map((j) => j.id)).toEqual(['w1', 'w2', 'a1', 'a2'])
  })

  it('งานไม่มีเลขเที่ยวอยู่ท้ายกลุ่มของตัวเอง', () => {
    const jobs = [job('a', 'ASSIGNED'), job('x', 'LOADING'), job('y', 'ACCEPTED', 1), job('b', 'ASSIGNED', 1)]
    expect([...jobs].sort(compareDriverJobs).map((j) => j.id)).toEqual(['y', 'x', 'b', 'a'])
  })
})
