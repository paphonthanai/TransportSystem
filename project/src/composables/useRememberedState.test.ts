import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick, ref, watch } from 'vue'
import { useRememberedState, __clearRememberedState } from './useRememberedState'
import { usePagedRows } from './usePagedRows'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

beforeEach(() => __clearRememberedState())

describe('useRememberedState — กลับมาจากหน้าแก้ไขแล้วตัวกรองยังอยู่', () => {
  it('ออกจากหน้าแล้วเปิดใหม่ (setup ใหม่) ได้คำค้น/ตัวกรองเดิม', async () => {
    const search = ref('')
    const filters = ref({ customer: '', price: '' })
    useRememberedState('page-a', { search, filters })
    search.value = 'SH2026'
    filters.value.customer = 'ลูกค้า ก'
    await nextTick()

    // เปิดหน้าใหม่
    const search2 = ref('')
    const filters2 = ref({ customer: '', price: '', site: '' })
    useRememberedState('page-a', { search: search2, filters: filters2 })
    expect(search2.value).toBe('SH2026')
    // field ที่เพิ่มใหม่ภายหลังยังได้ค่าเริ่มต้น
    expect(filters2.value).toEqual({ customer: 'ลูกค้า ก', price: '', site: '' })
  })

  it('คนละหน้า (key ต่างกัน) ไม่ปนกัน และค่าที่ชนิดไม่ตรงถูกข้าม', async () => {
    const a = ref('x')
    useRememberedState('page-b', { a })
    a.value = 'จำไว้'
    await nextTick()
    const other = ref('')
    useRememberedState('page-c', { a: other })
    expect(other.value).toBe('')
    const wrongType = ref<unknown>({ x: 1 })
    useRememberedState('page-b', { a: wrongType })
    expect(wrongType.value).toEqual({ x: 1 })
    // union number | '' (ช่องราคาตั้งแต่) จำได้ทั้งสองแบบ
    const priceMin = ref<number | ''>('')
    useRememberedState('page-d', { priceMin })
    priceMin.value = 500
    await nextTick()
    const priceMin2 = ref<number | ''>('')
    useRememberedState('page-d', { priceMin: priceMin2 })
    expect(priceMin2.value).toBe(500)
  })

  it('usePagedRows จำหน้าที่เปิดอยู่ และ watcher รีเซ็ตหน้าที่สร้างทีหลังไม่ทำให้หน้าเด้งกลับหน้า 1', async () => {
    const rows = ref(range(120))
    const first = usePagedRows(rows, 'jobs')
    first.perPage.value = 50
    await nextTick()
    first.page.value = 3
    await nextTick()

    const filters = ref({ q: '' })
    useRememberedState('jobs', { filters })
    const again = usePagedRows(rows, 'jobs')
    watch(filters, () => (again.page.value = 1), { deep: true })
    await nextTick()
    expect(again.perPage.value).toBe(50)
    expect(again.page.value).toBe(3)
    expect(again.pagedRows.value[0]).toBe(100)
  })
})
