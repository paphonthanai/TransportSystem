import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDocumentSettingsStore, type PriceDisplay } from './documentSettings'
import { useBookingStore } from './booking'

const SALES_DOCUMENTS_KEY = 'tms_sales_documents_v1'
const SALES_DOCUMENT_ITEMS_KEY = 'tms_sales_document_items_v1'

export type SalesDocumentType = 'QUOTATION' | 'SALES_ORDER' | 'BILLING' | 'TAX_INVOICE' | 'RECEIPT' | 'CASH_SALE' | 'PURCHASE_ORDER'
// Future: 'CREDIT_NOTE' | 'DEBIT_NOTE' (Round 3) — leave the union open via this comment, don't build now.

/** QUOTATION เท่านั้น: เงื่อนไขการชำระที่เลือกในฟอร์ม — กำหนดว่าจะให้กรอกจำนวนวันเครดิต/แสดงวันครบกำหนดหรือไม่ */
export type PaymentTermMode = 'CREDIT_DAYS' | 'CASH' | 'CREDIT_NO_DATE'

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
}

function reviveDocument(raw: any): SalesDocument {
  return {
    ...raw,
    date: new Date(raw.date),
    dueDate: raw.dueDate ? new Date(raw.dueDate) : undefined,
    paidDate: raw.paidDate ? new Date(raw.paidDate) : undefined,
    dateFrom: raw.dateFrom ? new Date(raw.dateFrom) : undefined,
    dateTo: raw.dateTo ? new Date(raw.dateTo) : undefined,
    createdAt: new Date(raw.createdAt),
  }
}

function loadDocuments(): SalesDocument[] {
  try {
    const raw = localStorage.getItem(SALES_DOCUMENTS_KEY)
    if (raw) return JSON.parse(raw).map(reviveDocument)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

function loadItems(): SalesDocumentItem[] {
  try {
    const raw = localStorage.getItem(SALES_DOCUMENT_ITEMS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

export const useSalesDocumentsStore = defineStore('salesDocuments', () => {
  const documents = ref<SalesDocument[]>(loadDocuments())
  const items = ref<SalesDocumentItem[]>(loadItems())

  watch(documents, (val) => localStorage.setItem(SALES_DOCUMENTS_KEY, JSON.stringify(val)), { deep: true })
  watch(items, (val) => localStorage.setItem(SALES_DOCUMENT_ITEMS_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === SALES_DOCUMENTS_KEY && e.newValue) {
      documents.value = JSON.parse(e.newValue).map(reviveDocument)
    }
    if (e.key === SALES_DOCUMENT_ITEMS_KEY && e.newValue) {
      items.value = JSON.parse(e.newValue)
    }
  })

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
    const reference = overrides?.reference !== undefined ? overrides.reference : doc.reference
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
  }): SalesDocument {
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.salesOrder
    const seq = documents.value.filter((d) => d.type === 'SALES_ORDER').length + 1
    const now = new Date()
    const salesOrder: SalesDocument = {
      id: genId('sdoc'),
      type: 'SALES_ORDER',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer: data.customer,
      status: 'CONVERTED',
      date: now,
      amount: data.amount,
      bookingIds: [data.bookingId],
      parentDocumentId: data.quotationId,
      reference: data.reference,
      createdAt: now,
    }
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
    documents.value.unshift(billing)
    addItemsToDocument(billing.id, data.items)
    linkManualDocToSource(billing, data)
    bookingStore.addLog('สร้างเอกสาร ' + billing.number, { docId: billing.id })
    return billing
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
    documents.value.unshift(invoice)
    addItemsToDocument(invoice.id, data.items)
    linkManualDocToSource(invoice, data)
    bookingStore.addLog('สร้างเอกสาร ' + invoice.number, { docId: invoice.id })
    return invoice
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
    documents.value.unshift(receipt)
    addItemsToDocument(receipt.id, data.items)
    useBookingStore().addLog('สร้างเอกสาร ' + receipt.number, { docId: receipt.id })
    return receipt
  }

  /**
   * สร้างใบวางบิล (เดี่ยวหรือรวม) จากงานขนส่งที่ "ส่งเสร็จแล้ว" (DELIVERED) โดยตรง — ไม่ผ่านใบเสนอราคาเลย
   * ต้องเป็นลูกค้าเดียวกันทุกงาน และยังไม่เคยถูกวางบิลมาก่อน (billingStatus ยังเป็น UNBILLED) มิฉะนั้นคืนค่า null
   * รายการต่อบรรทัด = 1 งานต่อ 1 บรรทัด เหมือน docRows ของ InvoiceDocumentView.vue ฝั่งเอกสารเดิม
   */
  function createBillingFromBookings(bookingIds: string[], overrides?: { customer?: string; reference?: string }): SalesDocument | null {
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
    const reference = overrides?.reference ?? targetBookings.map((b) => b.docNo).join(', ')
    const bookingTotal = (b: (typeof targetBookings)[number]) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
    const destinationLabel = (b: (typeof targetBookings)[number]) => {
      if (!b.items.length) return '-'
      const first = b.items[0].siteName
      return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
    }
    const amount = targetBookings.reduce((sum, b) => sum + bookingTotal(b), 0)
    const now = new Date()
    const billing: SalesDocument = {
      id: genId('sdoc'),
      type: 'BILLING',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'BILLING_PENDING',
      date: now,
      amount,
      bookingIds: targetBookings.map((b) => b.id),
      label: `รายการวางบิล ${customer}`,
      dateFrom: now,
      dateTo: now,
      reference,
      createdAt: now,
    }
    documents.value.unshift(billing)
    addItemsToDocument(
      billing.id,
      targetBookings.map((b) => ({
        description: `${b.docNo} · ${destinationLabel(b)}`,
        qty: 1,
        unit: 'เที่ยว',
        unitPrice: bookingTotal(b),
        amount: bookingTotal(b),
      }))
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

  /**
   * สร้างใบเสร็จรับเงิน (เดี่ยวหรือรวม) จากใบแจ้งหนี้ที่ยังไม่ชำระของลูกค้ารายเดียวกัน — รายการต่อบรรทัด = 1 ใบแจ้งหนี้
   * ต่อ 1 บรรทัด สถานะเริ่มต้นเป็น DRAFT (แสดงผลเป็น "รอดำเนินการ") จนกว่าจะกด "เก็บเงิน" ผ่าน recordReceiptPayment
   */
  function createReceiptFromInvoices(invoiceIds: string[], overrides?: { customer?: string; reference?: string }): SalesDocument | null {
    if (invoiceIds.length === 0) return null
    const targetInvoices = documents.value.filter((d) => invoiceIds.includes(d.id) && d.type === 'TAX_INVOICE')
    if (targetInvoices.length !== invoiceIds.length) return null
    const sameCustomer = targetInvoices.every((d) => d.customer === targetInvoices[0].customer)
    const allUnpaid = targetInvoices.every((d) => d.status !== 'PAID')
    if (!sameCustomer || !allUnpaid) return null
    const documentSettingsStore = useDocumentSettingsStore()
    const numbering = documentSettingsStore.settings.numbering.receipt
    const seq = documents.value.filter((d) => d.type === 'RECEIPT').length + 1
    const customer = overrides?.customer?.trim() || targetInvoices[0].customer
    const reference = overrides?.reference ?? targetInvoices.map((d) => d.number).join(', ')
    const amount = targetInvoices.reduce((sum, d) => sum + d.amount, 0)
    const now = new Date()
    const receipt: SalesDocument = {
      id: genId('sdoc'),
      type: 'RECEIPT',
      number: generateDocNumber(numbering.prefix, seq, numbering.padding, now),
      customer,
      status: 'DRAFT',
      date: now,
      amount,
      bookingIds: [],
      sourceDocumentIds: targetInvoices.map((d) => d.id),
      reference,
      createdAt: now,
    }
    documents.value.unshift(receipt)
    addItemsToDocument(
      receipt.id,
      targetInvoices.map((d) => ({
        description: `ใบแจ้งหนี้ ${d.number}`,
        qty: 1,
        unit: 'รายการ',
        unitPrice: d.amount,
        amount: d.amount,
      }))
    )
    useBookingStore().addLog('สร้างเอกสาร ' + receipt.number, { docId: receipt.id })
    return receipt
  }

  /** กด "เก็บเงิน" บนใบเสร็จรับเงิน — จบขั้นตอนทั้ง chain โดยปิดสถานะใบแจ้งหนี้ต้นทางทั้งหมดเป็นชำระแล้วด้วย */
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

  /** ยกเลิกใบเสร็จรับเงินที่ยังไม่ได้เก็บเงิน — คืนสถานะไม่กระทบใบแจ้งหนี้ต้นทาง (ยังไม่ได้ปิดสถานะ) */
  function cancelReceipt(id: string) {
    const doc = documents.value.find((d) => d.id === id && d.type === 'RECEIPT')
    if (!doc || doc.status !== 'DRAFT') return false
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
    deleteSalesOrder,
    createBillingFromBookings,
    createBillingManual,
    createInvoiceFromBilling,
    createTaxInvoiceManual,
    cancelBillingNote,
    sendInvoice,
    createReceiptFromInvoices,
    createReceiptManual,
    recordReceiptPayment,
    cancelReceipt,
    createCashSale,
  }
})
