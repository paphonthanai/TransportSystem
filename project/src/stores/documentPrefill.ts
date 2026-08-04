import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PriceDisplay } from './documentSettings'
import type { PaymentTermMode, SalesDocumentItem, SalesDocumentType } from './salesDocuments'

/**
 * ส่งข้อมูลเอกสารต้นทาง (ใบเสนอราคา/ใบวางบิล ฯลฯ) เป็น JSON payload ไปยังหน้าสร้างเอกสารปลายทาง โดยไม่ผ่าน query
 * string (ข้อมูลรายการสินค้า/ที่อยู่ยาวเกินจะเข้ารหัสใน URL ได้สะอาด) — เก็บใน memory ชั่วคราวเท่านั้น ไม่ persist
 * เพราะเป็นการส่งต่อครั้งเดียวตอนกดเมนูในดรอปดาวน์สถานะ แล้วอ่าน/เคลียร์ทิ้งทันทีที่หน้าปลายทางโหลดเสร็จ
 */
export interface DocumentPrefillPayload {
  sourceType: SalesDocumentType
  sourceId: string
  sourceNumber: string
  customer: string
  items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>
  reference?: string
  creditDays?: number
  paymentTermMode?: PaymentTermMode
  customerAddress?: string
  customerZipCode?: string
  customerTaxId?: string
  customerBranchName?: string
  project?: string
  salesperson?: string
  currencyCode?: string
  warehouse?: string
  priceMode?: PriceDisplay
  description?: string
  note?: string
  internalNote?: string
  attachmentImage?: string
  useESignature?: boolean
  discountTotal?: number
  vatAmount?: number
  whtAmount?: number
  /** ใบวางบิล → ใบแจ้งหนี้ เท่านั้น: งานขนส่งที่ผูกกับใบวางบิลต้นทาง ต้องพ่วงไปกับใบแจ้งหนี้ใหม่ด้วย */
  bookingIds?: string[]
}

export const useDocumentPrefillStore = defineStore('documentPrefill', () => {
  const payload = ref<DocumentPrefillPayload | null>(null)

  function setPrefill(data: DocumentPrefillPayload) {
    payload.value = data
  }

  /**
   * อ่านค่าแล้วเคลียร์ทิ้งทันที (ใช้ได้ครั้งเดียวต่อการ navigate หนึ่งครั้ง กันข้อมูลเก่าค้างไปโผล่ผิดหน้า)
   * ระบุ allowedSourceTypes เพื่อกันเคสข้อมูลเก่าจาก flow อื่นหลุดมาโผล่ผิดฟอร์ม (เช่น payload จากใบวางบิลไปโผล่ในฟอร์มใบเสร็จ)
   */
  function consumePrefill(allowedSourceTypes?: SalesDocumentType[]): DocumentPrefillPayload | null {
    const data = payload.value
    payload.value = null
    if (!data) return null
    if (allowedSourceTypes && !allowedSourceTypes.includes(data.sourceType)) return null
    return data
  }

  return { payload, setPrefill, consumePrefill }
})
