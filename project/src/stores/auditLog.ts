import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auditLogRepository } from '@/repositories/auditLogRepository'

/**
 * Phase 4 — ประวัติถาวรของเอกสารขาย แยกจาก /salesDocuments โดยเจตนา (ดู auditLogRepository.ts) ต้องอยู่รอดแม้
 * เอกสารต้นทางจะถูก Hard Delete ไปแล้ว จุดประสงค์หลัก: ตอบย้อนหลังได้ว่า "เลขเอกสารนี้เคยถูกใช้กับ Document ID ไหนบ้าง"
 * ก่อนจะอนุญาตให้ documentNo กลับมาใช้ซ้ำได้ (ดู checkDocumentNumberReuseEligibility ใน stores/salesDocuments.ts)
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'REUSE_DOCUMENT_NUMBER' | 'REFERENCE_REJECTED'

export interface AuditLogChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface AuditLogEntry {
  id: string
  /** Document ID ของเอกสารที่เกี่ยวข้องกับ action นี้ — เป็นแค่ string เก็บไว้ ไม่ใช่ live reference (เอกสารอาจถูกลบไปแล้ว) */
  documentId: string
  documentNo: string
  documentType: string
  action: AuditAction
  actorUserId: string
  actorName: string
  actorRole: string
  timestamp: Date
  reason?: string
  changes?: AuditLogChange[]
  /** เฉพาะ action REUSE_DOCUMENT_NUMBER: Document ID เดิมที่เคยใช้เลขนี้มาก่อน (ก่อนถูกลบ/ยกเลิกไป) */
  previousDocumentId?: string
  metadata?: Record<string, unknown>
}

export const useAuditLogStore = defineStore('auditLog', () => {
  const entries = ref<AuditLogEntry[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchEntries() {
    loading.value = true
    error.value = null
    try {
      entries.value = await auditLogRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดประวัติ Audit Log จาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchEntries()

  /** บันทึก audit entry ใหม่ถาวร — เขียนขึ้น Firestore จริงแล้วค่อย unshift เข้า entries ทันที (ไม่รอ refetch)
   *  เพื่อให้ checkDocumentNumberReuseEligibility ในเซสชันเดียวกันเห็นผลทันทีโดยไม่ต้องโหลดหน้าใหม่ — ถ้าเขียนไม่สำเร็จ
   *  (เช่น หลุดเน็ต) จะไม่ unshift เข้า entries ในเครื่อง เพื่อไม่ให้ state ในหน่วยความจำเพี้ยนไปจากของจริงใน Firestore
   */
  async function record(data: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const entry: Omit<AuditLogEntry, 'id'> = { ...data, timestamp: new Date() }
    const id = await auditLogRepository.create(entry)
    const saved: AuditLogEntry = { ...entry, id }
    entries.value.unshift(saved)
    return saved
  }

  /** เอกสาร Document ID ไหนเคยใช้เลขที่นี้ล่าสุด (ก่อนหน้ารายการปัจจุบัน ถ้ามี) — ใช้หา previousDocumentId ตอนตรวจสอบ
   *  ว่าจะให้ reuse เลขนี้ได้ไหม เรียงตาม timestamp desc อยู่แล้ว (ดู fetchEntries/record) จึงเอาตัวแรกที่เจอได้เลย */
  function findLatestByDocumentNumber(documentNo: string): AuditLogEntry | undefined {
    return entries.value.find((e) => e.documentNo === documentNo)
  }

  function findByDocumentId(documentId: string): AuditLogEntry[] {
    return entries.value.filter((e) => e.documentId === documentId)
  }

  return { entries, loading, error, fetchEntries, record, findLatestByDocumentNumber, findByDocumentId }
})
