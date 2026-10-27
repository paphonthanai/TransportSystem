import { describe, it, expect } from 'vitest'
import { driverIdentityIssue, normalizeDriverName } from './driverIdentity'

const driver = { id: 'drv-1', firstName: 'สมชาย', lastName: 'ใจดี' }

describe('driverIdentity', () => {
  it('เทียบชื่อโดยไม่สนคำนำหน้า/ช่องว่าง', () => {
    expect(normalizeDriverName('นาย สมชาย  ใจดี')).toBe('สมชายใจดี')
    expect(normalizeDriverName('นางสาวสมหญิง ดี')).toBe('สมหญิงดี')
    expect(normalizeDriverName('สมชาย ใจดี')).toBe('สมชายใจดี')
  })

  it('driverId ตรง + ชื่อตรง = ไม่มีปัญหา (ชื่อในงานไม่มีคำนำหน้าก็ได้)', () => {
    expect(driverIdentityIssue({ driverId: 'drv-1', driverFirstName: 'สมชาย', driverLastName: 'ใจดี' }, driver, 'นายสมชาย ใจดี')).toBe('')
    expect(driverIdentityIssue({ driverId: 'drv-1', driverName: 'นายสมชาย ใจดี' }, driver, 'นายสมชาย ใจดี')).toBe('')
  })

  it('ไม่มี driverId / driverId ไม่ตรง / ชื่อไม่ตรง = แจ้งรายละเอียด', () => {
    expect(driverIdentityIssue({ driverName: 'สมชาย ใจดี' }, driver, 'นายสมชาย ใจดี')).toContain('ไม่มีรหัสคนขับ')
    expect(driverIdentityIssue({ driverId: 'drv-2', driverName: 'สมชาย ใจดี' }, driver, 'นายสมชาย ใจดี')).toContain('drv-2')
    const issue = driverIdentityIssue({ driverId: 'drv-1', driverName: 'สมศักดิ์ ใจดี' }, driver, 'นายสมชาย ใจดี')
    expect(issue).toContain('สมศักดิ์ ใจดี')
    expect(issue).toContain('นายสมชาย ใจดี')
  })
})
