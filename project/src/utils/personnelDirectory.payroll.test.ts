import { describe, it, expect } from 'vitest'
import { staffAccountsWithoutRecord, staffRecordFromAccount } from './personnelDirectory'
import type { UserProfile } from '@/stores/users'
import type { StaffRecord } from '@/stores/staff'

const user = (over: Partial<UserProfile>): UserProfile => ({
  id: 'u1', email: 'u1@x.com', name: 'ผู้ใช้', role: 'STAFF', active: true, createdAt: '', updatedAt: '', ...over,
})
const staff = (over: Partial<StaffRecord>): StaffRecord =>
  ({ id: 's1', code: 'S001', prefix: 'นาง', firstName: 'สมหญิง', lastName: 'ใจดี', employmentStatus: 'active', ...over }) as StaffRecord

describe('staffAccountsWithoutRecord', () => {
  it('คืนบัญชีเสมียนที่เปิดใช้งานและยังไม่มีทะเบียนเสมียน', () => {
    const users = [
      user({ id: 'a', name: 'ใหม่' }),
      user({ id: 'b', name: 'สมหญิง ใจดี' }), // มีทะเบียนแล้ว (จับด้วยชื่อ)
      user({ id: 'c', name: 'ปิดแล้ว', active: false }),
      user({ id: 'd', name: 'แอดมิน', role: 'ADMIN' }),
    ]
    expect(staffAccountsWithoutRecord(users, [staff({})]).map((u) => u.id)).toEqual(['a'])
  })
})

describe('staffRecordFromAccount', () => {
  it('แยกคำนำหน้า/ชื่อ/นามสกุลจากชื่อบัญชี', () => {
    const r = staffRecordFromAccount(user({ name: 'นางสาว สมใจ  รักงาน' }))
    expect([r.prefix, r.firstName, r.lastName, r.position, r.employmentStatus]).toEqual(['นางสาว', 'สมใจ', 'รักงาน', 'เสมียน', 'active'])
  })
  it('ชื่อคำเดียว = ชื่ออย่างเดียว', () => {
    const r = staffRecordFromAccount(user({ name: 'แฟ้ม' }))
    expect([r.prefix, r.firstName, r.lastName]).toEqual(['', 'แฟ้ม', ''])
  })
})
