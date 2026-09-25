import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

/** งาน import จาก Excel (ก่อนแก้บั๊ก BookingView.vue's confirmImport) เซ็ตแค่ loadingDate ไม่เคยเซ็ต shipDate เลย
 *  ทำให้หน้าเลือกวางบิล/ใบวางบิล/ใบกำกับภาษีของงานเหล่านี้ขึ้น "วันที่ส่งงาน" เป็น "-" และช่วงวันที่ในคำอธิบาย
 *  รายการว่างเปล่า — ต้อง fallback ไปใช้ loadingDate ทุกจุดที่อ่าน shipDate เพื่อไม่ให้ข้อมูล production เดิม
 *  (ที่สร้างไปแล้วก่อนแก้บั๊กต้นตอ) ยังคงว่างเปล่าอยู่ */
describe('shipDate fallback ไปใช้ loadingDate สำหรับงาน import เก่าที่ไม่มี shipDate', () => {
  it('createBillingFromBookings ใช้ loadingDate เป็น dateFrom/dateTo และใส่ในคำอธิบายเมื่อ booking ไม่มี shipDate', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const loadingDate = new Date('2026-09-10')
    const booking = makeBooking({ customer: 'ลูกค้า A', status: 'DELIVERED', shipDate: undefined, loadingDate })
    bookingStore.bookings.push(booking)

    const billing = salesDocs.createBillingFromBookings([booking.id])!

    expect(billing.dateFrom).toBe(loadingDate)
    expect(billing.dateTo).toBe(loadingDate)
    expect(billing.description).not.toContain('- จำนวน')
  })

  it('บรรทัดรายการของเอกสาร (billingRowsFromBookings) ได้ shipDate จาก loadingDate เมื่อ booking ไม่มี shipDate', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const loadingDate = new Date('2026-09-12')
    const booking = makeBooking({ customer: 'ลูกค้า B', status: 'DELIVERED', shipDate: undefined, loadingDate })
    bookingStore.bookings.push(booking)

    const billing = salesDocs.createBillingFromBookings([booking.id])!
    const row = salesDocs.items.find((i) => i.documentId === billing.id)

    expect(row?.shipDate).toBe(loadingDate)
  })

  it('ใช้ shipDate ตรงๆ เมื่อ booking มี shipDate อยู่แล้ว (ไม่ทับด้วย loadingDate)', () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const shipDate = new Date('2026-09-15')
    const loadingDate = new Date('2026-09-01')
    const booking = makeBooking({ customer: 'ลูกค้า C', status: 'DELIVERED', shipDate, loadingDate })
    bookingStore.bookings.push(booking)

    const billing = salesDocs.createBillingFromBookings([booking.id])!

    expect(billing.dateFrom).toBe(shipDate)
    expect(billing.dateTo).toBe(shipDate)
  })
})
