import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useFuelRateStore } from './fuelRates'
import { useVehiclesStore } from './vehicles'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import type { Vehicle } from '@/types'

beforeEach(() => {
  setActivePinia(createPinia())
})

const vehicle = (plate: string, department: Vehicle['department']) =>
  ({ id: `v-${plate}`, plate, plateProvince: 'สระบุรี', department }) as Vehicle

const NOTE_PREFIX = 'เรทน้ำมัน: '

describe('เรทน้ำมันแยกตามประเภทรถ (ไม่มีเรทกลางแล้ว)', () => {
  it('fuelRateFor ใช้เรทของประเภทนั้น ไม่รู้ประเภท/ไม่ได้ตั้ง/ตั้งเป็น 0 = เรท 0 พร้อมสาเหตุ', () => {
    const fuel = useFuelRateStore()
    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 34.5, รถอู่เสริม: 0 }

    expect(fuel.fuelRateFor('รถร่วม')).toEqual({ rate: 34.5 })
    expect(fuel.fuelRateFor('รถอู่เสริม').rate).toBe(0)
    expect(fuel.fuelRateFor('รถอู่เสริม').reason).toContain('รถอู่เสริม')
    expect(fuel.fuelRateFor('รถบริษัท').rate).toBe(0)
    expect(fuel.fuelRateFor(undefined).rate).toBe(0)
    expect(fuel.fuelRateFor(undefined).reason).toContain('ยังไม่ทราบประเภทรถ')
  })

  it('จ่ายงานแล้วตั้ง fuelRate ตามประเภทของรถที่จัด และลบหมายเหตุสาเหตุเมื่อรู้เรทแล้ว', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 34.5 }
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'), vehicle('70-2222', 'รถบริษัท'))
    const b1 = makeBooking({ status: 'WAITING_DISPATCH', note: 'ติดต่อหน้างานก่อน | เรทน้ำมัน: ยังไม่ทราบประเภทรถ' })
    const b2 = makeBooking({ status: 'WAITING_DISPATCH' })
    bookingStore.bookings.push(b1, b2)

    bookingStore.dispatchBooking(b1.id, '70-1111 สระบุรี')
    bookingStore.dispatchBooking(b2.id, '70-2222 สระบุรี')

    expect(b1.fuelRate).toBe(34.5)
    expect(b1.note).toBe('ติดต่อหน้างานก่อน') // หมายเหตุที่ผู้ใช้พิมพ์เองอยู่ครบ ท่อนสาเหตุหายไป
    expect(b2.fuelRate).toBe(0) // รถบริษัทยังไม่ได้ตั้งเรท = ไม่มีเรท ไม่ใช่เรทกลาง
    expect(b2.note).toContain(NOTE_PREFIX + 'ยังไม่ได้ตั้งเรทน้ำมันของรถบริษัท')
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
    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 34.5 }
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const b = makeBooking({ status: 'FUEL_RECEIVED', fuelRate: 36, plate: '70-9999 สระบุรี' })
    bookingStore.bookings.push(b)

    bookingStore.dispatchBooking(b.id, '70-1111 สระบุรี')

    expect(b.fuelRate).toBe(36)
  })

  it('resyncFuelRates คำนวณเรทใหม่ให้ทุกงานที่มีทะเบียน รวมงาน DELIVERED แต่ข้ามงานที่ไม่มีทะเบียน', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const open = makeBooking({ status: 'ACCEPTED', fuelRate: 36.83, plate: '70-1111 สระบุรี' })
    const closed = makeBooking({ status: 'DELIVERED', fuelRate: 36.83, plate: '70-1111 สระบุรี' })
    const noPlate = makeBooking({ status: 'WAITING_DISPATCH', fuelRate: 36.83, plate: undefined })
    bookingStore.bookings.push(open, closed, noPlate)

    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 41.61 }
    bookingStore.resyncFuelRates()

    expect(open.fuelRate).toBe(41.61)
    expect(closed.fuelRate).toBe(41.61)
    expect(noPlate.fuelRate).toBe(36.83) // ไม่มีทะเบียน = ไม่รู้ประเภทรถ ข้าม (รอจ่ายงาน)
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
