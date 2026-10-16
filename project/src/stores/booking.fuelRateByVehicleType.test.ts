import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useFuelRateStore } from './fuelRates'
import { useVehiclesStore } from './vehicles'
import { useDriverPaymentsStore } from './driverPayments'
import { useDriverPayrollDocumentsStore } from './driverPayrollDocuments'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import type { Vehicle } from '@/types'

beforeEach(() => {
  setActivePinia(createPinia())
})

const vehicle = (plate: string, department: Vehicle['department']) =>
  ({ id: `v-${plate}`, plate, plateProvince: 'สระบุรี', department }) as Vehicle

const NOTE_PREFIX = 'เรทน้ำมัน: '
const day = (d: string) => new Date(d + 'T00:00:00+07:00')

const history = [
  { date: '2026-09-24', prices: { รถร่วม: 36.83, รถบริษัท: 36.83 } },
  { date: '2026-10-03', prices: { รถร่วม: 37.52 } },
]

describe('เรทน้ำมันตามราคาประจำวัน + ประเภทรถ (ไม่มีเรทกลาง ไม่เขียนทับย้อนหลัง)', () => {
  it('fuelRateFor ใช้ราคาล่าสุดที่ไม่เกินวันที่ของงาน แยกตามประเภท ไม่มีราคา = เรท 0 พร้อมสาเหตุ', () => {
    const fuel = useFuelRateStore()
    fuel.settings.priceHistory = history

    expect(fuel.fuelRateFor('รถร่วม', '2026-09-30')).toEqual({ rate: 36.83, priceDate: '2026-09-24' })
    expect(fuel.fuelRateFor('รถร่วม', '2026-10-03')).toEqual({ rate: 37.52, priceDate: '2026-10-03' })
    // รถบริษัทไม่มีราคาใหม่ในวันที่ 3 ต.ค. = ใช้ราคาล่าสุดของประเภทตัวเอง (36.83) ไม่ใช่ของรถร่วม
    expect(fuel.fuelRateFor('รถบริษัท', '2026-10-05')).toEqual({ rate: 36.83, priceDate: '2026-09-24' })
    // ก่อนวันที่มีราคาแรก = ไม่เดา
    const before = fuel.fuelRateFor('รถร่วม', '2026-09-01')
    expect(before.rate).toBe(0)
    expect(before.reason).toContain('รถร่วม')
    expect(fuel.fuelRateFor('รถอู่เสริม', '2026-10-05').rate).toBe(0)
    expect(fuel.fuelRateFor(undefined, '2026-10-05').reason).toContain('ยังไม่ทราบประเภทรถ')
  })

  it('ใช้ราคาตามวันเวลาไทย (ISO UTC 17:00 = วันถัดไปของไทย)', () => {
    const fuel = useFuelRateStore()
    fuel.settings.priceHistory = history
    expect(fuel.fuelRateFor('รถร่วม', new Date('2026-10-02T17:00:00Z')).rate).toBe(37.52)
    expect(fuel.fuelRateFor('รถร่วม', new Date('2026-10-02T16:59:00Z')).rate).toBe(36.83)
  })

  it('จ่ายงานแล้วตั้ง fuelRate ตามประเภทรถ+วันที่สร้างงาน และลบหมายเหตุสาเหตุเมื่อรู้เรทแล้ว', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    fuel.settings.priceHistory = history
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'), vehicle('70-2222', 'รถอู่เสริม'))
    const b1 = makeBooking({ status: 'WAITING_DISPATCH', createdAt: day('2026-09-30'), note: 'ติดต่อหน้างานก่อน | เรทน้ำมัน: ยังไม่ทราบประเภทรถ' })
    const b2 = makeBooking({ status: 'WAITING_DISPATCH', createdAt: day('2026-10-05') })
    bookingStore.bookings.push(b1, b2)

    bookingStore.dispatchBooking(b1.id, '70-1111 สระบุรี')
    bookingStore.dispatchBooking(b2.id, '70-2222 สระบุรี')

    expect(b1.fuelRate).toBe(36.83) // ราคาของวันที่สร้างงาน 30 ก.ย. ไม่ใช่ราคาล่าสุด
    expect(b1.fuelRatePriceDate).toBe('2026-09-24')
    expect(b1.note).toBe('ติดต่อหน้างานก่อน') // หมายเหตุที่ผู้ใช้พิมพ์เองอยู่ครบ ท่อนสาเหตุหายไป
    expect(b2.fuelRate).toBe(0) // รถอู่เสริมยังไม่มีราคา = ไม่มีเรท ไม่ใช่เรทกลาง
    expect(b2.note).toContain(NOTE_PREFIX + 'ยังไม่มีราคาน้ำมันของรถอู่เสริม')
  })

  it('สร้างงาน (addBooking) ที่ยังไม่มีทะเบียน = เรท 0 + หมายเหตุสาเหตุ ไม่ซ้ำแม้เรียกซ้ำ', () => {
    const bookingStore = useBookingStore()
    const created = bookingStore.addBooking({ ...makeBooking({ fuelRate: 99, note: 'โน้ตเดิม', plate: undefined }) } as never)

    expect(created.fuelRate).toBe(0)
    expect(created.note).toBe('โน้ตเดิม | ' + NOTE_PREFIX + 'ยังไม่ทราบประเภทรถ (ยังไม่ได้จัดรถ/ไม่พบรถในทะเบียนรถ) จึงยังไม่มีเรทน้ำมัน')

    bookingStore.applyFuelRate(created)
    bookingStore.applyFuelRate(created)
    expect(created.note!.split(NOTE_PREFIX).length).toBe(2) // มีท่อนสาเหตุแค่ 1 ท่อน
  })

  it('หลังคนขับรับน้ำมันแล้ว (FUEL_RECEIVED) เปลี่ยนรถไม่แก้เรทย้อนหลัง', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    fuel.settings.priceHistory = history
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const b = makeBooking({ status: 'FUEL_RECEIVED', fuelRate: 36, plate: '70-9999 สระบุรี', createdAt: day('2026-10-05') })
    bookingStore.bookings.push(b)

    bookingStore.dispatchBooking(b.id, '70-1111 สระบุรี')

    expect(b.fuelRate).toBe(36)
  })

  it('repriceFuelRates คำนวณตามราคาของวันที่แต่ละงาน (รวมงาน DELIVERED) ไม่ทำให้งานวันอื่นเพี้ยน และไม่แตะงานที่กรอกเรทเอง/ไม่มีทะเบียน', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const sep = makeBooking({ status: 'DELIVERED', fuelRate: 43.11, fuelLiters: 40, plate: '70-1111 สระบุรี', createdAt: day('2026-09-25') })
    const oct = makeBooking({ status: 'DELIVERED', fuelRate: 43.11, fuelLiters: 40, plate: '70-1111 สระบุรี', createdAt: day('2026-10-05') })
    const early = makeBooking({ status: 'DELIVERED', fuelRate: 43.11, fuelLiters: 40, plate: '70-1111 สระบุรี', createdAt: day('2026-09-01') })
    const manual = makeBooking({ status: 'DELIVERED', fuelRate: 50, fuelRateManual: true, plate: '70-1111 สระบุรี', createdAt: day('2026-10-05') })
    const noPlate = makeBooking({ status: 'WAITING_DISPATCH', fuelRate: 36.83, plate: undefined })
    bookingStore.bookings.push(sep, oct, early, manual, noPlate)

    fuel.settings.priceHistory = history
    const summary = bookingStore.repriceFuelRates()

    expect(sep.fuelRate).toBe(36.83)
    expect(oct.fuelRate).toBe(37.52)
    expect(early.fuelRate).toBe(0) // ก่อนมีราคาแรก = ยังไม่มีเรท (คิดเงินไม่ได้จนกว่าจะมีราคา)
    expect(manual.fuelRate).toBe(50)
    expect(noPlate.fuelRate).toBe(36.83)
    expect(summary).toEqual({ updated: 3, noPrice: 1, manual: 1, paid: 0 })

    // แก้ราคาของวันที่ 3 ต.ค. แล้วคำนวณใหม่ — งานเดือน ก.ย. ต้องไม่ขยับ
    fuel.settings.priceHistory = [history[0], { date: '2026-10-03', prices: { รถร่วม: 38 } }]
    bookingStore.repriceFuelRates()
    expect(sep.fuelRate).toBe(36.83)
    expect(oct.fuelRate).toBe(38)
  })

  it('งานที่จ่ายคนขับแล้ว (เอกสารรายได้จ่ายแล้ว / รอบเดือนติ๊กจ่ายแล้ว) คงเรท ณ ตอนนั้น — เปลี่ยนราคาแล้วเปลี่ยนเฉพาะงานที่ยังไม่จ่าย', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    const docs = useDriverPayrollDocumentsStore()
    const payments = useDriverPaymentsStore()
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const base = { status: 'DELIVERED' as const, fuelRate: 30, fuelLiters: 40, plate: '70-1111 สระบุรี', createdAt: day('2026-10-05'), shipDate: day('2026-10-05') }
    const paidByDoc = makeBooking({ ...base, driverPayrollDocId: 'doc-paid' })
    const paidByMonth = makeBooking({ ...base, driverName: 'สมชาย ใจดี', driverFirstName: 'สมชาย', driverLastName: 'ใจดี' })
    const unpaidDoc = makeBooking({ ...base, driverPayrollDocId: 'doc-unpaid' })
    const unpaid = makeBooking({ ...base, driverName: 'สมหญิง รักดี', driverFirstName: 'สมหญิง', driverLastName: 'รักดี' })
    bookingStore.bookings.push(paidByDoc, paidByMonth, unpaidDoc, unpaid)
    docs.documents.push(
      { id: 'doc-paid', paymentStatus: 'PAID' } as never,
      { id: 'doc-unpaid', paymentStatus: 'UNPAID' } as never
    )
    payments.payments.push({ id: 'p1', driverName: 'สมชาย ใจดี', periodLabel: '2569-10', status: 'PAID', updatedAt: new Date() })

    fuel.settings.priceHistory = history
    const summary = bookingStore.repriceFuelRates()

    expect(paidByDoc.fuelRate).toBe(30)
    expect(paidByMonth.fuelRate).toBe(30)
    expect(unpaidDoc.fuelRate).toBe(37.52)
    expect(unpaid.fuelRate).toBe(37.52)
    expect(summary).toMatchObject({ updated: 2, paid: 2 })

    // ราคาเปลี่ยนอีกรอบ — งานที่จ่ายแล้วยังคงที่
    fuel.settings.priceHistory = [history[0], { date: '2026-10-03', prices: { รถร่วม: 40 } }]
    bookingStore.repriceFuelRates()
    expect(paidByDoc.fuelRate).toBe(30)
    expect(paidByMonth.fuelRate).toBe(30)
    expect(unpaid.fuelRate).toBe(40)
  })

  it('แก้เรทเองในหน้าแก้ไขงาน = ล็อกเรท (fuelRateManual) กรอก 0 = ปล่อยให้ระบบหาราคาตามวันใหม่', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    fuel.settings.priceHistory = history
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const b = makeBooking({ status: 'ACCEPTED', plate: '70-1111 สระบุรี', createdAt: day('2026-10-05'), fuelRate: 37.52 })
    bookingStore.bookings.push(b)

    bookingStore.updateBookingFull(b.id, { fuelRate: 40 })
    expect(b.fuelRate).toBe(40)
    expect(b.fuelRateManual).toBe(true)
    bookingStore.repriceFuelRates()
    expect(b.fuelRate).toBe(40)

    bookingStore.updateBookingFull(b.id, { fuelRate: 0 })
    expect(b.fuelRateManual).toBeUndefined()
    expect(b.fuelRate).toBe(37.52)
  })
})

/** ลิตรน้ำมัน: ยึดค่าที่ส่งมา (กรอกเอง/Excel) ไม่ทับด้วยมาตรฐานปลายทางอีกต่อไป (เดิมบังคับเป็นมาตรฐานเงียบๆ) */
describe('ลิตรน้ำมัน — ยึดค่าที่กรอก/Excel ไม่ทับด้วยมาตรฐาน', () => {
  const setupStandard = () => {
    const fuel = useFuelRateStore()
    fuel.settings.rates = [{ province: 'ชลบุรี', district: 'บางละมุง', liters: 67 }]
  }
  const item = () => makeJobItem({ province: 'ชลบุรี', district: 'บางละมุง' })

  it('addBooking เก็บลิตรจาก Excel ที่ต่างจากมาตรฐาน', () => {
    setupStandard()
    const created = useBookingStore().addBooking({ ...makeBooking({ items: [item()], fuelLiters: 40 }) } as never)
    expect(created.fuelLiters).toBe(40)
  })

  it('addBooking ไม่ส่งลิตรมา = ใช้มาตรฐาน, ไม่มีมาตรฐานเลย = 0', () => {
    setupStandard()
    const store = useBookingStore()
    const withStd = store.addBooking({ ...makeBooking({ items: [item()], fuelLiters: undefined }) } as never)
    expect(withStd.fuelLiters).toBe(67)
    const noStd = store.addBooking({ ...makeBooking({ items: [makeJobItem({ province: 'ที่อื่น', district: 'ที่ไหนสักแห่ง' })], fuelLiters: undefined }) } as never)
    expect(noStd.fuelLiters).toBe(0)
  })

  it('updateBookingFull เก็บลิตรที่ผู้ใช้แก้ แม้ปลายทางมีมาตรฐานครบ', () => {
    setupStandard()
    const store = useBookingStore()
    const b = makeBooking({ items: [item()], fuelLiters: 67 })
    store.bookings.push(b)

    store.updateBookingFull(b.id, { fuelLiters: 55 })

    expect(b.fuelLiters).toBe(55)
  })
})
