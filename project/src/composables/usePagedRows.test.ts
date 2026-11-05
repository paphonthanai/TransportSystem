import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePagedRows } from './usePagedRows'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('usePagedRows', () => {
  it('ค่าเริ่มต้น 20 แถว เปลี่ยนหน้า/จำนวนแถวแล้วได้แถวถูกต้อง', async () => {
    const { page, perPage, pagedRows } = usePagedRows(ref(range(120)))
    expect(pagedRows.value).toEqual(range(20))
    page.value = 2
    expect(pagedRows.value[0]).toBe(20)
    perPage.value = 100
    await nextTick()
    expect(page.value).toBe(1)
    expect(pagedRows.value).toHaveLength(100)
  })

  it('แถวลดลงจนหน้าปัจจุบันไม่มีแล้ว ถอยมาหน้าสุดท้าย', async () => {
    const rows = ref(range(45))
    const { page, pagedRows } = usePagedRows(rows)
    page.value = 3
    rows.value = range(25)
    await nextTick()
    expect(page.value).toBe(2)
    expect(pagedRows.value).toEqual([20, 21, 22, 23, 24])
  })
})
