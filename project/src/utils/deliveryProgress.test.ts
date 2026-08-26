import { describe, it, expect } from 'vitest'
import { deliveryProgress } from './deliveryProgress'
import { makeJobItem } from '../../tests/fixtures/booking'

describe('deliveryProgress', () => {
  it('counts total/completed/remaining from deliveryStatus directly', () => {
    const items = [
      makeJobItem({ deliveryStatus: 'DELIVERED' }),
      makeJobItem({ deliveryStatus: 'DELIVERED' }),
      makeJobItem(), // undefined = PENDING
    ]
    expect(deliveryProgress(items)).toEqual({ total: 3, completed: 2, remaining: 1 })
  })

  it('reflects reality after a Reset/reassignment without needing any new field — still reads plain deliveryStatus', () => {
    // จำลอง state หลัง Reset/เปลี่ยนคนขับ (Phase E premise: Booking เดิมยังเป็น Source of Truth เดียว)
    const items = [makeJobItem({ deliveryStatus: 'DELIVERED' }), makeJobItem({ deliveryStatus: 'DELIVERED' }), makeJobItem()]
    expect(deliveryProgress(items)).toEqual({ total: 3, completed: 2, remaining: 1 })
  })

  it('all delivered: remaining is 0', () => {
    const items = [makeJobItem({ deliveryStatus: 'DELIVERED' }), makeJobItem({ deliveryStatus: 'DELIVERED' })]
    expect(deliveryProgress(items)).toEqual({ total: 2, completed: 2, remaining: 0 })
  })

  it('empty items: all zero', () => {
    expect(deliveryProgress([])).toEqual({ total: 0, completed: 0, remaining: 0 })
  })
})
