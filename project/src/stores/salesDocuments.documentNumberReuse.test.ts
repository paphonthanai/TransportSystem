import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSalesDocumentsStore } from './salesDocuments'
import { useAuditLogStore } from './auditLog'
import { useBookingStore } from './booking'
import { makeBooking } from '../../tests/fixtures/booking'

beforeEach(() => {
  setActivePinia(createPinia())
})

const oneItem = [{ description: 'ค่าบริการ', qty: 1, unit: 'งาน', unitPrice: 1000, amount: 1000, discountMode: 'percent' as const, discountPercent: 0, discountAmount: 0 }]

/** auditLogStore.record()/recordDeleteAudit() เขียนแบบ fire-and-forget (ไม่ await ใน createBillingManual/
 *  cancelBillingNote เอง — ดูคอมเมนต์ในนั้น) ต้อง flush microtask queue ก่อนอ่าน auditLog.entries ในเทสต์เสมอ */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Phase 4 — Document Number Reuse + Audit Log + Reference Validation
 * ครอบคลุม 12 เคสที่ PM ระบุไว้ตรงๆ ทีละเคส (ตัวเลขในชื่อ it() อ้างอิงลำดับเดียวกับที่ PM ให้มา)
 */
describe('Phase 4: Document Number Reuse', () => {
  it('1. creating a document normally assigns a fresh Document ID + Number, and logs a CREATE audit entry', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()

    const doc = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()

    expect(doc.id).toBeTruthy()
    expect(doc.number).toBeTruthy()
    const entry = auditLog.findLatestByDocumentNumber(doc.number)
    expect(entry).toBeDefined()
    expect(entry!.action).toBe('CREATE')
    expect(entry!.documentId).toBe(doc.id)
    expect(entry!.previousDocumentId).toBeUndefined()
  })

  it('2. cancelling a document removes it from the live set and logs a DELETE audit entry', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()
    const doc = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()

    const ok = salesDocs.cancelBillingNote(doc.id)
    await flush()

    expect(ok).toBe(true)
    expect(salesDocs.documents.find((d) => d.id === doc.id)).toBeUndefined()
    const entries = auditLog.findByDocumentId(doc.id)
    expect(entries.some((e) => e.action === 'DELETE')).toBe(true)
  })

  it('3. after cancel, the old Document ID and its original data remain recoverable via the Audit Log', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()
    const doc = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, reference: 'REF-ORIGINAL' })!
    await flush()

    salesDocs.cancelBillingNote(doc.id)
    await flush()

    // ตัว live document หายไปจริง (hard delete เดิม ไม่เปลี่ยน) — "ข้อมูลเดิมยังอยู่" หมายถึงยังค้นเจอได้ผ่าน Audit Log
    expect(salesDocs.documents.find((d) => d.id === doc.id)).toBeUndefined()
    const history = auditLog.findByDocumentId(doc.id)
    expect(history.length).toBeGreaterThanOrEqual(2)
    const createEntry = history.find((e) => e.action === 'CREATE')
    expect(createEntry?.documentNo).toBe(doc.number)
    expect(createEntry?.documentId).toBe(doc.id)
  })

  it('4. checkDocumentNumberReuseEligibility correctly identifies a cancelled number as reuse-eligible', async () => {
    const salesDocs = useSalesDocumentsStore()
    const doc = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(doc.id)
    await flush()

    const check = salesDocs.checkDocumentNumberReuseEligibility(doc.number)

    expect(check.eligible).toBe(true)
    expect(check.previousDocumentId).toBe(doc.id)
  })

  it('5. reusing an eligible number creates a brand-new Document ID, never the old one', async () => {
    const salesDocs = useSalesDocumentsStore()
    const original = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(original.id)
    await flush()

    const reused = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, number: original.number })

    expect(reused).not.toBeNull()
    expect(reused!.id).not.toBe(original.id)
    expect(reused!.number).toBe(original.number)
  })

  it('6. historical (audit) and active (live) records for the same number coexist without conflict', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()
    const original = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(original.id)
    await flush()
    const reused = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, number: original.number })!
    await flush()

    const liveWithThisNumber = salesDocs.documents.filter((d) => d.number === original.number)
    expect(liveWithThisNumber).toEqual([reused])
    const historyOfOriginal = auditLog.findByDocumentId(original.id)
    expect(historyOfOriginal.length).toBeGreaterThanOrEqual(2)
  })

  it('7. old audit entries keep pointing to the old Document ID even after the number is reused', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()
    const original = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(original.id)
    await flush()
    salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, number: original.number })!
    await flush()

    const historyOfOriginal = auditLog.findByDocumentId(original.id)
    historyOfOriginal.forEach((entry) => expect(entry.documentId).toBe(original.id))
  })

  it('8. new references created after reuse point to the new Document ID, not the old one', async () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const original = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(original.id)
    await flush()

    const booking = makeBooking({ customer: 'ลูกค้า A', status: 'IN_TRANSIT' })
    bookingStore.bookings.push(booking)
    const reused = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, number: original.number, bookingIds: [booking.id] })!

    expect(booking.billingNoteDocId).toBe(reused.id)
    expect(booking.billingNoteDocId).not.toBe(original.id)
  })

  it('9. a successful reuse logs a complete REUSE_DOCUMENT_NUMBER audit entry with all required fields', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()
    const original = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(original.id)
    await flush()

    const reused = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, number: original.number })!
    await flush()

    const entry = auditLog.entries.find((e) => e.documentId === reused.id && e.action === 'REUSE_DOCUMENT_NUMBER')
    expect(entry).toBeDefined()
    expect(entry!.documentNo).toBe(original.number)
    expect(entry!.documentType).toBe('BILLING')
    expect(entry!.previousDocumentId).toBe(original.id)
    expect(typeof entry!.actorUserId).toBe('string')
    expect(typeof entry!.actorName).toBe('string')
    expect(typeof entry!.actorRole).toBe('string')
    expect(entry!.timestamp).toBeInstanceOf(Date)
    expect(entry!.reason).toBeTruthy()
  })

  it('10a. reuse is blocked when a live (active) document currently holds the number', () => {
    const salesDocs = useSalesDocumentsStore()
    const live = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!

    const attempt = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem, number: live.number })
    const check = salesDocs.checkDocumentNumberReuseEligibility(live.number)

    expect(attempt).toBeNull()
    expect(check.eligible).toBe(false)
    expect(check.previousDocumentId).toBe(live.id)
  })

  it('10b. reuse is blocked (defense-in-depth) when a booking still dangles a reference to the old Document ID', async () => {
    const bookingStore = useBookingStore()
    const salesDocs = useSalesDocumentsStore()
    const original = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelBillingNote(original.id)
    await flush()
    // จำลอง edge case ที่ cleanup ปกติพลาดไป (ไม่ใช่ path ปกติของ cancelBillingNote ที่เคลียร์ billingNoteDocId ให้เองอยู่แล้ว)
    const danglingBooking = makeBooking({ billingNoteDocId: original.id })
    bookingStore.bookings.push(danglingBooking)

    const check = salesDocs.checkDocumentNumberReuseEligibility(original.number)

    expect(check.eligible).toBe(false)
    expect(check.reason).toContain(danglingBooking.docNo)
    expect(check.previousDocumentId).toBe(original.id)
  })

  it('11. allocation never produces two live documents with the same number, across repeated reuse cycles', async () => {
    const salesDocs = useSalesDocumentsStore()
    const seenNumbers = new Set<string>()
    for (let i = 0; i < 5; i++) {
      const doc = salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!
      expect(seenNumbers.has(doc.number)).toBe(false)
      seenNumbers.add(doc.number)
      salesDocs.cancelBillingNote(doc.id)
      await flush()
    }

    // สร้างหลายใบพร้อมกันโดยไม่ยกเลิกเลย (auto-number ล้วน) ก็ต้องไม่ชนกันเองเช่นกัน
    const liveDocs = [1, 2, 3].map(() => salesDocs.createBillingManual({ customer: 'ลูกค้า A', items: oneItem })!)
    const liveNumbers = liveDocs.map((d) => d.number)
    expect(new Set(liveNumbers).size).toBe(liveDocs.length)
  })

  it('Tax Invoice: reuse works the same way as Billing (createTaxInvoiceManual)', async () => {
    const salesDocs = useSalesDocumentsStore()
    const auditLog = useAuditLogStore()
    const original = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem })!
    await flush()
    salesDocs.cancelTaxInvoice(original.id)
    await flush()

    const reused = salesDocs.createTaxInvoiceManual({ customer: 'ลูกค้า A', items: oneItem, number: original.number })
    await flush()

    expect(reused).not.toBeNull()
    expect(reused!.id).not.toBe(original.id)
    const entry = auditLog.entries.find((e) => e.documentId === reused!.id)
    expect(entry?.action).toBe('REUSE_DOCUMENT_NUMBER')
    expect(entry?.previousDocumentId).toBe(original.id)
  })
})
