import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('รูปตอนขึ้นสินค้า/ส่งของ (ไม่บังคับ)', () => {
  it('deliverJobItem เก็บรูปสินค้าตอนลงและรูปใบส่งของได้พร้อมกัน', () => {
    const store = useBookingStore()
    const item = makeJobItem()
    const b = makeBooking({ status: 'IN_TRANSIT', items: [item] })
    store.bookings.push(b)

    store.deliverJobItem(b.id, item.id, 'https://x/goods.jpg', 'สมชาย', 'https://x/note.jpg')

    expect(item.podImage).toBe('https://x/goods.jpg')
    expect(item.deliveryNoteImage).toBe('https://x/note.jpg')
    expect(item.deliveryStatus).toBe('DELIVERED')
  })

  it('ส่งของได้แม้ไม่มีรูปเลย (ไม่บังคับ)', () => {
    const store = useBookingStore()
    const item = makeJobItem()
    const b = makeBooking({ status: 'IN_TRANSIT', items: [item] })
    store.bookings.push(b)

    store.deliverJobItem(b.id, item.id, undefined, 'สมชาย')

    expect(item.deliveryStatus).toBe('DELIVERED')
    expect(item.podImage).toBeUndefined()
    expect(item.deliveryNoteImage).toBeUndefined()
  })

  it('ออฟฟิศแนบรูปใบส่งของทีหลังได้เฉพาะจุดที่ส่งแล้ว', () => {
    const store = useBookingStore()
    const delivered = makeJobItem({ deliveryStatus: 'DELIVERED' })
    const pending = makeJobItem()
    const b = makeBooking({ status: 'DELIVERING', items: [delivered, pending] })
    store.bookings.push(b)

    store.setDeliveryNoteImage(b.id, delivered.id, 'https://x/n.jpg')
    store.setDeliveryNoteImage(b.id, pending.id, 'https://x/n2.jpg')

    expect(delivered.deliveryNoteImage).toBe('https://x/n.jpg')
    expect(pending.deliveryNoteImage).toBeUndefined()
  })

  it('setLoadingImage เก็บรูปแต่ไม่เปลี่ยนสถานะงาน', () => {
    const store = useBookingStore()
    const b = makeBooking({ status: 'LOADING' })
    store.bookings.push(b)

    store.setLoadingImage(b.id, 'https://x/load.jpg')

    expect(b.loadingImage).toBe('https://x/load.jpg')
    expect(b.status).toBe('LOADING')
  })
})
