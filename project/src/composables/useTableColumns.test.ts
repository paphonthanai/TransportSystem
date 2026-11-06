import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTableColumns, type TableColumn } from './useTableColumns'

interface Row {
  id: string
  status: string
  fee?: number
}

const columns: TableColumn<Row>[] = [
  { key: 'status', label: (r) => r.status },
  { key: 'fee', label: (r) => (r.fee ? String(r.fee) : ''), sortValue: (r) => r.fee },
]
const data: Row[] = [
  { id: 'a', status: 'ส่งแล้ว', fee: 300 },
  { id: 'b', status: 'กำลังส่ง' },
  { id: 'c', status: 'ส่งแล้ว', fee: 100 },
  { id: 'd', status: 'รอรับ', fee: 200 },
]
const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('useTableColumns', () => {
  it('ไม่เลือกอะไร = คงลำดับเริ่มต้น', () => {
    expect(ids(useTableColumns(ref(data), columns).rows.value)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('กดหัวตารางวน น้อย→มาก, มาก→น้อย, ลำดับเริ่มต้น และค่าว่างอยู่ท้ายสุดทั้งสองทิศ', () => {
    const t = useTableColumns(ref(data), columns)
    t.toggleSort('fee')
    expect(ids(t.rows.value)).toEqual(['c', 'd', 'a', 'b'])
    t.toggleSort('fee')
    expect(ids(t.rows.value)).toEqual(['a', 'd', 'c', 'b'])
    t.toggleSort('fee')
    expect(ids(t.rows.value)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('กรองได้หลายค่า รวมค่าว่าง (-) และล้างตัวกรองได้', () => {
    const t = useTableColumns(ref(data), columns)
    t.setFilter('status', ['ส่งแล้ว', 'รอรับ'])
    expect(ids(t.rows.value)).toEqual(['a', 'c', 'd'])
    expect(t.hasFilters.value).toBe(true)
    t.clearFilters()
    t.setFilter('fee', ['-'])
    expect(ids(t.rows.value)).toEqual(['b'])
    t.setFilter('fee', [])
    expect(t.hasFilters.value).toBe(false)
    expect(t.rows.value).toHaveLength(4)
  })

  it('ตัวเลือกของคอลัมน์หนึ่งคิดจากการกรองคอลัมน์อื่น ไม่ใช่ตัวเอง', () => {
    const t = useTableColumns(ref(data), columns)
    t.setFilter('status', ['ส่งแล้ว'])
    expect(t.optionsFor('fee')).toEqual(['100', '300'])
    expect(t.optionsFor('status')).toEqual(['กำลังส่ง', 'รอรับ', 'ส่งแล้ว'])
  })
})
