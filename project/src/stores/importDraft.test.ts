import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useImportDraftStore } from './importDraft'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('importDraft', () => {
  it('take คืนฉบับร่างของ fleet เดียวกันครั้งเดียว แล้วล้างทิ้ง', () => {
    const store = useImportDraftStore()
    store.set({ fleet: 'cements', shipDate: '2026-10-11', rows: [{ 'สถานที่ส่งสินค้า': 'ไซต์ A' }] })

    const first = store.take('cements')
    expect(first?.rows).toHaveLength(1)
    expect(first?.shipDate).toBe('2026-10-11')
    expect(store.take('cements')).toBeNull()
  })

  it('fleet ไม่ตรง = ไม่หยิบและไม่ล้างฉบับร่าง', () => {
    const store = useImportDraftStore()
    store.set({ fleet: 'cements', shipDate: '', rows: [] })

    expect(store.take('ceramics')).toBeNull()
    expect(store.take('cements')).not.toBeNull()
  })
})
