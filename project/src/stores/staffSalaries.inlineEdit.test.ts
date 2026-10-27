import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { useBookingStore } from './booking'
import { useStaffSalaryStore } from './staffSalaries'
import { staffSalaryRepository } from '@/repositories/staffSalaryRepository'
import type { UserRole } from './users'

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

const input = (overrides: Record<string, unknown> = {}) => ({
  staffId: 'staff-1',
  period: '2569-10',
  baseSalary: 15000,
  additions: [{ id: 'a1', label: 'OT', amount: 1000 }],
  deductions: [{ id: 'd1', label: 'ประกันสังคม', amount: 750 }],
  status: 'DRAFT' as const,
  documentNumber: 'SLR-001',
  ...overrides,
})

async function setup() {
  const store = useStaffSalaryStore()
  await vi.waitFor(() => expect(store.loading).toBe(false))
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('updateSalaryFields — inline แก้ในหน้ารายละเอียดเงินเดือน', () => {
  it('แก้หมายเหตุ/เลขที่เอกสาร/วันที่ได้ บันทึก Firestore และเขียน log ค่าว่าง = ล้างค่า', async () => {
    loginAs('ADMIN')
    const store = await setup()
    const record = (await store.createSalary(input({ note: 'เดิม' })))!

    expect((await store.updateSalaryFields(record.id, { documentNumber: '  SLR-002 ' })).ok).toBe(true)
    expect((await store.updateSalaryFields(record.id, { note: '' })).ok).toBe(true)
    expect((await store.updateSalaryFields(record.id, { documentDate: new Date('2026-10-01') })).ok).toBe(true)

    const saved = (await staffSalaryRepository.getAll()).find((r) => r.id === record.id)!
    expect(saved.documentNumber).toBe('SLR-002')
    expect(saved.note).toBeUndefined()
    expect(saved.documentDate?.toISOString().slice(0, 10)).toBe('2026-10-01')
    expect(useBookingStore().logs.filter((l) => l.action.startsWith('แก้ไขเงินเดือน'))).toHaveLength(3)
  })

  it('เลขที่เอกสารซ้ำ / วันที่ล่วงหน้า / ไม่ใช่ ADMIN = ไม่บันทึก', async () => {
    loginAs('ADMIN')
    const store = await setup()
    await store.createSalary(input({ staffId: 'staff-2', documentNumber: 'SLR-999' }))
    const record = (await store.createSalary(input()))!

    expect((await store.updateSalaryFields(record.id, { documentNumber: 'SLR-999' })).ok).toBe(false)
    expect((await store.updateSalaryFields(record.id, { documentDate: new Date(Date.now() + 86400000 * 3) })).ok).toBe(false)
    loginAs('STAFF')
    expect((await store.updateSalaryFields(record.id, { note: 'x' })).ok).toBe(false)
    expect(record.documentNumber).toBe('SLR-001')
  })

  it('จ่ายแล้ว: ล็อกเลขที่/วันที่/สถานะเอกสาร แต่ยังแก้หมายเหตุและเปลี่ยนสถานะกลับเป็นรอจ่ายได้', async () => {
    loginAs('ADMIN')
    const store = await setup()
    const record = (await store.createSalary(input({ status: 'PAID' })))!

    expect(store.paidLockReason(record)).not.toBe('')
    expect((await store.updateSalaryFields(record.id, { documentNumber: 'SLR-NEW' })).ok).toBe(false)
    expect((await store.updateSalaryFields(record.id, { documentStatus: 'ISSUED' })).ok).toBe(false)
    expect((await store.updateSalaryFields(record.id, { note: 'โอนแล้ว' })).ok).toBe(true)
    expect((await store.updateSalaryFields(record.id, { status: 'DRAFT' })).ok).toBe(true)
    expect((await store.updateSalaryFields(record.id, { documentNumber: 'SLR-NEW' })).ok).toBe(true)
  })
})

describe('updateSalary — ล็อกยอดเงินเมื่อจ่ายแล้ว', () => {
  it('ใบที่จ่ายแล้วแก้ยอดเงินผ่านฟอร์มไม่ได้ แต่แก้หมายเหตุได้ / เปลี่ยนเป็นรอจ่ายแล้วแก้ยอดได้', async () => {
    loginAs('ADMIN')
    const store = await setup()
    const record = (await store.createSalary(input({ status: 'PAID' })))!

    expect(await store.updateSalary(record.id, input({ status: 'PAID', baseSalary: 20000 }))).toBeNull()
    expect(await store.updateSalary(record.id, input({ status: 'PAID', deductions: [] }))).toBeNull()
    const noteOnly = await store.updateSalary(record.id, input({ status: 'PAID', note: 'โอนแล้ว' }))
    expect(noteOnly?.note).toBe('โอนแล้ว')
    expect(noteOnly?.netAmount).toBe(15250)

    await store.updateSalary(record.id, input({ status: 'DRAFT', note: 'โอนแล้ว' }))
    const changed = await store.updateSalary(record.id, input({ status: 'DRAFT', baseSalary: 20000 }))
    expect(changed?.netAmount).toBe(20250)
  })
})
