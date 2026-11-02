/**
 * ความคืบหน้าการส่งของจุดที่คนขับกำลังทำอยู่ เก็บในเครื่อง — ระหว่างเปิดกล้อง มือถือสเปกต่ำมักปิดหน้าเว็บทิ้งเพื่อคืนหน่วยความจำ
 * กลับมาหน้าเว็บจึงโหลดใหม่ ถ้าไม่จำไว้รูปที่อัปโหลดแล้ว/ขั้นตอนจะหายหมดเหมือนถูกย้อนกลับ (ดู DriverJobDetailView.vue)
 * localStorage ใช้ไม่ได้ (โหมดส่วนตัว/เต็ม) = ทำงานต่อได้ตามปกติ แค่จำไม่ได้
 */
export interface DeliveryDraft {
  itemId: string
  step: 'goods' | 'note'
  goodsUrl?: string
  noteUrl?: string
  extraUrls: string[]
}

const keyOf = (bookingId: string) => `driver-delivery-draft:${bookingId}`

export function loadDeliveryDraft(bookingId: string): DeliveryDraft | null {
  try {
    const raw = localStorage.getItem(keyOf(bookingId))
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (typeof draft?.itemId !== 'string' || (draft.step !== 'goods' && draft.step !== 'note')) return null
    return { ...draft, extraUrls: Array.isArray(draft.extraUrls) ? draft.extraUrls : [] }
  } catch {
    return null
  }
}

export function saveDeliveryDraft(bookingId: string, draft: DeliveryDraft) {
  try {
    localStorage.setItem(keyOf(bookingId), JSON.stringify(draft))
  } catch {
    // จำไม่ได้ก็ส่งของต่อได้ตามปกติ
  }
}

export function clearDeliveryDraft(bookingId: string) {
  try {
    localStorage.removeItem(keyOf(bookingId))
  } catch {
    // ไม่มีอะไรต้องทำ
  }
}
