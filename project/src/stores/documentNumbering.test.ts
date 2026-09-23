import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useSalesDocumentsStore } from './salesDocuments'
import { makeBooking } from '../../tests/fixtures/booking'

/** เลขที่เอกสารทุกชนิด (Booking.docNo, ใบเสนอราคา/ใบสั่งสินค้า/ใบวางบิล/ใบกำกับภาษี/ใบเสร็จ) ต้องใช้กฎเดียวกัน:
 *  {prefix}{ปีเดือนวันที่ออก 8 หลัก}{เลขรัน 4 หลัก} หาเลขรันน้อยที่สุดที่ยังไม่มีเอกสารถือครองอยู่ "ในปีเดียวกัน" เท่านั้น
 *  (ไม่ใช่ตัวนับเดินหน้าทั้งระบบแบบเดิม) รีเซ็ตกลับเป็น 0001 ทุกครั้งที่ขึ้นปีใหม่ — ตามที่ยืนยันกับผู้ใช้ */
beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Booking.docNo (nextDocNo)', () => {
  it('ออกเลขรูปแบบ ปีเดือนวันที่ออก + เลขรัน 4 หลัก เริ่มที่ 0001', () => {
    vi.setSystemTime(new Date(2026, 8, 23)) // 23 กันยายน 2026
    const bookingStore = useBookingStore()
    expect(bookingStore.nextDocNo('cements')).toBe('CM202609230001')
  })

  it('เลขรันเดินต่อเนื่องภายในวันเดียวกัน ไม่ชนกับงานที่มีอยู่แล้ว', () => {
    vi.setSystemTime(new Date(2026, 8, 23))
    const bookingStore = useBookingStore()
    bookingStore.bookings.push(makeBooking({ category: 'cements', docNo: 'CM202609230001' }))
    expect(bookingStore.nextDocNo('cements')).toBe('CM202609230002')
  })

  it('รีเซ็ตกลับเป็น 0001 เมื่อขึ้นปีใหม่ แม้ปีก่อนจะออกเลขไปมากแล้วก็ตาม', () => {
    const bookingStore = useBookingStore()
    bookingStore.bookings.push(makeBooking({ category: 'cements', docNo: 'CM202512310099' }))
    vi.setSystemTime(new Date(2026, 0, 2)) // 2 มกราคม 2569(ค.ศ.2026) — ปีใหม่
    expect(bookingStore.nextDocNo('cements')).toBe('CM202601020001')
  })

  it('เลขที่ถูกแก้ไขเองด้วยมือ (ไม่ตรง pattern อัตโนมัติ) ไม่ไปรบกวนการนับเลขรันต่อไป', () => {
    vi.setSystemTime(new Date(2026, 8, 23))
    const bookingStore = useBookingStore()
    bookingStore.bookings.push(makeBooking({ category: 'cements', docNo: 'CM-กรอกเอง-999' }))
    expect(bookingStore.nextDocNo('cements')).toBe('CM202609230001')
  })
})

describe('เลขที่เอกสารขาย (nextFreeSequence ผ่าน createSalesOrderForBooking)', () => {
  it('ออกเลขรัน 0001 ในปีปัจจุบัน แม้ปีก่อนจะมีเอกสารเลขรันเดิมค้างอยู่ (พิสูจน์ scope แยกตามปี ไม่ใช่ global ตลอดกาลแบบเดิม)', () => {
    vi.setSystemTime(new Date(2025, 5, 1))
    const salesDocs = useSalesDocumentsStore()
    const lastYearOrder = salesDocs.createSalesOrderForBooking({ bookingId: 'b-last-year', customer: 'ลูกค้าเก่า', amount: 1000, items: [] })
    expect(lastYearOrder.number).toMatch(/^SO202506010001$/)

    vi.setSystemTime(new Date(2026, 8, 23))
    const thisYearOrder = salesDocs.createSalesOrderForBooking({ bookingId: 'b-this-year', customer: 'ลูกค้าใหม่', amount: 2000, items: [] })
    expect(thisYearOrder.number).toBe('SO202609230001')
  })
})
