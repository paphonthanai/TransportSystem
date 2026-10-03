import { computed, ref, type Ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useVehiclesStore } from '@/stores/vehicles'
import { computeBookingMoney } from '@/utils/bookingMoney'
import { isBookingConfirmedForBilling } from '@/utils/bookingStatus'
import type { Booking, BookingCategory } from '@/types'

/** สถานะเอกสารทั้ง 3 ประเภท (billingNoteDocId/taxInvoiceDocId/receiptDocId) เป็นอิสระต่อกันโดยเจตนา ไม่ใช่ enum เดียวแบบ
 *  billingStatus เดิม — ตัวกรองนี้จึงเลือกกรองได้ทีละ "ด้าน" เท่านั้น (เช่น เฉพาะยังไม่วางบิล หรือเฉพาะออกใบแจ้งหนี้แล้ว) */
export type CompletedJobsDocClaimFilter = '' | 'BILLING_PENDING' | 'BILLING_DONE' | 'INVOICE_PENDING' | 'INVOICE_DONE' | 'RECEIPT_PENDING' | 'RECEIPT_DONE'

export interface CompletedJobsFilters {
  /** ไม่ระบุ = รวมทุกกองรถ */
  fleet?: BookingCategory
  search: string
  dateFrom: string
  dateTo: string
  customer: string
  driverName: string
  docClaim: CompletedJobsDocClaimFilter
  site: string
  district: string
}

export const defaultCompletedJobsFilters = (fleet?: BookingCategory): CompletedJobsFilters => ({
  fleet,
  search: '',
  dateFrom: '',
  dateTo: '',
  customer: '',
  driverName: '',
  docClaim: '',
  site: '',
  district: '',
})

/**
 * รวม logic ของ "งานเสร็จสิ้น" (booking.status === 'DELIVERED') ไว้ที่เดียว ให้ทั้งหน้า /completed-jobs (รวมทุกกองรถ)
 * และหน้า /booking/:fleet/completed (เฉพาะกองรถเดียว) เรียกใช้ร่วมกัน แทนที่จะก็อปปี้ logic การกรอง/แสดงผลซ้ำ
 */
export function useCompletedJobs(filters: Ref<CompletedJobsFilters>) {
  const bookingStore = useBookingStore()
  const salesDocumentsStore = useSalesDocumentsStore()
  const vehiclesStore = useVehiclesStore()

  const matchesSearch = (b: Booking, q: string) =>
    b.docNo.toLowerCase().includes(q) ||
    (b.po || '').toLowerCase().includes(q) ||
    b.customer.toLowerCase().includes(q) ||
    (b.plate || '').toLowerCase().includes(q) ||
    b.items.some((i) => i.siteName.toLowerCase().includes(q) || i.district.toLowerCase().includes(q))

  const completedBookings = computed(() => {
    const f = filters.value
    const q = f.search.trim().toLowerCase()
    const from = f.dateFrom ? new Date(f.dateFrom) : null
    const to = f.dateTo ? new Date(f.dateTo) : null
    return bookingStore.bookings
      .filter((b) => b.status === 'DELIVERED')
      // งานที่จบผ่านแอปคนขับ (มี podReviewStatus) ต้องรอ "ยืนยันการจบงาน" ก่อนถึงจะมาอยู่ในหน้านี้ — อยู่ในตาราง
      // "งานที่กำลังขนส่ง" (BookingView.vue) ไปก่อนจนกว่าจะกดยืนยัน (ดู isBookingConfirmedForBilling) งานที่ออฟฟิศ
      // ปิดเอง (podReviewStatus undefined) ไม่ต้องรอ โผล่ที่นี่ทันทีเหมือนเดิม
      .filter((b) => isBookingConfirmedForBilling(b))
      .filter((b) => !f.fleet || b.category === f.fleet)
      .filter((b) => !q || matchesSearch(b, q))
      .filter((b) => !f.customer || b.customer === f.customer)
      .filter((b) => !f.driverName || b.driverName === f.driverName)
      .filter((b) => {
        switch (f.docClaim) {
          case 'BILLING_PENDING':
            return !b.billingNoteDocId
          case 'BILLING_DONE':
            return !!b.billingNoteDocId
          case 'INVOICE_PENDING':
            return !b.taxInvoiceDocId
          case 'INVOICE_DONE':
            return !!b.taxInvoiceDocId
          case 'RECEIPT_PENDING':
            return !b.receiptDocId
          case 'RECEIPT_DONE':
            return !!b.receiptDocId
          default:
            return true
        }
      })
      .filter((b) => !f.site || b.items.some((i) => i.siteName.toLowerCase().includes(f.site.trim().toLowerCase())))
      .filter((b) => !f.district || b.items.some((i) => i.district.toLowerCase().includes(f.district.trim().toLowerCase())))
      .filter((b) => {
        if (!from && !to) return true
        const completed = b.completedAt ? new Date(b.completedAt) : null
        if (!completed) return false
        if (from && completed < from) return false
        if (to) {
          const toEnd = new Date(to)
          toEnd.setHours(23, 59, 59, 999)
          if (completed > toEnd) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
  })

  const productLabel = (booking: Booking) => {
    const names = [...new Set(booking.items.map((i) => i.product).filter(Boolean))]
    return names.length ? names.join(', ') : '-'
  }

  const destinationLabel = (booking: Booking) => {
    if (!booking.items.length) return '-'
    const first = booking.items[0].siteName
    return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
  }

  /** งานเก่าบางรายการอาจไม่มี qty/unit ต่อรายการ (ข้อมูลไม่ครบ) — แสดง "-" แทน ห้ามโชว์ "undefined" ดิบๆ */
  const weightQtyLabel = (booking: Booking) =>
    booking.items.map((i) => (i.qty !== undefined && i.unit ? `${i.qty} ${i.unit}` : '-')).join(', ') || '-'

  /** รูป POD อยู่ระดับรายการสินค้า (JobItem.podImage) ไม่ใช่ระดับงาน — ใช้รูปแรกที่มีเป็นตัวแทนของทั้งงาน */
  const firstPodImage = (booking: Booking) => booking.items.find((i) => i.podImage)?.podImage

  /** รูปทั้งหมดของงาน (ขึ้นสินค้า + ต่อจุดส่ง: สินค้าตอนลง/ใบส่งของ) พร้อมป้ายกำกับ ใช้โชว์รวมในหน้าดูรูป */
  const bookingPhotos = (booking: Booking) => {
    const photos: { label: string; url: string }[] = []
    if (booking.loadingImage) photos.push({ label: 'ขึ้นสินค้า', url: booking.loadingImage })
    booking.items.forEach((item, idx) => {
      const where = booking.items.length > 1 ? ` (จุดที่ ${idx + 1}: ${item.siteName})` : ''
      if (item.podImage) photos.push({ label: `สินค้าตอนลง${where}`, url: item.podImage })
      if (item.deliveryNoteImage) photos.push({ label: `ใบส่งของ${where}`, url: item.deliveryNoteImage })
    })
    return photos
  }

  /** หาเอกสารขาย (ใบวางบิล/ใบแจ้งหนี้/ใบเสร็จ) ที่ผูกกับงานนี้ ใช้ทำลิงก์ข้ามไปหน้าเอกสารนั้นโดยตรง */
  const documentsForBooking = (booking: Booking) => {
    const docs = salesDocumentsStore.documents.filter((d) => d.bookingIds.includes(booking.id))
    return {
      billing: docs.find((d) => d.type === 'BILLING'),
      taxInvoice: docs.find((d) => d.type === 'TAX_INVOICE'),
      receipt: docs.find((d) => d.type === 'RECEIPT'),
    }
  }

  /** เงินของงานนี้ (ยอดขาย/เบี้ยเลี้ยง/ค่าน้ำมัน/รายจ่าย/รายได้บริษัท) — ประเภทรถหาจากทะเบียนรถ ดู utils/bookingMoney.ts */
  const moneyForBooking = (booking: Booking) =>
    computeBookingMoney(booking, booking.plate ? vehiclesStore.findByFullPlate(booking.plate)?.department : undefined)

  /** แถว Excel ของงานเสร็จสิ้น 1 งาน — ใช้ร่วมกันทั้งหน้า "งานเสร็จสิ้นทั้งหมด" และ "งานเสร็จสิ้น" รายกองรถ ให้คอลัมน์ตรงกันเสมอ
   *  ลูกค้าใช้ชื่อเต็ม (ไม่ใช่ชื่อย่อ) รายได้คงเหลือ (รายได้บริษัท) เว้นว่างถ้าคิดไม่ได้ พร้อมหมายเหตุสาเหตุ (ห้ามนำไปคำนวณ) */
  const buildExportRow = (b: Booking) => {
    const docs = documentsForBooking(b)
    const money = moneyForBooking(b)
    const dateLabel = (d?: Date) => (d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
    return {
      เลขที่เอกสาร: b.docNo,
      'เลข PO': b.po || '',
      กองรถ: b.category === 'cements' ? 'Cements' : 'Ceramics',
      ลูกค้า: b.customer,
      ปลายทาง: b.items.map((i) => i.siteName).filter(Boolean).join(', '),
      'อำเภอ/จังหวัด': [...new Set(b.items.map((i) => [i.district, i.province].filter(Boolean).join('/')).filter(Boolean))].join(', '),
      สินค้า: productLabel(b),
      'น้ำหนัก/จำนวน': weightQtyLabel(b),
      ทะเบียนรถ: b.plate || '',
      คนขับ: b.driverName || '',
      วันที่ส่งของสำเร็จ: dateLabel(b.completedAt),
      ราคา: b.agreedPrice || b.tripFee || 0,
      เบี้ยเลี้ยง: money.allowance,
      ค่าน้ำมัน: money.fuelCost,
      'รายได้คงเหลือ (รายได้บริษัท)': money.companyIncome ?? '',
      หมายเหตุรายได้: money.incomeNote || '',
      เลขใบวางบิล: docs.billing?.number || '',
      เลขใบแจ้งหนี้: docs.taxInvoice?.number || '',
      เลขใบเสร็จ: docs.receipt?.number || '',
    }
  }

  const distinctCustomers = computed(() => [...new Set(bookingStore.bookings.filter((b) => b.status === 'DELIVERED').map((b) => b.customer))].sort())
  const distinctDrivers = computed(() =>
    [...new Set(bookingStore.bookings.filter((b) => b.status === 'DELIVERED' && b.driverName).map((b) => b.driverName as string))].sort()
  )
  const distinctDistricts = computed(() =>
    [...new Set(bookingStore.bookings.filter((b) => b.status === 'DELIVERED').flatMap((b) => b.items.map((i) => i.district)).filter(Boolean))].sort()
  )

  const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatShortDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

  return {
    completedBookings,
    productLabel,
    destinationLabel,
    weightQtyLabel,
    firstPodImage,
    bookingPhotos,
    documentsForBooking,
    moneyForBooking,
    buildExportRow,
    distinctCustomers,
    distinctDrivers,
    distinctDistricts,
    formatBaht,
    formatShortDate,
  }
}

export const useCompletedJobsFilters = (fleet?: BookingCategory) => ref<CompletedJobsFilters>(defaultCompletedJobsFilters(fleet))
