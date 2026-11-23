import type { Booking } from '@/types'

/**
 * เลขชิพเม้นของลูกค้า (เช่น SH20261031-0699/2111799855-10-00001) — ลูกค้าออกให้เที่ยวละเลข ใช้เช็คเอกสาร/ตรวจงานซ้ำแทนเลขที่เอกสารที่ระบบออกเอง
 * เก็บอยู่ที่ Booking.reference (ช่อง "เลขที่ PO ลูกค้า" / คอลัมน์ "เลขที่เอกสาร" ตอน import) งานที่กรอกไว้แค่ช่อง "เลขชิพเม้น" ใช้ shipmentNo แทน
 */
export const customerShipmentNo = (b: Pick<Booking, 'reference' | 'shipmentNo'>) => b.reference?.trim() || b.shipmentNo?.trim() || ''

/** ช่อง "เลขที่เอกสาร" ของงาน = เลขที่เอกสารของลูกค้าจากไฟล์ import (I-...) ถ้ามี ไม่มีใช้เลขที่ระบบรันเอง */
export const bookingDocNo = (b: Pick<Booking, 'customerDocNo' | 'docNo'>) => b.customerDocNo?.trim() || b.docNo

/** เลขที่เอกสารที่แสดงในเอกสารวางบิล/ใบกำกับภาษี/ใบเสร็จ และหน้าเลือกงาน = คอลัมน์ "เลขที่เอกสาร" จากไฟล์ import (I-...)
 *  งานที่ import ก่อนมีช่อง customerDocNo เก็บเลขจากคอลัมน์นั้นไว้ที่ reference จึงใช้ reference เป็นลำดับถัดไป ไม่มีทั้งคู่ใช้เลขของระบบ */
export const billingDocNo = (b: Pick<Booking, 'customerDocNo' | 'reference' | 'shipmentNo' | 'docNo'>) =>
  b.customerDocNo?.trim() || customerShipmentNo(b) || b.docNo

/** เลขที่ใช้แสดงแทนงาน 1 งานทุกหน้า = เลข PO ลูกค้า (ชิพเม้น) — งานที่ไม่มีเลข PO ใช้เลขที่เอกสารของระบบแทน ไม่ให้ช่องว่าง */
export const bookingRefNo = (b: Pick<Booking, 'reference' | 'shipmentNo' | 'docNo'>) => customerShipmentNo(b) || b.docNo
