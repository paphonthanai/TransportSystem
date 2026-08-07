<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="text-xs text-muted">ใบสั่งสินค้า &gt; {{ statusFilterLabel }}</div>
      <div class="flex items-center gap-2">
        <button @click="syncMissingSalesOrders" class="btn-secondary" title="สร้างใบสั่งสินค้าให้กับงานขนส่งที่ยังไม่มีใบสั่งสินค้าผูกอยู่">
          <span class="material-symbols-rounded text-base">sync</span>
          ซิงก์ใบสั่งสินค้าที่ขาดหาย
        </button>
        <div class="relative">
        <button @click="createMenuOpen = !createMenuOpen" class="btn-primary">
          <span class="material-symbols-rounded text-base">add</span>
          สร้างใหม่
          <span class="material-symbols-rounded text-base">expand_more</span>
        </button>
        <div v-if="createMenuOpen" v-click-outside="() => (createMenuOpen = false)" class="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
          <button @click="createNew('cements')" class="menu-item">
            <span class="material-symbols-rounded text-base">category</span>
            Fleet Cements
          </button>
          <button @click="createNew('ceramics')" class="menu-item">
            <span class="material-symbols-rounded text-base">category</span>
            Fleet Ceramics
          </button>
        </div>
        </div>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <select v-model="statusFilter" class="input-field w-48">
          <option value="all">แสดงทั้งหมด</option>
          <option v-for="s in bookingStatusOptions" :key="s" :value="s">{{ bookingStatusLabel[s] }}</option>
        </select>
        <div class="relative w-full max-w-xs">
          <span class="material-symbols-rounded text-base text-muted absolute left-3 top-1/2 -translate-y-1/2">search</span>
          <input v-model="search" placeholder="ค้นหาลูกค้า/เลขที่เอกสาร" class="input-field w-full pl-9" />
        </div>
      </div>

      <div class="overflow-auto max-h-[480px] border border-border rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border sticky top-0 z-[1]">
            <tr>
              <th class="text-left px-3 py-3 font-semibold text-muted">วันที่</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">ชื่อลูกค้า</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">อ้างอิงใบเสนอราคา</th>
              <th class="text-right px-3 py-3 font-semibold text-muted">ยอดรวมสุทธิ</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานะงานขนส่ง</th>
              <th class="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedRows" :key="row.doc.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ formatDate(row.doc.date) }}</td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-2 font-bold text-primary">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="row.booking ? bookingStatusClass[row.booking.status] : 'bg-gray-400'"></span>
                  {{ row.doc.number }}
                </div>
              </td>
              <td class="px-3 py-3 font-semibold text-text">{{ row.doc.customer }}</td>
              <td class="px-3 py-3 text-muted">
                <RouterLink v-if="row.doc.parentDocumentId" :to="`/documents/${row.doc.parentDocumentId}`" class="hover:text-primary hover:underline">
                  {{ sourceQuotationNumber(row.doc) }}
                </RouterLink>
                <span v-else>-</span>
              </td>
              <td class="px-3 py-3 text-right font-semibold text-text">{{ formatBaht(row.doc.amount) }}</td>
              <td class="px-3 py-3">
                <select
                  v-if="row.booking"
                  :value="row.booking.status"
                  @change="onStatusSelect(row.booking, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = row.booking.status"
                  class="status-select"
                  :class="bookingStatusClass[row.booking.status]"
                >
                  <option :value="row.booking.status">{{ bookingStatusLabel[row.booking.status] }}</option>
                  <option v-if="row.booking.status !== 'DELIVERED'" value="COMPLETE">✓ จบงาน (ออกใบวางบิล)</option>
                  <option v-if="row.booking.status !== 'WAITING_DISPATCH'" value="RESET">↺ Reset สถานะ</option>
                </select>
                <span v-else class="status-pill bg-gray-100 text-gray-700">ไม่พบงานขนส่ง</span>
              </td>
              <td class="px-3 py-3 text-right relative">
                <button @click="toggleMenu(row.doc.id, $event)" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2 ml-auto">
                  <span class="material-symbols-rounded text-base">more_horiz</span>
                </button>
              </td>
            </tr>
            <tr v-if="pagedRows.length === 0">
              <td colspan="7" class="px-3 py-8 text-center text-muted">ยังไม่มีเอกสาร</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 text-sm">
        <div class="flex items-center gap-2 text-muted">
          รายการต่อหน้า
          <select v-model.number="perPage" class="input-field w-20">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-muted">ยอดรวมทั้งหมด: <span class="font-semibold text-text">{{ formatBaht(totalAmount) }}</span></div>
          <div class="flex items-center gap-1">
            <button @click="page = Math.max(1, page - 1)" :disabled="page === 1" class="page-btn">
              <span class="material-symbols-rounded text-base">chevron_left</span>
            </button>
            <span class="text-muted px-1">{{ page }}/{{ totalPages }}</span>
            <button @click="page = Math.min(totalPages, page + 1)" :disabled="page === totalPages" class="page-btn">
              <span class="material-symbols-rounded text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="activeMenuDoc"
        v-click-outside="closeMenu"
        class="fixed z-50 w-52 bg-surface border border-border rounded-lg shadow-lg py-1 text-left"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
      >
        <button @click="router.push(`/documents/${activeMenuDoc.id}`); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">print</span>
          พิมพ์
        </button>
        <button v-if="activeMenuBooking" @click="router.push(`/job/${activeMenuBooking.id}`); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">local_shipping</span>
          ดูงานขนส่ง
        </button>
        <div class="border-t border-border my-1"></div>
        <button @click="removeSalesOrder(activeMenuDoc); closeMenu()" class="menu-item text-red-600 hover:bg-red-50">
          <span class="material-symbols-rounded text-base">delete</span>
          ลบ (ไม่กระทบงานขนส่ง)
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesDocumentsStore, type SalesDocument } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useBookingStore } from '@/stores/booking'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import type { Booking, BookingCategory, BookingStatus } from '@/types'

const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const bookingStore = useBookingStore()

const statusFilter = ref<'all' | BookingStatus>('all')
const search = ref('')
const createMenuOpen = ref(false)

const bookingStatusOptions = Object.keys(bookingStatusLabel) as BookingStatus[]
const statusFilterLabel = computed(() => (statusFilter.value === 'all' ? 'แสดงทั้งหมด' : bookingStatusLabel[statusFilter.value]))

/** ใบสั่งสินค้าแต่ละใบผูกกับ Booking เดียวเสมอ (สร้างพร้อมกันตอนบันทึกงาน) — โชว์สถานะจริงจากงานขนส่ง ไม่ใช่สถานะเอกสาร */
const rows = computed(() =>
  salesDocumentsStore.documents
    .filter((d) => d.type === 'SALES_ORDER')
    .map((doc) => ({ doc, booking: bookingStore.bookings.find((b) => b.id === doc.bookingIds[0]) }))
)

const filteredRows = computed(() =>
  rows.value.filter(({ doc, booking }) => {
    if (statusFilter.value !== 'all' && booking?.status !== statusFilter.value) return false
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    return doc.customer.toLowerCase().includes(q) || doc.number.toLowerCase().includes(q)
  })
)

const page = ref(1)
const perPage = ref(20)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)))
const pagedRows = computed(() => filteredRows.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
const totalAmount = computed(() => filteredRows.value.reduce((sum, r) => sum + r.doc.amount, 0))

const sourceQuotationNumber = (doc: SalesDocument) => salesDocumentsStore.documents.find((d) => d.id === doc.parentDocumentId)?.number || '-'

const createNew = (fleet: BookingCategory) => {
  createMenuOpen.value = false
  router.push({ name: 'BookingCreate', params: { fleet }, query: { source: 'sales_order' } })
}

const syncMissingSalesOrders = () => {
  const created = salesDocumentsStore.backfillMissingSalesOrders()
  alert(created > 0 ? `สร้างใบสั่งสินค้าให้งานที่ขาดหายแล้ว ${created} ใบ` : 'ทุกงานมีใบสั่งสินค้าครบแล้ว ไม่มีรายการที่ต้องซิงก์')
}

/** Dropdown สถานะงานขนส่งในตารางนี้ — ปัจจุบันมีแค่ทางลัดเดียวคือ "จบงาน" ข้ามทุกขั้นตอนไปเลย (ใช้ completeJob
 * ตัวเดียวกับปุ่ม "จบงาน (ข้ามขั้นตอน)" ในหน้ารายการงานขนส่ง) แล้วสร้างใบวางบิลอัตโนมัติทันที เหมือนปุ่มสร้างใบวางบิลด้วยมือ */
const onStatusSelect = (booking: Booking, action: string) => {
  if (action === 'COMPLETE') {
    if (!confirm(`ยืนยันจบงาน ${booking.docNo} และออกใบวางบิล?`)) return
    bookingStore.completeJob(booking.id, [], undefined)
    salesDocumentsStore.createBillingFromBookings([booking.id])
    return
  }
  if (action === 'RESET') {
    if (booking.status === 'DELIVERED') {
      const billing = salesDocumentsStore.documents.find((d) => d.type === 'BILLING' && d.bookingIds.includes(booking.id))
      if (billing && billing.status !== 'BILLING_PENDING') {
        alert(`ไม่สามารถ Reset งาน ${booking.docNo} ได้ เนื่องจากใบวางบิล ${billing.number} ถูกดำเนินการต่อแล้ว (ออกใบแจ้งหนี้แล้ว) กรุณา Reset เอกสารปลายทางก่อน`)
        return
      }
      if (!confirm(`ยืนยัน Reset สถานะงาน ${booking.docNo} จาก "ส่งของสำเร็จ" กลับไปขั้นก่อนหน้า?${billing ? ` (จะลบใบวางบิล ${billing.number} ที่ยังไม่ได้ดำเนินการต่อด้วย)` : ''}`)) return
      if (billing) salesDocumentsStore.cancelBillingNote(billing.id)
    } else if (!confirm(`ยืนยัน Reset สถานะงาน ${booking.docNo} กลับไปขั้นก่อนหน้า?`)) {
      return
    }
    const result = bookingStore.resetBookingStatus(booking.id)
    if (!result.ok && result.message) alert(result.message)
  }
}

const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: 0, left: 0 })
const activeMenuDoc = computed(() => filteredRows.value.find((r) => r.doc.id === openMenuId.value)?.doc || null)
const activeMenuBooking = computed(() => filteredRows.value.find((r) => r.doc.id === openMenuId.value)?.booking || null)

const MENU_WIDTH = 208
const MENU_ESTIMATED_HEIGHT = 140

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    closeMenu()
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const openUpward = rect.bottom + MENU_ESTIMATED_HEIGHT > window.innerHeight
  menuPosition.value = {
    top: openUpward ? rect.top - MENU_ESTIMATED_HEIGHT : rect.bottom + 4,
    left: Math.max(8, rect.right - MENU_WIDTH),
  }
  openMenuId.value = id
}
const closeMenu = () => {
  openMenuId.value = null
}

window.addEventListener('scroll', closeMenu, true)
onUnmounted(() => window.removeEventListener('scroll', closeMenu, true))

const vClickOutside = {
  mounted(el: HTMLElement & { _clickOutside?: (e: MouseEvent) => void }, binding: { value: () => void }) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el: HTMLElement & { _clickOutside?: (e: MouseEvent) => void }) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside, true)
  },
}

const removeSalesOrder = (doc: SalesDocument) => {
  if (!confirm(`ยืนยันลบใบสั่งสินค้า ${doc.number}? งานขนส่งที่ผูกไว้จะไม่ถูกลบ`)) return
  salesDocumentsStore.deleteSalesOrder(doc.id)
}

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.status-pill {
  @apply inline-flex h-7 px-2.5 rounded-full text-xs font-semibold items-center;
}

.status-select {
  @apply h-8 px-2 rounded-full border-0 text-xs font-semibold cursor-pointer focus:outline-none;
}

.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 cursor-pointer text-left;
}

.page-btn {
  @apply w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}
</style>
