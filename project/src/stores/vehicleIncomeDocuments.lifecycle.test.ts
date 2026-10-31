import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useAuthStore } from './auth'
import { useVehiclesStore } from './vehicles'
import { useVehicleIncomeDocumentsStore, vendorFuelCostOf } from './vehicleIncomeDocuments'
import { useVehicleExpensesStore } from './vehicleExpenses'
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
  makeBooking({ status: 'DELIVERED', plate: '70-1234 กรุงเทพมหานคร', tripFee: 3000, fuelLiters: 0, fuelRate: 30, shipDate: new Date(2026, 9, 5), ...overrides })

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
  it('ค่าที่แก้เองทับค่าอัตโนมัติ, ไม่แก้ = ลิตร × เรท และเก็บยอดต่องานไว้ใน lines', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const b = jobOf({ tripFee: 2000, fuelLiters: 50 })
    bookings.bookings.push(a, b)

    expect(docs.updateVendorCosts(a.id, { fuelCost: 1200.5, vehicleExpense: 300 }).ok).toBe(true)
    const result = await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10')

    expect(result.ok).toBe(true)
    const doc = result.doc!
    expect(doc.tripIncomeTotal).toBe(5000)
    expect(doc.fuelCostTotal).toBe(2700.5)
    expect(doc.vehicleExpenseTotal).toBe(300)
    expect(doc.netTotal).toBe(1999.5)
    expect(doc.lines).toEqual([
      { bookingId: a.id, tripFee: 3000, fuelCost: 1200.5, vehicleExpense: 300, allowance: 0 },
      { bookingId: b.id, tripFee: 2000, fuelCost: 1500, vehicleExpense: 0, allowance: 0 },
    ])
    expect(a.vehicleIncomeDocId).toBe(doc.id)
    expect(b.fuelLiters).toBe(50)
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

describe('รายการหักก่อนออกเอกสาร + รีเซ็ตงานที่ออกเอกสารแล้ว', () => {
  it('หักภาษี 1% / ค่าดำเนินการ 10% / อื่นๆ ระบุ % คิดจากรายได้จากงาน แล้วหักออกจากยอดสุทธิ', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const b = jobOf({ tripFee: 2000 })
    bookings.bookings.push(a, b)
    docs.updateVendorCosts(a.id, { fuelCost: 1000 })

    const result = await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10', [
      { kind: 'WHT', percent: 1 },
      { kind: 'SERVICE', percent: 10 },
      { kind: 'OTHER', percent: 2.5, label: 'ค่าประกันสินค้า' },
    ])

    expect(result.ok).toBe(true)
    const doc = result.doc!
    expect(doc.deductions).toEqual([
      { kind: 'WHT', label: 'หักภาษี ณ ที่จ่าย', percent: 1, amount: 50 },
      { kind: 'SERVICE', label: 'หักค่าดำเนินการ', percent: 10, amount: 500 },
      { kind: 'OTHER', label: 'ค่าประกันสินค้า', percent: 2.5, amount: 125 },
    ])
    expect(doc.deductionTotal).toBe(675)
    expect(doc.netTotal).toBe(5000 - 675 - 1000)
  })

  it('ไม่ติ๊กรายการหัก = ไม่หัก / % ไม่ถูกต้องหรือหักอื่นๆ ไม่ระบุชื่อ = ไม่สร้างเอกสาร', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect((await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10', [{ kind: 'OTHER', percent: 0, label: 'x' }])).ok).toBe(false)
    expect((await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10', [{ kind: 'OTHER', percent: 101, label: 'x' }])).ok).toBe(false)
    expect((await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10', [{ kind: 'OTHER', percent: 5, label: ' ' }])).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBeUndefined()
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')).doc!
    expect(doc.deductionTotal).toBe(0)
    expect(doc.netTotal).toBe(3000)
  })

  it('รีเซ็ตงานเดียว = เอาออกจากเอกสาร คิดยอด/รายการหักใหม่จากงานที่เหลือ, รีเซ็ตงานสุดท้าย = ยกเลิกเอกสาร', async () => {
    loginAs('ACCOUNTING')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const b = jobOf({ tripFee: 2000 })
    bookings.bookings.push(a, b)
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10', [{ kind: 'SERVICE', percent: 10 }])).doc!

    expect((await docs.removeBookingFromDocument(a.id)).ok).toBe(true)
    expect(a.vehicleIncomeDocId).toBeUndefined()
    const updated = docs.documents.find((d) => d.id === doc.id)!
    expect(updated.bookingIds).toEqual([b.id])
    expect(updated.tripIncomeTotal).toBe(2000)
    expect(updated.deductions?.[0].amount).toBe(200)
    expect(updated.netTotal).toBe(1800)
    expect(docs.vendorCostEditBlockedReason(a)).toBe('')

    expect((await docs.removeBookingFromDocument(b.id)).ok).toBe(true)
    expect(b.vehicleIncomeDocId).toBeUndefined()
    expect(docs.documents.some((d) => d.id === doc.id)).toBe(false)
  })

  it('บันทึกเอกสารไม่สำเร็จ = งานยังผูกเอกสารอยู่ / DISPATCHER รีเซ็ตไม่ได้', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const b = jobOf()
    bookings.bookings.push(a, b)
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10')).doc!
    vi.spyOn(vehicleIncomeDocumentRepository, 'set').mockRejectedValueOnce(new Error('denied'))
    expect((await docs.removeBookingFromDocument(a.id)).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBe(doc.id)
    loginAs('DISPATCHER')
    expect((await docs.removeBookingFromDocument(a.id)).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBe(doc.id)
  })
})

describe('สถานะจ่ายเอกสารรายได้รถร่วม (แบบเดียวกับคนขับ)', () => {
  it('เอกสารใหม่ = รอจ่าย → บันทึกจ่าย → จ่ายแล้วยกเลิก/เอางานออกไม่ได้ → รีเซ็ตเป็นรอจ่ายแล้วยกเลิกได้', async () => {
    loginAs('ACCOUNTING')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const b = jobOf()
    bookings.bookings.push(a, b)
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10')).doc!
    expect(doc.paymentStatus).toBe('UNPAID')

    const paidDate = new Date(2026, 9, 20)
    expect((await docs.recordPayment(doc.id, paidDate)).ok).toBe(true)
    expect(doc.paymentStatus).toBe('PAID')
    expect(doc.paidDate).toEqual(paidDate)
    expect((await docs.recordPayment(doc.id)).ok).toBe(false)
    expect((await docs.cancelVehicleIncomeDocument(doc.id)).ok).toBe(false)
    expect((await docs.removeBookingFromDocument(a.id)).ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBe(doc.id)

    expect((await docs.updatePaidDate(doc.id, new Date(2026, 9, 21))).ok).toBe(true)
    expect((await docs.resetPayment(doc.id)).ok).toBe(true)
    expect(doc.paymentStatus).toBe('UNPAID')
    expect(doc.paidDate).toBeUndefined()
    expect((await docs.cancelVehicleIncomeDocument(doc.id)).ok).toBe(true)
    expect(a.vehicleIncomeDocId).toBeUndefined()
    expect(bookings.logs.some((l) => l.action.startsWith('บันทึกจ่ายเงินเอกสาร'))).toBe(true)
  })

  it('ห้ามวันที่จ่ายล่วงหน้า / เอกสารเก่าที่ไม่มีสถานะ = รอจ่าย / DISPATCHER บันทึกจ่ายไม่ได้', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    const doc = (await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10')).doc!
    expect((await docs.recordPayment(doc.id, new Date(Date.now() + 86400000 * 2))).ok).toBe(false)
    delete doc.paymentStatus
    loginAs('DISPATCHER')
    expect((await docs.recordPayment(doc.id)).ok).toBe(false)
    loginAs('ADMIN')
    expect((await docs.recordPayment(doc.id)).ok).toBe(true)
  })
})

describe('ค่าน้ำมัน/ค่าใช้จ่ายประจำรถคำนวณอัตโนมัติ แก้ทับได้', () => {
  it('ค่าใช้จ่ายประจำรถ = ยอดเดือน ÷ จำนวนงานของรถในเดือน, แก้เองแล้วกด null = กลับไปค่าอัตโนมัติ', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const expenses = useVehicleExpensesStore()
    await vi.waitFor(() => expect(expenses.loading).toBe(false))
    expenses.expenses.push(
      { id: 'e1', vehicleId: 'veh-1', expenseType: 'ประกันภัย', amount: 900, date: new Date(2026, 9, 1), createdAt: new Date(), updatedAt: new Date() },
      { id: 'e2', vehicleId: 'veh-1', expenseType: 'GPS', amount: 100, date: new Date(2026, 8, 1), createdAt: new Date(), updatedAt: new Date() }
    )
    const a = jobOf({ fuelLiters: 10 })
    const b = jobOf()
    const c = jobOf()
    const otherMonth = jobOf({ shipDate: new Date(2026, 8, 20) })
    bookings.bookings.push(a, b, c, otherMonth)

    expect(docs.vehicleExpenseOf(a)).toBe(300)
    expect(docs.vehicleExpenseOf(otherMonth)).toBe(100)

    expect(docs.updateVendorCosts(a.id, { fuelCost: 999, vehicleExpense: 50 }).ok).toBe(true)
    expect(vendorFuelCostOf(a)).toBe(999)
    expect(docs.vehicleExpenseOf(a)).toBe(50)

    expect(docs.updateVendorCosts(a.id, { fuelCost: null, vehicleExpense: null }).ok).toBe(true)
    expect(a.vendorFuelCost).toBeUndefined()
    expect(vendorFuelCostOf(a)).toBe(300)
    expect(docs.vehicleExpenseOf(a)).toBe(300)
  })
})

describe('รายได้รถร่วม — เบี้ยเลี้ยง + รายได้ส่วนเพิ่ม/หักค่าใช้จ่ายที่พิมพ์เอง', () => {
  it('เบี้ยเลี้ยงบวกเพิ่ม, หัก % คิดจากรายได้จากงานอย่างเดียว, รายการพิมพ์เองเข้าสุทธิ และคงอยู่เมื่อเอางานออก', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf({ allowance: 400, finalAllowance: 350 })
    const b = jobOf({ tripFee: 2000, allowance: 200 })
    bookings.bookings.push(a, b)

    const result = await docs.createVehicleIncomeDocument('veh-1', [a.id, b.id], '2026-10', [{ kind: 'WHT', percent: 1 }], {
      additions: [{ label: 'ค่าขึ้นเขา', amount: 500 }, { label: '', amount: 0 }],
      deductions: [{ label: 'ค่าปรับ', amount: 120.5 }],
    })

    expect(result.ok).toBe(true)
    const doc = result.doc!
    expect(doc.allowanceTotal).toBe(550)
    expect(doc.deductionTotal).toBe(50)
    expect(doc.additions).toEqual([{ label: 'ค่าขึ้นเขา', amount: 500 }])
    expect(doc.manualDeductions).toEqual([{ label: 'ค่าปรับ', amount: 120.5 }])
    // 5000 − 50 + 550 + 500 − 0 − 0 − 120.5
    expect(doc.netTotal).toBe(5879.5)

    expect((await docs.removeBookingFromDocument(b.id)).ok).toBe(true)
    const updated = docs.documents.find((d) => d.id === doc.id)!
    expect(updated.allowanceTotal).toBe(350)
    expect(updated.additions).toEqual([{ label: 'ค่าขึ้นเขา', amount: 500 }])
    // 3000 − 30 + 350 + 500 − 120.5
    expect(updated.netTotal).toBe(3699.5)
  })

  it('รายการพิมพ์เองไม่มีรายละเอียด หรือยอดไม่เกิน 0 = ไม่สร้างเอกสาร', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    const noLabel = await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10', [], { additions: [{ label: ' ', amount: 100 }], deductions: [] })
    expect(noLabel.ok).toBe(false)
    const negative = await docs.createVehicleIncomeDocument('veh-1', [a.id], '2026-10', [], { additions: [], deductions: [{ label: 'x', amount: -5 }] })
    expect(negative.ok).toBe(false)
    expect(a.vehicleIncomeDocId).toBeUndefined()
  })
})
