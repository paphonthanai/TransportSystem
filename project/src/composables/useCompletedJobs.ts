import { computed, ref, type Ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import type { Booking, BookingCategory } from '@/types'

export interface CompletedJobsFilters {
  /** ไม่ระบุ = รวมทุกกองรถ */
  fleet?: BookingCategory
  search: string
  dateFrom: string
  dateTo: string
  customer: string
  driverName: string
  billingStatus: string
}

export const defaultCompletedJobsFilters = (fleet?: BookingCategory): CompletedJobsFilters => ({
  fleet,
  search: '',
  dateFrom: '',
  dateTo: '',
  customer: '',
  driverName: '',
  billingStatus: '',
})

/**
 * รวม logic ของ "งานเสร็จสิ้น" (booking.status === 'DELIVERED') ไว้ที่เดียว ให้ทั้งหน้า /completed-jobs (รวมทุกกองรถ)
 * และหน้า /booking/:fleet/completed (เฉพาะกองรถเดียว) เรียกใช้ร่วมกัน แทนที่จะก็อปปี้ logic การกรอง/แสดงผลซ้ำ
 */
export function useCompletedJobs(filters: Ref<CompletedJobsFilters>) {
  const bookingStore = useBookingStore()
  const salesDocumentsStore = useSalesDocumentsStore()

  const matchesSearch = (b: Booking, q: string) =>
    b.docNo.toLowerCase().includes(q) ||
    (b.po || '').toLowerCase().includes(q) ||
    b.customer.toLowerCase().includes(q) ||
    (b.plate || '').toLowerCase().includes(q)

  const completedBookings = computed(() => {
    const f = filters.value
    const q = f.search.trim().toLowerCase()
    const from = f.dateFrom ? new Date(f.dateFrom) : null
    const to = f.dateTo ? new Date(f.dateTo) : null
    return bookingStore.bookings
      .filter((b) => b.status === 'DELIVERED')
      .filter((b) => !f.fleet || b.category === f.fleet)
      .filter((b) => !q || matchesSearch(b, q))
      .filter((b) => !f.customer || b.customer === f.customer)
      .filter((b) => !f.driverName || b.driverName === f.driverName)
      .filter((b) => !f.billingStatus || (b.billingStatus || 'UNBILLED') === f.billingStatus)
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

  const weightQtyLabel = (booking: Booking) => booking.items.map((i) => `${i.qty} ${i.unit}`).join(', ') || '-'

  /** รูป POD อยู่ระดับรายการสินค้า (JobItem.podImage) ไม่ใช่ระดับงาน — ใช้รูปแรกที่มีเป็นตัวแทนของทั้งงาน */
  const firstPodImage = (booking: Booking) => booking.items.find((i) => i.podImage)?.podImage

  /** หาเอกสารขาย (ใบวางบิล/ใบแจ้งหนี้/ใบเสร็จ) ที่ผูกกับงานนี้ ใช้ทำลิงก์ข้ามไปหน้าเอกสารนั้นโดยตรง */
  const documentsForBooking = (booking: Booking) => {
    const docs = salesDocumentsStore.documents.filter((d) => d.bookingIds.includes(booking.id))
    return {
      billing: docs.find((d) => d.type === 'BILLING'),
      taxInvoice: docs.find((d) => d.type === 'TAX_INVOICE'),
      receipt: docs.find((d) => d.type === 'RECEIPT'),
    }
  }

  const distinctCustomers = computed(() => [...new Set(bookingStore.bookings.filter((b) => b.status === 'DELIVERED').map((b) => b.customer))].sort())
  const distinctDrivers = computed(() =>
    [...new Set(bookingStore.bookings.filter((b) => b.status === 'DELIVERED' && b.driverName).map((b) => b.driverName as string))].sort()
  )

  const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
  const formatShortDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

  return {
    completedBookings,
    productLabel,
    destinationLabel,
    weightQtyLabel,
    firstPodImage,
    documentsForBooking,
    distinctCustomers,
    distinctDrivers,
    formatBaht,
    formatShortDate,
  }
}

export const useCompletedJobsFilters = (fleet?: BookingCategory) => ref<CompletedJobsFilters>(defaultCompletedJobsFilters(fleet))
