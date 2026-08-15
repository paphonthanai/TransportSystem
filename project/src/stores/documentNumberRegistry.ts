import { defineStore } from 'pinia'
import { useFirestoreSettings } from '@/composables/useFirestoreSettings'

/**
 * ทะเบียนเลขที่เอกสารถาวร (Phase 4) — แก้ปัญหาที่ต้นเหตุจริง: เดิมทุกจุดที่ออกเลขรัน (createReceiptManual,
 * createReceiptFromSourceDocs ฯลฯ) ใช้ documents.value.filter(d => d.type === 'RECEIPT').length + 1 ซึ่งนับจาก
 * เอกสารที่ "ยังมีอยู่จริงตอนนี้" เท่านั้น — ถ้าลบเอกสารทิ้งแล้วสร้างใหม่ เลขจะย้อนกลับไปซ้ำเลขเดิมทันที (bug จริงที่ระบุมา)
 *
 * เก็บเป็น settings doc ใหม่ 1 อัน (reuse collection 'settings' เดิม ไม่สร้าง collection ใหม่) แยกจาก documentSettings
 * เพราะเปลี่ยนบ่อยกว่ามาก (ทุกครั้งที่ออกเอกสาร) ไม่อยากให้ปนกับ settings ทั่วไปที่แก้ไม่บ่อย:
 * - sequences: ตัวนับเดินหน้าอย่างเดียวต่อประเภทเอกสาร ไม่มีวันย้อนกลับแม้ลบเอกสารทิ้ง
 * - usedNumbers: เลขที่เอกสารทุกเลขที่เคยออกไปแล้วจริง (map string -> true) ใช้เช็คเลขซ้ำตอน Admin กรอกเอง แม้เอกสาร
 *   ต้นทางจะถูกลบไปแล้วก็ตาม (เช็คจาก collection เอกสารที่มีอยู่จริงอย่างเดียวไม่พอ เพราะลบแล้วหายไปจากที่นั่นเลย)
 *
 * หมายเหตุ (ข้อจำกัดที่ทราบ): ใช้ pattern เดียวกับ useFirestoreSettings ที่มีอยู่แล้วทั้งระบบ (โหลดเข้า memory ทั้งก้อน
 * แก้ในนี้แบบ sync แล้วปล่อยให้ watcher เขียนกลับ Firestore แบบ async เบื้องหลัง) เพื่อไม่ต้องเปลี่ยนฟังก์ชันสร้าง
 * เอกสารเดิมทั้งหมดจาก sync เป็น async (จะกระทบทุกหน้าที่เรียกใช้) — ไม่ได้ป้องกัน race condition แบบ 100% ถ้ามีแอดมิน
 * 2 คนกดสร้างเอกสารพร้อมกันเป๊ะ (ต้องใช้ Firestore Transaction แบบ async ถึงจะกันได้เต็มร้อย) แต่ไม่ได้แย่ไปกว่า
 * กลไกเดิมของระบบนี้เลย (ที่อื่นก็ใช้วิธี sync คำนวณจาก array ในหน่วยความจำเหมือนกันหมด) แค่แก้ปัญหา "เลขย้อนกลับ"
 * ที่เป็นปัญหาจริงที่ระบุมาให้หายไปทั้งหมด
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

  /** ออกเลขรันถัดไปของประเภทเอกสารนี้ เดินหน้าอย่างเดียวเสมอ (ไม่สนว่าเอกสารที่มีเลขก่อนหน้าจะยังอยู่จริงไหม) */
  function nextSequence(docType: string): number {
    const next = (data.value.sequences[docType] ?? 0) + 1
    data.value.sequences[docType] = next
    return next
  }

  /** ดูเลขรันถัดไปที่ "จะ" ออก โดยไม่บันทึก/เพิ่มตัวนับจริง — ใช้แสดงเลขที่เอกสารตัวอย่างในฟอร์มก่อนกดบันทึก */
  function peekNextSequence(docType: string): number {
    return (data.value.sequences[docType] ?? 0) + 1
  }

  /** true ถ้าเลขที่เอกสารนี้เคยถูกใช้ไปแล้ว (ไม่ว่าเอกสารต้นทางจะยังอยู่หรือถูกลบไปแล้วก็ตาม) */
  function isNumberUsed(number: string): boolean {
    return data.value.usedNumbers[number.trim()] === true
  }

  /** จองเลขที่เอกสารนี้ถาวร — เรียกตอนบันทึกเอกสารสำเร็จเท่านั้น ไม่มีการลบระเบียนนี้ทิ้งแม้เอกสารต้นทางจะถูกลบภายหลัง */
  function registerNumber(number: string) {
    if (!number.trim()) return
    data.value.usedNumbers[number.trim()] = true
  }

  return { loading, error, nextSequence, peekNextSequence, isNumberUsed, registerNumber }
})
