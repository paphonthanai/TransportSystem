import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useAuthStore } from './auth'
import { useVehiclesStore } from './vehicles'
import { useVehicleIncomeDocumentsStore } from './vehicleIncomeDocuments'
import { vehicleIncomeDocumentRepository } from '@/repositories/vehicleIncomeDocumentRepository'
import { makeBooking } from '../../tests/fixtures/booking'
import type { UserRole } from './users'
import type { Vehicle } from '@/types'

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

const jobOf = (overrides: Record<string, unknown> = {}) =>
  makeBooking({ status: 'DELIVERED', plate: '70-1234 กรุงเทพมหานคร', tripFee: 3000, fuelLiters: 50, fuelRate: 30, ...overrides })

async function setup() {
  const docs = useVehicleIncomeDocumentsStore()
  await vi.waitFor(() => expect(docs.loading).toBe(false))
  // รอ fetchBookings รอบแรก (ยิงตอนสร้าง store เพราะ login แล้ว) โหลดเสร็จก่อน ไม่งั้นมันจะเขียนทับงานที่ push เข้าไปทีหลัง
  await vi.waitFor(() => expect(useBookingStore().bookingsLoading).toBe(false))
  await vi.waitFor(() => expect(useVehiclesStore().loading).toBe(false))
  useVehiclesStore().vehicles.push({ id: 'veh-1', plate: '70-1234', plateProvince: 'กรุงเทพมหานคร' } as Vehicle)
  return { docs, bookings: useBookingStore() }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('รายได้รถร่วม — ค่าน้ำมัน/ค่าใช้จ่ายประจำรถกรอกเองต่องาน', () => {
  it('ยอดเอกสารรวมจากค่าที่กรอกเอง ไม่ใช้ลิตร × เรทอัตโนมัติ (ยังไม่กรอก = 0) และเก็บยอดต่องานไว้ใน lines', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const b = jobOf({ tripFee: 2000 })
    bookings.bookings.push(a, b)

    expect(docs.updateVendorCosts(a.id, { fuelCost: 1200.5, vehicleExpense: 300 }).ok).toBe(true)
    const result = await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10')

    expect(result.ok).toBe(true)
    const doc = result.doc!
    expect(doc.tripIncomeTotal).toBe(5000)
    expect(doc.fuelCostTotal).toBe(1200.5)
    expect(doc.vehicleExpenseTotal).toBe(300)
    expect(doc.netTotal).toBe(3499.5)
    expect(doc.lines).toEqual([
      { bookingId: a.id, tripFee: 3000, fuelCost: 1200.5, vehicleExpense: 300 },
      { bookingId: b.id, tripFee: 2000, fuelCost: 0, vehicleExpense: 0 },
    ])
    expect(a.vehicleIncomeDocId).toBe(doc.id)
    expect(a.fuelLiters).toBe(50)
    expect(bookings.logs.some((l) => l.action.startsWith('แก้ยอดรถร่วม'))).toBe(true)
  })

  it('ค่าติดลบ/ไม่ใช่ตัวเลข/ไม่ใช่ ADMIN = ไม่บันทึก', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect(docs.updateVendorCosts(a.id, { fuelCost: -1 }).ok).toBe(false)
    expect(docs.updateVendorCosts(a.id, { vehicleExpense: Number.NaN }).ok).toBe(false)
    loginAs('DISPATCHER')
    expect(docs.updateVendorCosts(a.id, { fuelCost: 100 }).ok).toBe(false)
    expect(a.vendorFuelCost).toBeUndefined()
  })

  it('ออกเอกสารแล้ว ล็อกค่าน้ำมัน/ค่าใช้จ่ายประจำรถ/ค่าเที่ยว — ยกเลิกเอกสารแล้วปลดล็อกคืน', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')).doc!

    expect(docs.updateVendorCosts(a.id, { fuelCost: 999 }).ok).toBe(false)
    expect(bookings.updateBookingPrice(a.id, { tripFee: 1 }).ok).toBe(false)
    expect(a.tripFee).toBe(3000)

    expect((await docs.cancelVehicleIncomeDocument(doc.id)).ok).toBe(true)
    expect(a.vehicleIncomeDocId).toBeUndefined()
    expect(docs.updateVendorCosts(a.id, { fuelCost: 999 }).ok).toBe(true)
    expect(bookings.updateBookingPrice(a.id, { tripFee: 3100 }).ok).toBe(true)
  })

  it('บันทึกเอกสารไม่สำเร็จ = ไม่ผูกงาน / ไม่ใช่ ADMIN สร้างหรือยกเลิกไม่ได้', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    vi.spyOn(vehicleIncomeDocumentRepository, 'set').mockRejectedValueOnce(new Error('denied'))
    expect((await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBeUndefined()

    const second = await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')
    expect(second.message).toBeUndefined()
    const doc = second.doc!
    loginAs('STAFF')
    expect((await docs.cancelVehicleIncomeDocument(doc.id)).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBe(doc.id)
    expect((await docs.createVehicleIncomeDocument('veh-1', [jobOf().id], '2026-10')).ok).toBe(false)
  })

  it('ปลดล็อกงานที่ค้างป้ายแต่ไม่มีเอกสารรายได้รถจริง', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const orphan = jobOf({ vehicleIncomeDocId: 'vhic-missing' })
    bookings.bookings.push(orphan)
    expect(docs.releaseOrphanedBooking(orphan.id).ok).toBe(true)
    expect(orphan.vehicleIncomeDocId).toBeUndefined()
  })
})

describe('สิทธิ์แต่ละ role — เอกสารรายได้รถร่วม', () => {
  it('ฝ่ายบัญชี (ACCOUNTING) แก้ยอดรถร่วม/สร้าง/ยกเลิกเอกสารได้', async () => {
    loginAs('ACCOUNTING')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect(docs.canManage()).toBe(true)
    expect(docs.updateVendorCosts(a.id, { fuelCost: 500, vehicleExpense: 100 }).ok).toBe(true)
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')).doc!
    expect(doc.netTotal).toBe(2400)
    expect((await docs.cancelVehicleIncomeDocument(doc.id)).ok).toBe(true)
    expect(a.vehicleIncomeDocId).toBeUndefined()
  })

  it.each(['DISPATCHER', 'STAFF', 'DRIVER'] as UserRole[])('%s แก้ยอด/สร้างเอกสารไม่ได้', async (role) => {
    loginAs(role)
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect(docs.canManage()).toBe(false)
    expect(docs.updateVendorCosts(a.id, { fuelCost: 500 }).ok).toBe(false)
    expect((await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBeUndefined()
  })
})
