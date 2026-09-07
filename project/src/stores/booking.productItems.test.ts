import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useSalesDocumentsStore } from './salesDocuments'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

/**
 * Task: Refactor Booking Structure — Separate Product / Destination / Job Information
 * Product ต้องแยกจาก Destination เสมอ (คนละ field), productId ไม่บังคับ unique ภายใน Booking,
 * และไม่มี merge/deduplicate/sum qty ของ Item ที่มี productId ซ้ำกัน — ทดสอบเฉพาะข้อมูล/field ไม่แตะ
 * Sales Document accounting model, Stock/Inventory, Driver App, หรือ Zero-item rule เลย
 */
describe('JobItem.productId — Product/Destination separation', () => {
  it('1. a JobItem can carry productId', () => {
    const item = makeJobItem({ productId: 'P001', product: 'AP-WA12 Pleno Town' })
    expect(item.productId).toBe('P001')
  })

  it('2/3. the same productId can appear on multiple, independent items within one booking', () => {
    const item1 = makeJobItem({ id: 'item-1', productId: 'P001', product: 'AP-WA12 Pleno Town', qty: 13, unit: 'ตัน' })
    const item2 = makeJobItem({ id: 'item-2', productId: 'P001', product: 'AP-WA12 Pleno Town', qty: 13, unit: 'ตัน' })
    const booking = makeBooking({ items: [item1, item2] })

    expect(booking.items).toHaveLength(2)
    expect(booking.items[0].productId).toBe(booking.items[1].productId)
    expect(booking.items[0].id).not.toBe(booking.items[1].id)
  })

  it('4/5. items sharing a productId are never merged, and their qty is never summed', () => {
    const item1 = makeJobItem({ id: 'item-1', productId: 'P001', qty: 13, unit: 'ตัน' })
    const item2 = makeJobItem({ id: 'item-2', productId: 'P001', qty: 13, unit: 'ตัน' })
    const booking = makeBooking({ items: [item1, item2] })

    expect(booking.items).toHaveLength(2)
    expect(booking.items.map((i) => i.qty)).toEqual([13, 13])
  })

  it('6/7. product and siteName are distinct fields — siteName is never written into product', () => {
    const item = makeJobItem({ product: 'AP-WA12 Pleno Town', siteName: 'เทพารักษ์-บางพลี' })
    expect(item.product).toBe('AP-WA12 Pleno Town')
    expect(item.siteName).toBe('เทพารักษ์-บางพลี')
    expect(item.product).not.toContain(item.siteName)
    expect(item.siteName).not.toContain(item.product)
  })

  it('8. product + siteName can be composed together for display without mutating storage', () => {
    const item = makeJobItem({ product: 'AP-WA12 Pleno Town', siteName: 'เทพารักษ์-บางพลี' })
    const displayLabel = `${item.product} ${item.siteName}`

    expect(displayLabel).toBe('AP-WA12 Pleno Town เทพารักษ์-บางพลี')
    expect(item.product).toBe('AP-WA12 Pleno Town')
    expect(item.siteName).toBe('เทพารักษ์-บางพลี')
  })

  it('9. a booking supports multiple distinct product items', () => {
    const booking = makeBooking({
      items: [
        makeJobItem({ id: 'item-1', productId: 'P001', product: 'สินค้า A', qty: 10 }),
        makeJobItem({ id: 'item-2', productId: 'P002', product: 'สินค้า B', qty: 5 }),
      ],
    })

    expect(booking.items).toHaveLength(2)
    expect(new Set(booking.items.map((i) => i.productId))).toEqual(new Set(['P001', 'P002']))
  })

  it('10. legacy items without productId still work (product string fallback, no field forced)', () => {
    const legacyItem = makeJobItem({ product: 'สินค้าเดิม', qty: 7, unit: 'ตัน' })
    expect(legacyItem.productId).toBeUndefined()
    expect(legacyItem.product).toBe('สินค้าเดิม')
  })

  it('11/12. Booking-level loadingDate/loadingTime remain independently readable/writable', () => {
    const booking = makeBooking({ loadingDate: new Date('2026-09-10'), loadingTime: '08:00' })
    expect(booking.loadingDate?.toISOString().slice(0, 10)).toBe('2026-09-10')
    expect(booking.loadingTime).toBe('08:00')
  })
})

/**
 * Regression guard: this task must NOT change the Sales Document accounting model.
 * A booking with multiple (even duplicate-productId) items must still collapse to exactly
 * ONE SalesDocumentItem ("1 Booking = 1 Trip"), never one row per product.
 */
describe('Sales Document accounting model — unchanged (1 Booking = 1 Trip = 1 SalesDocumentItem)', () => {
  it('13/14. a booking with multiple product items still produces exactly ONE SalesDocumentItem, not one per product', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const booking = makeBooking({
      customer: 'ลูกค้าทดสอบ',
      status: 'DELIVERED',
      tripFee: 1500,
      items: [
        makeJobItem({ id: 'item-1', productId: 'P001', product: 'AP-WA12 Pleno Town', siteName: 'เทพารักษ์-บางพลี', qty: 13, unit: 'ตัน' }),
        makeJobItem({ id: 'item-2', productId: 'P001', product: 'AP-WA12 Pleno Town', siteName: 'เทพารักษ์-บางพลี', qty: 13, unit: 'ตัน' }),
      ],
    })
    bookingStore.bookings.push(booking)

    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const billingItems = salesDocs.itemsForDocument(billing.id)

    expect(billingItems).toHaveLength(1)
    expect(billingItems[0].qty).toBe(1)
    expect(billingItems[0].unit).toBe('เที่ยว')
  })
})
