import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BookingCategory } from '@/types'

/**
 * ฉบับร่างแถวงานที่ส่งต่อจากหน้า "ตารางลงงาน" (BookingSheetView) ไปยังหน้า Booking เพื่อเข้าขั้นตอนนำเข้าเดิม
 * (พรีวิว/คำเตือน/ยืนยันสร้างงาน) โดยไม่ต้องผ่านไฟล์ Excel — ใช้ pipeline เดียวกับ "นำเข้า Excel" ทุกประการ
 * เก็บแค่ในหน่วยความจำ (หายเมื่อรีเฟรช) ตัวข้อมูลที่กรอกจริงถูกเก็บไว้ที่หน้าตารางลงงานเองแล้ว
 */
export interface ImportDraft {
  fleet: BookingCategory
  /** วันที่ลงงานของทั้งชุด รูปแบบ YYYY-MM-DD (ว่าง = ไม่กำหนด) */
  shipDate: string
  /** แถวดิบ คีย์ = ชื่อหัวคอลัมน์เดียวกับไฟล์นำเข้า (IMPORT_HEADERS) */
  rows: Record<string, string>[]
}

export const useImportDraftStore = defineStore('importDraft', () => {
  const draft = ref<ImportDraft | null>(null)

  function set(value: ImportDraft) {
    draft.value = value
  }

  /** หยิบฉบับร่างของ fleet นี้ออกไปใช้ (ใช้ครั้งเดียว) — คืน null ถ้าไม่มี/เป็นของ fleet อื่น */
  function take(fleet: BookingCategory): ImportDraft | null {
    const current = draft.value
    if (!current || current.fleet !== fleet) return null
    draft.value = null
    return current
  }

  return { draft, set, take }
})
