import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDocumentSettingsStore, type PriceDisplay } from './documentSettings'
import { useBookingStore } from './booking'
import { useCustomerStore } from './customers'
import { useContactStore } from './contacts'
import { salesDocumentRepository } from '@/repositories/salesDocumentRepository'
import { salesDocumentItemRepository } from '@/repositories/salesDocumentItemRepository'
import { computeRowAmount, computeRowDiscountBaht, computeRowVat } from '@/utils/documentTotals'
import type { Booking, BillingStatus } from '@/types'

export type SalesDocumentType = 'QUOTATION' | 'SALES_ORDER' | 'BILLING' | 'TAX_INVOICE' | 'RECEIPT' | 'CASH_SALE' | 'PURCHASE_ORDER'
// Future: 'CREDIT_NOTE' | 'DEBIT_NOTE' (Round 3) — leave the union open via this comment, don't build now.

/** QUOTATION เท่านั้น: เงื่อนไขการชำระที่เลือกในฟอร์ม — กำหนดว่าจะให้กรอกจำนวนวันเครดิต/แสดงวันครบกำหนดหรือไม่ */
export type PaymentTermMode = 'CREDIT_DAYS' | 'CASH' | 'CREDIT_NO_DATE'

/** ประเภทเอกสารต้นทางที่ใบเสร็จอ้างอิงตรงได้ — TAX_INVOICE (เดิม) หรือ BILLING ตรงๆ (ข้าม Tax Invoice ไปเลย, ดู createReceiptFromSourceDocs) */
export type ReceiptSourceType = 'TAX_INVOICE' | 'BILLING'

/**
 * หนึ่ง union รวมทุกประเภทเอกสาร แทนที่จะแยก union ต่อประเภท เพราะสถานะของ BILLING ต้องคงค่าเดิมเป๊ะ
 * (มี UI ที่ผูกกับค่าพวกนี้อยู่แล้วจาก BillingView.vue) และ 'PAID' ต้องมีความหมายเดียวกันไม่ว่าจะเป็น
 * BILLING/TAX_INVOICE/CASH_SALE เพื่อให้ยอดรายรับสรุปรวมข้ามประเภทได้ ความถูกต้องของสถานะต่อประเภท
 * ควบคุมโดยฟังก์ชันของ store นี้ ไม่ใช่โดย TypeScript
 */
export type SalesDocumentStatus =
  | 'DRAFT' // QUOTATION + TAX_INVOICE สถานะเริ่มต้น, RECEIPT ใช้เป็น "รอดำเนินการ" ก่อนเก็บเงิน
  | 'WAITING_APPROVAL' // QUOTATION + SALES_ORDER
  | 'APPROVED' // QUOTATION + SALES_ORDER
  | 'REJECTED' // QUOTATION + SALES_ORDER — ไม่อนุมัติ กลับไปแก้ไข/รีเซ็ตได้
  | 'CONVERTED' // QUOTATION + SALES_ORDER (จบ flow อัตโนมัติ — ระบบสร้างเอกสาร/Booking ลูกให้แล้ว)
  | 'PROCESSED' // QUOTATION เท่านั้น — ผู้ใช้กดจบขั้นตอนเองด้วยมือ (ดำเนินการแล้ว) เหลือแค่รีเซ็ตได้
  | 'SENT' // TAX_INVOICE เท่านั้น
  | 'BILLING_PENDING' // BILLING เท่านั้น — คงค่าเดิมจาก BillingBatch.status
  | 'BILLED' // BILLING เท่านั้น — คงค่าเดิม
  | 'WAITING_PAYMENT' // BILLING เท่านั้น — คงค่าเดิม
  | 'PAID' // BILLING (คงค่าเดิม) + TAX_INVOICE + CASH_SALE + RECEIPT (ตั้งค่าตอนเก็บเงิน)
  | 'CLOSED' // BILLING เท่านั้น — คงค่าเดิม
  | 'ISSUED' // PURCHASE_ORDER — แทบไม่มีสถานะย่อย มีแล้วคือออกแล้ว

export interface SalesDocument {
  id: string
  type: SalesDocumentType
  /** เลขที่เอกสาร เช่น QT2569-0001 / VB2569-0001 / INV2569-0001 / RE2569-0001 / CS2569-0001 */
  number: string
  customer: string
  status: SalesDocumentStatus
  date: Date
  amount: number
  /** BILLING/TAX_INVOICE/RECEIPT: งานขนส่งที่เอกสารนี้ครอบคลุม */
  bookingIds: string[]
  /** TAX_INVOICE/RECEIPT: เอกสาร BILLING ต้นทางที่ออกเอกสารนี้มา */
  batchId?: string
  /** RECEIPT ชี้ไปใบแจ้งหนี้ต้นทาง / TAX_INVOICE หรือ BILLING ชี้ไปใบเสนอราคาที่แปลงมา */
  parentDocumentId?: string
  /** QUOTATION/SALES_ORDER/DELIVERY: id ของเอกสารที่ถูกแปลงไปสร้าง (ใบแจ้งหนี้/ใบวางบิล) */
  convertedToDocumentIds?: string[]
  /** BILLING/RECEIPT ที่รวมหลายเอกสารต้นทาง (ใบวางบิลรวม/ใบเสร็จรวม): รายการ id เอกสารต้นทางทั้งหมดที่ถูกนำมารวม */
  sourceDocumentIds?: string[]
  creditDays?: number
  dueDate?: Date
  paidDate?: Date
  /** RECEIPT เท่านั้น: วิธีการรับชำระที่บันทึกตอนกด "เก็บเงิน" เช่น เงินสด/โอนเงิน */
  paymentMethod?: string
  /** BILLING เท่านั้น คงค่าเดิมจาก BillingBatch */
  label?: string
  dateFrom?: Date
  dateTo?: Date
  paymentProofImage?: string
  reference?: string
  vatRate?: number
  vatAmount?: number
  whtRate?: number
  whtAmount?: number
  createdAt: Date
  /** QUOTATION: snapshot ข้อมูลลูกค้า ณ ตอนสร้างเอกสาร (แก้ไขได้อิสระจากสมุดรายชื่อ ไม่ผูก live กับ CustomerRecord) */
  customerAddress?: string
  customerZipCode?: string
  customerTaxId?: string
  customerBranchName?: string
  /** QUOTATION: ชื่อโปรเจ็ค (free text — ระบบยังไม่มี Project entity) */
  project?: string
  /** QUOTATION: ชื่อพนักงานขาย */
  salesperson?: string
  /** QUOTATION: รหัสสกุลเงิน เช่น THB (ระบบรองรับสกุลเดียวในตอนนี้) */
  currencyCode?: string
  /** QUOTATION: คลังสินค้าที่อ้างอิงบนเอกสาร (ระบบยังไม่มีหลายคลัง เก็บเป็น free text) */
  warehouse?: string
  /** QUOTATION: โหมดแสดงราคาของเอกสารนี้โดยเฉพาะ (แยกจาก documentSettingsStore.settings.priceDisplay ที่เป็นค่า default ทั้งระบบ) */
  priceMode?: PriceDisplay
  /** QUOTATION: คำอธิบายสรุปเอกสาร (แยกจากรายละเอียดรายบรรทัด) */
  description?: string
  /** QUOTATION: หมายเหตุที่พิมพ์บนเอกสาร */
  note?: string
  /** QUOTATION: โน้ตภายในบริษัท ไม่พิมพ์บนเอกสาร */
  internalNote?: string
  /** QUOTATION: ไฟล์แนบ (data URL) */
  attachmentImage?: string
  /** QUOTATION: แสดงลายเซ็นอิเล็กทรอนิกส์/ตรายางบนเอกสารหรือไม่ */
  useESignature?: boolean
  /** QUOTATION: ยอดส่วนลดรวม คำนวณจากส่วนลดต่อรายการ ณ ตอนบันทึก */
  discountTotal?: number
  /** QUOTATION: เงื่อนไขการชำระที่เลือกในฟอร์ม (กำหนดว่าจะแสดงช่องจำนวนวัน/วันครบกำหนดหรือไม่) */
  paymentTermMode?: PaymentTermMode
  /**
   * ผู้ติดต่อของลูกค้า (ContactRecord.id) ที่ใช้บนเอกสารนี้ — เก็บเป็น Snapshot ของชื่อ/ตำแหน่ง/เบอร์/อีเมล ณ ตอน
   * ออกเอกสาร (contactName/contactPosition/contactPhone/contactEmail) ตาม pattern เดียวกับ customerAddress/
   * customerZipCode/customerTaxId ด้านบนที่ snapshot ข้อมูลลูกค้าไว้อยู่แล้ว ไม่ผูก live กับ ContactRecord — ถ้า
   * แก้ไขผู้ติดต่อภายหลัง เอกสารเก่าที่ออกไปแล้วจะยังเห็นข้อมูล ณ ตอนออกเอกสารเดิม ไม่เปลี่ยนตาม
   * ห้ามใช้ Current User (authStore) แทนค่านี้เด็ดขาด — เป็นคนละ Entity กัน (ผู้ใช้ระบบ vs ผู้ติดต่อของลูกค้า)
   */
  contactId?: string
  contactName?: string
  contactPosition?: string
  contactPhone?: string
  contactEmail?: string
}

/**
 * ใช้แทน Firestore subcollection ด้วย flat array + FK (documentId) — ใช้เฉพาะ QUOTATION/CASH_SALE เท่านั้น
 * BILLING/TAX_INVOICE/RECEIPT ยังคงดึงรายการจาก bookingIds สด (1 งาน = 1 บรรทัด) เหมือนเดิมที่
 * BillingNoteView.vue/InvoiceDocumentView.vue ทำอยู่แล้ว — ห้ามสร้างแถว item ให้ 3 ประเภทนี้
 */
export interface SalesDocumentItem {
  id: string
  /** FK → SalesDocument.id */
  documentId: string
  description: string
  /** FK → inventory Product.id ถ้าเลือกจาก Product Master */
  productId?: string
  qty: number
  unit: string
  unitPrice: number
  /** ส่วนลดรายการ (%) */
  discountPercent?: number
  /** โหมดส่วนลดรายการนี้ — ไม่มีค่า/'percent' = ใช้ discountPercent, 'fixed' = ใช้ discountAmount (บาท) */
  discountMode?: 'percent' | 'fixed'
  /** ส่วนลดรายการแบบตายตัว (บาท) ใช้เมื่อ discountMode === 'fixed' */
  discountAmount?: number
  /** ยอดที่คำนวณ ณ ตอนบันทึก = qty * unitPrice หักส่วนลดแล้ว ไม่คำนวณสดใหม่ทุกครั้ง */
  amount: number
  vatRate?: number
  /** อัตราภาษีหัก ณ ที่จ่าย (%) ของรายการนี้ ไม่มีค่า/0 = ไม่หัก */
  whtRate?: number
  sortOrder: number
}

/** ค่าที่แก้ไขได้ก่อนสร้างจริง ตอนแปลงใบเสนอราคาเป็นเอกสารอื่น (ดูหน้า QuotationConvertView.vue) */
export interface QuotationConvertOverrides {
  customer?: string
  reference?: string
  /** TAX_INVOICE เท่านั้น */
  creditDays?: number
  items?: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>
}

/**
 * ฟอร์มกรอกเอกสารแบบเต็ม ใช้ร่วมกันทุกหน้า "สร้างใหม่" (BillingFormView/TaxInvoiceFormView/ReceiptFormView)
 * ที่ทำ UI แบบเดียวกับ QuotationFormView.vue — ฟิลด์ตรงกับ createQuotation ทุกตัว ต่างกันแค่ type/status/numbering
 */
export interface ManualDocumentFormData {
  customer: string
  items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>
  number?: string
  date?: Date
  creditDays?: number
  reference?: string
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
  vatRate?: number
  vatAmount?: number
  whtRate?: number
  whtAmount?: number
  paymentTermMode?: PaymentTermMode
  /** RECEIPT เท่านั้น */
  paymentMethod?: string
  /** BILLING/TAX_INVOICE ที่กรอกฟอร์มนี้โดยดึงข้อมูลมาจากใบเสนอราคา — ใช้ผูก parentDocumentId และปิดสถานะใบเสนอราคาต้นทางเป็น CONVERTED */
  sourceQuotationId?: string
  /** TAX_INVOICE ที่กรอกฟอร์มนี้โดยดึงข้อมูลมาจากใบวางบิล — ใช้ผูก parentDocumentId, สำเนา bookingIds และปิดสถานะใบวางบิลต้นทางเป็น BILLED */
  sourceBillingId?: string
  /** ผู้ติดต่อของลูกค้าที่ผู้ใช้เลือกในฟอร์ม (ContactRecord.id) — ถ้าไม่ส่งมา จะ fallback ไปใช้ Primary Contact ของลูกค้ารายนั้นแทน (ดู resolveContactSnapshot) */
  contactId?: string
}

export const useSalesDocumentsStore = defineStore('salesDocuments', () => {
  const documents = ref<SalesDocument[]>([])
  const items = ref<SalesDocumentItem[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  /**
   * Snapshot ผู้ติดต่อของลูกค้า (Customer Contact) มาใส่บนเอกสาร ณ ตอนสร้าง — ถ้าผู้ใช้เลือกผู้ติดต่อเองในฟอร์ม
   * (explicitContactId) ใช้ตัวที่เลือกจริงเสมอ ค้นหาแบบไม่กรอง active เพราะผู้ใช้อาจเลือกไว้ตอนที่ contact ยัง active
   * อยู่ แล้วภายหลังถูกปิดใช้งาน — เอกสารที่ snapshot ไปแล้วต้องไม่เปลี่ยนตาม ถ้าไม่ได้เลือกมาจึง fallback ไปใช้ Primary
   * Contact ของลูกค้ารายนั้นเป็นค่าเริ่มต้นเหมือนเดิม (ดู stores/contacts.ts) — ตั้งใจไม่ใช้ authStore/ผู้ใช้ที่ login
   * อยู่มาแทนค่านี้เด็ดขาด เพราะเป็นคนละ Entity กัน (ผู้ใช้ระบบ vs ผู้ติดต่อของลูกค้า) ถ้าลูกค้ายังไม่มีผู้ติดต่อเลย
   * คืนค่าว่างทั้งหมด (แสดงเป็น "-" ตอน render เท่านั้น ไม่เขียน "-" ลง Firestore)
   */
  function resolveContactSnapshot(
    customerName: string,
    explicitContactId?: string
  ): {
    contactId?: string
    contactName?: string
    contactPosition?: string
    contactPhone?: string
    contactEmail?: string
  } {
    const contactStore = useContactStore()
    let selected = explicitContactId ? contactStore.contacts.find((c) => c.id === explicitContactId) : undefined
    if (!selected) {
      const customerStore = useCustomerStore()
      const customer = customerStore.customers.find((c) => c.name === customerName)
      if (!customer?.id) return {}
      selected = contactStore.primaryContactFor(customer.id) || undefined
    }
    if (!selected) return {}
    return {
      contactId: selected.id,
      contactName: selected.name || undefined,
      contactPosition: selected.position || undefined,
      contactPhone: selected.phone || undefined,
      contactEmail: selected.email || undefined,
    }
  }

  /**
   * Sales document data source: Firestore (แทน localStorage เดิม) เหมือน booking.ts แต่ฟังก์ชันสร้าง/แก้ไข/ลบ
   * เอกสารกระจายอยู่เกือบ 20 จุดในไฟล์นี้ (mutate documents.value/items.value ตรงๆ ทั้ง unshift/find+assign/filter)
   * จึงไม่คุ้มและเสี่ยงเกินไปที่จะรื้อทุกจุดให้เรียก repository เอง — ใช้ deep watcher เปรียบเทียบเนื้อหาต่อ
   * document/item (เหมือน lastKnownBookingJson ใน booking.ts) แล้ว upsert เฉพาะรายการที่เปลี่ยนจริงไป Firestore
   * และลบรายการที่หายไปจาก array (ครอบคลุมทั้งกรณีสร้างใหม่ แก้ไข และลบ โดยไม่ต้องแก้ฟังก์ชันเดิมแม้แต่บรรทัดเดียว)
   */
  const lastKnownDocJson = new Map<string, string>()
  const lastKnownItemJson = new Map<string, string>()

  function applyRemoteDocuments(remote: SalesDocument[]) {
    documents.value = remote
    lastKnownDocJson.clear()
    remote.forEach((d) => lastKnownDocJson.set(d.id, JSON.stringify(d)))
  }

  function applyRemoteItems(remote: SalesDocumentItem[]) {
    items.value = remote
    lastKnownItemJson.clear()
    remote.forEach((i) => lastKnownItemJson.set(i.id, JSON.stringify(i)))
  }

  watch(
    documents,
    (val) => {
      const currentIds = new Set(val.map((d) => d.id))
      val.forEach((d) => {
        const json = JSON.stringify(d)
        if (lastKnownDocJson.get(d.id) === json) return
        lastKnownDocJson.set(d.id, json)
        const { id, ...rest } = d
        salesDocumentRepository.set(id, rest).catch((err: any) => {
          error.value = err?.message || 'บันทึกเอกสารไป Firestore ไม่สำเร็จ'
        })
      })
      lastKnownDocJson.forEach((_json, id) => {
        if (currentIds.has(id)) return
        lastKnownDocJson.delete(id)
        salesDocumentRepository.delete(id).catch((err: any) => {
          error.value = err?.message || 'ลบเอกสารจาก Firestore ไม่สำเร็จ'
        })
      })
    },
    { deep: true }
  )

  watch(
    items,
    (val) => {
      const currentIds = new Set(val.map((i) => i.id))
      val.forEach((i) => {
        const json = JSON.stringify(i)
        if (lastKnownItemJson.get(i.id) === json) return
        lastKnownItemJson.set(i.id, json)
        const { id, ...rest } = i
        salesDocumentItemRepository.set(id, rest).catch((err: any) => {
          error.value = err?.message || 'บันทึกรายการเอกสารไป Firestore ไม่สำเร็จ'
        })
      })
      lastKnownItemJson.forEach((_json, id) => {
        if (currentIds.has(id)) return
        lastKnownItemJson.delete(id)
        salesDocumentItemRepository.delete(id).catch((err: any) => {
          error.value = err?.message || 'ลบรายการเอกสารจาก Firestore ไม่สำเร็จ'
        })
      })
    },
    { deep: true }
  )

  /** ไม่ auto-reseed ข้อมูลตัวอย่าง — collection ว่าง แปลว่ายังไม่มีเอกสารจริง ไม่ใช่ "ยังไม่ได้ migrate" */
  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [docs, docItems] = await Promise.all([salesDocumentRepository.getAll(), salesDocumentItemRepository.getAll()])
      applyRemoteDocuments(docs)
      applyRemoteItems(docItems)
    } catch (err: any) {
      error.value = err?.message || 'โหลดเอกสารจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
    salesDocumentRepository.subscribe(applyRemoteDocuments, (err) => {
      error.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ (เอกสาร)'
    })
    salesDocumentItemRepository.subscribe(applyRemoteItems, (err) => {
      error.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ (รายการเอกสาร)'
    })
  }

  fetchAll()

  const itemsForDocument = (documentId: string) => items.value.filter((i) => i.documentId === documentId).sort((a, b) => a.sortOrder - b.sortOrder)

  const genId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`

  /** เลขที่เอกสาร = คำนำหน้า + วันที่ออกเอกสารแบบเต็ม (ค.ศ. YYYYMMDD) + เลขรัน เช่น BL202608040001 */
  const generateDocNumber = (prefix: string, seq: number, padding: number, date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${prefix}${yyyy}${mm}${dd}${String(seq).padStart(padding, '0')}`
  }

  /** รวมค่า override (จากหน้า QuotationConvertView.vue) เข้ากับข้อมูลต้นทางของใบเสนอราคา ก่อนสร้างเอกสารใหม่ */
  function resolveConvertInputs(doc: SalesDocument, overrides?: QuotationConvertOverrides) {
    const customer = overrides?.customer?.trim() || doc.customer
    /** ค่าเริ่มต้นของเลขที่อ้างอิงเอกสารใหม่ = เลขที่เอกสารต้นทาง (doc.number) ไม่ใช่ reference เดิมของเอกสารต้นทาง
     *  (ซึ่งอาจเป็นค่าที่สืบทอดมาจากเอกสารรุ่นก่อนหน้าอีกที) เพื่อให้ตามสายเอกสารย้อนกลับได้ถูกต้องเสมอ */
    const reference = overrides?.reference !== undefined ? overrides.reference : doc.number
    const itemRows = overrides?.items ?? itemsForDocument(doc.id).map(({ id, documentId, sortOrder, ...rest }) => rest)
    const amount = overrides?.items ? overrides.items.reduce((sum, i) => sum + i.amount, 0) : doc.amount
    return { customer, reference, itemRows, amount }
  }

  function addItemsToDocument(documentId: string, rows: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>) {
    rows.forEach((row, idx) => {
      items.value.push({ ...row, id: genId('sitem'), documentId, sortOrder: idx })
    })
  }

  /**
   * ผูกเอกสารที่สร้างจากฟอร์มกรอกเอง (createBillingManual/createTaxInvoiceManual) กลับไปยังเอกสารต้นทาง เมื่อฟอร์มถูก
   * เปิดมาจากดรอปดาวน์สถานะของใบเสนอราคา/ใบวางบิล (ผ่าน documentPrefillStore) — ปิดสถานะเอกสารต้นทางเหมือนกับที่
   * convertQuotationToBilling/createInvoiceFromQuotation/createInvoiceFromBilling ทำ เพื่อไม่ให้เอกสารต้นทางค้างสถานะเดิม
   */
  function linkManualDocToSource(doc: SalesDocument, data: ManualDocumentFormData) {
    if (data.sourceQuotationId) {
      const quotation = documents.value.find((d) => d.id === data.sourceQuotationId && d.type === 'QUOTATION')
      if (quotation) {
        doc.parentDocumentId = quotation.id
        quotation.status = 'CONVERTED'
        quotation.convertedToDocumentIds = [...(quotation.convertedToDocumentIds || []), doc.id]
      }
    }
    if (data.sourceBillingId) {
      const billing = documents.value.find((d) => d.id === data.sourceBillingId && d.type === 'BILLING')
      if (billing) {
        doc.parentDocumentId = billing.id
        doc.bookingIds = billing.bookingIds
        billing.status = 'BILLED'
        billing.convertedToDocumentIds = [...(billing.convertedToDocumentIds || []), doc.id]
        if (billing.bookingIds.length) {
          const bookingStore = useBookingStore()
          billing.bookingIds.forEach((bid) => {
            const b = bookingStore.bookings.find((bk) => bk.id === bid)
            if (b) b.billingStatus = 'INVOICED'
          })
        }
      }
    }
  }

  function createQuotation(data: {
    customer: string
    items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>
    /** เลขที่เอกสาร กำหนดเองได้ — ถ้าไม่ระบุจะออกเลขอัตโนมัติตามปกติ */
    number?: string
    date?: Date
    creditDays?: number
    reference?: string
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
    paymentTermMode?: PaymentTermMode
  }): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.quotation
    const seq = documents.value.filter((d) => d.type === 'QUOTATION').length + 1
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    const now = new Date()
    const issueDate = data.date || now
    const dueDate = data.creditDays !== undefined ? new Date(issueDate) : undefined
    if (dueDate) dueDate.setDate(dueDate.getDate() + (data.creditDays || 0))
    const doc: SalesDocument = {
      id: genId('sdoc'),
      type: 'QUOTATION',
      number: data.number?.trim() || generateDocNumber(numbering.prefix, seq, numbering.padding, issueDate),
      customer: data.customer,
      status: 'DRAFT',
      date: issueDate,
      amount,
      bookingIds: [],
      creditDays: data.creditDays,
      dueDate,
      reference: data.reference,
      convertedToDocumentIds: [],
      createdAt: now,
      customerAddress: data.customerAddress,
      customerZipCode: data.customerZipCode,
      customerTaxId: data.customerTaxId,
      customerBranchName: data.customerBranchName,
      project: data.project,
      salesperson: data.salesperson,
      currencyCode: data.currencyCode,
      warehouse: data.warehouse,
      priceMode: data.priceMode,
      description: data.description,
      note: data.note,
      internalNote: data.internalNote,
      attachmentImage: data.attachmentImage,
      useESignature: data.useESignature,
      discountTotal: data.discountTotal,
      vatAmount: data.vatAmount,
      whtAmount: data.whtAmount,
      paymentTermMode: data.paymentTermMode,
    }
    documents.value.unshift(doc)
    addItemsToDocument(doc.id, data.items)
    useBookingStore().addLog('สร้างเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  function sendQuotationForApproval(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || doc.status !== 'DRAFT') return
    doc.status = 'WAITING_APPROVAL'
  }

  function approveQuotation(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || doc.status !== 'WAITING_APPROVAL') return
    doc.status = 'APPROVED'
  }

  /** ไม่อนุมัติใบเสนอราคา — เรียกได้จากทุกสถานะก่อนแปลงเป็นเอกสารแล้ว กลับไปแก้ไขหรือรีเซ็ตต่อได้ */
  function rejectQuotation(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || doc.status === 'CONVERTED') return
    doc.status = 'REJECTED'
  }

  /** รีเซ็ตกลับไปเป็นร่าง — ใช้ไม่ได้กับเอกสารที่แปลงเป็นใบแจ้งหนี้/ขายเงินสดไปแล้ว เพราะมีเอกสารลูกผูกอยู่ */
  function resetQuotation(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || doc.status === 'CONVERTED') return
    doc.status = 'DRAFT'
  }

  /** ปิดจบขั้นตอนการออกเอกสารด้วยมือ (ปุ่ม "ดำเนินการแล้ว") — กดได้เฉพาะจากสถานะอนุมัติแล้ว จากนี้ทำได้แค่รีเซ็ต */
  function markQuotationProcessed(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || doc.status !== 'APPROVED') return
    doc.status = 'PROCESSED'
  }

  /** แก้ไขใบเสนอราคา (ก่อนแปลงเป็นเอกสารแล้ว) — แทนที่ field เอกสาร + รายการทั้งหมด ไม่เปลี่ยนเลขที่/สถานะ */
  function updateQuotation(
    id: string,
    data: Omit<Parameters<typeof createQuotation>[0], 'date'> & { date?: Date }
  ): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || doc.status === 'CONVERTED') return null
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    doc.customer = data.customer
    doc.amount = amount
    if (data.number?.trim()) doc.number = data.number.trim()
    if (data.date) doc.date = data.date
    doc.creditDays = data.creditDays
    if (data.creditDays !== undefined) {
      const dueDate = new Date(doc.date)
      dueDate.setDate(dueDate.getDate() + data.creditDays)
      doc.dueDate = dueDate
    } else {
      doc.dueDate = undefined
    }
    doc.paymentTermMode = data.paymentTermMode
    doc.reference = data.reference
    doc.customerAddress = data.customerAddress
    doc.customerZipCode = data.customerZipCode
    doc.customerTaxId = data.customerTaxId
    doc.customerBranchName = data.customerBranchName
    doc.project = data.project
    doc.salesperson = data.salesperson
    doc.currencyCode = data.currencyCode
    doc.warehouse = data.warehouse
    doc.priceMode = data.priceMode
    doc.description = data.description
    doc.note = data.note
    doc.internalNote = data.internalNote
    doc.attachmentImage = data.attachmentImage
    doc.useESignature = data.useESignature
    doc.discountTotal = data.discountTotal
    doc.vatAmount = data.vatAmount
    doc.whtAmount = data.whtAmount
    items.value = items.value.filter((i) => i.documentId !== id)
    addItemsToDocument(id, data.items)
    useBookingStore().addLog('แก้ไขเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  /** สร้างใบเสนอราคาใหม่จากใบเดิม (เลขที่ใหม่ สถานะร่าง ไม่ผูกกับเอกสารที่แปลงไปแล้ว) */
  function duplicateQuotation(id: string): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc) return null
    const sourceItems = itemsForDocument(id).map(({ id: _id, documentId: _documentId, sortOrder: _sortOrder, ...rest }) => rest)
    return createQuotation({
      customer: doc.customer,
      items: sourceItems,
      creditDays: doc.creditDays,
      reference: doc.reference,
      customerAddress: doc.customerAddress,
      customerZipCode: doc.customerZipCode,
      customerTaxId: doc.customerTaxId,
      customerBranchName: doc.customerBranchName,
      project: doc.project,
      salesperson: doc.salesperson,
      currencyCode: doc.currencyCode,
      warehouse: doc.warehouse,
      priceMode: doc.priceMode,
      description: doc.description,
      note: doc.note,
      internalNote: doc.internalNote,
      useESignature: doc.useESignature,
      discountTotal: doc.discountTotal,
      vatAmount: doc.vatAmount,
      whtAmount: doc.whtAmount,
      paymentTermMode: doc.paymentTermMode,
    })
  }

  /** ลบใบเสนอราคา (ไม่กระทบเอกสารลูกที่แปลงไปแล้ว ถ้ามี) */
  function deleteQuotation(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc) return false
    documents.value = documents.value.filter((d) => d.id !== id)
    items.value = items.value.filter((i) => i.documentId !== id)
    return true
  }

  /**
   * ออกใบส่งสินค้า/ใบแจ้งหนี้/ใบกำกับภาษี (TAX_INVOICE) จากใบเสนอราคาที่อนุมัติแล้ว — เป็นฟังก์ชันเฉพาะของ
   * Dropdown การดำเนินการในหน้าใบเสนอราคา แยกจากฟังก์ชันแปลงเอกสารอื่นๆ โดยเจตนา
   * ก่อน Step 5 (ย้าย Billing/Invoice เดิมมาที่ store นี้) เลขที่ใบแจ้งหนี้ยังต้องนับรวมกับ
   * bookingStore.documents ของระบบเดิมด้วย เพราะทั้งสองฝั่งใช้ prefix 'INV' เดียวกัน ไม่งั้นเลขที่จะซ้ำกัน
   */
  function createInvoiceFromQuotation(id: string, overrides?: QuotationConvertOverrides): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || (doc.status !== 'APPROVED' && doc.status !== 'WAITING_APPROVAL')) return null
    const documentSettingsStore = useDocumentSettingsStore()
    const bookingStore = useBookingStore()
    const numbering = documentSettingsStore.settings.numbering.invoice
    const seq = bookingStore.documents.length + documents.value.filter((d) => d.type === 'TAX_INVOICE').length + 1
    const { customer, reference, itemRows, amount } = resolveConvertInputs(doc, overrides)
    const issueDate = new Date()
    const creditDays = overrides?.creditDays ?? doc.creditDays ?? 30
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + creditDays)
    const salesCalcMode = documentSettingsStore.settings.calcMode.sales
    const vatRate = salesCalcMode.vat === 'included' ? 0 : documentSettingsStore.settings.vatRate
    const vatAmount = Math.round((amount * vatRate) / 100)
    const whtRate = salesCalcMode.wht === 'included' ? 0 : documentSettingsStore.settings.whtRate
    const whtAmount = Math.round((amount * whtRate) / 100)
    const invoice: SalesDocument = {
      id: genId('sdoc'),
      type: 'TAX_INVOICE',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, issueDate),
      customer,
      status: 'DRAFT',
      date: issueDate,
      amount,
      bookingIds: [],
      parentDocumentId: doc.id,
      creditDays,
      dueDate,
      reference,
      vatRate,
      vatAmount,
      whtRate,
      whtAmount,
      createdAt: issueDate,
    }
    Object.assign(invoice, resolveContactSnapshot(customer, doc.contactId))
    documents.value.unshift(invoice)
    addItemsToDocument(invoice.id, itemRows)
    doc.status = 'CONVERTED'
    doc.convertedToDocumentIds = [...(doc.convertedToDocumentIds || []), invoice.id]
    bookingStore.addLog('สร้างเอกสาร ' + invoice.number, { docId: invoice.id })
    return invoice
  }

  /** แปลงใบเสนอราคาเป็นขายเงินสด (ใบกำกับภาษี/ใบเสร็จรับเงิน) — ชำระแล้วทันทีตอนสร้าง เหมือน createCashSale ทั่วไป */
  function convertQuotationToCashSale(id: string, overrides?: QuotationConvertOverrides): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || (doc.status !== 'APPROVED' && doc.status !== 'WAITING_APPROVAL')) return null
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.cashSale
    const seq = documents.value.filter((d) => d.type === 'CASH_SALE').length + 1
    const { customer, reference, itemRows, amount } = resolveConvertInputs(doc, overrides)
    const now = new Date()
    const cashSale: SalesDocument = {
      id: genId('sdoc'),
      type: 'CASH_SALE',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'PAID',
      date: now,
      amount,
      bookingIds: [],
      parentDocumentId: doc.id,
      reference,
      paidDate: now,
      createdAt: now,
    }
    documents.value.unshift(cashSale)
    addItemsToDocument(cashSale.id, itemRows)
    doc.status = 'CONVERTED'
    doc.convertedToDocumentIds = [...(doc.convertedToDocumentIds || []), cashSale.id]
    useBookingStore().addLog('สร้างเอกสาร ' + cashSale.number, { docId: cashSale.id })
    return cashSale
  }

  /**
   * แปลงใบเสนอราคาเป็นใบวางบิล (BILLING) — ต่างจาก Billing เดิมใน BillingView.vue ที่ผูกกับ booking eligibility
   * ของงานขนส่งจริง เพราะใบเสนอราคาไม่มีงานขนส่งอ้างอิง จึงสร้างเป็นเอกสาร items แบนเหมือน TAX_INVOICE/CASH_SALE
   * ใช้เลขที่ prefix เดียวกับรายการวางบิลเดิม (VB) แต่กันเลขชนด้วยการนับรวม bookingStore.batches เหมือนที่ทำกับ INV
   */
  function convertQuotationToBilling(id: string, overrides?: QuotationConvertOverrides): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || (doc.status !== 'APPROVED' && doc.status !== 'WAITING_APPROVAL')) return null
    const documentSettingsStore = useDocumentSettingsStore()
    const bookingStore = useBookingStore()
    const numbering = documentSettingsStore.settings.numbering.billingList
    const seq = bookingStore.batches.length + documents.value.filter((d) => d.type === 'BILLING').length + 1
    const { customer, reference, itemRows, amount } = resolveConvertInputs(doc, overrides)
    const now = new Date()
    const billing: SalesDocument = {
      id: genId('sdoc'),
      type: 'BILLING',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'BILLING_PENDING',
      date: now,
      amount,
      bookingIds: [],
      parentDocumentId: doc.id,
      label: `รายการวางบิล ${customer}`,
      dateFrom: now,
      dateTo: now,
      reference,
      createdAt: now,
    }
    Object.assign(billing, resolveContactSnapshot(customer, doc.contactId))
    documents.value.unshift(billing)
    addItemsToDocument(billing.id, itemRows)
    doc.status = 'CONVERTED'
    doc.convertedToDocumentIds = [...(doc.convertedToDocumentIds || []), billing.id]
    bookingStore.addLog('สร้างเอกสาร ' + billing.number, { docId: billing.id })
    return billing
  }

  /** แปลงใบเสนอราคาเป็นใบสั่งซื้อ — ไม่มี workflow ย่อย ออกแล้วถือว่าเสร็จสิ้นทันที (เหมือน RECEIPT) */
  function convertQuotationToPurchaseOrder(id: string, overrides?: QuotationConvertOverrides): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'QUOTATION')
    if (!doc || (doc.status !== 'APPROVED' && doc.status !== 'WAITING_APPROVAL')) return null
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.purchaseOrder
    const seq = documents.value.filter((d) => d.type === 'PURCHASE_ORDER').length + 1
    const { customer, reference, itemRows, amount } = resolveConvertInputs(doc, overrides)
    const now = new Date()
    const po: SalesDocument = {
      id: genId('sdoc'),
      type: 'PURCHASE_ORDER',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'ISSUED',
      date: now,
      amount,
      bookingIds: [],
      parentDocumentId: doc.id,
      reference,
      createdAt: now,
    }
    documents.value.unshift(po)
    addItemsToDocument(po.id, itemRows)
    doc.status = 'CONVERTED'
    doc.convertedToDocumentIds = [...(doc.convertedToDocumentIds || []), po.id]
    useBookingStore().addLog('สร้างเอกสาร ' + po.number, { docId: po.id })
    return po
  }

  /**
   * สร้างระเบียนใบสั่งสินค้า (SALES_ORDER) พร้อมกับ Booking ที่เพิ่งบันทึกในหน้า BookingCreateView.vue — ไม่มี
   * ขั้นอนุมัติแยกต่างหากอีกต่อไป เพราะ "สร้างใบสั่งสินค้า" กับ "สร้างงานขนส่งใหม่" ถูกรวมเป็นการกระทำเดียวกัน
   * (การบันทึกงานคือการยืนยันแล้ว) สถานะจริงของงาน (ยังไม่จัดรถ/กำลังวิ่ง/ส่งเสร็จ) ให้ดูจาก Booking ที่ผูกอยู่ใน
   * bookingIds แทน — status ของ SalesDocument นี้คงที่เป็น CONVERTED เสมอ ใช้แค่เพื่อให้มีรายการโชว์/พิมพ์ได้
   */
  function createSalesOrderForBooking(data: {
    bookingId: string
    customer: string
    amount: number
    reference?: string
    quotationId?: string
    items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>
    /** ผู้ติดต่อของลูกค้าที่ผู้ใช้เลือกในฟอร์มสร้างงาน (BookingCreateView.vue) — ไม่ส่งมาจะ fallback ไปใช้ Primary Contact */
    contactId?: string
  }): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.salesOrder
    const seq = documents.value.filter((d) => d.type === 'SALES_ORDER').length + 1
    const now = new Date()
    /** คำนวณ VAT ระดับเอกสารจาก item.amount/item.vatRate ของแต่ละรายการ (item.amount คำนวณหักส่วนลดไว้แล้ว) —
     *  เดิม createSalesOrderForBooking ไม่เคยเซ็ต vatAmount/vatRate ระดับเอกสารเลย ทำให้พิมพ์ใบสั่งสินค้าแล้ว
     *  ยอดรวมทั้งสิ้นไม่รวม VAT (ต่างจากใบวางบิลที่คำนวณให้ถูกต้องอยู่แล้ว ดู createBillingFromBookings) */
    const vatAmount = Math.round(data.items.reduce((sum, item) => sum + (item.amount * (item.vatRate || 0)) / 100, 0))
    const vatRates = new Set(data.items.map((item) => item.vatRate || 0))
    const vatRate = vatRates.size === 1 ? data.items[0]?.vatRate : undefined
    const salesOrder: SalesDocument = {
      id: genId('sdoc'),
      type: 'SALES_ORDER',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer: data.customer,
      status: 'CONVERTED',
      date: now,
      amount: data.amount,
      vatRate,
      vatAmount,
      bookingIds: [data.bookingId],
      parentDocumentId: data.quotationId,
      reference: data.reference,
      createdAt: now,
    }
    Object.assign(salesOrder, resolveContactSnapshot(data.customer, data.contactId))
    documents.value.unshift(salesOrder)
    addItemsToDocument(salesOrder.id, data.items)
    useBookingStore().addLog('สร้างเอกสาร ' + salesOrder.number, { docId: salesOrder.id, bookingId: data.bookingId })
    if (data.quotationId) {
      const quotation = documents.value.find((d) => d.id === data.quotationId && d.type === 'QUOTATION')
      if (quotation) {
        quotation.status = 'CONVERTED'
        quotation.convertedToDocumentIds = [...(quotation.convertedToDocumentIds || []), salesOrder.id]
      }
    }
    return salesOrder
  }

  /**
   * ซ่อมย้อนหลัง: สร้างใบสั่งสินค้าให้กับงานขนส่งที่ยังไม่มีใบสั่งสินค้าผูกอยู่เลย (เช่น งานที่ถูกสร้างไว้ก่อนหน้านี้
   * ผ่านช่องทางที่ยังไม่ได้สร้างใบสั่งสินค้าคู่กันอัตโนมัติ) ใช้ createSalesOrderForBooking ตัวเดียวกับตอนสร้างงานใหม่
   * เพื่อให้เอกสารที่ได้มีโครงสร้าง/พฤติกรรมเหมือนกันทุกอย่าง ทำงานซ้ำได้อย่างปลอดภัย (idempotent) เพราะเช็คก่อนว่า
   * งานนั้นมีใบสั่งสินค้าอยู่แล้วหรือยัง คืนค่าจำนวนใบสั่งสินค้าที่สร้างเพิ่ม
   */
  function backfillMissingSalesOrders(): number {
    const bookingStore = useBookingStore()
    let created = 0
    bookingStore.bookings.forEach((booking) => {
      const hasSalesOrder = documents.value.some((d) => d.type === 'SALES_ORDER' && d.bookingIds.includes(booking.id))
      if (hasSalesOrder) return
      const amount = booking.agreedPrice || booking.tripFee || 0
      const destinationSummary = booking.items.map((i) => i.siteName).filter(Boolean).join(', ') || '-'
      const salesOrder = createSalesOrderForBooking({
        bookingId: booking.id,
        customer: booking.customer,
        amount,
        reference: booking.po,
        items: [
          {
            description: `${booking.docNo} · ${destinationSummary}`,
            qty: 1,
            unit: 'เที่ยว',
            unitPrice: amount,
            amount,
            discountMode: booking.discountMode,
            discountPercent: booking.discountPercent,
            discountAmount: booking.discountAmount,
            vatRate: booking.vatRate,
          },
        ],
      })
      booking.sourceDocumentId = salesOrder.id
      created++
    })
    return created
  }

  /**
   * ซ่อมยอด VAT ของใบสั่งสินค้าเดิมที่สร้างไว้ก่อนหน้า createSalesOrderForBooking จะเริ่มคำนวณ vatAmount/vatRate
   * ระดับเอกสาร (ดูคอมเมนต์ที่ createSalesOrderForBooking) — ยืนยันจากข้อมูลจริงใน Firestore: ใบสั่งสินค้าที่สร้าง
   * ก่อนแก้จุดนั้นจะไม่มี field vatAmount เลย ทำให้พิมพ์เอกสารแล้วยอดรวมไม่รวม VAT
   *
   * ใช้ engine เดิม (computeRowVat จาก documentTotals.ts ตัวเดียวกับที่ createBillingFromBookings ใช้) คำนวณจาก
   * "รายการที่บันทึกไว้แล้วจริง" ของเอกสารนั้น (itemsForDocument) — ไม่เดา ไม่สร้างสูตรคำนวณ VAT ใหม่แยกเฉพาะ
   * Migration แตะแค่ vatAmount/vatRate เท่านั้น ไม่แตะ amount/discountTotal ที่ถูกต้องอยู่แล้ว ไม่แตะ Booking เลย
   *
   * เงื่อนไข "ต้องซ่อม": vatAmount ยังไม่มีค่า (undefined) เท่านั้น — ถ้ามีค่าอยู่แล้ว (แม้เป็น 0 จริงๆ เพราะงานนั้น
   * ไม่มี VAT) ถือว่าเคยคำนวณแล้ว ไม่แตะซ้ำ — Idempotent เต็มรูปแบบ: รันซ้ำแล้วไม่มีใบไหนเข้าเงื่อนไขอีกเพราะ
   * vatAmount ถูกเติมไปแล้วตั้งแต่รอบแรก
   */
  function repairSalesOrderVat(): { checked: number; repaired: { id: string; number: string; vatAmount: number }[] } {
    const salesOrders = documents.value.filter((d) => d.type === 'SALES_ORDER')
    const repaired: { id: string; number: string; vatAmount: number }[] = []
    salesOrders.forEach((doc) => {
      if (doc.vatAmount !== undefined) return
      const docItems = itemsForDocument(doc.id)
      if (docItems.length === 0) return
      const vatAmount = Math.round(docItems.reduce((sum, item) => sum + computeRowVat(item), 0))
      const vatRates = new Set(docItems.map((item) => item.vatRate || 0))
      const vatRate = vatRates.size === 1 ? docItems[0].vatRate : undefined
      doc.vatAmount = vatAmount
      doc.vatRate = vatRate
      repaired.push({ id: doc.id, number: doc.number, vatAmount })
    })
    if (repaired.length) useBookingStore().addLog(`ซ่อมยอด VAT ของใบสั่งสินค้าเดิม ${repaired.length} ใบ`)
    return { checked: salesOrders.length, repaired }
  }

  /**
   * ซ่อม TAX_INVOICE.parentDocumentId ที่ขาด/ชี้ไปเอกสารที่ไม่มีอยู่จริง — เกิดได้ถ้าข้อมูลถูกย้าย/แก้ไขนอกระบบ
   * จนความสัมพันธ์ตรงขาดไป ทั้งที่ตัวเอกสารยังมี field `reference` เก็บเลขที่ใบวางบิลต้นทางไว้เป็นข้อความอยู่แล้ว
   * (ดู createInvoiceFromBilling ด้านบนที่ set reference มาจาก billing.number ตรงๆ) — ใช้ reference นั้นจับคู่กลับ
   * ไปยัง BILLING.number แบบตรงตัวเป๊ะเท่านั้น ถ้าจับคู่ได้แบบเดียวไม่กำกวมเท่านั้นถึงจะเติม parentDocumentId ให้ พร้อม
   * เติม BILLING.convertedToDocumentIds ย้อนกลับให้ครบทั้งสองทาง — ถ้าจับคู่ไม่ได้/กำกวม (reference ตรงกับหลายใบ)
   * ปล่อยเป็น undefined ไว้เหมือนเดิม ห้ามเดา รายงานเป็น unmatched ให้ผู้ใช้ตรวจเอง
   */
  function repairTaxInvoiceReferences(): {
    checked: number
    repaired: { id: string; number: string; matchedBilling: string }[]
    unmatched: { id: string; number: string; reference?: string }[]
  } {
    const invoices = documents.value.filter((d) => d.type === 'TAX_INVOICE')
    const repaired: { id: string; number: string; matchedBilling: string }[] = []
    const unmatched: { id: string; number: string; reference?: string }[] = []
    invoices.forEach((inv) => {
      const parentExists = inv.parentDocumentId && documents.value.some((d) => d.id === inv.parentDocumentId && d.type === 'BILLING')
      if (parentExists) return
      if (!inv.reference) {
        unmatched.push({ id: inv.id, number: inv.number, reference: inv.reference })
        return
      }
      const candidates = documents.value.filter((d) => d.type === 'BILLING' && d.number === inv.reference)
      if (candidates.length !== 1) {
        unmatched.push({ id: inv.id, number: inv.number, reference: inv.reference })
        return
      }
      const billing = candidates[0]
      inv.parentDocumentId = billing.id
      billing.convertedToDocumentIds = [...new Set([...(billing.convertedToDocumentIds || []), inv.id])]
      repaired.push({ id: inv.id, number: inv.number, matchedBilling: billing.number })
    })
    if (repaired.length) useBookingStore().addLog(`ซ่อม reference ของใบแจ้งหนี้/ใบกำกับภาษีเดิม ${repaired.length} ใบ`)
    return { checked: invoices.length, repaired, unmatched }
  }

  /**
   * ซ่อม RECEIPT.sourceDocumentIds ที่ขาด/ชี้ไปเอกสารที่ไม่มีอยู่จริง — pattern เดียวกับ repairTaxInvoiceReferences
   * ทุกประการ แต่ต้นทางของ Receipt เป็นได้ทั้ง TAX_INVOICE หรือ BILLING (ข้ามขั้นใบแจ้งหนี้ไปเลยก็ได้ ดู
   * createReceiptFromSourceDocs) จึงต้องลองจับคู่ reference กับทั้งสองประเภท — จับคู่ได้แบบเดียวไม่กำกวมเท่านั้นถึง
   * จะเติมให้ ห้ามเดา ไม่แตะ bookingIds/amount/vatAmount ที่มีอยู่แล้วของ Receipt เอง
   */
  function repairReceiptReferences(): {
    checked: number
    repaired: { id: string; number: string; matchedSource: string }[]
    unmatched: { id: string; number: string; reference?: string }[]
  } {
    const receipts = documents.value.filter((d) => d.type === 'RECEIPT')
    const repaired: { id: string; number: string; matchedSource: string }[] = []
    const unmatched: { id: string; number: string; reference?: string }[] = []
    receipts.forEach((rec) => {
      const hasValidSource = (rec.sourceDocumentIds || []).some((id) => documents.value.some((d) => d.id === id))
      if (hasValidSource) return
      if (!rec.reference) {
        unmatched.push({ id: rec.id, number: rec.number, reference: rec.reference })
        return
      }
      const candidates = documents.value.filter((d) => (d.type === 'TAX_INVOICE' || d.type === 'BILLING') && d.number === rec.reference)
      if (candidates.length !== 1) {
        unmatched.push({ id: rec.id, number: rec.number, reference: rec.reference })
        return
      }
      const source = candidates[0]
      rec.sourceDocumentIds = [source.id]
      if (rec.bookingIds.length === 0 && source.bookingIds.length) rec.bookingIds = source.bookingIds
      repaired.push({ id: rec.id, number: rec.number, matchedSource: source.number })
    })
    if (repaired.length) useBookingStore().addLog(`ซ่อม reference ของใบเสร็จรับเงินเดิม ${repaired.length} ใบ`)
    return { checked: receipts.length, repaired, unmatched }
  }

  /**
   * ซ่อม Booking.billingStatus ที่ค้างมาจากระบบวางบิลเดิม (batches/documents เดิมที่เคยเก็บใน localStorage
   * ก่อนย้ายมาใช้ SalesDocument ผ่าน Firestore) — งานที่เคยถูกดึงเข้ารอบบิลเดิมจะมี billingStatus ค้างเป็น
   * IN_BATCH/HOLD/INVOICED/PAID ตลอดไปเพราะไม่มีจุดไหนในระบบปัจจุบันเคลียร์ค่านี้ให้ (removeFromBatch ใน
   * booking.ts เป็นจุดเดียวที่เคลียร์ได้ แต่เข้าถึงได้ทางอ้อมผ่านการ Reset สถานะงานย้อนไปถึง ASSIGNED เท่านั้น
   * ซึ่งไม่ควรเป็นทางเดียวที่ใช้แก้ปัญหานี้ — ดู createBillingFromBookings ด้านล่างที่เช็ค billingStatus ===
   * UNBILLED เป็นเงื่อนไขจำเป็นก่อนสร้างใบวางบิลได้)
   *
   * เงื่อนไข "ถือว่าค้าง ต้องซ่อม": status === DELIVERED, billingStatus มีค่าและไม่ใช่ UNBILLED, และไม่มี
   * SalesDocument ประเภท BILLING/TAX_INVOICE/RECEIPT ของระบบปัจจุบันที่ bookingIds อ้างถึงงานนี้อยู่จริงเลย
   * (ถ้ามีอยู่จริงแปลว่ากำลังอยู่ระหว่างดำเนินการในระบบปัจจุบันจริงๆ ไม่ใช่ค่าที่ค้างมาจากระบบเดิม ห้ามไปแตะ —
   * ป้องกัน Case C ที่มี Billing Note อยู่แล้วไม่ให้ syncBillingReadiness ไปยุ่งด้วย)
   *
   * ทำแค่ 2 อย่างต่องานที่เข้าเงื่อนไข: billingStatus = 'UNBILLED', batchId = undefined — เหมือนที่
   * removeFromBatch ทำเป๊ะ ไม่สร้าง/ลบเอกสารใดๆ ไม่แตะ status ของงานเลย Idempotent เต็มรูปแบบ: รันซ้ำแล้วไม่มี
   * งานไหนเข้าเงื่อนไข "ค้าง" อีก เพราะ billingStatus ถูกซ่อมเป็น UNBILLED ไปแล้วตั้งแต่รอบแรก
   */
  function syncBillingReadiness(): { checked: number; repaired: { bookingId: string; docNo: string; previousBillingStatus: BillingStatus }[] } {
    const bookingStore = useBookingStore()
    const deliveredBookings = bookingStore.bookings.filter((b) => b.status === 'DELIVERED')
    const repaired: { bookingId: string; docNo: string; previousBillingStatus: BillingStatus }[] = []
    deliveredBookings.forEach((b) => {
      if (!b.billingStatus || b.billingStatus === 'UNBILLED') return
      const hasCurrentDocument = documents.value.some(
        (d) => (d.type === 'BILLING' || d.type === 'TAX_INVOICE' || d.type === 'RECEIPT') && d.bookingIds.includes(b.id)
      )
      if (hasCurrentDocument) return
      repaired.push({ bookingId: b.id, docNo: b.docNo, previousBillingStatus: b.billingStatus })
      b.billingStatus = 'UNBILLED'
      b.batchId = undefined
    })
    if (repaired.length) bookingStore.addLog(`ซิงก์สถานะวางบิลที่ค้างจากระบบเดิม ${repaired.length} งาน`)
    return { checked: deliveredBookings.length, repaired }
  }

  /** ลบระเบียนใบสั่งสินค้าออกจากรายการ (ไม่กระทบ Booking ที่ผูกอยู่ — งานขนส่งยังอยู่ตามปกติ) */
  function deleteSalesOrder(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'SALES_ORDER')
    if (!doc) return false
    documents.value = documents.value.filter((d) => d.id !== id)
    items.value = items.value.filter((i) => i.documentId !== id)
    return true
  }

  /** สร้างใบวางบิลแบบกรอกเอง (ไม่ผูกกับ Booking) — ใช้หน้าฟอร์มแบบเดียวกับ QuotationFormView.vue (ดู BillingFormView.vue) */
  function createBillingManual(data: ManualDocumentFormData): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const bookingStore = useBookingStore()
    const numbering = documentSettingsStore.settings.numbering.billingList
    const seq = bookingStore.batches.length + documents.value.filter((d) => d.type === 'BILLING').length + 1
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    const now = new Date()
    const issueDate = data.date || now
    const billing: SalesDocument = {
      id: genId('sdoc'),
      type: 'BILLING',
      number: data.number?.trim() || generateDocNumber(numbering.prefix, seq, numbering.padding, issueDate),
      customer: data.customer,
      status: 'BILLING_PENDING',
      date: issueDate,
      amount,
      bookingIds: [],
      label: `รายการวางบิล ${data.customer}`,
      dateFrom: issueDate,
      dateTo: issueDate,
      reference: data.reference,
      createdAt: now,
      customerAddress: data.customerAddress,
      customerZipCode: data.customerZipCode,
      customerTaxId: data.customerTaxId,
      customerBranchName: data.customerBranchName,
      project: data.project,
      salesperson: data.salesperson,
      currencyCode: data.currencyCode,
      warehouse: data.warehouse,
      priceMode: data.priceMode,
      description: data.description,
      note: data.note,
      internalNote: data.internalNote,
      attachmentImage: data.attachmentImage,
      useESignature: data.useESignature,
      discountTotal: data.discountTotal,
      vatAmount: data.vatAmount,
      whtAmount: data.whtAmount,
      paymentTermMode: data.paymentTermMode,
      creditDays: data.creditDays,
    }
    Object.assign(billing, resolveContactSnapshot(data.customer, data.contactId))
    documents.value.unshift(billing)
    addItemsToDocument(billing.id, data.items)
    linkManualDocToSource(billing, data)
    bookingStore.addLog('สร้างเอกสาร ' + billing.number, { docId: billing.id })
    return billing
  }

  /** แก้ไขใบวางบิล (เฉพาะตอนยังไม่ออกใบแจ้งหนี้ — สถานะ BILLING_PENDING) แทนที่ field เอกสาร + รายการทั้งหมด ไม่เปลี่ยนเลขที่/สถานะ/bookingIds */
  function updateBillingManual(id: string, data: ManualDocumentFormData): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'BILLING')
    if (!doc || doc.status !== 'BILLING_PENDING') return null
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    doc.customer = data.customer
    doc.amount = amount
    if (data.number?.trim()) doc.number = data.number.trim()
    if (data.date) doc.date = data.date
    doc.creditDays = data.creditDays
    doc.reference = data.reference
    doc.customerAddress = data.customerAddress
    doc.customerZipCode = data.customerZipCode
    doc.customerTaxId = data.customerTaxId
    doc.customerBranchName = data.customerBranchName
    doc.project = data.project
    doc.salesperson = data.salesperson
    doc.currencyCode = data.currencyCode
    doc.warehouse = data.warehouse
    doc.priceMode = data.priceMode
    doc.description = data.description
    doc.note = data.note
    doc.internalNote = data.internalNote
    doc.attachmentImage = data.attachmentImage
    doc.useESignature = data.useESignature
    doc.discountTotal = data.discountTotal
    doc.vatAmount = data.vatAmount
    doc.whtAmount = data.whtAmount
    doc.paymentTermMode = data.paymentTermMode
    Object.assign(doc, resolveContactSnapshot(data.customer, data.contactId))
    items.value = items.value.filter((i) => i.documentId !== id)
    addItemsToDocument(id, data.items)
    useBookingStore().addLog('แก้ไขเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  /** สร้างใบแจ้งหนี้/ใบกำกับภาษีแบบกรอกเอง (ไม่ผูกกับใบวางบิล) — ใช้หน้าฟอร์มแบบเดียวกับ QuotationFormView.vue (ดู TaxInvoiceFormView.vue) */
  function createTaxInvoiceManual(data: ManualDocumentFormData): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const bookingStore = useBookingStore()
    const numbering = documentSettingsStore.settings.numbering.invoice
    const seq = bookingStore.documents.length + documents.value.filter((d) => d.type === 'TAX_INVOICE').length + 1
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    const issueDate = data.date || new Date()
    const creditDays = data.creditDays ?? 30
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + creditDays)
    const invoice: SalesDocument = {
      id: genId('sdoc'),
      type: 'TAX_INVOICE',
      number: data.number?.trim() || generateDocNumber(numbering.prefix, seq, numbering.padding, issueDate),
      customer: data.customer,
      status: 'DRAFT',
      date: issueDate,
      amount,
      bookingIds: [],
      creditDays,
      dueDate,
      reference: data.reference,
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      whtRate: data.whtRate,
      whtAmount: data.whtAmount,
      createdAt: new Date(),
      customerAddress: data.customerAddress,
      customerZipCode: data.customerZipCode,
      customerTaxId: data.customerTaxId,
      customerBranchName: data.customerBranchName,
      project: data.project,
      salesperson: data.salesperson,
      currencyCode: data.currencyCode,
      warehouse: data.warehouse,
      priceMode: data.priceMode,
      description: data.description,
      note: data.note,
      internalNote: data.internalNote,
      attachmentImage: data.attachmentImage,
      useESignature: data.useESignature,
      discountTotal: data.discountTotal,
      paymentTermMode: data.paymentTermMode,
    }
    Object.assign(invoice, resolveContactSnapshot(data.customer, data.contactId))
    documents.value.unshift(invoice)
    addItemsToDocument(invoice.id, data.items)
    linkManualDocToSource(invoice, data)
    bookingStore.addLog('สร้างเอกสาร ' + invoice.number, { docId: invoice.id })
    return invoice
  }

  /** แก้ไขใบแจ้งหนี้/ใบกำกับภาษี (เฉพาะตอนยังไม่ส่ง — สถานะ DRAFT) แทนที่ field เอกสาร + รายการทั้งหมด ไม่เปลี่ยนเลขที่/สถานะ/bookingIds */
  function updateTaxInvoiceManual(id: string, data: ManualDocumentFormData): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'TAX_INVOICE')
    if (!doc || doc.status !== 'DRAFT') return null
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    const issueDate = data.date || doc.date
    const creditDays = data.creditDays ?? 30
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + creditDays)
    doc.customer = data.customer
    doc.amount = amount
    if (data.number?.trim()) doc.number = data.number.trim()
    doc.date = issueDate
    doc.creditDays = creditDays
    doc.dueDate = dueDate
    doc.reference = data.reference
    doc.vatRate = data.vatRate
    doc.vatAmount = data.vatAmount
    doc.whtRate = data.whtRate
    doc.whtAmount = data.whtAmount
    doc.customerAddress = data.customerAddress
    doc.customerZipCode = data.customerZipCode
    doc.customerTaxId = data.customerTaxId
    doc.customerBranchName = data.customerBranchName
    doc.project = data.project
    doc.salesperson = data.salesperson
    doc.currencyCode = data.currencyCode
    doc.warehouse = data.warehouse
    doc.priceMode = data.priceMode
    doc.description = data.description
    doc.note = data.note
    doc.internalNote = data.internalNote
    doc.attachmentImage = data.attachmentImage
    doc.useESignature = data.useESignature
    doc.discountTotal = data.discountTotal
    doc.paymentTermMode = data.paymentTermMode
    Object.assign(doc, resolveContactSnapshot(data.customer, data.contactId))
    items.value = items.value.filter((i) => i.documentId !== id)
    addItemsToDocument(id, data.items)
    useBookingStore().addLog('แก้ไขเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  /** สร้างใบเสร็จรับเงินแบบกรอกเอง — ใช้หน้าฟอร์มแบบเดียวกับ QuotationFormView.vue (ดู ReceiptFormView.vue) ถือว่าเก็บเงินแล้วทันทีตอนบันทึก */
  function createReceiptManual(data: ManualDocumentFormData): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.receipt
    const seq = documents.value.filter((d) => d.type === 'RECEIPT').length + 1
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    const now = new Date()
    const paidDate = data.date || now
    const receipt: SalesDocument = {
      id: genId('sdoc'),
      type: 'RECEIPT',
      number: data.number?.trim() || generateDocNumber(numbering.prefix, seq, numbering.padding, paidDate),
      customer: data.customer,
      status: 'PAID',
      date: paidDate,
      amount,
      bookingIds: [],
      reference: data.reference,
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      whtRate: data.whtRate,
      whtAmount: data.whtAmount,
      paymentMethod: data.paymentMethod,
      paidDate,
      createdAt: now,
      customerAddress: data.customerAddress,
      customerZipCode: data.customerZipCode,
      customerTaxId: data.customerTaxId,
      customerBranchName: data.customerBranchName,
      project: data.project,
      salesperson: data.salesperson,
      currencyCode: data.currencyCode,
      warehouse: data.warehouse,
      priceMode: data.priceMode,
      description: data.description,
      note: data.note,
      internalNote: data.internalNote,
      attachmentImage: data.attachmentImage,
      useESignature: data.useESignature,
      discountTotal: data.discountTotal,
    }
    Object.assign(receipt, resolveContactSnapshot(data.customer, data.contactId))
    documents.value.unshift(receipt)
    addItemsToDocument(receipt.id, data.items)
    useBookingStore().addLog('สร้างเอกสาร ' + receipt.number, { docId: receipt.id })
    return receipt
  }

  /** แก้ไขใบเสร็จรับเงินที่กรอกเอง (เฉพาะตอนยังไม่เก็บเงินจริง — สถานะ DRAFT) แทนที่ field เอกสาร + รายการทั้งหมด ไม่เปลี่ยนเลขที่/สถานะ/bookingIds */
  function updateReceiptManual(id: string, data: ManualDocumentFormData): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'RECEIPT')
    if (!doc || doc.status !== 'DRAFT') return null
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    doc.customer = data.customer
    doc.amount = amount
    if (data.number?.trim()) doc.number = data.number.trim()
    if (data.date) doc.date = data.date
    doc.reference = data.reference
    doc.vatRate = data.vatRate
    doc.vatAmount = data.vatAmount
    doc.whtRate = data.whtRate
    doc.whtAmount = data.whtAmount
    doc.paymentMethod = data.paymentMethod
    doc.customerAddress = data.customerAddress
    doc.customerZipCode = data.customerZipCode
    doc.customerTaxId = data.customerTaxId
    doc.customerBranchName = data.customerBranchName
    doc.project = data.project
    doc.salesperson = data.salesperson
    doc.currencyCode = data.currencyCode
    doc.warehouse = data.warehouse
    doc.priceMode = data.priceMode
    doc.description = data.description
    doc.note = data.note
    doc.internalNote = data.internalNote
    doc.attachmentImage = data.attachmentImage
    doc.useESignature = data.useESignature
    doc.discountTotal = data.discountTotal
    Object.assign(doc, resolveContactSnapshot(data.customer, data.contactId))
    items.value = items.value.filter((i) => i.documentId !== id)
    addItemsToDocument(id, data.items)
    useBookingStore().addLog('แก้ไขเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  /**
   * สร้างใบวางบิล (เดี่ยวหรือรวม) จากงานขนส่งที่ "ส่งเสร็จแล้ว" (DELIVERED) โดยตรง — ไม่ผ่านใบเสนอราคาเลย
   * ต้องเป็นลูกค้าเดียวกันทุกงาน และยังไม่เคยถูกวางบิลมาก่อน (billingStatus ยังเป็น UNBILLED) มิฉะนั้นคืนค่า null
   * รายการต่อบรรทัด = 1 งานต่อ 1 บรรทัด เหมือน docRows ของ InvoiceDocumentView.vue ฝั่งเอกสารเดิม
   */
  /** แถวคำนวณเงินของ 1 booking ป้อนเข้า computeRowDiscountBaht/computeRowAmount/computeRowVat (documentTotals.ts) ตัวเดียวกับที่
   *  BookingCreateView.vue/JobDocumentView.vue ใช้กับงานนี้เอง — ยอดก่อนส่วนลด = ค่าเที่ยว + extraCharges รวม (ยอดที่เรียกเก็บลูกค้าจริง),
   *  ส่วนลด/VAT ใช้ discountMode/discountPercent/discountAmount/vatRate ของ booking นี้ตรงๆ ไม่คำนวณเปอร์เซ็นต์ใหม่เอง */
  function bookingBillingRow(b: Booking) {
    return {
      qty: 1,
      unitPrice: (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0),
      discountMode: b.discountMode,
      discountPercent: b.discountPercent,
      discountAmount: b.discountAmount,
      vatRate: b.vatRate,
    }
  }

  function createBillingFromBookings(bookingIds: string[], overrides?: { customer?: string; reference?: string; contactId?: string }): SalesDocument | null {
    if (bookingIds.length === 0) return null
    const bookingStore = useBookingStore()
    const targetBookings = bookingStore.bookings.filter((b) => bookingIds.includes(b.id))
    if (targetBookings.length !== bookingIds.length) return null
    const sameCustomer = targetBookings.every((b) => b.customer === targetBookings[0].customer)
    const allEligible = targetBookings.every((b) => b.status === 'DELIVERED' && (b.billingStatus ?? 'UNBILLED') === 'UNBILLED')
    if (!sameCustomer || !allEligible) return null

    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.billingList
    const seq = bookingStore.batches.length + documents.value.filter((d) => d.type === 'BILLING').length + 1
    const customer = overrides?.customer?.trim() || targetBookings[0].customer
    /** ใช้เลขที่เอกสารใบสั่งสินค้าต้นทาง (booking.sourceDocumentId) เป็นเลขที่อ้างอิง ไม่ใช่ docNo ของ Booking ตรงๆ —
     *  เพื่อให้ "เลขที่อ้างอิงเอกสาร" ที่พิมพ์บนใบวางบิล ชี้กลับไปเอกสารขั้นก่อนหน้าจริงๆ ตาม Document Flow
     *  ถ้างานไหนไม่มีใบสั่งสินค้าผูกอยู่ (เช่นยังไม่ได้ซิงก์) ใช้ docNo เป็น fallback เหมือนเดิม */
    const referenceFor = (b: (typeof targetBookings)[number]) => {
      const salesOrder = b.sourceDocumentId ? documents.value.find((d) => d.type === 'SALES_ORDER' && d.id === b.sourceDocumentId) : undefined
      return salesOrder?.number || b.docNo
    }
    const reference = overrides?.reference ?? targetBookings.map(referenceFor).join(', ')
    const destinationLabel = (b: (typeof targetBookings)[number]) => {
      if (!b.items.length) return '-'
      const first = b.items[0].siteName
      return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
    }
    const discountTotal = Math.round(targetBookings.reduce((sum, b) => sum + computeRowDiscountBaht(bookingBillingRow(b)), 0))
    const amount = Math.round(targetBookings.reduce((sum, b) => sum + computeRowAmount(bookingBillingRow(b)), 0))
    const vatAmount = Math.round(targetBookings.reduce((sum, b) => sum + computeRowVat(bookingBillingRow(b)), 0))
    const vatRates = new Set(targetBookings.map((b) => b.vatRate || 0))
    const vatRate = vatRates.size === 1 ? targetBookings[0].vatRate : undefined
    const now = new Date()
    const billing: SalesDocument = {
      id: genId('sdoc'),
      type: 'BILLING',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'BILLING_PENDING',
      date: now,
      amount,
      discountTotal,
      vatRate,
      vatAmount,
      bookingIds: targetBookings.map((b) => b.id),
      label: `รายการวางบิล ${customer}`,
      dateFrom: now,
      dateTo: now,
      reference,
      createdAt: now,
    }
    Object.assign(billing, resolveContactSnapshot(customer, overrides?.contactId))
    documents.value.unshift(billing)
    addItemsToDocument(
      billing.id,
      targetBookings.map((b) => {
        const row = bookingBillingRow(b)
        return {
          description: `${b.docNo} · ${destinationLabel(b)}`,
          qty: 1,
          unit: 'เที่ยว',
          unitPrice: row.unitPrice,
          amount: computeRowAmount(row),
          discountMode: row.discountMode,
          discountPercent: row.discountPercent,
          discountAmount: row.discountAmount,
          vatRate: row.vatRate,
        }
      })
    )
    targetBookings.forEach((b) => {
      b.billingStatus = 'IN_BATCH'
    })
    bookingStore.addLog('สร้างเอกสาร ' + billing.number, { docId: billing.id })
    return billing
  }

  /** ออกใบแจ้งหนี้/ใบกำกับภาษีจากใบวางบิลที่รอวางบิลอยู่ — คู่กับ createInvoiceFromQuotation แต่ต้นทางเป็น BILLING ไม่ใช่ QUOTATION */
  function createInvoiceFromBilling(id: string, overrides?: QuotationConvertOverrides): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === id && d.type === 'BILLING')
    if (!doc || doc.status !== 'BILLING_PENDING') return null
    const documentSettingsStore = useDocumentSettingsStore()
    const bookingStore = useBookingStore()
    const numbering = documentSettingsStore.settings.numbering.invoice
    const seq = bookingStore.documents.length + documents.value.filter((d) => d.type === 'TAX_INVOICE').length + 1
    const { customer, reference, itemRows, amount } = resolveConvertInputs(doc, overrides)
    const issueDate = new Date()
    const creditDays = overrides?.creditDays ?? doc.creditDays ?? 30
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + creditDays)
    const salesCalcMode = documentSettingsStore.settings.calcMode.sales
    /** ใบวางบิลที่สร้างจากงานขนส่ง (createBillingFromBookings) มี vatAmount/discountTotal ที่คำนวณจาก booking ต้นทางไว้แล้ว —
     *  ต้อง sync ตรงๆ ไม่คำนวณ VAT% ของระบบซ้ำอีกชั้น (จะได้ค่าคลาดเคลื่อนถ้า booking ตั้ง vatRate ต่างจากค่า default)
     *  ใบวางบิลกรอกเอง/จากใบเสนอราคา (createBillingManual) ไม่มี vatAmount เก็บไว้ ยังคงคำนวณจากอัตราของระบบเหมือนเดิม
     *  ถ้าผู้ใช้แก้ไขรายการเองตอนแปลง (overrides.items) ถือว่าตัวเลขต้นทางใช้ไม่ได้แล้ว คำนวณใหม่จากอัตราของระบบเช่นกัน */
    const syncFromBilling = doc.vatAmount !== undefined && !overrides?.items
    const vatRate = syncFromBilling ? doc.vatRate ?? 0 : salesCalcMode.vat === 'included' ? 0 : documentSettingsStore.settings.vatRate
    const vatAmount = syncFromBilling ? doc.vatAmount! : Math.round((amount * vatRate) / 100)
    const discountTotal = syncFromBilling ? doc.discountTotal : undefined
    const whtRate = salesCalcMode.wht === 'included' ? 0 : documentSettingsStore.settings.whtRate
    const whtAmount = Math.round((amount * whtRate) / 100)
    const invoice: SalesDocument = {
      id: genId('sdoc'),
      type: 'TAX_INVOICE',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, issueDate),
      customer,
      status: 'DRAFT',
      date: issueDate,
      amount,
      discountTotal,
      bookingIds: doc.bookingIds,
      parentDocumentId: doc.id,
      creditDays,
      dueDate,
      reference,
      vatRate,
      vatAmount,
      whtRate,
      whtAmount,
      createdAt: issueDate,
    }
    Object.assign(invoice, resolveContactSnapshot(customer, doc.contactId))
    documents.value.unshift(invoice)
    addItemsToDocument(invoice.id, itemRows)
    doc.status = 'BILLED'
    doc.convertedToDocumentIds = [...(doc.convertedToDocumentIds || []), invoice.id]
    if (doc.bookingIds.length) {
      const bookingStore2 = useBookingStore()
      doc.bookingIds.forEach((bid) => {
        const b = bookingStore2.bookings.find((bk) => bk.id === bid)
        if (b) b.billingStatus = 'INVOICED'
      })
    }
    bookingStore.addLog('สร้างเอกสาร ' + invoice.number, { docId: invoice.id })
    return invoice
  }

  /**
   * Migration/Backfill: ซ่อมใบวางบิลเดิมที่สร้างจากงานขนส่ง (bookingIds ไม่ว่าง) ก่อนที่ createBillingFromBookings จะเริ่มคำนวณ
   * ส่วนลด/VAT จาก booking ต้นทาง (ของเดิมมี amount แบบไม่หักส่วนลด/ไม่มี vatAmount เลย) — Trace กลับไปยัง Booking ต้นทางด้วย
   * bookingIds ที่มีอยู่แล้ว ใช้ Booking เป็น source of truth คำนวณด้วย logic เดียวกับ createBillingFromBookings เป๊ะ
   * (bookingBillingRow + computeRowDiscountBaht/computeRowAmount/computeRowVat) แล้วอัปเดตเฉพาะ amount/discountTotal/vatAmount/vatRate
   * ของเอกสารเดิม (คง id/number/bookingIds/sourceDocumentIds/parentDocumentId/convertedToDocumentIds ไว้ทั้งหมด ไม่สร้างเอกสารใหม่)
   * ใบวางบิลที่มี Tax Invoice/Receipt อ้างอิงต่อแล้ว จะไม่ถูกแก้ตามไปด้วย (เสี่ยงเกินไปถ้าเอกสารนั้นส่งลูกค้า/เก็บเงินไปแล้ว) —
   * แค่ตรวจสอบแล้วรายงานเป็น downstreamMismatches ให้ผู้ใช้ตัดสินใจเอง
   */
  interface BillingVatBackfillTotals {
    amount: number
    discountTotal?: number
    vatAmount?: number
    vatRate?: number
  }
  interface BillingVatBackfillChange {
    billingId: string
    billingNumber: string
    customer: string
    before: BillingVatBackfillTotals
    after: BillingVatBackfillTotals
  }
  interface BillingVatBackfillDownstreamMismatch {
    /** เลขที่เอกสารต้นทาง (ใบวางบิลที่เพิ่งซิงก์ยอดใหม่) */
    billingId: string
    billingNumber: string
    /** เลขที่เอกสารปลายทางที่ยอดไม่ตรงกับใบวางบิลต้นทางหลังซิงก์ — ไม่ถูกแก้ไขให้อัตโนมัติ */
    downstreamType: 'TAX_INVOICE' | 'RECEIPT'
    downstreamId: string
    downstreamNumber: string
    /** ยอดที่ควรจะเป็นตามใบวางบิลต้นทางหลังซิงก์ (grandTotal = amount + vatAmount) */
    expected: BillingVatBackfillTotals & { grandTotal: number }
    /** ยอดที่เก็บอยู่จริงในเอกสารปลายทาง ณ ตอนนี้ (ไม่ถูกแตะต้อง) */
    stored: BillingVatBackfillTotals & { grandTotal: number }
    /** รายชื่อ field ที่ค่าไม่ตรงกันระหว่าง expected/stored เช่น ['vatRate', 'vatAmount', 'grandTotal'] */
    mismatchedFields: string[]
  }
  interface BillingVatBackfillReport {
    /** true ถ้าเรียกใช้ตอนที่ store ของ Booking ยังโหลดจาก Firestore ไม่เสร็จ (เพิ่งเข้าเว็บมาสดๆ) — ตอนนี้ยังไม่ได้ตรวจ/แก้อะไรเลย
     *  ต้องลองกดใหม่อีกครั้งหลังหน้าโหลดข้อมูลเสร็จ ไม่งั้นจะเข้าใจผิดว่า Booking ต้นทางหาไม่เจอ (untraceable) ทั้งที่จริงๆ แค่ยังโหลดไม่เสร็จ */
    notReady: boolean
    totalCandidates: number
    updated: number
    unchanged: number
    untraceable: Array<{ billingId: string; billingNumber: string; reason: string }>
    changes: BillingVatBackfillChange[]
    downstreamMismatches: BillingVatBackfillDownstreamMismatch[]
  }

  /** เทียบยอด "ที่ควรจะเป็น" (expected, จากใบวางบิลต้นทางหลังซิงก์) กับ "ที่เก็บอยู่จริง" (stored, ในเอกสารปลายทาง)
   *  ทีละ field คืน field ที่ไม่ตรงกันทั้งหมด (รวม grandTotal ที่คำนวณจาก amount+vatAmount) — ไม่คืนอะไรถ้ายอดตรงกันหมด */
  function diffBillingVatBackfillTotals(
    expected: BillingVatBackfillTotals,
    stored: BillingVatBackfillTotals
  ): { mismatchedFields: string[]; expected: BillingVatBackfillTotals & { grandTotal: number }; stored: BillingVatBackfillTotals & { grandTotal: number } } {
    const expectedGrandTotal = expected.amount + (expected.vatAmount || 0)
    const storedGrandTotal = stored.amount + (stored.vatAmount || 0)
    const mismatchedFields: string[] = []
    if (stored.amount !== expected.amount) mismatchedFields.push('amount')
    if ((stored.discountTotal || 0) !== (expected.discountTotal || 0)) mismatchedFields.push('discountTotal')
    if ((stored.vatAmount || 0) !== (expected.vatAmount || 0)) mismatchedFields.push('vatAmount')
    if ((stored.vatRate || 0) !== (expected.vatRate || 0)) mismatchedFields.push('vatRate')
    if (storedGrandTotal !== expectedGrandTotal) mismatchedFields.push('grandTotal')
    return {
      mismatchedFields,
      expected: { ...expected, grandTotal: expectedGrandTotal },
      stored: { ...stored, grandTotal: storedGrandTotal },
    }
  }

  function recalcBillingTotalsFromBookings(targetBookings: Booking[]): BillingVatBackfillTotals {
    const discountTotal = Math.round(targetBookings.reduce((sum, b) => sum + computeRowDiscountBaht(bookingBillingRow(b)), 0))
    const amount = Math.round(targetBookings.reduce((sum, b) => sum + computeRowAmount(bookingBillingRow(b)), 0))
    const vatAmount = Math.round(targetBookings.reduce((sum, b) => sum + computeRowVat(bookingBillingRow(b)), 0))
    const vatRates = new Set(targetBookings.map((b) => b.vatRate || 0))
    const vatRate = vatRates.size === 1 ? targetBookings[0].vatRate : undefined
    return { amount, discountTotal, vatAmount, vatRate }
  }

  function backfillBillingVatFromBookings(): BillingVatBackfillReport {
    const bookingStore = useBookingStore()
    const candidates = documents.value.filter((d) => d.type === 'BILLING' && d.bookingIds.length > 0)
    const report: BillingVatBackfillReport = {
      notReady: false,
      totalCandidates: candidates.length,
      updated: 0,
      unchanged: 0,
      untraceable: [],
      changes: [],
      downstreamMismatches: [],
    }
    /** bookingStore โหลดจาก Firestore แบบ async แยกอิสระจาก salesDocumentsStore — ถ้าเพิ่งเข้าหน้านี้มาสดๆ (hard reload)
     *  แล้วกดปุ่มนี้ทันที bookings อาจยังว่างเปล่าอยู่ ทำให้ทุกใบดูเหมือน "trace ไม่ได้" ทั้งที่จริงๆ มี booking อยู่ครบ
     *  กันเข้าใจผิด: ถ้ามีใบวางบิลที่ผูก booking อยู่ (candidates > 0) แต่ bookingStore ว่างเปล่าสนิท ให้ถือว่ายังไม่พร้อม ไม่ตรวจ/ไม่แก้อะไรเลย */
    if (candidates.length > 0 && bookingStore.bookings.length === 0) {
      report.notReady = true
      return report
    }
    const changedBillingIds = new Set<string>()

    candidates.forEach((billing) => {
      const targetBookings = billing.bookingIds
        .map((id) => bookingStore.bookings.find((b) => b.id === id))
        .filter((b): b is Booking => !!b)
      if (targetBookings.length !== billing.bookingIds.length) {
        report.untraceable.push({ billingId: billing.id, billingNumber: billing.number, reason: 'หา Booking ต้นทางไม่ครบ (บางงานถูกลบไปแล้ว)' })
        return
      }
      const billingItems = itemsForDocument(billing.id)
      if (billingItems.length !== targetBookings.length) {
        report.untraceable.push({
          billingId: billing.id,
          billingNumber: billing.number,
          reason: 'จำนวนรายการในเอกสารไม่ตรงกับจำนวนงานขนส่ง ข้ามไปเพื่อความปลอดภัย (ไม่แก้ไข)',
        })
        return
      }

      const before: BillingVatBackfillTotals = {
        amount: billing.amount,
        discountTotal: billing.discountTotal,
        vatAmount: billing.vatAmount,
        vatRate: billing.vatRate,
      }
      const after = recalcBillingTotalsFromBookings(targetBookings)
      const changed =
        before.amount !== after.amount ||
        (before.discountTotal || 0) !== (after.discountTotal || 0) ||
        before.vatAmount !== after.vatAmount ||
        before.vatRate !== after.vatRate

      if (!changed) {
        report.unchanged++
        return
      }

      billing.amount = after.amount
      billing.discountTotal = after.discountTotal
      billing.vatAmount = after.vatAmount
      billing.vatRate = after.vatRate
      targetBookings.forEach((b, idx) => {
        const row = bookingBillingRow(b)
        const item = billingItems[idx]
        item.amount = computeRowAmount(row)
        item.discountMode = row.discountMode
        item.discountPercent = row.discountPercent
        item.discountAmount = row.discountAmount
        item.vatRate = row.vatRate
      })
      changedBillingIds.add(billing.id)
      report.updated++
      report.changes.push({ billingId: billing.id, billingNumber: billing.number, customer: billing.customer, before, after })
    })

    /** ตรวจสอบเอกสารปลายทาง (Tax Invoice/Receipt) ที่อ้างอิงใบวางบิลที่เพิ่งแก้ไป — อ่านอย่างเดียว ไม่มีการ assign ค่าใดๆ
     *  ลงในเอกสารปลายทางเลยในบล็อกนี้ (เทียบเลขแล้วแค่ push เข้า report) แค่รายงานให้ผู้ใช้ตัดสินใจเอง */
    changedBillingIds.forEach((billingId) => {
      const billing = documents.value.find((d) => d.id === billingId)!
      const expected: BillingVatBackfillTotals = { amount: billing.amount, discountTotal: billing.discountTotal, vatAmount: billing.vatAmount, vatRate: billing.vatRate }
      const invoiceChild = documents.value.find((d) => d.type === 'TAX_INVOICE' && d.parentDocumentId === billingId)
      if (invoiceChild) {
        const stored: BillingVatBackfillTotals = {
          amount: invoiceChild.amount,
          discountTotal: invoiceChild.discountTotal,
          vatAmount: invoiceChild.vatAmount,
          vatRate: invoiceChild.vatRate,
        }
        const diff = diffBillingVatBackfillTotals(expected, stored)
        if (diff.mismatchedFields.length > 0) {
          report.downstreamMismatches.push({
            billingId,
            billingNumber: billing.number,
            downstreamType: 'TAX_INVOICE',
            downstreamId: invoiceChild.id,
            downstreamNumber: invoiceChild.number,
            expected: diff.expected,
            stored: diff.stored,
            mismatchedFields: diff.mismatchedFields,
          })
        }
      }
    })
    documents.value
      .filter((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).some((sid) => changedBillingIds.has(sid)))
      .forEach((receipt) => {
        const sourceDocs = documents.value.filter((d) => (receipt.sourceDocumentIds || []).includes(d.id))
        const expectedTotals = buildReceiptTotalsFromSourceDocs(sourceDocs)
        const expected: BillingVatBackfillTotals = { amount: expectedTotals.amount, discountTotal: expectedTotals.discountTotal, vatAmount: expectedTotals.vatAmount, vatRate: expectedTotals.vatRate }
        const stored: BillingVatBackfillTotals = { amount: receipt.amount, discountTotal: receipt.discountTotal, vatAmount: receipt.vatAmount, vatRate: receipt.vatRate }
        const diff = diffBillingVatBackfillTotals(expected, stored)
        if (diff.mismatchedFields.length > 0) {
          const sourceBilling = sourceDocs.find((d) => changedBillingIds.has(d.id))!
          report.downstreamMismatches.push({
            billingId: sourceBilling.id,
            billingNumber: sourceBilling.number,
            downstreamType: 'RECEIPT',
            downstreamId: receipt.id,
            downstreamNumber: receipt.number,
            expected: diff.expected,
            stored: diff.stored,
            mismatchedFields: diff.mismatchedFields,
          })
        }
      })

    return report
  }

  /** ยกเลิกใบวางบิลที่ยังไม่ออกใบแจ้งหนี้ — คืนสถานะการเงินของงานขนส่งที่ผูกอยู่กลับเป็น UNBILLED แล้วลบเอกสารทิ้ง */
  function cancelBillingNote(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'BILLING')
    if (!doc || doc.status !== 'BILLING_PENDING') return false
    if (doc.bookingIds.length) {
      const bookingStore = useBookingStore()
      doc.bookingIds.forEach((bid) => {
        const b = bookingStore.bookings.find((bk) => bk.id === bid)
        if (b && b.billingStatus === 'IN_BATCH') b.billingStatus = 'UNBILLED'
      })
    }
    documents.value = documents.value.filter((d) => d.id !== id)
    items.value = items.value.filter((i) => i.documentId !== id)
    return true
  }

  /** ส่งใบแจ้งหนี้/ใบกำกับภาษีให้ลูกค้า — ไม่ผูกกับการชำระเงิน (เก็บเงินจริงผ่านใบเสร็จรับเงินเท่านั้น) */
  function sendInvoice(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'TAX_INVOICE')
    if (!doc || doc.status !== 'DRAFT') return
    doc.status = 'SENT'
  }

  /** Reset ใบแจ้งหนี้/ใบกำกับภาษีที่ส่งแล้วกลับเป็นร่าง — บล็อกถ้ามีใบเสร็จรับเงินออกจากใบนี้แล้ว (จะทำให้ใบเสร็จลอยไม่มีต้นทาง) */
  function resetTaxInvoice(id: string): { ok: boolean; message?: string } {
    const doc = documents.value.find((d) => d.id === id && d.type === 'TAX_INVOICE')
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (doc.status === 'DRAFT') return { ok: false, message: 'เอกสารนี้อยู่สถานะร่างอยู่แล้ว' }
    const hasReceipt = documents.value.some((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(id))
    if (hasReceipt) return { ok: false, message: `ไม่สามารถ Reset ได้ เนื่องจากมีใบเสร็จรับเงินที่ออกจากใบแจ้งหนี้ ${doc.number} แล้ว` }
    doc.status = 'DRAFT'
    useBookingStore().addLog(`Reset สถานะ ${doc.number} กลับเป็นร่าง`, { docId: doc.id })
    return { ok: true }
  }

  /**
   * Reset ใบวางบิลที่ออกใบแจ้งหนี้ไปแล้วกลับเป็น "รอวางบิล" — ทำได้เฉพาะกรณีใบแจ้งหนี้ลูกยังเป็นร่าง (ยังไม่ส่ง/ยังไม่มีใบเสร็จ)
   * ใช้ cancelTaxInvoice ตัวเดียวกับปุ่มยกเลิกใบแจ้งหนี้ ซึ่งลบใบแจ้งหนี้ทิ้งและคืนสถานะใบวางบิลต้นทางเป็น BILLING_PENDING ให้อัตโนมัติอยู่แล้ว
   */
  function resetBillingNote(id: string): { ok: boolean; message?: string } {
    const doc = documents.value.find((d) => d.id === id && d.type === 'BILLING')
    if (!doc) return { ok: false, message: 'ไม่พบเอกสาร' }
    if (doc.status !== 'BILLED') return { ok: false, message: 'เอกสารนี้อยู่สถานะรอวางบิลอยู่แล้ว' }
    const childId = (doc.convertedToDocumentIds || [])[0]
    const childDoc = childId ? documents.value.find((d) => d.id === childId) : undefined
    /** ใบวางบิลนี้อาจถูกแปลงเป็นใบแจ้งหนี้ (ทางเดิม) หรือถูกอ้างอิงตรงจากใบเสร็จ (ทางใหม่ createReceiptFromBillingNotes) ก็ได้ — Reset ผ่านปุ่มนี้รองรับแค่ทางแรก ทางที่สองต้องยกเลิกที่ใบเสร็จแทน (cancelReceipt คืนสถานะให้อัตโนมัติอยู่แล้ว) */
    if (childDoc?.type === 'RECEIPT') {
      return { ok: false, message: `ไม่สามารถ Reset ได้ เนื่องจากใบวางบิลนี้ถูกอ้างอิงตรงจากใบเสร็จรับเงิน ${childDoc.number} — ให้ยกเลิกใบเสร็จนั้นแทน` }
    }
    const child = childDoc?.type === 'TAX_INVOICE' ? childDoc : undefined
    if (!child) return { ok: false, message: 'ไม่พบใบแจ้งหนี้ที่ผูกอยู่ ไม่สามารถ Reset ได้' }
    if (child.status !== 'DRAFT') {
      return { ok: false, message: `ไม่สามารถ Reset ได้ เนื่องจากใบแจ้งหนี้ ${child.number} ถูกส่งให้ลูกค้าแล้วหรือชำระเงินแล้ว` }
    }
    const hasReceipt = documents.value.some((d) => d.type === 'RECEIPT' && (d.sourceDocumentIds || []).includes(child.id))
    if (hasReceipt) {
      return { ok: false, message: `ไม่สามารถ Reset ได้ เนื่องจากมีใบเสร็จรับเงินที่ออกจากใบแจ้งหนี้ ${child.number} แล้ว` }
    }
    cancelTaxInvoice(child.id)
    return { ok: true }
  }

  /** ยกเลิกใบแจ้งหนี้/ใบกำกับภาษีที่ยังไม่ส่ง (DRAFT) — คืนสถานะการเงินของงานขนส่งที่ผูกอยู่กลับเป็น UNBILLED, คืนสถานะใบวางบิลต้นทาง (ถ้ามี) กลับเป็นรอออกใบแจ้งหนี้ แล้วลบเอกสารทิ้ง */
  function cancelTaxInvoice(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'TAX_INVOICE')
    if (!doc || doc.status !== 'DRAFT') return false
    if (doc.bookingIds.length) {
      const bookingStore = useBookingStore()
      doc.bookingIds.forEach((bid) => {
        const b = bookingStore.bookings.find((bk) => bk.id === bid)
        if (b && b.billingStatus === 'INVOICED') b.billingStatus = 'UNBILLED'
      })
    }
    if (doc.parentDocumentId) {
      const parent = documents.value.find((d) => d.id === doc.parentDocumentId && d.type === 'BILLING')
      if (parent) {
        parent.convertedToDocumentIds = (parent.convertedToDocumentIds || []).filter((cid) => cid !== doc.id)
        if (parent.status === 'BILLED' && parent.convertedToDocumentIds.length === 0) parent.status = 'BILLING_PENDING'
      }
    }
    documents.value = documents.value.filter((d) => d.id !== id)
    items.value = items.value.filter((i) => i.documentId !== id)
    return true
  }

  /** เอกสาร (ใบแจ้งหนี้หรือใบวางบิล) ที่ id นี้ถูกอ้างอิงไว้แล้วในใบเสร็จรับเงินใบอื่น (ที่ยังไม่ถูกยกเลิก) หรือยัง — กันสร้าง/แก้ไขใบเสร็จให้ไปอ้างอิงเอกสารต้นทางซ้ำกับใบเสร็จอื่น ใช้ร่วมกันทั้งสองเส้นทาง (Tax Invoice/Billing Note) เพราะ sourceDocumentIds เก็บ id แบบไม่ผูกชนิดอยู่แล้ว
   *  excludeReceiptId ใช้ตอนแก้ไขใบเสร็จเดิม เพื่อไม่ให้เอกสารตัวเองมานับชนกับตัวเอง */
  function sourceDocsClaimedByOtherReceipts(sourceIds: string[], excludeReceiptId?: string): string[] {
    const claimed = new Set<string>()
    documents.value.forEach((d) => {
      if (d.type !== 'RECEIPT' || d.id === excludeReceiptId) return
      ;(d.sourceDocumentIds || []).forEach((sid) => {
        if (sourceIds.includes(sid)) claimed.add(sid)
      })
    })
    return [...claimed]
  }

  /**
   * รวมยอด/ภาษี/ส่วนลด/หัก ณ ที่จ่าย จากเอกสารต้นทางตรงๆ (ไม่คำนวณ VAT%/ส่วนลด% ใหม่เอง) เพื่อให้ใบเสร็จสะท้อนตัวเลขที่
   * เอกสารต้นทางคำนวณไว้แล้วเป๊ะ — ใช้ร่วมกันทั้งเส้นทาง Tax Invoice และ Billing Note ตรงๆ (createReceiptFromSourceDocs/updateReceiptFromSourceDocs)
   * ใบวางบิลที่สร้างจากงานขนส่งโดยตรง (createBillingFromBookings) มักไม่มี vatAmount/whtAmount/dueDate เลย (ไม่ได้ตั้งใจละไว้ ตัวฟังก์ชันนั้นไม่ได้คำนวณภาษีในชั้นนี้) จึงต้องเตือนแทนการเดาเป็น 0 เงียบๆ
   */
  function buildReceiptTotalsFromSourceDocs(targetDocs: SalesDocument[]) {
    const amount = targetDocs.reduce((sum, d) => sum + d.amount, 0)
    const discountTotal = targetDocs.reduce((sum, d) => sum + (d.discountTotal || 0), 0)
    const vatAmount = targetDocs.reduce((sum, d) => sum + (d.vatAmount || 0), 0)
    const whtAmount = targetDocs.reduce((sum, d) => sum + (d.whtAmount || 0), 0)
    /** vatRate เก็บไว้แค่ใช้แสดงผล (เช่น "ภาษีมูลค่าเพิ่ม 7%") — ถ้าเอกสารต้นทางทุกใบใช้อัตราเดียวกันก็ใช้อัตรานั้น ถ้าผสมหลายอัตรา (รวมหลายใบ) ไม่มีอัตราเดียวที่ถูกต้อง ปล่อยว่างไว้ */
    const vatRates = new Set(targetDocs.map((d) => d.vatRate || 0))
    const vatRate = vatRates.size === 1 ? targetDocs[0].vatRate : undefined
    const bookingIds = [...new Set(targetDocs.flatMap((d) => d.bookingIds))]
    const warnings: string[] = []
    targetDocs.forEach((d) => {
      const label = d.type === 'BILLING' ? 'ใบวางบิล' : 'ใบแจ้งหนี้'
      if (d.dueDate === undefined) warnings.push(`${label} ${d.number} ไม่มีวันครบกำหนด`)
      if (d.vatAmount === undefined && d.whtAmount === undefined) warnings.push(`${label} ${d.number} ไม่มีข้อมูลภาษี/หัก ณ ที่จ่าย — ตรวจสอบยอดก่อนเก็บเงินจริง`)
    })
    return { amount, discountTotal, vatRate, vatAmount, whtAmount, bookingIds, warnings }
  }

  function receiptItemRowsFromSourceDocs(targetDocs: SalesDocument[]): Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>> {
    return targetDocs.map((d) => ({
      description: `${d.type === 'BILLING' ? 'ใบวางบิล' : 'ใบแจ้งหนี้'} ${d.number}`,
      qty: 1,
      unit: 'รายการ',
      unitPrice: d.amount,
      amount: d.amount,
      vatRate: d.amount ? Math.round(((d.vatAmount || 0) / d.amount) * 10000) / 100 : 0,
      whtRate: d.amount ? Math.round(((d.whtAmount || 0) / d.amount) * 10000) / 100 : 0,
    }))
  }

  /** เอกสารสถานะ "ยังเรียกเก็บได้อยู่" ตามชนิด — ใบแจ้งหนี้คือยังไม่ PAID, ใบวางบิลคือยังไม่ถูกแปลงไปเป็นใบแจ้งหนี้/ใบเสร็จอื่น (BILLING_PENDING เท่านั้น) */
  const isSourceDocEligible = (d: SalesDocument, sourceType: ReceiptSourceType) =>
    sourceType === 'TAX_INVOICE' ? d.status !== 'PAID' : d.status === 'BILLING_PENDING'

  /**
   * สร้างใบเสร็จรับเงิน (เดี่ยวหรือรวม) จากเอกสารต้นทางชนิดเดียวกันของลูกค้ารายเดียวกัน — รายการต่อบรรทัด = 1 เอกสารต้นทาง
   * ต่อ 1 บรรทัด สถานะเริ่มต้นเป็น DRAFT (แสดงผลเป็น "รอดำเนินการ") จนกว่าจะกด "เก็บเงิน" ผ่าน recordReceiptPayment
   * sourceType = 'TAX_INVOICE': เส้นทางเดิม (ผ่านใบแจ้งหนี้) — sourceType = 'BILLING': เส้นทางใหม่ ข้ามใบแจ้งหนี้ไปเลย
   * (Booking → Sales Order → Billing Note → Receipt) — ตอนสำเร็จจะปิดสถานะใบวางบิลต้นทางเป็น BILLED เหมือน createInvoiceFromBilling
   * ทำ เพื่อกันไม่ให้ใบวางบิลใบเดียวกันถูกนำไปออกทั้งใบแจ้งหนี้ปกติ "และ" ใบเสร็จตรงพร้อมกัน (เงินก้อนเดียวกันถูกเรียกเก็บซ้ำ)
   * ยอด/ภาษี/ส่วนลด/หัก ณ ที่จ่าย ดึงจากเอกสารต้นทางตรงๆ (ดู buildReceiptTotalsFromSourceDocs) ไม่คำนวณเปอร์เซ็นต์ใหม่เอง
   */
  function createReceiptFromSourceDocs(
    sourceIds: string[],
    sourceType: ReceiptSourceType,
    overrides?: { customer?: string; reference?: string; contactId?: string }
  ): { doc: SalesDocument; warnings: string[] } | null {
    if (sourceIds.length === 0) return null
    const targetDocs = documents.value.filter((d) => sourceIds.includes(d.id) && d.type === sourceType)
    if (targetDocs.length !== sourceIds.length) return null
    const sameCustomer = targetDocs.every((d) => d.customer === targetDocs[0].customer)
    const allEligible = targetDocs.every((d) => isSourceDocEligible(d, sourceType))
    if (!sameCustomer || !allEligible) return null
    if (sourceDocsClaimedByOtherReceipts(sourceIds).length > 0) return null
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.receipt
    const seq = documents.value.filter((d) => d.type === 'RECEIPT').length + 1
    const customer = overrides?.customer?.trim() || targetDocs[0].customer
    const reference = overrides?.reference ?? targetDocs.map((d) => d.number).join(', ')
    const { amount, discountTotal, vatRate, vatAmount, whtAmount, bookingIds, warnings } = buildReceiptTotalsFromSourceDocs(targetDocs)
    const now = new Date()
    const receipt: SalesDocument = {
      id: genId('sdoc'),
      type: 'RECEIPT',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'DRAFT',
      date: now,
      amount,
      bookingIds,
      sourceDocumentIds: targetDocs.map((d) => d.id),
      reference,
      discountTotal,
      vatRate,
      vatAmount,
      whtAmount,
      createdAt: now,
    }
    Object.assign(receipt, resolveContactSnapshot(customer, overrides?.contactId ?? targetDocs[0].contactId))
    documents.value.unshift(receipt)
    addItemsToDocument(receipt.id, receiptItemRowsFromSourceDocs(targetDocs))
    if (sourceType === 'BILLING') {
      targetDocs.forEach((billing) => {
        billing.status = 'BILLED'
        billing.convertedToDocumentIds = [...(billing.convertedToDocumentIds || []), receipt.id]
      })
    }
    useBookingStore().addLog('สร้างเอกสาร ' + receipt.number, { docId: receipt.id })
    return { doc: receipt, warnings }
  }

  /** แก้ไขใบเสร็จรับเงินที่สร้างจากเอกสารต้นทาง (เฉพาะตอนยังไม่เก็บเงิน — สถานะ DRAFT) แทนที่รายการเอกสารอ้างอิงทั้งหมด ไม่เปลี่ยนเลขที่/สถานะ
   *  sourceType ต้องตรงกับที่ตอนสร้างไว้เสมอ (ห้ามสลับจากอ้างอิงใบแจ้งหนี้ไปอ้างอิงใบวางบิลระหว่างแก้ไข — ผู้เรียกต้องส่ง type เดิมของเอกสารมา) */
  function updateReceiptFromSourceDocs(
    id: string,
    sourceIds: string[],
    sourceType: ReceiptSourceType,
    overrides?: { customer?: string; reference?: string; contactId?: string }
  ): { doc: SalesDocument; warnings: string[] } | null {
    if (sourceIds.length === 0) return null
    const doc = documents.value.find((d) => d.id === id && d.type === 'RECEIPT')
    if (!doc || doc.status !== 'DRAFT') return null
    const targetDocs = documents.value.filter((d) => sourceIds.includes(d.id) && d.type === sourceType)
    if (targetDocs.length !== sourceIds.length) return null
    const sameCustomer = targetDocs.every((d) => d.customer === targetDocs[0].customer)
    const allEligible = targetDocs.every((d) => isSourceDocEligible(d, sourceType))
    if (!sameCustomer || !allEligible) return null
    if (sourceDocsClaimedByOtherReceipts(sourceIds, id).length > 0) return null
    /** ใบวางบิลที่ถูกถอดออกจากรายการอ้างอิงตอนแก้ไข ต้องคืนสถานะกลับ BILLING_PENDING ให้มันด้วย ไม่งั้นจะค้างสถานะ BILLED ทั้งที่ไม่มีใบเสร็จอ้างอิงแล้ว */
    if (sourceType === 'BILLING') {
      const removedIds = (doc.sourceDocumentIds || []).filter((sid) => !sourceIds.includes(sid))
      removedIds.forEach((sid) => {
        const billing = documents.value.find((d) => d.id === sid && d.type === 'BILLING')
        if (billing && billing.status === 'BILLED') {
          billing.status = 'BILLING_PENDING'
          billing.convertedToDocumentIds = (billing.convertedToDocumentIds || []).filter((cid) => cid !== doc.id)
        }
      })
    }
    const customer = overrides?.customer?.trim() || targetDocs[0].customer
    const reference = overrides?.reference ?? targetDocs.map((d) => d.number).join(', ')
    const { amount, discountTotal, vatRate, vatAmount, whtAmount, bookingIds, warnings } = buildReceiptTotalsFromSourceDocs(targetDocs)
    doc.customer = customer
    doc.reference = reference
    doc.amount = amount
    doc.bookingIds = bookingIds
    doc.sourceDocumentIds = targetDocs.map((d) => d.id)
    doc.discountTotal = discountTotal
    doc.vatRate = vatRate
    doc.vatAmount = vatAmount
    doc.whtAmount = whtAmount
    Object.assign(doc, resolveContactSnapshot(customer, overrides?.contactId ?? doc.contactId ?? targetDocs[0].contactId))
    items.value = items.value.filter((i) => i.documentId !== id)
    addItemsToDocument(id, receiptItemRowsFromSourceDocs(targetDocs))
    if (sourceType === 'BILLING') {
      targetDocs.forEach((billing) => {
        billing.status = 'BILLED'
        billing.convertedToDocumentIds = [...(billing.convertedToDocumentIds || []), doc.id].filter((v, i, arr) => arr.indexOf(v) === i)
      })
    }
    useBookingStore().addLog('แก้ไขเอกสาร ' + doc.number, { docId: doc.id })
    return { doc, warnings }
  }

  /** เดิม: สร้างใบเสร็จจากใบแจ้งหนี้ — คงชื่อไว้เพื่อความเข้ากันได้กับที่เรียกใช้อยู่ ภายในเรียก createReceiptFromSourceDocs เส้นทาง TAX_INVOICE */
  function createReceiptFromInvoices(invoiceIds: string[], overrides?: { customer?: string; reference?: string }) {
    return createReceiptFromSourceDocs(invoiceIds, 'TAX_INVOICE', overrides)
  }
  function updateReceiptFromInvoices(id: string, invoiceIds: string[], overrides?: { customer?: string; reference?: string }) {
    return updateReceiptFromSourceDocs(id, invoiceIds, 'TAX_INVOICE', overrides)
  }
  /** ใหม่: สร้าง/แก้ไขใบเสร็จจากใบวางบิลตรงๆ ข้ามขั้นใบแจ้งหนี้ (Booking → Sales Order → Billing Note → Receipt) */
  function createReceiptFromBillingNotes(billingIds: string[], overrides?: { customer?: string; reference?: string }) {
    return createReceiptFromSourceDocs(billingIds, 'BILLING', overrides)
  }
  function updateReceiptFromBillingNotes(id: string, billingIds: string[], overrides?: { customer?: string; reference?: string }) {
    return updateReceiptFromSourceDocs(id, billingIds, 'BILLING', overrides)
  }
  /** เผื่อผู้เรียกไม่ทราบ/ไม่อยากสนใจว่า id เอกสารต้นทางเป็นใบแจ้งหนี้หรือใบวางบิล — ตรวจชนิดจาก id แรกที่พบให้อัตโนมัติ */
  function invoicesClaimedByOtherReceipts(sourceIds: string[], excludeReceiptId?: string) {
    return sourceDocsClaimedByOtherReceipts(sourceIds, excludeReceiptId)
  }

  /** กด "เก็บเงิน" บนใบเสร็จรับเงิน — จบขั้นตอนทั้ง chain โดยปิดสถานะเอกสารต้นทางเป็นชำระแล้วด้วย (ใบแจ้งหนี้ -> PAID, ใบวางบิลที่อ้างอิงตรง คงสถานะ BILLED เดิมไว้เพราะไม่มีสถานะ "จ่ายแล้ว" แยกของตัวเอง — ใช้สถานะใบเสร็จเป็นตัวบอกแทน) */
  function recordReceiptPayment(
    receiptId: string,
    payment: { paidDate?: Date; whtAmount?: number; paymentMethod?: string; note?: string }
  ): SalesDocument | null {
    const doc = documents.value.find((d) => d.id === receiptId && d.type === 'RECEIPT')
    if (!doc || doc.status !== 'DRAFT') return null
    doc.status = 'PAID'
    doc.paidDate = payment.paidDate || new Date()
    if (payment.whtAmount !== undefined) doc.whtAmount = payment.whtAmount
    doc.paymentMethod = payment.paymentMethod
    doc.note = payment.note
    ;(doc.sourceDocumentIds || []).forEach((sid) => {
      const invoice = documents.value.find((d) => d.id === sid && d.type === 'TAX_INVOICE')
      if (invoice) invoice.status = 'PAID'
    })
    return doc
  }

  /** ยกเลิกใบเสร็จรับเงินที่ยังไม่ได้เก็บเงิน — ไม่กระทบใบแจ้งหนี้ต้นทาง (ยังไม่ได้ปิดสถานะ) แต่ถ้ามาจากใบวางบิลตรงๆ ต้องคืนสถานะใบวางบิลกลับ BILLING_PENDING ไม่งั้นใบวางบิลจะค้างสถานะ BILLED ทั้งที่ไม่มีใบเสร็จอ้างอิงแล้ว (ออกใบแจ้งหนี้/ใบเสร็จใหม่จากใบวางบิลนี้ไม่ได้อีกเลย) */
  function cancelReceipt(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'RECEIPT')
    if (!doc || doc.status !== 'DRAFT') return false
    ;(doc.sourceDocumentIds || []).forEach((sid) => {
      const billing = documents.value.find((d) => d.id === sid && d.type === 'BILLING')
      if (billing && billing.status === 'BILLED') {
        billing.status = 'BILLING_PENDING'
        billing.convertedToDocumentIds = (billing.convertedToDocumentIds || []).filter((cid) => cid !== doc.id)
      }
    })
    documents.value = documents.value.filter((d) => d.id !== id)
    items.value = items.value.filter((i) => i.documentId !== id)
    return true
  }

  function createCashSale(data: { customer: string; items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>; reference?: string }): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.cashSale
    const seq = documents.value.filter((d) => d.type === 'CASH_SALE').length + 1
    const amount = data.items.reduce((sum, i) => sum + i.amount, 0)
    const now = new Date()
    const doc: SalesDocument = {
      id: genId('sdoc'),
      type: 'CASH_SALE',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer: data.customer,
      status: 'PAID',
      date: now,
      amount,
      bookingIds: [],
      reference: data.reference,
      paidDate: now,
      createdAt: now,
    }
    documents.value.unshift(doc)
    addItemsToDocument(doc.id, data.items)
    useBookingStore().addLog('สร้างเอกสาร ' + doc.number, { docId: doc.id })
    return doc
  }

  return {
    documents,
    items,
    loading,
    error,
    itemsForDocument,
    createQuotation,
    sendQuotationForApproval,
    approveQuotation,
    rejectQuotation,
    resetQuotation,
    markQuotationProcessed,
    updateQuotation,
    duplicateQuotation,
    deleteQuotation,
    createInvoiceFromQuotation,
    convertQuotationToCashSale,
    convertQuotationToBilling,
    convertQuotationToPurchaseOrder,
    createSalesOrderForBooking,
    backfillMissingSalesOrders,
    repairSalesOrderVat,
    repairTaxInvoiceReferences,
    repairReceiptReferences,
    syncBillingReadiness,
    deleteSalesOrder,
    createBillingFromBookings,
    backfillBillingVatFromBookings,
    createBillingManual,
    updateBillingManual,
    createInvoiceFromBilling,
    createTaxInvoiceManual,
    updateTaxInvoiceManual,
    cancelBillingNote,
    resetBillingNote,
    cancelTaxInvoice,
    resetTaxInvoice,
    sendInvoice,
    createReceiptFromInvoices,
    updateReceiptFromInvoices,
    createReceiptFromBillingNotes,
    updateReceiptFromBillingNotes,
    createReceiptFromSourceDocs,
    updateReceiptFromSourceDocs,
    invoicesClaimedByOtherReceipts,
    sourceDocsClaimedByOtherReceipts,
    createReceiptManual,
    updateReceiptManual,
    recordReceiptPayment,
    cancelReceipt,
    createCashSale,
  }
})
