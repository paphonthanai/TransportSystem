import type { Booking } from '@/types'

/**
 * ค้นหางานขนส่งจากคำค้นเดียว ใช้ร่วมกันทั้งหน้า Booking และหน้าเลือกงานออกเอกสาร (ใบวางบิล/ใบกำกับภาษี/ใบเสร็จ)
 * ครอบคลุม: เลขที่งาน · เลขใบปล่อยรถ · ใบสั่งงาน (PO) · เลขที่ PO ลูกค้า · เลขชิพเม้น · ลูกค้า · ทะเบียน · คนขับ (ชื่อ/
 * นามสกุล/ชื่อเล่นที่ส่งเข้ามา) · ต้นทาง · เส้นทาง · รายละเอียด · หมายเหตุ · ทุกจุดส่ง (หน้างาน · จังหวัด · อำเภอ ·
 * สินค้า · ผู้ติดต่อ · เบอร์โทร · จุดรับสินค้า)
 * ไม่สนตัวพิมพ์เล็กใหญ่ เว้นวรรคหลายคำ = ต้องเจอทุกคำ (เช่น "สมชาย แพร่") เบอร์โทรค้นได้ทั้งแบบมี/ไม่มีขีด
 */
export function matchesBookingSearch(b: Booking, query: string, extraTerms: (string | undefined)[] = []): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const text = bookingSearchText(b, extraTerms)
  const digits = text.replace(/[\s-]+/g, '')
  return words.every((w) => text.includes(w) || (/^[\d-]+$/.test(w) && digits.includes(w.replace(/-/g, ''))))
}

function bookingSearchText(b: Booking, extraTerms: (string | undefined)[]): string {
  const parts: (string | undefined)[] = [
    b.docNo,
    b.releaseNo,
    b.po,
    b.reference,
    b.shipmentNo,
    b.customer,
    b.plate,
    b.driverName,
    b.driverFirstName,
    b.driverLastName,
    b.origin,
    b.route,
    b.description,
    b.note,
    ...extraTerms,
  ]
  for (const i of b.items) {
    parts.push(i.siteName, i.province, i.district, i.product, i.siteContactName, i.sitePhone, i.pickupOriginName)
  }
  return parts.filter(Boolean).join(' | ').toLowerCase()
}
