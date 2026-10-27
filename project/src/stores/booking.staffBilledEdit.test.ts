import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useAuthStore } from './auth'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import type { UserRole } from './users'

beforeEach(() => {
  setActivePinia(createPinia())
})

function loginAs(role: UserRole) {
  useAuthStore().profile = {
    id: 'uid-test',
    email: 'test@test.com',
    name: 'Test User',
    role,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const confirmed = {
  status: 'DELIVERED' as const,
  driverName: 'สมชาย ใจดี',
  tripFee: 3000,
  allowance: 750,
  finalAllowance: 750,
  completedAt: new Date(2026, 9, 27, 9, 0),
  podReviewStatus: 'APPROVED' as const,
  completionConfirmedAt: new Date(2026, 9, 27, 10, 0),
  items: [makeJobItem()],
}

describe('เสมียนแก้ค่าเที่ยว/เบี้ยเลี้ยง/วันที่ส่งของสำเร็จ ได้จนกว่างานจะถูกนำไปวางบิล', () => {
  it('งานที่ยืนยันการจบงานแล้วแต่ยังไม่วางบิล — เสมียนแก้ได้ทั้ง 3 อย่าง', () => {
    loginAs('STAFF')
    const store = useBookingStore()
    const b = makeBooking({ ...confirmed })
    store.bookings.push(b)

    expect(store.updateBookingPrice(b.id, { tripFee: 3200, agreedPrice: 3200 }).ok).toBe(true)
    expect(b.tripFee).toBe(3200)
    expect(store.updateDriverIncome(b.id, 800, []).ok).toBe(true)
    expect(b.allowance).toBe(800)
    const picked = new Date(2026, 9, 26, 9, 0)
    expect(store.updateCompletedAt(b.id, picked).ok).toBe(true)
    expect(b.completedAt).toEqual(picked)
  })

  it.each(['billingNoteDocId', 'taxInvoiceDocId', 'receiptDocId'] as const)('ถูกนำไปวางบิลแล้ว (%s) — เสมียนแก้ไม่ได้ ข้อมูลไม่เปลี่ยน', (field) => {
    loginAs('STAFF')
    const store = useBookingStore()
    const b = makeBooking({ ...confirmed, [field]: 'doc-1' })
    store.bookings.push(b)

    expect(store.updateBookingPrice(b.id, { tripFee: 3200, agreedPrice: 3200 }).ok).toBe(false)
    expect(store.updateDriverIncome(b.id, 800, []).ok).toBe(false)
    expect(store.updateCompletedAt(b.id, new Date(2026, 9, 26)).ok).toBe(false)
    expect(b.tripFee).toBe(3000)
    expect(b.allowance).toBe(750)
    expect(b.completedAt).toEqual(confirmed.completedAt)
  })

  it('ADMIN แก้ได้แม้วางบิลแล้ว', () => {
    loginAs('ADMIN')
    const store = useBookingStore()
    const b = makeBooking({ ...confirmed, billingNoteDocId: 'doc-1' })
    store.bookings.push(b)

    expect(store.updateBookingPrice(b.id, { tripFee: 3200, agreedPrice: 3200 }).ok).toBe(true)
    expect(store.updateCompletedAt(b.id, new Date(2026, 9, 26)).ok).toBe(true)
  })

  it('ค่าเที่ยวหลังจัดรถ: role อื่นที่ไม่ใช่ ADMIN/เสมียน ยังแก้ไม่ได้เหมือนเดิม', () => {
    loginAs('DISPATCHER')
    const store = useBookingStore()
    const b = makeBooking({ ...confirmed })
    store.bookings.push(b)

    expect(store.updateBookingPrice(b.id, { tripFee: 3200, agreedPrice: 3200 }).ok).toBe(false)
    expect(b.tripFee).toBe(3000)
  })
})

describe('updateBookingRefs — แก้เลขที่ PO ลูกค้า / เลขชิพเม้น จากหน้ารายละเอียดงาน', () => {
  it('เสมียนแก้ได้ก่อนวางบิล ค่าว่าง = ล้างค่า', () => {
    loginAs('STAFF')
    const store = useBookingStore()
    const b = makeBooking({ ...confirmed, reference: 'PO-1', shipmentNo: 'SH-1' })
    store.bookings.push(b)

    expect(store.updateBookingRefs(b.id, { reference: ' PO-2 ', shipmentNo: '' }).ok).toBe(true)
    expect(b.reference).toBe('PO-2')
    expect(b.shipmentNo).toBeUndefined()
  })

  it('เสมียนแก้ไม่ได้หลังวางบิล / บัญชีไม่มีสิทธิ์', () => {
    loginAs('STAFF')
    const store = useBookingStore()
    const b = makeBooking({ ...confirmed, reference: 'PO-1', billingNoteDocId: 'doc-1' })
    store.bookings.push(b)
    expect(store.updateBookingRefs(b.id, { reference: 'PO-2' }).ok).toBe(false)
    expect(b.reference).toBe('PO-1')

    loginAs('ACCOUNTING')
    const c = makeBooking({ ...confirmed, reference: 'PO-1' })
    store.bookings.push(c)
    expect(store.updateBookingRefs(c.id, { reference: 'PO-2' }).ok).toBe(false)
  })
})
