import { describe, it, expect } from 'vitest'
import { findReconcileMatches, computeReconcilePatches, RECONCILE_MIN_MATCH, type ReconcileRowInput } from './importReconciliation'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

/** ข้อมูลจริงจากไฟล์ Excel ต้นฉบับที่ PM ใช้ import (สเปรดชีตไม่มีชื่อ (3).xlsx, Row 3) — ยืนยันแล้วว่านี่คือแถวจริงที่
 *  ทำให้เกิดบั๊ก tripFee=0 เพราะคอลัมน์ "จำนวนตัน" เขียนเป็น "0.40 + 9.60" (แยกด้วย +) ทำให้ Number() เดิม parse ไม่ได้
 *  แล้ว fallback เป็น 0 เงียบๆ ทั้งที่ "ราคาปูน" (3300) กรอกมาถูกต้อง */
const row3FromRealFile: ReconcileRowInput = {
  customer: 'FSM',
  plate: '73-1124',
  productCodes: ['23', '13'],
  productQtyPairs: [
    { product: '23', qty: 0.4 },
    { product: '13', qty: 9.6 },
  ],
  driverName: 'หนึ่งใหม่',
  qty: 10,
  price: 3300,
  allowance: 750,
  fuelLiters: 38,
}

const shipDate = new Date(2026, 8, 22) // 22-09-69 ตามหัวไฟล์จริง

describe('findReconcileMatches — จับคู่กับไฟล์จริงที่เคย import พลาด', () => {
  it('จับคู่ได้เมื่อวันที่/ลูกค้า/ทะเบียนรถ/สินค้าหลัก/คนขับ ตรงกันครบ 5/5', () => {
    const booking = makeBooking({
      customer: 'FSM',
      plate: '73-1124',
      driverName: 'หนึ่งใหม่',
      loadingDate: shipDate,
      tripFee: 0,
      allowance: 0,
      items: [makeJobItem({ product: '23', qty: 0 })],
    })
    const matches = findReconcileMatches(row3FromRealFile, [booking], shipDate)
    expect(matches).toHaveLength(1)
    expect(matches[0].score).toBe(5)
  })

  it('คืนผู้สมัครที่คะแนนต่ำกว่าเกณฑ์มาด้วย (ไม่กรองทิ้ง) ให้ผู้ใช้เห็น/เลือกยืนยันเองได้ แต่ยังไม่ถือว่า "จับคู่ได้" อัตโนมัติ', () => {
    const unrelatedBooking = makeBooking({
      customer: 'FSM',
      plate: '99-9999',
      driverName: 'คนอื่น',
      loadingDate: new Date(2026, 8, 25),
      items: [makeJobItem({ product: '23', qty: 5 })],
    })
    const matches = findReconcileMatches(row3FromRealFile, [unrelatedBooking], shipDate)
    expect(matches).toHaveLength(1)
    expect(matches[0].score).toBe(2)
    expect(matches[0].score).toBeLessThan(RECONCILE_MIN_MATCH)
    expect(matches[0].breakdown).toEqual({ date: false, customer: true, plate: false, product: true, driver: false })
  })

  it('เกณฑ์ขั้นต่ำคือ 4 จาก 5 อย่าง — ตรงแค่ 2 อย่างไม่ถือว่าจับคู่ได้อัตโนมัติ (กันจับคู่ผิดงาน)', () => {
    const booking = makeBooking({
      customer: 'FSM',
      plate: '73-1124',
      driverName: 'คนละคน',
      loadingDate: new Date(2026, 8, 1),
      items: [makeJobItem({ product: '99', qty: 0 })],
    })
    const matches = findReconcileMatches(row3FromRealFile, [booking], shipDate)
    expect(matches[0].score).toBe(2)
    expect(matches[0].score).toBeLessThan(RECONCILE_MIN_MATCH)
    expect(RECONCILE_MIN_MATCH).toBe(4)
  })

  it('จับคู่สินค้าได้แม้ Booking เก่าเก็บหลายชนิดเป็นสตริงดิบไม่ได้แยก (เช่น "23 + 52" ทั้งก้อน) ต่างจากไฟล์ใหม่ที่แยกเป็น ["23","52"] — เคสจริงที่เจอ: CM2569-0070', () => {
    const legacyBooking = makeBooking({
      customer: 'Sccc',
      plate: '72-2337',
      driverName: 'คนขับทดสอบ',
      loadingDate: shipDate,
      items: [makeJobItem({ product: '23 + 52', qty: 10 })], // งานเก่าก่อนแก้ไข ยังไม่แยกสินค้า
    })
    const row: ReconcileRowInput = { ...row3FromRealFile, customer: 'Sccc', plate: '72-2337', productCodes: ['23', '52'], driverName: 'คนขับทดสอบ' }
    const matches = findReconcileMatches(row, [legacyBooking], shipDate)
    expect(matches[0].breakdown.product).toBe(true)
    expect(matches[0].score).toBe(5)
  })

  it('เทียบลูกค้า/ทะเบียนรถ/คนขับแบบไม่สนตัวพิมพ์เล็ก-ใหญ่/ช่องว่าง/เครื่องหมาย "-" กันจับคู่พลาดเพราะพิมพ์ต่างกันนิดหน่อย', () => {
    const booking = makeBooking({
      customer: '  fsm  ', // ตัวพิมพ์เล็ก + ช่องว่างหัวท้าย
      plate: '731124', // ไม่มีขีด ต่างจาก "73-1124" ในไฟล์
      driverName: 'หนึ่งใหม่',
      loadingDate: shipDate,
      items: [makeJobItem({ product: '23', qty: 0 })],
    })
    const matches = findReconcileMatches(row3FromRealFile, [booking], shipDate)
    expect(matches[0].score).toBe(5)
    expect(matches[0].breakdown).toEqual({ date: true, customer: true, plate: true, product: true, driver: true })
  })
})

describe('computeReconcilePatches — ใช้ยอดที่ parse ถูกต้องจากไฟล์ ไม่ใช่ค่า 0 ที่ค้างอยู่ในระบบจากบั๊กเดิม', () => {
  it('เติมค่าเที่ยว/เบี้ยเลี้ยง/น้ำมัน/จำนวนตันที่ยังว่าง/0 อยู่ ด้วยค่าจากไฟล์ (10 ตัน x 3300 = 33000)', () => {
    const booking = makeBooking({
      tripFee: 0,
      allowance: 0,
      fuelLiters: undefined,
      items: [makeJobItem({ product: '23', qty: 0 })],
    })
    const patches = computeReconcilePatches(row3FromRealFile, booking)
    expect(patches).toEqual(
      expect.arrayContaining([
        { field: 'ค่าเที่ยว', from: 0, to: 33000 },
        { field: 'เบี้ยเลี้ยง', from: 0, to: 750 },
        { field: 'น้ำมัน (ลิตร)', from: 0, to: 38 },
        { field: 'จำนวนตัน', from: 0, to: 0.4 },
      ])
    )
  })

  it('ไม่แตะ field ที่มีค่าอยู่แล้ว แม้จะไม่ตรงกับไฟล์ก็ตาม (กันเขียนทับข้อมูลที่ถูกต้องอยู่แล้ว)', () => {
    const booking = makeBooking({
      tripFee: 99999,
      allowance: 500,
      fuelLiters: 20,
      items: [makeJobItem({ product: '23', qty: 5 })],
    })
    const patches = computeReconcilePatches(row3FromRealFile, booking)
    expect(patches).toHaveLength(0)
  })

  it('เติมเฉพาะ field ที่ว่าง โดยไม่แตะ field อื่นที่มีค่าอยู่แล้วในงานเดียวกัน', () => {
    const booking = makeBooking({
      tripFee: 0,
      allowance: 750, // มีอยู่แล้ว ไม่ควรถูกแตะ
      fuelLiters: undefined,
      items: [makeJobItem({ product: '23', qty: 0 })],
    })
    const patches = computeReconcilePatches(row3FromRealFile, booking)
    const fields = patches.map((p) => p.field)
    expect(fields).toContain('ค่าเที่ยว')
    expect(fields).toContain('น้ำมัน (ลิตร)')
    expect(fields).toContain('จำนวนตัน')
    expect(fields).not.toContain('เบี้ยเลี้ยง')
  })
})
