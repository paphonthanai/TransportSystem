import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useFuelRateStore } from './fuelRates'
import { useVehiclesStore } from './vehicles'
import { makeBooking } from '../../tests/fixtures/booking'
import type { Vehicle } from '@/types'

beforeEach(() => {
  setActivePinia(createPinia())
})

const vehicle = (plate: string, department: Vehicle['department']) =>
  ({ id: `v-${plate}`, plate, plateProvince: 'สระบุรี', department }) as Vehicle

describe('เรทน้ำมันแยกตามประเภทรถ', () => {
  it('pricePerLiterFor ใช้เรทเฉพาะประเภท ถ้าไม่ได้ตั้งหรือเป็น 0 ใช้เรทกลาง', () => {
    const fuel = useFuelRateStore()
    fuel.settings.todayPricePerLiter = 36
    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 34.5, รถอู่เสริม: 0 }
    expect(fuel.pricePerLiterFor('รถร่วม')).toBe(34.5)
    expect(fuel.pricePerLiterFor('รถอู่เสริม')).toBe(36)
    expect(fuel.pricePerLiterFor('รถบริษัท')).toBe(36)
    expect(fuel.pricePerLiterFor(undefined)).toBe(36)
  })

  it('จ่ายงานแล้วอัปเดต fuelRate ตามประเภทของรถที่จัด', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    fuel.settings.todayPricePerLiter = 36
    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 34.5 }
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'), vehicle('70-2222', 'รถบริษัท'))
    const b1 = makeBooking({ status: 'WAITING_DISPATCH', fuelRate: 36 })
    const b2 = makeBooking({ status: 'WAITING_DISPATCH', fuelRate: 36 })
    bookingStore.bookings.push(b1, b2)

    bookingStore.dispatchBooking(b1.id, '70-1111 สระบุรี')
    bookingStore.dispatchBooking(b2.id, '70-2222 สระบุรี')

    expect(b1.fuelRate).toBe(34.5)
    expect(b2.fuelRate).toBe(36)
  })

  it('หลังรับน้ำมันแล้ว (FUEL_RECEIVED) เปลี่ยนรถไม่แก้เรทย้อนหลัง', () => {
    const bookingStore = useBookingStore()
    const fuel = useFuelRateStore()
    const vehicles = useVehiclesStore()
    fuel.settings.todayPricePerLiter = 36
    fuel.settings.pricePerLiterByVehicleType = { รถร่วม: 34.5 }
    vehicles.vehicles.push(vehicle('70-1111', 'รถร่วม'))
    const b = makeBooking({ status: 'FUEL_RECEIVED', fuelRate: 36, plate: '70-9999 สระบุรี' })
    bookingStore.bookings.push(b)

    bookingStore.dispatchBooking(b.id, '70-1111 สระบุรี')

    expect(b.fuelRate).toBe(36)
  })
})
