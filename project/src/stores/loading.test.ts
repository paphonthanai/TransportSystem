import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { trackLoading, useLoadingStore } from './loading'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('loading store', () => {
  it('busy เมื่อกำลังเปลี่ยนหน้า หรือมีงานโหลดข้อมูลค้าง และกลับเป็น false เมื่อจบทั้งหมด', () => {
    const l = useLoadingStore()
    expect(l.busy).toBe(false)

    const a = l.begin()
    const b = l.begin()
    expect(l.busy).toBe(true)
    l.end(a)
    expect(l.busy).toBe(true)
    l.end(b)
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

  it('pagePending นับเฉพาะงานโหลดของหน้าปัจจุบัน — งานค้างของหน้าก่อนหน้าไม่ทำให้หน้าใหม่ค้าง', () => {
    const l = useLoadingStore()
    const old = l.begin() // งานของหน้าแรก
    expect(l.pagePending).toBe(1)

    l.nextPage() // เปลี่ยนไปหน้าที่สอง
    expect(l.pagePending).toBe(0) // งานเก่าไม่นับกับหน้าใหม่
    expect(l.pending).toBe(1) // แต่ยังนับรวมสำหรับแถบด้านบน

    const mine = l.begin() // งานของหน้าที่สอง
    expect(l.pagePending).toBe(1)
    l.end(old) // งานของหน้าแรกจบทีหลัง ต้องไม่ไปลดงานของหน้าที่สอง
    expect(l.pagePending).toBe(1)
    l.end(mine)
    expect(l.pagePending).toBe(0)
    expect(l.pending).toBe(0)
  })
})

describe('trackLoading', () => {
  it('นับเป็นกำลังโหลดจน promise จบ (สำเร็จ) แล้วคืนค่าเดิม', async () => {
    const l = useLoadingStore()
    let resolve!: (v: number) => void
    const task = new Promise<number>((r) => (resolve = r))

    const tracked = trackLoading(task)
    expect(l.pagePending).toBe(1)
    resolve(42)
    expect(await tracked).toBe(42)
    expect(l.pagePending).toBe(0)
  })

  it('promise ล้มเหลว: ยังหยุดนับ และส่ง error ต่อเหมือนเดิม', async () => {
    const l = useLoadingStore()
    await expect(trackLoading(Promise.reject(new Error('offline')))).rejects.toThrow('offline')
    expect(l.pending).toBe(0)
  })

  it('จบหลังเปลี่ยนหน้าแล้ว: ลดงานของหน้าที่เริ่มมันเท่านั้น', async () => {
    const l = useLoadingStore()
    let resolve!: () => void
    const tracked = trackLoading(new Promise<void>((r) => (resolve = r)))
    l.nextPage()
    const mine = l.begin()

    resolve()
    await tracked
    expect(l.pagePending).toBe(1) // งานของหน้าใหม่ยังอยู่
    l.end(mine)
    expect(l.pending).toBe(0)
  })
})
