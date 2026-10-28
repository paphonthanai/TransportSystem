import type { BookingJobType } from '@/types'

/** ประเภทการลงสินค้า (Fleet Cements) — ค่าที่เก็บในระบบยังเป็นชื่อไทยเหมือนเดิม (งานเก่าไม่ต้องแปลง) แต่หน้างานเรียกเป็นรหัส d1/d2/d3 */
export const JOB_TYPE_OPTIONS: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

export const JOB_TYPE_CODE: Record<BookingJobType, string> = {
  ลงมือ: 'd1',
  พาเลทโรงงาน: 'd2',
  พาเลทฟรี: 'd3',
}

/** รหัสที่แสดงให้คนขับ/ในเอกสาร เช่น "d1" — ไม่มีประเภท = '' */
export function jobTypeCode(t?: BookingJobType): string {
  return t ? JOB_TYPE_CODE[t] : ''
}

/** ปุ่มเลือกฝั่งออฟฟิศ — รหัสพร้อมชื่อเต็ม เช่น "d1 ลงมือ" */
export function jobTypeOptionLabel(t: BookingJobType): string {
  return `${JOB_TYPE_CODE[t]} ${t}`
}

/** อ่านค่าจาก Excel/ชีท — รับทั้งรหัส (d1, D1) และชื่อไทยเต็ม; อ่านไม่ออก = undefined */
export function parseJobType(raw: string): BookingJobType | undefined {
  const v = raw.trim()
  if (!v) return undefined
  const lower = v.toLowerCase()
  return JOB_TYPE_OPTIONS.find((t) => t === v || JOB_TYPE_CODE[t] === lower)
}

/** รหัสพร้อมชื่อเต็ม เช่น "d1 (ลงมือ)" — ใช้ในแอปคนขับและหน้ารายละเอียดงาน; ไม่มีประเภท = '' */
export function jobTypeLabel(t?: BookingJobType): string {
  return t ? `${JOB_TYPE_CODE[t]} (${t})` : ''
}
