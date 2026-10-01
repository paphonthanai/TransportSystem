import type { Booking, BookingStatus, BillingStatus, PodReviewStatus, BookingCategory } from '@/types'

/**
 * เงื่อนไขเดียวที่ใช้ร่วมกันทุกจุดที่ต้องเช็คว่า "งานนี้คอนเฟิร์มพร้อมนำไปวางบิล/ออกเอกสารขายแล้วหรือยัง" (ใบวางบิล/
 * ใบกำกับภาษี/ใบเสร็จ ทุกเส้นทาง ทั้งสร้างตรงจากงานขนส่งและสร้างจากเอกสารต้นทาง) — แยกเจตนาจาก "ตรวจสอบ POD"
 * (podReviewStatus บอกแค่ว่าหลักฐานรูปถ่ายตรงกับข้อมูลในระบบไหม) อย่างชัดเจน: งานที่ไม่เคยผ่านขั้นตอนตรวจสอบ POD เลย
 * (ออฟฟิศปิดงานเอง ไม่ผ่านแอปคนขับ — podReviewStatus เป็น undefined) ถือว่าคอนเฟิร์มแล้วโดยปริยาย เหมือนเดิมทุกประการ
 * ส่วนงานที่ผ่านขั้นตอนนี้มา (podReviewStatus มีค่า) ต้องรอ "ยืนยันการจบงาน" (completionConfirmedAt) อีกขั้นหนึ่ง —
 * ไม่ใช่แค่ POD อนุมัติเฉยๆ เพราะ "ตรวจสอบ POD" กับ "ยืนยันการจบงาน (ขั้นสุดท้ายจริง)" เป็นคนละขั้นตอนกันตาม Requirement
 */
export function isBookingConfirmedForBilling(b: Pick<Booking, 'podReviewStatus' | 'completionConfirmedAt'>): boolean {
  return !b.podReviewStatus || !!b.completionConfirmedAt
}

/** ป้ายกำกับ Feed (ประเภทสินค้า) ที่ใช้ทั้งตอนสร้างใบวางบิล (บังคับ 1 Feed ต่อใบวางบิล) และตอนพิมพ์ใบกำกับภาษี/ใบเสร็จ
 *  (ชื่องาน/รายละเอียดรายการ) — booking.category เป็นฟิลด์เดียวที่บอก "ประเภทสินค้า" ได้เชื่อถือได้ เพราะรายได้แต่ละ Feed
 *  คำนวณคนละกติกากัน (JobItem.product เป็น free text ต่อปลายทาง/รหัสงาน ไม่ใช่ตัวแบ่งกลุ่มรายได้ ห้ามใช้แทนกัน) */
export const categoryFeedLabel: Record<BookingCategory, string> = {
  cements: 'Cement',
  ceramics: 'Ceramic',
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  WAITING_DISPATCH: 'รอจัดรถ',
  ASSIGNED: 'รอคนขับตอบรับ',
  ACCEPTED: 'คนขับตอบรับแล้ว',
  FUEL_RECEIVED: 'รับน้ำมันแล้ว',
  LOADING: 'กำลังรับสินค้า',
  LOADED: 'รับสินค้าครบแล้ว',
  // IN_TRANSIT ใช้ label เดียวกับ DELIVERING โดยตั้งใจ (เดิม "กำลังขนส่ง") — ตัดขั้นตอนย่อย FUEL_RECEIVED/LOADING/
  // LOADED ออกจาก flow คนขับใหม่แล้ว (ดู DriverJobDetailView.vue) เริ่มขนส่ง (ACCEPTED -> IN_TRANSIT ตรงๆ) จึงควร
  // อ่านว่า "กำลังส่งของ" ให้สอดคล้องกับช่วง DELIVERING ต่อเนื่องกัน ไม่ใช่คนละความหมายที่ผู้ใช้แยกไม่ออก
  IN_TRANSIT: 'กำลังส่งของ',
  DELIVERING: 'กำลังส่งของ',
  // เดิม "ส่งของสำเร็จ" ฟังดูเหมือนจบงานแล้วทันทีที่คนขับกดรับงาน (สับสนกับ ACCEPTED) เปลี่ยนเป็น "ส่งของเสร็จสิ้น"
  // ให้ชัดว่าหมายถึงส่งครบทุกจุดแล้วจริง (finishDriverJob/completeJob)
  DELIVERED: 'ส่งของเสร็จสิ้น',
}

export const bookingStatusClass: Record<BookingStatus, string> = {
  WAITING_DISPATCH: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-cyan-100 text-cyan-700',
  FUEL_RECEIVED: 'bg-orange-100 text-orange-700',
  LOADING: 'bg-teal-100 text-teal-700',
  LOADED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  DELIVERING: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
}

export const billingStatusLabel: Record<BillingStatus, string> = {
  UNBILLED: 'ยังไม่วางบิล',
  IN_BATCH: 'อยู่ในรายการวางบิล',
  HOLD: 'พักบิล',
  INVOICED: 'ออกใบแจ้งหนี้แล้ว',
  PAID: 'ชำระแล้ว',
}

export const billingStatusClass: Record<BillingStatus, string> = {
  UNBILLED: 'bg-gray-100 text-gray-700',
  IN_BATCH: 'bg-blue-100 text-blue-700',
  HOLD: 'bg-red-100 text-red-700',
  INVOICED: 'bg-purple-100 text-purple-700',
  PAID: 'bg-green-100 text-green-700',
}

export interface DocumentClaimBadge {
  label: string
  class: string
}

/** สถานะเอกสารรวมของงานนี้ (ใบวางบิล/ใบแจ้งหนี้/ใบเสร็จ/เอกสารรายได้คนขับ/เอกสารรายได้รถ) เป็นอิสระต่อกันโดยเจตนา ไม่ใช่
 *  progression เดียวแบบ billingStatus เดิม (ระบบเก่า ดู Booking.billingStatus ใน types/index.ts) — งานหนึ่งอยู่ได้หลายป้ายพร้อมกัน
 *  คืนป้ายทั้งหมดที่ควรแสดง (0-5 ป้าย) */
export function documentClaimBadges(booking: {
  billingNoteDocId?: string
  taxInvoiceDocId?: string
  receiptDocId?: string
  driverPayrollDocId?: string
  vehicleIncomeDocId?: string
}): DocumentClaimBadge[] {
  const badges: DocumentClaimBadge[] = []
  if (booking.billingNoteDocId) badges.push({ label: 'วางบิลแล้ว', class: 'bg-blue-100 text-blue-700' })
  if (booking.taxInvoiceDocId) badges.push({ label: 'ออกใบแจ้งหนี้แล้ว', class: 'bg-purple-100 text-purple-700' })
  if (booking.receiptDocId) badges.push({ label: 'รับเงินแล้ว', class: 'bg-green-100 text-green-700' })
  if (booking.driverPayrollDocId) badges.push({ label: 'ออกเอกสารรายได้คนขับแล้ว', class: 'bg-teal-100 text-teal-700' })
  if (booking.vehicleIncomeDocId) badges.push({ label: 'ออกเอกสารรายได้รถแล้ว', class: 'bg-orange-100 text-orange-700' })
  return badges
}

export const podReviewStatusLabel: Record<PodReviewStatus, string> = {
  PENDING_REVIEW: 'รอตรวจสอบ POD',
  APPROVED: 'ตรวจสอบแล้ว',
  REJECTED: 'ตีกลับ',
}

export const podReviewStatusClass: Record<PodReviewStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}
