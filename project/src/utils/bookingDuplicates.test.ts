import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { findDuplicateGroups, docNoKey, bookingDocNoKey, isDuplicateGroupDismissed } from './bookingDuplicates'
import { makeBooking, makeJobItem } from '../../tests/fixtures/booking'
import { useBookingStore } from '@/stores/booking'

const job = (over: Record<string, unknown> = {}) =>
  makeBooking({
    category: 'cements',
    customer: 'บจก. เอ',
    customerDocNo: 'I-001',
    reference: 'SH-001',
    driverName: 'สมชาย ใจดี',
    loadingDate: new Date(2026, 9, 5, 8),
    items: [makeJobItem({ siteName: 'ไซต์ A', product: '23', qty: 10 })],
    ...over,
  })

describe('findDuplicateGroups — ตรวจซ้ำด้วยเลขที่เอกสารลูกค้า', () => {
  it('ลูกค้าเดียวกัน เลขที่เอกสารเดียวกัน = กลุ่มซ้ำ (ไม่สนชิพเม้น/คนขับ/วัน) เรียงงานเก่าก่อน', () => {
    const a = job({ docNo: 'A', createdAt: new Date(2026, 9, 5, 9) })
    const b = job({ docNo: 'B', createdAt: new Date(2026, 9, 5, 10), driverName: 'อื่น', customerDocNo: ' i-001 ', reference: 'SH-999' })
    const groups = findDuplicateGroups([b, a])
    expect(groups).toHaveLength(1)
    expect(groups[0].bookings.map((x) => x.docNo)).toEqual(['A', 'B'])
  })

  it('เลขชิพเม้นเดียวกันแต่เลขที่เอกสารต่างกัน = ไม่ใช่งานซ้ำ (1 ชิพเม้นมีหลายเอกสาร)', () => {
    expect(findDuplicateGroups([job({ docNo: 'A' }), job({ docNo: 'B', customerDocNo: 'I-002' })])).toHaveLength(0)
  })

  it('ไม่มีเลขที่เอกสารลูกค้า = ไม่ตรวจ (ไม่ใช้ docNo ที่ระบบรันเอง)', () => {
    expect(findDuplicateGroups([job({ docNo: 'X', customerDocNo: undefined }), job({ docNo: 'X', customerDocNo: undefined })])).toHaveLength(0)
  })

  it('เลขที่เอกสารเดียวกันแต่คนละลูกค้า = ไม่ใช่งานซ้ำ', () => {
    expect(findDuplicateGroups([job({ docNo: 'A' }), job({ docNo: 'B', customer: 'บจก. บี' })])).toHaveLength(0)
  })

  it('key ของแถว import ตรงกับงานที่มีเลขที่เอกสารเดียวกัน (ไม่สนช่องว่าง/ตัวพิมพ์)', () => {
    expect(docNoKey('บจก.  เอ', 'i-001')).toBe(bookingDocNoKey(job()))
    expect(docNoKey('บจก. เอ', '')).toBe('')
  })
})

/** บั๊กจริง: กด "ไม่ใช่งานซ้ำ" แล้วบางทีเด้งกลับมาอีก (จำไว้แค่ในเบราว์เซอร์เครื่องเดียว + key ผูกกับรายชื่องาน) */
describe('ไม่ใช่งานซ้ำ — จำไว้ที่ตัวงาน', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('กดแล้วกลุ่มหายถาวร (ข้อมูลอยู่ที่งาน ทุกเครื่องเห็นเหมือนกัน)', () => {
    const store = useBookingStore()
    store.bookings.push(job({ docNo: 'A' }), job({ docNo: 'B' }))
    const [group] = findDuplicateGroups(store.bookings)
    store.markNotDuplicate(group.bookings.map((b) => b.id), group.key)
    expect(store.bookings.every((b) => b.notDuplicateKey === group.key)).toBe(true)
    expect(findDuplicateGroups(store.bookings).filter((g) => !isDuplicateGroupDismissed(g))).toHaveLength(0)
  })

  it('มีงานใหม่เลขที่เอกสารเดียวกันเข้ามา = เตือนใหม่', () => {
    const store = useBookingStore()
    store.bookings.push(job({ docNo: 'A' }), job({ docNo: 'B' }))
    const [group] = findDuplicateGroups(store.bookings)
    store.markNotDuplicate(group.bookings.map((b) => b.id), group.key)
    store.bookings.push(job({ docNo: 'C' }))
    expect(findDuplicateGroups(store.bookings).filter((g) => !isDuplicateGroupDismissed(g))).toHaveLength(1)
  })

  it('แก้เลขที่เอกสารให้ซ้ำกับงานอื่นทีหลัง = เตือนใหม่ (key เก่าใช้ไม่ได้)', () => {
    const store = useBookingStore()
    store.bookings.push(job({ docNo: 'A' }), job({ docNo: 'B' }), job({ docNo: 'C', customerDocNo: 'I-777' }), job({ docNo: 'D', customerDocNo: 'I-777' }))
    findDuplicateGroups(store.bookings).forEach((g) => store.markNotDuplicate(g.bookings.map((b) => b.id), g.key))
    store.bookings.find((b) => b.docNo === 'C')!.customerDocNo = 'I-001'
    const active = findDuplicateGroups(store.bookings).filter((g) => !isDuplicateGroupDismissed(g))
    expect(active.map((g) => g.bookings.map((b) => b.docNo))).toEqual([['A', 'B', 'C']])
  })
})
