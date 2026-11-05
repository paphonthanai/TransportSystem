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
  makeBooking({ docNo, customer: 'ลูกค้า A', category: 'cements', status: 'DELIVERED', shipDate: new Date(2026, 9, day), tripFee: 1000, items: [makeJobItem()], ...over })

function setup() {
  const bookings = useBookingStore()
  const docs = useSalesDocumentsStore()
  const a = job('A', 5)
  const b = job('B', 6)
  bookings.bookings.push(a, b)
  const billing = docs.createBillingFromBookings([a.id])!
  /** payload แบบที่หน้าฟอร์มส่ง: แถวเดิมทั้งหมด + แถวของงานใหม่ */
  const rowOf = (x: Booking) => ({ description: x.docNo, qty: 1, unit: 'เที่ยว', unitPrice: 1000, amount: 1000, deliveryNo: x.docNo })
  return { bookings, docs, a, b, billing, rowOf }
}

describe('ติ๊กเพิ่มงานเข้าใบวางบิลที่สร้างแล้ว (updateBillingManual)', () => {
  it('เพิ่มงานใหม่: claim งาน รวมยอด และสรุปหัวเอกสาร (จำนวนเที่ยว/ห้วงวันที่) ตามงานชุดใหม่', () => {
    const { docs, a, b, billing, rowOf } = setup()
    expect(billing.description).toContain('จำนวน 1 เที่ยว')

    const updated = docs.updateBillingManual(billing.id, {
      customer: 'ลูกค้า A',
      items: [rowOf(a), rowOf(b)],
      description: billing.description,
      reference: billing.reference,
      bookingIds: [b.id],
    })

    expect(updated?.bookingIds).toEqual([a.id, b.id])
    expect(b.billingNoteDocId).toBe(billing.id)
    expect(updated?.amount).toBe(2000)
    expect(updated?.description).toContain('จำนวน 2 เที่ยว')
    expect(updated?.description).toContain('05/10/69 - 06/10/69')
    expect(updated?.reference).toBe('A, B')
  })

  it('รายละเอียด/อ้างอิงที่ผู้ใช้พิมพ์เองไม่ถูกทับ', () => {
    const { docs, a, b, billing, rowOf } = setup()
    const updated = docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [rowOf(a), rowOf(b)], description: 'ค่าขนส่งเดือนตุลาคม', reference: 'PO-99', bookingIds: [b.id] })
    expect(updated?.description).toBe('ค่าขนส่งเดือนตุลาคม')
    expect(updated?.reference).toBe('PO-99')
  })

  it('งานคนละลูกค้า/คนละ Feed/ถูกวางบิลแล้ว เพิ่มไม่ได้ และไม่แตะเอกสารเลย', () => {
    const { bookings, docs, a, billing, rowOf } = setup()
    const other = job('C', 7, { customer: 'ลูกค้า B' })
    const ceramic = job('D', 7, { category: 'ceramics' })
    const claimed = job('E', 7, { billingNoteDocId: 'doc-อื่น' })
    bookings.bookings.push(other, ceramic, claimed)
    for (const x of [other, ceramic, claimed]) {
      expect(docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [rowOf(a), rowOf(x)], bookingIds: [x.id] })).toBeNull()
      expect(billing.bookingIds).toEqual([a.id])
    }
    expect(other.billingNoteDocId).toBeUndefined()
    expect(claimed.billingNoteDocId).toBe('doc-อื่น')
  })

  it('ใบที่ออกใบกำกับภาษีครบแล้ว (ไม่ใช่รอวางบิล) เพิ่มงานไม่ได้', () => {
    const { docs, a, b, billing, rowOf } = setup()
    billing.status = 'BILLED'
    expect(docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [rowOf(a), rowOf(b)], bookingIds: [b.id] })).toBeNull()
    expect(b.billingNoteDocId).toBeUndefined()
  })

  it('ลบแถวงานเดิมออก = คืนงานให้วางบิลใบอื่นได้ ส่วนงานที่ออกใบกำกับภาษีแล้วไม่ถูกปล่อย', () => {
    const { docs, a, b, billing, rowOf } = setup()
    docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [rowOf(a), rowOf(b)], bookingIds: [b.id] })

    const updated = docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [rowOf(a)], bookingIds: [] })
    expect(updated?.bookingIds).toEqual([a.id])
    expect(b.billingNoteDocId).toBeUndefined()

    a.taxInvoiceDocId = 'inv-1'
    docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [{ ...rowOf(b), deliveryNo: undefined }], bookingIds: [] })
    expect(a.billingNoteDocId).toBe(billing.id)
  })

  it('แก้ไขปกติ (ไม่ส่ง bookingIds, แถวไม่มีเลขใบขนส่ง) ไม่กระทบงานที่ผูกอยู่', () => {
    const { docs, a, billing } = setup()
    docs.updateBillingManual(billing.id, { customer: 'ลูกค้า A', items: [{ description: 'แก้ข้อความ', qty: 1, unit: 'เที่ยว', unitPrice: 1000, amount: 1000, deliveryNo: 'A' }] })
    expect(a.billingNoteDocId).toBe(billing.id)
    expect(billing.bookingIds).toEqual([a.id])
  })
})
