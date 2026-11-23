import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import type { Booking } from '@/types'

beforeEach(() => {
  setActivePinia(createPinia())
})

const job = (docNo: string, day: number, over: Partial<Booking> = {}) =>
  makeBooking({ docNo, customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', shipDate: new Date(2026, 9, day), tripFee: 1000, vatRate: 7, items: [makeJobItem()], ...over })

function setup() {
  const bookings = useBookingStore()
  const docs = useSalesDocumentsStore()
  const a = job('A', 5)
  const b = job('B', 6)
  const c = job('C', 7)
  bookings.bookings.push(a, b, c)
  const billing = docs.createBillingFromBookings([a.id])!
  return { bookings, docs, a, b, c, billing }
}

describe('เพิ่มรายการวางบิลเข้าใบเดิมแล้วบันทึกทับทันที (appendBookingsToBilling)', () => {
  it('ต่อแถวงานใหม่ท้ายแถวเดิม claim งาน รวมยอด/VAT และสรุปหัวเอกสารใหม่', () => {
    const { docs, a, b, c, billing } = setup()
    const updated = docs.appendBookingsToBilling(billing.id, [b.id, c.id])

    expect(updated?.id).toBe(billing.id)
    expect(updated?.bookingIds).toEqual([a.id, b.id, c.id])
    expect(b.billingNoteDocId).toBe(billing.id)
    expect(c.billingNoteDocId).toBe(billing.id)
    expect(docs.itemsForDocument(billing.id).map((i) => i.deliveryNo)).toEqual(['A', 'B', 'C'])
    expect(updated?.amount).toBe(3000)
    expect(updated?.vatAmount).toBe(210)
    expect(updated?.description).toContain('จำนวน 3 เที่ยว')
    expect(updated?.reference).toBe('A, B, C')
  })

  it('งานคนละลูกค้า/คนละ Feed/ถูกวางบิลแล้ว/ยังไม่จบงาน เพิ่มไม่ได้ และไม่แตะเอกสาร', () => {
    const { bookings, docs, a, billing } = setup()
    const other = job('X', 7, { customer: 'ลูกค้า B' })
    const ceramic = job('Y', 7, { category: 'ceramics' })
    const claimed = job('Z', 7, { billingNoteDocId: 'doc-อื่น' })
    const transit = job('T', 7, { status: 'IN_TRANSIT' })
    bookings.bookings.push(other, ceramic, claimed, transit)
    for (const x of [other, ceramic, claimed, transit]) {
      expect(docs.appendBookingsToBilling(billing.id, [x.id])).toBeNull()
      expect(billing.bookingIds).toEqual([a.id])
      expect(docs.itemsForDocument(billing.id)).toHaveLength(1)
    }
    expect(claimed.billingNoteDocId).toBe('doc-อื่น')
  })

  it('ใบที่ออกใบกำกับภาษีแล้ว (งานในใบมีใบกำกับ หรือสถานะไม่ใช่รอวางบิล) เพิ่มไม่ได้', () => {
    const { docs, a, b, billing } = setup()
    a.taxInvoiceDocId = 'inv-1'
    expect(docs.appendBookingsToBilling(billing.id, [b.id])).toBeNull()
    a.taxInvoiceDocId = undefined
    billing.status = 'BILLED'
    expect(docs.appendBookingsToBilling(billing.id, [b.id])).toBeNull()
    expect(b.billingNoteDocId).toBeUndefined()
  })
})
