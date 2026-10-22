import { describe, it, expect } from 'vitest'
import { pruneResolvedNote } from './bookingNote'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'

describe('pruneResolvedNote', () => {
  const note = 'ต้องกรอกเพิ่ม: เบี้ยเลี้ยง | ต้องกรอกเพิ่ม: ราคาปูน'

  it('ยังไม่กรอก = หมายเหตุอยู่ครบ', () => {
    expect(pruneResolvedNote(makeBooking({ note, allowance: 0, tripFee: 0 }))).toBe(note)
  })

  it('กรอกบางช่อง = ตัดเฉพาะท่อนที่กรอกแล้ว', () => {
    expect(pruneResolvedNote(makeBooking({ note, allowance: 300, tripFee: 0 }))).toBe('ต้องกรอกเพิ่ม: ราคาปูน')
  })

  it('กรอกครบ = หมายเหตุหายทั้งหมด (ปุ่ม "!" หาย) แต่หมายเหตุที่พิมพ์เองยังอยู่', () => {
    expect(pruneResolvedNote(makeBooking({ note, allowance: 300, tripFee: 3000 }))).toBeUndefined()
    expect(pruneResolvedNote(makeBooking({ note: `ส่งก่อนเที่ยง | ${note}`, allowance: 300, tripFee: 3000 }))).toBe('ส่งก่อนเที่ยง')
  })

  it('จำนวนตัน/อำเภอ-จังหวัด หายเมื่อรายการมีข้อมูลแล้ว', () => {
    const b = makeBooking({ note: 'ต้องกรอกเพิ่ม: จำนวนตัน | ต้องกรอกเพิ่ม: อำเภอ/จังหวัด', items: [makeJobItem({ qty: 0, province: '', district: '' })] })
    expect(pruneResolvedNote(b)).toBe(b.note)
    b.items = [makeJobItem({ qty: 12 })]
    expect(pruneResolvedNote(b)).toBeUndefined()
  })
})
