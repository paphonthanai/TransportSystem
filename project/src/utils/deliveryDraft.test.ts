import { describe, it, expect, beforeEach } from 'vitest'
import { clearDeliveryDraft, loadDeliveryDraft, saveDeliveryDraft } from './deliveryDraft'

beforeEach(() => localStorage.clear())

describe('deliveryDraft — จำขั้นตอนส่งของเมื่อหน้าเว็บถูกโหลดใหม่', () => {
  it('บันทึกแล้วอ่านกลับได้ แยกตามงาน และล้างได้', () => {
    saveDeliveryDraft('job-1', { itemId: 'i1', step: 'note', goodsUrl: 'u', extraUrls: ['x'] })
    expect(loadDeliveryDraft('job-1')).toEqual({ itemId: 'i1', step: 'note', goodsUrl: 'u', extraUrls: ['x'] })
    expect(loadDeliveryDraft('job-2')).toBeNull()
    clearDeliveryDraft('job-1')
    expect(loadDeliveryDraft('job-1')).toBeNull()
  })

  it('ข้อมูลเสียในเครื่อง = เหมือนไม่มี draft ไม่พัง', () => {
    localStorage.setItem('driver-delivery-draft:job-1', '{bad json')
    expect(loadDeliveryDraft('job-1')).toBeNull()
    localStorage.setItem('driver-delivery-draft:job-1', JSON.stringify({ itemId: 'i1', step: 'อื่น' }))
    expect(loadDeliveryDraft('job-1')).toBeNull()
  })
})
