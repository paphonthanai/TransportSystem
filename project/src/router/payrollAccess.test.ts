import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from './index'
import { useAuthStore } from '@/stores/auth'
import { useAppStore, type MenuItem } from '@/stores/app'
import type { UserRole } from '@/stores/users'
// ?raw = ให้ Vite อ่านไฟล์เป็นข้อความ (tsconfig ของ src ไม่มี type ของ Node fs/path)
import rules from '../../firestore.rules?raw'

/**
 * สิทธิ์ของหน้าเงินเดือนคนขับ/รถร่วม/เอกสารรายได้ ต้องสอดคล้องกันทั้ง Route, เมนู และ Firestore Rules — ไม่มี emulator
 * ในชุดเทสต์นี้ จึงตรวจ firestore.rules แบบอ่านข้อความ match block ตรงๆ (กันลืมแก้ฝั่งใดฝั่งหนึ่ง)
 */
const rolesOf = (name: string) => (router.getRoutes().find((r) => r.name === name)?.meta.roles as UserRole[] | undefined) ?? []

function ruleBlock(collection: string): string {
  const start = rules.indexOf(`match /${collection}/`)
  expect(start, `ไม่พบ match block ของ ${collection}`).toBeGreaterThan(-1)
  return rules.slice(start, rules.indexOf('\n    }', start))
}
const rolesIn = (line: string | undefined) => (line?.match(/'([A-Z]+)'/g) ?? []).map((s) => s.replace(/'/g, ''))
const allowLine = (block: string, op: 'read' | 'write') =>
  block.split('\n').find((l) => l.includes('allow') && l.includes('hasRole') && (l.includes(`${op},`) || l.includes(`${op}:`) || l.includes(`, ${op}`)))

beforeEach(() => setActivePinia(createPinia()))

describe('สิทธิ์ ACCOUNTING — route', () => {
  it.each(['PayrollDrivers', 'DriverDetail', 'DriverIncomeDocument', 'PayrollVendorFleet', 'VendorFleetVehicleDetail', 'VehicleIncomeDocument'])(
    '%s เปิดให้ ADMIN และ ACCOUNTING',
    (name) => {
      expect(rolesOf(name)).toEqual(expect.arrayContaining(['ADMIN', 'ACCOUNTING']))
    }
  )

  it('เงินเดือนเสมียนยังเป็น ADMIN อย่างเดียว / DISPATCHER ยังดูเอกสารรายได้คนขับได้', () => {
    expect(rolesOf('PayrollStaff')).toEqual(['ADMIN'])
    expect(rolesOf('StaffSalaryDetail')).toEqual(['ADMIN'])
    expect(rolesOf('DriverIncomeDocument')).toContain('DISPATCHER')
  })
})

describe('สิทธิ์ ACCOUNTING — เมนู', () => {
  const routesFor = (role: UserRole) => {
    useAuthStore().profile = { id: 'u', email: 'a@a.com', name: 'A', role, active: true, createdAt: '', updatedAt: '' }
    const flat = (items: MenuItem[]): string[] => items.flatMap((i) => [...(i.route ? [i.route] : []), ...flat(i.children ?? [])])
    return flat(useAppStore().menu)
  }

  it('ฝ่ายบัญชีเห็นเมนูพนักงานขับรถ/รถร่วม แต่ไม่เห็นเงินเดือนเสมียน', () => {
    const routes = routesFor('ACCOUNTING')
    expect(routes).toEqual(expect.arrayContaining(['/payroll/drivers', '/payroll/vendor-fleet']))
    expect(routes).not.toContain('/payroll/staff')
  })
})

describe('สิทธิ์ ACCOUNTING — firestore.rules', () => {
  it('driverPayrollDocuments: ADMIN/ACCOUNTING อ่าน-เขียน, DISPATCHER อ่านอย่างเดียว', () => {
    const block = ruleBlock('driverPayrollDocuments')
    expect(rolesIn(allowLine(block, 'read')).sort()).toEqual(['ACCOUNTING', 'ADMIN', 'DISPATCHER'])
    expect(rolesIn(allowLine(block, 'write')).sort()).toEqual(['ACCOUNTING', 'ADMIN'])
  })

  it('vehicleIncomeDocuments: ADMIN/ACCOUNTING อ่าน-เขียน', () => {
    expect(rolesIn(allowLine(ruleBlock('vehicleIncomeDocuments'), 'write')).sort()).toEqual(['ACCOUNTING', 'ADMIN'])
  })

  it.each(['payrollDeductions', 'driverPayments', 'vehicleExpenses'])('%s: ACCOUNTING อ่านได้ แต่เขียนได้เฉพาะ ADMIN', (collection) => {
    const block = ruleBlock(collection)
    expect(rolesIn(allowLine(block, 'read'))).toContain('ACCOUNTING')
    expect(rolesIn(allowLine(block, 'write'))).toEqual(['ADMIN'])
  })

  it.each(['drivers', 'vehicles'])('%s: ACCOUNTING อ่านได้ (ใช้จับคู่งาน)', (collection) => {
    expect(ruleBlock(collection)).toMatch(/allow read: if hasRole\(\['ACCOUNTING'\]\)/)
  })
})
