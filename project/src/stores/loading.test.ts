import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLoadingStore } from './loading'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('loading store', () => {
  it('busy เมื่อกำลังเปลี่ยนหน้า หรือมีงานโหลดข้อมูลค้าง และกลับเป็น false เมื่อจบทั้งหมด', () => {
    const l = useLoadingStore()
    expect(l.busy).toBe(false)

    l.begin()
    l.begin()
    expect(l.busy).toBe(true)
    l.end()
    expect(l.busy).toBe(true)
    l.end()
    expect(l.busy).toBe(false)

    l.routeLoading = true
    expect(l.busy).toBe(true)
    l.routeLoading = false
    expect(l.busy).toBe(false)
  })

  it('end เกินจำนวน begin ไม่ทำให้ติดลบ', () => {
    const l = useLoadingStore()
    l.end()
    expect(l.pending).toBe(0)
    l.begin()
    expect(l.busy).toBe(true)
  })
})
