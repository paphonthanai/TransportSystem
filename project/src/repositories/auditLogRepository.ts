import { addDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { AuditLogEntry } from '@/stores/auditLog'

/**
 * Audit Log ถาวร (Phase 4) — append-only โดยเจตนา: ไม่มี update()/delete() ในไฟล์นี้เลย (ดู firestore.rules
 * ที่ปิด update/delete ของ collection นี้ไว้ทุก role แม้แต่ ADMIN) เพราะจุดประสงค์คือย้อนดูประวัติที่แก้ไข/ลบไม่ได้
 * แยก collection ต่างหากจาก /salesDocuments โดยตั้งใจ — ต้องอยู่รอดแม้เอกสารต้นทางจะถูก Hard Delete ไปแล้ว
 * (documentId/documentNo/previousDocumentId เป็นแค่ string ที่เก็บไว้ ไม่ใช่ live reference กลับไปที่เอกสาร)
 */
const COLLECTION = 'auditLogs'

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

function revive(raw: any): AuditLogEntry {
  return { ...raw, timestamp: new Date(raw.timestamp) }
}

export const auditLogRepository = {
  /** เรียงใหม่สุดก่อน (client-side) — ไม่ใช้ query()/orderBy() ของ Firestore ตามธรรมเนียมเดิมของ repository ทุกไฟล์
   *  ในโปรเจกต์นี้ (อ่านทั้ง collection ตรงๆ เสมอ ดู tests/setup.ts) */
  async getAll(): Promise<AuditLogEntry[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => revive({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  },

  async create(data: Omit<AuditLogEntry, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), sanitize(data as unknown as Record<string, unknown>))
    return ref.id
  },
}
