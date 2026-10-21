import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useDriverPayrollDocumentsStore } from './driverPayrollDocuments'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

const delivered = {
  status: 'DELIVERED' as const,
  driverName: 'สมชาย ใจดี',
  allowance: 750,
  finalAllowance: 750,
  items: [makeJobItem()],
}

describe('updateDriverIncome — แก้รายได้คนขับของงานที่จบแล้ว', () => {
  it('งานที่คนขับจบจากแอป แก้เบี้ยเลี้ยง + เพิ่ม/ลดหนี้ได้ คำนวณสุทธิสูตรเดียวกับจบงาน', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...delivered })
    store.bookings.push(b)

    const result = store.updateDriverIncome(b.id, 800, [
      { id: 'a1', label: 'ค่าปรับ', amount: 100 },
      { id: 'a2', label: 'คืนเงิน', amount: -20 },
    ])

    expect(result.ok).toBe(true)
    expect(b.allowance).toBe(800)
    expect(b.finalAllowance).toBe(720)
    expect(b.debtAdjustments).toHaveLength(2)
    expect(b.status).toBe('DELIVERED')
  })

  it('งานที่ยังไม่จบ แก้ไม่ได้ และไม่แตะข้อมูล', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...delivered, status: 'IN_TRANSIT', finalAllowance: undefined })
    store.bookings.push(b)

    expect(store.updateDriverIncome(b.id, 900, []).ok).toBe(false)
    expect(b.allowance).toBe(750)
    expect(b.finalAllowance).toBeUndefined()
  })

  it('งานที่อยู่ในเอกสารรายได้คนขับแล้ว (จ่ายหรือยังไม่จ่าย) แก้ไม่ได้', () => {
    const store = useBookingStore()
    useDriverPayrollDocumentsStore().documents.push(
      { id: 'doc-paid', paymentStatus: 'PAID' } as never,
      { id: 'doc-unpaid', paymentStatus: 'UNPAID' } as never
    )
    const paid = makeBooking({ ...delivered, driverPayrollDocId: 'doc-paid' })
    const inDoc = makeBooking({ ...delivered, driverPayrollDocId: 'doc-unpaid' })
    store.bookings.push(paid, inDoc)

    expect(store.updateDriverIncome(paid.id, 900, []).ok).toBe(false)
    expect(store.driverIncomeEditBlockedReason(paid)).toContain('จ่ายรายได้')
    expect(store.updateDriverIncome(inDoc.id, 900, []).ok).toBe(false)
    expect(store.driverIncomeEditBlockedReason(inDoc)).toContain('เอกสารรายได้คนขับ')
    expect(paid.finalAllowance).toBe(750)
    expect(inDoc.finalAllowance).toBe(750)
  })

  it('เบี้ยเลี้ยงติดลบ = ไม่บันทึก', () => {
    const store = useBookingStore()
    const b = makeBooking({ ...delivered })
    store.bookings.push(b)

    expect(store.updateDriverIncome(b.id, -1, []).ok).toBe(false)
    expect(b.allowance).toBe(750)
  })
})
