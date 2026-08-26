import { describe, it, expect } from 'vitest'
import { nextPickup, nextDelivery } from './driverJobs'
import { makeJobItem } from '../../tests/fixtures/booking'

/** Phase E.1 Test 1 — Sequential Pickup: Driver ต้องเห็นทีละจุดตามลำดับใน array (C -> B -> A ในตัวอย่างของ PM
 *  หมายถึง "ตามลำดับที่ปรากฏใน items[]" ไม่ใช่ลำดับตายตัวจาก field อื่น — ดู Step 1 inspection) */
describe('nextPickup — Sequential Pickup', () => {
  it('shows only the first not-yet-picked-up item, in array order — never more than one at a time', () => {
    const c = makeJobItem({ id: 'c' })
    const b = makeJobItem({ id: 'b' })
    const a = makeJobItem({ id: 'a' })
    const items = [c, b, a] // ลำดับใน array = ลำดับรับสินค้า C -> B -> A ตามตัวอย่างของ PM

    expect(nextPickup(items)?.id).toBe('c')

    c.pickupStatus = 'PICKED_UP'
    expect(nextPickup(items)?.id).toBe('b')

    b.pickupStatus = 'PICKED_UP'
    expect(nextPickup(items)?.id).toBe('a')

    a.pickupStatus = 'PICKED_UP'
    expect(nextPickup(items)).toBeNull()
  })

  it('returns null immediately when there are no items', () => {
    expect(nextPickup([])).toBeNull()
  })
})

/** Phase E.1 Test 2 — Sequential Delivery: ต้องเห็นทีละจุดตาม deliverySequence (คำนวณย้อนกลับจากลำดับรับ
 *  A -> B -> C เมื่อรับ C -> B -> A ตามตัวอย่างของ PM — สอดคล้องกับ deliverySequence = maxPickupSeq - pickupSequence
 *  ที่ pickupJobItem คำนวณไว้แล้วเดิม ไม่ต้องแก้ store logic เลย) */
describe('nextDelivery — Sequential Delivery', () => {
  it('shows only the first not-yet-delivered item, ordered by deliverySequence — never more than one at a time', () => {
    // จำลองผลลัพธ์ของ pickupJobItem หลังรับครบ C(seq0) -> B(seq1) -> A(seq2): deliverySequence ย้อนกลับ = A(0), B(1), C(2)
    const a = makeJobItem({ id: 'a', deliverySequence: 0 })
    const b = makeJobItem({ id: 'b', deliverySequence: 1 })
    const c = makeJobItem({ id: 'c', deliverySequence: 2 })
    const items = [c, b, a] // ลำดับใน array ไม่สำคัญ — nextDelivery ต้องเรียงตาม deliverySequence เสมอ

    expect(nextDelivery(items)?.id).toBe('a')

    a.deliveryStatus = 'DELIVERED'
    expect(nextDelivery(items)?.id).toBe('b')

    b.deliveryStatus = 'DELIVERED'
    expect(nextDelivery(items)?.id).toBe('c')

    c.deliveryStatus = 'DELIVERED'
    expect(nextDelivery(items)).toBeNull()
  })
})
