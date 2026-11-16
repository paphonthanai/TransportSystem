import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore, type SalesDocument, type SalesDocumentItem } from './salesDocuments'
import { salesDocumentItemRepository } from '@/repositories/salesDocumentItemRepository'

/**
 * บั๊กจริง (INV202611160001): กดบันทึกใบแจ้งหนี้ 2 ครั้งติดกัน (~100ms) — รอบแรกเขียนรายการทีละแถว ระหว่างนั้น snapshot จาก
 * Firestore มาถึงพร้อมรายการรอบแรก "บางส่วน" (57 จาก 97 แถว) store เอามาแทนทั้งชุดและลืมแถวที่ยังเขียนไม่เสร็จ รอบที่สองจึง
 * ลบได้แค่แถวที่รู้จัก แถวที่เหลือค้างบนเซิร์ฟเวอร์ ยอดในหน้าแก้ไข (ผลรวมรายการ) ไม่ตรงกับยอดในหน้า List (doc.amount)
 */
let emitItems: ((items: SalesDocumentItem[]) => void) | undefined

beforeEach(() => {
  vi.restoreAllMocks()
  emitItems = undefined
  vi.spyOn(salesDocumentItemRepository, 'subscribe').mockImplementation((onData: any) => {
    emitItems = onData
    onData([])
    return () => {}
  })
  setActivePinia(createPinia())
})

const row = (n: number) => ({ description: `เที่ยว ${n}`, qty: 1, unit: 'เที่ยว', unitPrice: 1000, amount: 1000, deliveryNo: `CM${n}` })

const draftInvoice = (): SalesDocument =>
  ({
    id: 'sdocINV1',
    type: 'TAX_INVOICE',
    number: 'INV-TEST-1',
    customer: 'ลูกค้า ก',
    status: 'DRAFT',
    date: new Date('2026-11-16'),
    amount: 0,
    bookingIds: [],
    createdAt: new Date('2026-11-16'),
  }) as SalesDocument

const save = (store: ReturnType<typeof useSalesDocumentsStore>, rows: ReturnType<typeof row>[]) =>
  store.updateTaxInvoiceManual('sdocINV1', { customer: 'ลูกค้า ก', items: rows } as any)

describe('บันทึกรายการเอกสารซ้ำเร็วๆ ระหว่างที่ snapshot ยังมาไม่ครบ ต้องไม่ทิ้งแถวค้าง', () => {
  it('snapshot ที่มีรายการรอบก่อนแค่บางส่วน ไม่ทำให้ลืมแถวที่ยังเขียนไม่เสร็จ — บันทึกรอบถัดไปลบแถวรอบก่อนครบทุกแถว', async () => {
    const store = useSalesDocumentsStore()
    await vi.waitFor(() => expect(store.loading).toBe(false))
    const set = vi.spyOn(salesDocumentItemRepository, 'set').mockResolvedValue()
    const del = vi.spyOn(salesDocumentItemRepository, 'delete').mockResolvedValue()
    store.documents.push(draftInvoice())
    await nextTick()

    // บันทึกรอบแรก 5 แถว
    save(store, [1, 2, 3, 4, 5].map(row))
    await nextTick()
    const firstIds = store.itemsForDocument('sdocINV1').map((i) => i.id)
    expect(firstIds).toHaveLength(5)
    expect(set).toHaveBeenCalledTimes(5)

    // snapshot ระหว่างทาง: เซิร์ฟเวอร์/แคชเห็นรอบแรกแค่ 3 แถว
    const partial = store.itemsForDocument('sdocINV1').slice(0, 3).map((i) => ({ ...i }))
    emitItems!(partial)
    await nextTick()
    // หน้าแก้ไขที่เปิดตอนนี้ต้องยังเห็นครบ 5 แถว (ไม่ใช่ 3)
    expect(store.itemsForDocument('sdocINV1')).toHaveLength(5)

    // บันทึกรอบสอง (กดซ้ำ) — ต้องลบแถวรอบแรกครบทั้ง 5 แถว
    save(store, [1, 2, 3, 4, 5].map(row))
    await nextTick()
    const deleted = del.mock.calls.map((c) => c[0])
    expect([...deleted].sort()).toEqual([...firstIds].sort())
    expect(store.itemsForDocument('sdocINV1')).toHaveLength(5)
  })

  it('แถวที่สั่งลบไปแล้ว (ยังรอเซิร์ฟเวอร์) ไม่โผล่กลับมาจาก snapshot ที่ยังเห็นแถวนั้นอยู่', async () => {
    const store = useSalesDocumentsStore()
    await vi.waitFor(() => expect(store.loading).toBe(false))
    vi.spyOn(salesDocumentItemRepository, 'set').mockResolvedValue()
    vi.spyOn(salesDocumentItemRepository, 'delete').mockImplementation(() => new Promise(() => {})) // ลบค้าง (ยังไม่ตอบ)
    store.documents.push(draftInvoice())
    await nextTick()
    save(store, [1, 2, 3].map(row))
    await nextTick()
    const oldItems = store.itemsForDocument('sdocINV1').map((i) => ({ ...i }))
    save(store, [1, 2, 3].map(row))
    await nextTick()
    const newItems = store.itemsForDocument('sdocINV1').map((i) => ({ ...i }))
    // snapshot ที่ยังมีทั้งแถวเก่า (ลบยังไม่เสร็จ) และแถวใหม่
    emitItems!([...oldItems, ...newItems])
    await nextTick()
    expect(store.itemsForDocument('sdocINV1').map((i) => i.id).sort()).toEqual(newItems.map((i) => i.id).sort())
  })
})
