import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookingStore } from './booking'
import { useAuthStore } from './auth'
import { useDriversStore, type DriverRecord } from './drivers'
import { usePayrollDeductionsStore } from './payrollDeductions'
import { useDriverPayrollDocumentsStore } from './driverPayrollDocuments'
import { driverPayrollDocumentRepository } from '@/repositories/driverPayrollDocumentRepository'
import { makeBooking } from '../../tests/fixtures/booking'
import type { UserRole } from './users'
import type { PayrollDeduction } from '@/types'

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

const driver = { id: 'drv-1', code: 'D01', prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี' } as DriverRecord

/** งานของคนขับ drv-1 รอบ ต.ค. 2026 (พ.ศ. 2569-10) — Snapshot ชื่อในงานไม่มีคำนำหน้า (เหมือนข้อมูลจริง) */
const jobOf = (overrides: Record<string, unknown> = {}) =>
  makeBooking({
    status: 'DELIVERED',
    driverId: 'drv-1',
    driverFirstName: 'สมชาย',
    driverLastName: 'ใจดี',
    driverName: 'สมชาย ใจดี',
    allowance: 500,
    finalAllowance: 500,
    shipDate: new Date(2026, 9, 5),
    ...overrides,
  })

function line(kind: 'ADDITION' | 'DEDUCTION', type: string, amount: number): PayrollDeduction {
  // บันทึกใต้ชื่อเต็มที่มีคำนำหน้า — key เดียวกับที่ PayrollDeductionPanel ใช้ (driversStore.fullName)
  return { id: `${type}-${amount}`, driverName: 'นายสมชาย ใจดี', periodLabel: '2569-10', type, label: '', amount, kind, createdAt: new Date() }
}

async function setup() {
  const docs = useDriverPayrollDocumentsStore()
  await vi.waitFor(() => expect(docs.loading).toBe(false))
  // รอ fetchBookings รอบแรก (ยิงตอนสร้าง store เพราะ login แล้ว) โหลดเสร็จก่อน ไม่งั้นมันจะเขียนทับงานที่ push เข้าไปทีหลัง
  await vi.waitFor(() => expect(useBookingStore().bookingsLoading).toBe(false))
  await vi.waitFor(() => expect(useDriversStore().loading).toBe(false))
  await vi.waitFor(() => expect(usePayrollDeductionsStore().loading).toBe(false))
  useDriversStore().drivers.push(driver)
  return { docs, bookings: useBookingStore(), deductions: usePayrollDeductionsStore() }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('createDriverPayrollDocument', () => {
  it('ดึงรายการหัก/รายได้อื่นที่บันทึกใต้ชื่อมีคำนำหน้าได้ แยกทีละรายการ และคำนวณสุทธิถูก (regression: ยอดหักเคยเป็น 0)', async () => {
    loginAs('ADMIN')
    const { docs, bookings, deductions } = await setup()
    const a = jobOf()
    const b = jobOf({ allowance: 700, finalAllowance: 650 })
    bookings.bookings.push(a, b)
    deductions.deductions.push(line('DEDUCTION', 'ประกันงาน', 300), line('DEDUCTION', 'ผ่อนชำระ', 100), line('ADDITION', 'โบนัส', 200))

    const result = await docs.createDriverPayrollDocument('drv-1', [a.id, b.id], '2026-10')

    expect(result.ok).toBe(true)
    const doc = result.doc!
    expect(doc.driverName).toBe('นายสมชาย ใจดี')
    expect(doc.tripIncomeTotal).toBe(1150)
    expect(doc.deductionTotal).toBe(400)
    expect(doc.additionTotal).toBe(200)
    expect(doc.netIncome).toBe(950)
    expect(doc.deductionItems).toEqual([
      { type: 'ประกันงาน', label: '', amount: 300 },
      { type: 'ผ่อนชำระ', label: '', amount: 100 },
    ])
    expect(doc.additionItems).toEqual([{ type: 'โบนัส', label: '', amount: 200 }])
    expect(a.driverPayrollDocId).toBe(doc.id)
    expect(b.driverPayrollDocId).toBe(doc.id)
    expect((await driverPayrollDocumentRepository.getAll()).map((d) => d.id)).toContain(doc.id)
  })

  it('ชื่อคนขับในงานไม่ตรงกับทะเบียน = ไม่สร้างเอกสาร คืนรายละเอียดที่ไม่ตรง และไม่ผูกงาน', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const ok = jobOf()
    const wrongName = jobOf({ driverFirstName: 'สมศักดิ์', driverName: 'สมศักดิ์ ใจดี' })
    bookings.bookings.push(ok, wrongName)

    const result = await docs.createDriverPayrollDocument('drv-1', [ok.id, wrongName.id], '2026-10')

    expect(result.ok).toBe(false)
    expect(result.mismatches).toHaveLength(1)
    expect(result.mismatches![0].docNo).toBe(wrongName.docNo)
    expect(result.mismatches![0].issue).toContain('สมศักดิ์')
    expect(ok.driverPayrollDocId).toBeUndefined()
    expect(docs.documents).toHaveLength(0)
  })

  it('งานไม่มี driverId หรือ driverId เป็นคนอื่น = ไม่สร้างเอกสาร', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const noId = jobOf({ driverId: undefined })
    const otherId = jobOf({ driverId: 'drv-2' })
    bookings.bookings.push(noId, otherId)

    const result = await docs.createDriverPayrollDocument('drv-1', [noId.id, otherId.id], '2026-10')

    expect(result.ok).toBe(false)
    expect(result.mismatches!.map((m) => m.issue).join('|')).toMatch(/ไม่มีรหัสคนขับ.*\|.*ไม่ตรงกับคนขับคนนี้/)
  })

  it('บันทึกเอกสารลง Firestore ไม่สำเร็จ = ไม่ผูกงาน ไม่ค้างป้าย "ออกเอกสารแล้ว"', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    vi.spyOn(driverPayrollDocumentRepository, 'set').mockRejectedValueOnce(new Error('Missing or insufficient permissions'))

    const result = await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')

    expect(result.ok).toBe(false)
    expect(result.message).toContain('permissions')
    expect(a.driverPayrollDocId).toBeUndefined()
    expect(docs.documents).toHaveLength(0)
  })

  it('ไม่ใช่ ADMIN สร้างไม่ได้ / งานที่ออกเอกสารแล้วเลือกซ้ำไม่ได้', async () => {
    loginAs('DISPATCHER')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect((await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')).ok).toBe(false)

    loginAs('ADMIN')
    a.driverPayrollDocId = 'other-doc'
    expect((await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')).ok).toBe(false)
  })
})

describe('สถานะจ่าย / ยกเลิกเอกสาร', () => {
  async function issued() {
    loginAs('ADMIN')
    const ctx = await setup()
    const a = jobOf()
    ctx.bookings.bookings.push(a)
    const doc = (await ctx.docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')).doc!
    return { ...ctx, a, doc }
  }

  it('บันทึกจ่าย → แก้วันที่จ่าย → รีเซ็ตเป็นรอจ่าย และเขียน log ทุกขั้น', async () => {
    const { docs, bookings, doc } = await issued()
    const paidDate = new Date(2026, 9, 20)

    expect((await docs.recordPayment(doc.id, paidDate)).ok).toBe(true)
    expect(doc.paymentStatus).toBe('PAID')
    expect((await docs.recordPayment(doc.id)).ok).toBe(false)

    expect((await docs.updatePaidDate(doc.id, new Date(2026, 9, 21))).ok).toBe(true)
    expect(doc.paidDate?.getDate()).toBe(21)
    expect((await docs.updatePaidDate(doc.id, new Date(Date.now() + 86400000 * 3))).ok).toBe(false)

    expect((await docs.resetPayment(doc.id)).ok).toBe(true)
    expect(doc.paymentStatus).toBe('UNPAID')
    expect(doc.paidDate).toBeUndefined()
    const actions = bookings.logs.map((l) => l.action)
    expect(actions.some((a) => a.startsWith('บันทึกจ่ายเงินเอกสาร'))).toBe(true)
    expect(actions.some((a) => a.startsWith('รีเซ็ตเอกสาร'))).toBe(true)
  })

  it('ไม่ใช่ ADMIN บันทึกจ่าย/รีเซ็ต/ยกเลิกไม่ได้', async () => {
    const { docs, doc } = await issued()
    loginAs('DISPATCHER')
    expect((await docs.recordPayment(doc.id)).ok).toBe(false)
    expect((await docs.cancelDriverPayrollDocument(doc.id)).ok).toBe(false)
    expect(doc.paymentStatus).toBe('UNPAID')
  })

  it('ยกเลิกเอกสารที่ยังไม่จ่าย = ลบเอกสารและปลดงาน / เอกสารที่จ่ายแล้วยกเลิกไม่ได้', async () => {
    const { docs, a, doc } = await issued()
    await docs.recordPayment(doc.id, new Date(2026, 9, 20))
    expect((await docs.cancelDriverPayrollDocument(doc.id)).ok).toBe(false)
    expect(a.driverPayrollDocId).toBe(doc.id)

    await docs.resetPayment(doc.id)
    expect((await docs.cancelDriverPayrollDocument(doc.id)).ok).toBe(true)
    expect(a.driverPayrollDocId).toBeUndefined()
    expect(docs.documents).toHaveLength(0)
    expect(await driverPayrollDocumentRepository.getAll()).toHaveLength(0)
  })

  it('ลบเอกสารใน Firestore ไม่สำเร็จ = ไม่ปลดงาน', async () => {
    const { docs, a, doc } = await issued()
    vi.spyOn(driverPayrollDocumentRepository, 'delete').mockRejectedValueOnce(new Error('denied'))
    expect((await docs.cancelDriverPayrollDocument(doc.id)).ok).toBe(false)
    expect(a.driverPayrollDocId).toBe(doc.id)
    expect(docs.documents).toHaveLength(1)
  })

  it('ปลดล็อกงานที่ค้างป้ายแต่ไม่มีเอกสารจริงได้ / งานที่มีเอกสารอยู่จริงปลดไม่ได้', async () => {
    const { docs, bookings, a } = await issued()
    const orphan = jobOf({ driverPayrollDocId: 'drpr-missing' })
    bookings.bookings.push(orphan)

    expect(docs.isOrphanedBooking(a)).toBe(false)
    expect(docs.releaseOrphanedBooking(a.id).ok).toBe(false)
    expect(docs.isOrphanedBooking(orphan)).toBe(true)
    expect(docs.releaseOrphanedBooking(orphan.id).ok).toBe(true)
    expect(orphan.driverPayrollDocId).toBeUndefined()
  })
})

describe('สิทธิ์แต่ละ role — เอกสารรายได้คนขับ', () => {
  it('ฝ่ายบัญชี (ACCOUNTING) สร้าง/บันทึกจ่าย/รีเซ็ต/ยกเลิก/ปลดล็อกได้', async () => {
    loginAs('ACCOUNTING')
    const { docs, bookings } = await setup()
    const a = jobOf()
    const orphan = jobOf({ driverPayrollDocId: 'drpr-missing' })
    bookings.bookings.push(a, orphan)

    expect(docs.canManage()).toBe(true)
    const doc = (await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')).doc!
    expect(doc).toBeDefined()
    expect((await docs.recordPayment(doc.id, new Date(2026, 9, 20))).ok).toBe(true)
    expect((await docs.resetPayment(doc.id)).ok).toBe(true)
    expect((await docs.cancelDriverPayrollDocument(doc.id)).ok).toBe(true)
    expect(a.driverPayrollDocId).toBeUndefined()
    expect(docs.releaseOrphanedBooking(orphan.id).ok).toBe(true)
  })

  it.each(['DISPATCHER', 'STAFF', 'DRIVER'] as UserRole[])('%s จัดการเอกสารไม่ได้ (อ่านอย่างเดียว/ไม่มีสิทธิ์)', async (role) => {
    loginAs(role)
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect(docs.canManage()).toBe(false)
    const result = await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('ฝ่ายบัญชี')
    expect(a.driverPayrollDocId).toBeUndefined()
  })

  it('โหลดรายการหักไม่สำเร็จ (เช่นสิทธิ์อ่านไม่พอ) = ไม่สร้างเอกสาร กันยอดหักเป็น 0 แบบเงียบๆ', async () => {
    loginAs('ACCOUNTING')
    const { docs, bookings, deductions } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    deductions.error = 'Missing or insufficient permissions'
    const result = await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('รายการหัก')
    expect(a.driverPayrollDocId).toBeUndefined()
  })
})

describe('createDriverPayrollDocument — หัก % / รายได้ส่วนเพิ่ม / หักค่าใช้จ่ายที่พิมพ์เอง', () => {
  it('หักภาษี 3% + หักอื่นๆ % คิดจากรายได้จากงาน และรายการพิมพ์เองต่อท้ายรายการจากหน้าเงินเดือน', async () => {
    loginAs('ADMIN')
    const { docs, bookings, deductions } = await setup()
    const a = jobOf({ allowance: 1000, finalAllowance: 1000 })
    bookings.bookings.push(a)
    deductions.deductions.push(line('DEDUCTION', 'ประกันงาน', 100))

    const result = await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10', {
      percentDeductions: [{ kind: 'WHT', percent: 3 }, { kind: 'OTHER', percent: 2.5, label: 'ค่าบริหาร' }],
      adjustments: { additions: [{ label: 'ค่าล่วงเวลา', amount: 300 }], deductions: [{ label: 'ค่าของเสียหาย', amount: 50 }] },
    })

    expect(result.ok).toBe(true)
    const doc = result.doc!
    expect(doc.additionItems).toEqual([{ type: 'MANUAL', label: 'ค่าล่วงเวลา', amount: 300 }])
    expect(doc.deductionItems).toEqual([
      { type: 'ประกันงาน', label: '', amount: 100 },
      { type: 'PERCENT', label: 'หักภาษี ณ ที่จ่าย 3%', amount: 30 },
      { type: 'PERCENT', label: 'ค่าบริหาร 2.5%', amount: 25 },
      { type: 'MANUAL', label: 'ค่าของเสียหาย', amount: 50 },
    ])
    // 1000 + 300 − (100 + 30 + 25 + 50)
    expect(doc.netIncome).toBe(1095)
  })

  it('หักอื่นๆ ไม่ระบุชื่อ / % เกิน 100 = ไม่สร้างเอกสาร', async () => {
    loginAs('ADMIN')
    const { docs, bookings } = await setup()
    const a = jobOf()
    bookings.bookings.push(a)
    expect((await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10', { percentDeductions: [{ kind: 'OTHER', percent: 5 }] })).ok).toBe(false)
    expect((await docs.createDriverPayrollDocument('drv-1', [a.id], '2026-10', { percentDeductions: [{ kind: 'WHT', percent: 120 }] })).ok).toBe(false)
    expect(a.driverPayrollDocId).toBeUndefined()
  })
})
