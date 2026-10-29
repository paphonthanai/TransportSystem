import { describe, it, expect } from 'vitest'
import { loadingTimeOf } from './loadingTime'

describe('loadingTimeOf', () => {
  it('ใช้เวลาของจุดส่งก่อน ไม่มีค่อยใช้ของทั้งงาน', () => {
    expect(loadingTimeOf({ loadingTime: '08:00' }, { loadingTime: '10:30' })).toBe('10:30')
    expect(loadingTimeOf({ loadingTime: '08:00' }, {})).toBe('08:00')
    expect(loadingTimeOf({})).toBe('')
  })
})
