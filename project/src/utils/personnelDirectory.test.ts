import { describe, it, expect } from 'vitest'
import { buildPersonnelRows, filterPersonnelRows, countByRole, normalizePersonName, personnelStatusMismatch } from './personnelDirectory'
import type { UserProfile } from '@/stores/users'
import type { StaffRecord } from '@/stores/staff'
import type { DriverRecord } from '@/stores/drivers'

const user = (over: Partial<UserProfile>): UserProfile => ({
  id: 'u1',
  email: 'u1@x.com',
  name: 'ผู้ใช้',
  role: 'STAFF',
  active: true,
  createdAt: '',
  updatedAt: '',
  ...over,
})
const staff = (over: Partial<StaffRecord>): StaffRecord =>
  ({ id: 's1', code: 'S001', prefix: 'นาง', firstName: 'สมหญิง', lastName: 'ใจดี', employmentStatus: 'active', ...over }) as StaffRecord
const driver = (over: Partial<DriverRecord>): DriverRecord =>
  ({ id: 'd1', code: '0001', prefix: 'นาย', firstName: 'สมชาย', lastName: 'ขับดี', nickname: 'ชาย', employmentStatus: 'active', ...over }) as DriverRecord

describe('normalizePersonName', () => {
  it('ตัดคำนำหน้าและช่องว่างซ้อน', () => {
    expect(normalizePersonName('นางสาว  สมหญิง   ใจดี')).toBe('สมหญิง ใจดี')
    expect(normalizePersonName('นายสมชาย ขับดี')).toBe('สมชาย ขับดี')
  })
})

describe('buildPersonnelRows', () => {
  it('บัญชี DRIVER ที่ผูก driverId รวมกับทะเบียนคนขับเป็นแถวเดียว ไม่ซ้ำ', () => {
    const rows = buildPersonnelRows({
      users: [user({ id: 'u2', role: 'DRIVER', name: 'acc', driverId: 'd1' })],
      staff: [],
      drivers: [driver({})],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ role: 'DRIVER', name: 'สมชาย ขับดี', nickname: 'ชาย', code: '0001' })
    expect(rows[0].user?.id).toBe('u2')
    expect(rows[0].driver?.id).toBe('d1')
  })

  it('คนขับที่ไม่มีบัญชีเป็นแถว role DRIVER ที่ไม่มีบัญชี', () => {
    const rows = buildPersonnelRows({ users: [], staff: [], drivers: [driver({}), driver({ id: 'd2', code: '0002', firstName: 'สมศักดิ์' })] })
    expect(rows.map((r) => r.role)).toEqual(['DRIVER', 'DRIVER'])
    expect(rows.every((r) => !r.user)).toBe(true)
  })

  it('บัญชี STAFF ที่ชื่อตรงกับทะเบียนเสมียน (ไม่สนคำนำหน้า) รวมเป็นแถวเดียว', () => {
    const rows = buildPersonnelRows({
      users: [user({ id: 'u3', role: 'STAFF', name: 'นางสาวสมหญิง ใจดี' })],
      staff: [staff({})],
      drivers: [],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].staff?.id).toBe('s1')
    expect(rows[0].user?.id).toBe('u3')
  })

  it('เสมียนที่ไม่มีบัญชีเป็นแถว role STAFF และบัญชีอื่น ๆ คงสิทธิ์ของตัวเอง', () => {
    const rows = buildPersonnelRows({
      users: [user({ id: 'a', role: 'ADMIN', name: 'แอดมิน' }), user({ id: 'b', role: 'DISPATCHER', name: 'ผู้จัดรถ' })],
      staff: [staff({})],
      drivers: [],
    })
    expect(countByRole(rows)).toMatchObject({ ALL: 3, ADMIN: 1, DISPATCHER: 1, STAFF: 1, DRIVER: 0 })
  })

  it('สถานะ: แถวมีบัญชีใช้สถานะบัญชี, แถวไม่มีบัญชีใช้สถานะการทำงานของทะเบียน', () => {
    const rows = buildPersonnelRows({
      users: [user({ id: 'u9', role: 'ACCOUNTING', active: false })],
      staff: [],
      drivers: [driver({ employmentStatus: 'resigned' })],
    })
    expect(rows.find((r) => r.user)?.active).toBe(false)
    expect(rows.find((r) => r.driver)?.active).toBe(false)
  })
})

describe('filterPersonnelRows', () => {
  const rows = buildPersonnelRows({
    users: [user({ id: 'a', role: 'ADMIN', name: 'แอดมิน', email: 'admin@x.com' })],
    staff: [staff({})],
    drivers: [driver({}), driver({ id: 'd2', code: '0002', firstName: 'สมศักดิ์', nickname: 'ศักดิ์' })],
  })

  it('กรองตาม Role', () => {
    expect(filterPersonnelRows(rows, { role: 'DRIVER' })).toHaveLength(2)
    expect(filterPersonnelRows(rows, { role: 'ALL' })).toHaveLength(4)
  })

  it('ค้นหาด้วยชื่อ/ชื่อเล่น/รหัส/อีเมล/ทะเบียน', () => {
    expect(filterPersonnelRows(rows, { query: 'ศักดิ์' }).map((r) => r.code)).toContain('0002')
    expect(filterPersonnelRows(rows, { query: 'admin@' })).toHaveLength(1)
    expect(filterPersonnelRows(rows, { query: '0001' })).toHaveLength(1)
    const plateOf = (r: { driver?: { code: string } }) => (r.driver?.code === '0001' ? '73-1124 สระบุรี' : '')
    expect(filterPersonnelRows(rows, { query: '73-1124', plateOf })).toHaveLength(1)
  })
})

describe('บัญชีคนขับผูกรหัสเก่า / สถานะขัดกัน', () => {
  it('driverId ไม่มีในทะเบียนแต่ชื่อตรง = รวมเป็นแถวเดียวพร้อมเตือนให้ผูกใหม่ ไม่เกิดแถวซ้ำ', () => {
    const rows = buildPersonnelRows({
      users: [user({ id: 'u9', role: 'DRIVER', name: 'นายสมชาย ขับดี', driverId: 'old-id' })],
      staff: [],
      drivers: [driver({})],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].driver?.id).toBe('d1')
    expect(rows[0].linkIssue).toContain('ไม่มีในทะเบียน')
  })

  it('ลาออกแต่บัญชียังเปิด / ทำงานอยู่แต่บัญชีถูกปิด = เตือน', () => {
    expect(personnelStatusMismatch({ user: user({ active: true }), driver: driver({ employmentStatus: 'resigned' as never }) })).toContain('ลาออก')
    expect(personnelStatusMismatch({ user: user({ active: false }), driver: driver({}) })).toContain('ปิด')
    expect(personnelStatusMismatch({ user: user({ active: true }), driver: driver({}) })).toBe('')
  })
})
