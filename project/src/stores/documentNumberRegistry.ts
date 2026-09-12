import { defineStore } from 'pinia'
import { useFirestoreSettings } from '@/composables/useFirestoreSettings'

/**
 * ทะเบียนเลขที่เอกสารถาวร (Phase 4 — เดิม) — แก้ปัญหาที่ต้นเหตุจริงตอนนั้น: ทุกจุดที่ออกเลขรัน (createReceiptManual,
 * createReceiptFromSourceDocs ฯลฯ) ใช้ documents.value.filter(d => d.type === 'RECEIPT').length + 1 ซึ่งนับจาก
 * เอกสารที่ "ยังมีอยู่จริงตอนนี้" เท่านั้น — ถ้าลบเอกสารทิ้งแล้วสร้างใหม่ เลขจะย้อนกลับไปซ้ำเลขเดิมทันที (bug จริงที่ระบุมา)
 * แก้ตอนนั้นด้วยตัวนับเดินหน้าอย่างเดียวไม่มีวันย้อนกลับ ("Document Number ห้าม reuse เด็ดขาด")
 *
 * DEPRECATED (กติกาใหม่ล่าสุด): PM ยกเลิกกฎ "ตัวนับเดินหน้าอย่างเดียว" แล้ว เปลี่ยนเป็น "Document Number ห้ามซ้ำกัน
 * เฉพาะ Active Documents เท่านั้น — เลขที่ไม่มี Active Document ถือครองแล้ว นำกลับมาใช้ได้ทันที" ซึ่งตรงข้ามกับ invariant
 * ของตัวนับนี้โดยตรง (ตัวนับไม่รู้จักคำว่า "ว่างแล้ว" เลย มีแต่ "เดินหน้า") ตอนนี้ salesDocuments.ts เปลี่ยนไปใช้
 * nextFreeSequence()/peekNextDocumentNumber() (สแกน documents.value หาเลขน้อยที่สุดที่ไม่มี Active Document ถือครอง
 * สดๆ ทุกครั้งแทน) ทุกจุดที่เคยเรียก nextSequence()/peekNextSequence()/isNumberUsed() เพื่อตัดสินใจ ALLOW/BLOCK แล้ว
 * ฟังก์ชัน/ข้อมูลในสโตร์นี้ (sequences, usedNumbers, และทุกฟังก์ชันด้านล่าง) จึง **ไม่มีผลต่อการออก/ตรวจเลขที่เอกสาร
 * อีกต่อไป** เหลือไว้เฉยๆ เพื่อไม่ให้ checkDocumentNumberRegistryConsistency()/backfillDocumentNumberRegistry()
 * (Phase 1 admin tool ใน salesDocuments.ts) และ DocumentNumberingView.vue ที่ยังเรียกใช้อยู่พังไปด้วย — เครื่องมือ
 * เหล่านั้นกลายเป็น diagnostic เฉยๆ ไม่ใช่ source of truth อีกแล้วเช่นกัน ห้ามเพิ่ม call site ใหม่มาพึ่งพา store นี้
 * เพื่อการตัดสินใจ ALLOW/BLOCK เด็ดขาด
 *
 * เก็บเป็น settings doc เดิมไว้ (reuse collection 'settings' เดิม ไม่สร้าง collection ใหม่) แยกจาก documentSettings:
 * - sequences: ตัวนับเดินหน้าอย่างเดียวต่อประเภทเอกสาร (ค้างจากยุคเก่า ไม่ถูกอ่าน/เขียนจากเส้นทางออกเลขจริงอีกแล้ว)
 * - usedNumbers: เลขที่เอกสารทุกเลขที่เคยออกไปแล้วจริง (ค้างจากยุคเก่าเช่นกัน)
 */
interface DocumentNumberRegistry {
  sequences: Record<string, number>
  usedNumbers: Record<string, boolean>
}

function defaultRegistry(): DocumentNumberRegistry {
  return { sequences: {}, usedNumbers: {} }
}

function mergeWithDefaults(raw: any): DocumentNumberRegistry {
  return {
    sequences: raw?.sequences ?? {},
    usedNumbers: raw?.usedNumbers ?? {},
  }
}

export const useDocumentNumberRegistryStore = defineStore('documentNumberRegistry', () => {
  const { data, loading, error } = useFirestoreSettings<DocumentNumberRegistry>('documentNumberRegistry', defaultRegistry, mergeWithDefaults)

  /** DEPRECATED — ไม่ถูกเรียกจากเส้นทางออกเลขที่เอกสารจริงอีกแล้ว (ดูคอมเมนต์บนสุดของไฟล์) เหลือไว้เพื่อ backward-compat
   *  ออกเลขรันถัดไปของประเภทเอกสารนี้ เดินหน้าอย่างเดียวเสมอ (ไม่สนว่าเอกสารที่มีเลขก่อนหน้าจะยังอยู่จริงไหม) */
  function nextSequence(docType: string): number {
    const next = (data.value.sequences[docType] ?? 0) + 1
    data.value.sequences[docType] = next
    return next
  }

  /** DEPRECATED — ไม่ถูกเรียกจากเส้นทางออกเลขที่เอกสารจริงอีกแล้ว (ดูคอมเมนต์บนสุดของไฟล์)
   *  ดูเลขรันถัดไปที่ "จะ" ออก โดยไม่บันทึก/เพิ่มตัวนับจริง — ใช้แสดงเลขที่เอกสารตัวอย่างในฟอร์มก่อนกดบันทึก */
  function peekNextSequence(docType: string): number {
    return (data.value.sequences[docType] ?? 0) + 1
  }

  /** DEPRECATED — ไม่ใช้ตัดสิน ALLOW/BLOCK เลขที่เอกสารอีกแล้ว (ดูคอมเมนต์บนสุดของไฟล์) เหลือไว้ให้ diagnostic tool เดิมเรียก
   *  true ถ้าเลขที่เอกสารนี้เคยถูกใช้ไปแล้ว (ไม่ว่าเอกสารต้นทางจะยังอยู่หรือถูกลบไปแล้วก็ตาม) */
  function isNumberUsed(number: string): boolean {
    return data.value.usedNumbers[number.trim()] === true
  }

  /** DEPRECATED — ไม่มี call site ใดเรียกจากเส้นทางออกเลขที่เอกสารจริงอีกแล้ว (ดูคอมเมนต์บนสุดของไฟล์)
   *  จองเลขที่เอกสารนี้ถาวร — เดิมเรียกตอนบันทึกเอกสารสำเร็จ ไม่มีการลบระเบียนนี้ทิ้งแม้เอกสารต้นทางจะถูกลบภายหลัง */
  function registerNumber(number: string) {
    if (!number.trim()) return
    data.value.usedNumbers[number.trim()] = true
  }

  /** DEPRECATED — เหลือไว้ให้ diagnostic tool เดิมเรียกเท่านั้น (ดูคอมเมนต์บนสุดของไฟล์)
   *  ค่าตัวนับปัจจุบันของประเภทเอกสารนี้ (อ่านอย่างเดียว) — ใช้ตรวจสอบความสอดคล้องก่อน migrate ฟอร์มอื่นมาใช้
   *  peekNextSequence/nextSequence (ดู checkDocumentNumberRegistryConsistency ใน stores/salesDocuments.ts) */
  function sequenceValue(docType: string): number {
    return data.value.sequences[docType] ?? 0
  }

  /** DEPRECATED — เหลือไว้ให้ diagnostic tool เดิมเรียกเท่านั้น (ดูคอมเมนต์บนสุดของไฟล์)
   *  สำเนาอ่านอย่างเดียวของ usedNumbers ทั้งหมด — ใช้ตรวจสอบความสอดคล้อง (ไม่ใช้แก้ไขตรงๆ จากภายนอก store นี้) */
  function usedNumbersSnapshot(): Readonly<Record<string, boolean>> {
    return { ...data.value.usedNumbers }
  }

  /** DEPRECATED — เหลือไว้ให้ diagnostic tool เดิม (backfillDocumentNumberRegistry) เรียกเท่านั้น (ดูคอมเมนต์บนสุดของไฟล์)
   *  ดันตัวนับของประเภทเอกสารนี้ขึ้นให้ไม่ต่ำกว่า min เท่านั้น (ไม่มีวันลดค่าลง) */
  function ensureMinSequence(docType: string, min: number) {
    if ((data.value.sequences[docType] ?? 0) < min) data.value.sequences[docType] = min
  }

  return {
    loading,
    error,
    nextSequence,
    peekNextSequence,
    isNumberUsed,
    registerNumber,
    sequenceValue,
    usedNumbersSnapshot,
    ensureMinSequence,
  }
})
