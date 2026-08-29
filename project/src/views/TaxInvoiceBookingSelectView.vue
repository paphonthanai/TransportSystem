<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">เลือกงานขนส่งเพื่อออกใบแจ้งหนี้รวม</h2>
        <div class="text-xs text-muted mt-0.5">เลือกลูกค้าและงานขนส่ง แล้วนำข้อมูลไปแสดงในหน้าสร้างใบแจ้งหนี้</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/tax-invoices')" class="btn-secondary">ยกเลิก</button>
        <button @click="goToForm" :disabled="pickerSelectedIds.size === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">arrow_forward</span>
          ถัดไป ({{ pickerSelectedIds.size }})
        </button>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <div>
          <label class="field-label">ลูกค้า</label>
          <select v-model="customerName" class="input-field w-full">
            <option value="">เลือกลูกค้า...</option>
            <option v-for="c in eligibleCustomers" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">ประเภทงาน (Feed)</label>
          <select v-model="bookingCategory" :disabled="!customerName.trim()" class="input-field w-full disabled:opacity-40">
            <option value="">เลือกประเภทงาน...</option>
            <option v-for="c in bookingCategories" :key="c" :value="c">{{ categoryFeedLabel[c] }}</option>
          </select>
        </div>
      </div>
      <div v-if="bookingCategories.length > 1" class="text-[11px] text-muted">ลูกค้ารายนี้มีงานมากกว่าหนึ่งประเภท ต้องออกใบแจ้งหนี้แยกทีละประเภท (Feed) เสมอ</div>

      <div v-if="bookingCategory" class="border border-border rounded-lg overflow-x-auto bg-surface">
        <table class="w-full text-sm min-w-[900px]">
          <thead class="bg-surface-2 text-xs text-muted">
            <tr>
              <th class="px-3 py-2 w-8"></th>
              <th class="text-left px-3 py-2 font-semibold w-10">ลำดับ</th>
              <th class="text-left px-3 py-2 font-semibold">ชื่อสินค้า/รายละเอียด</th>
              <th class="text-right px-3 py-2 font-semibold">จำนวน</th>
              <th class="text-left px-3 py-2 font-semibold">หน่วย</th>
              <th class="text-right px-3 py-2 font-semibold">ราคาต่อหน่วย</th>
              <th class="text-right px-3 py-2 font-semibold">ส่วนลด</th>
              <th class="text-right px-3 py-2 font-semibold">ภาษี (%)</th>
              <th class="text-right px-3 py-2 font-semibold">หัก ณ ที่จ่าย</th>
              <th class="text-right px-3 py-2 font-semibold">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in eligibleBookings" :key="b.id" class="border-t border-border">
              <td class="px-3 py-2">
                <input type="checkbox" :checked="pickerSelectedIds.has(b.id)" @change="toggleBooking(b.id)" class="w-4 h-4" />
              </td>
              <td class="px-3 py-2 text-muted">{{ idx + 1 }}</td>
              <td class="px-3 py-2 text-text">{{ bookingDescription(b) }}</td>
              <td class="px-3 py-2 text-right text-text">1</td>
              <td class="px-3 py-2 text-text">เที่ยว</td>
              <td class="px-3 py-2 text-right text-text">{{ formatBaht(bookingTotal(b)) }}</td>
              <td class="px-3 py-2 text-right text-text">{{ b.discountMode === 'fixed' ? formatBaht(b.discountAmount || 0) : `${b.discountPercent || 0}%` }}</td>
              <td class="px-3 py-2 text-right text-text">{{ b.vatRate || 0 }}%</td>
              <td class="px-3 py-2 text-right text-text">-</td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(b)) }}</td>
            </tr>
            <tr v-if="eligibleBookings.length === 0">
              <td colspan="10" class="px-3 py-6 text-center text-muted">ลูกค้ารายนี้ไม่มีงานประเภทนี้ที่รอออกใบแจ้งหนี้</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="bookingCategory" class="flex justify-end text-sm">
        <span class="text-muted">ยอดรวมที่เลือก:</span>
        <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { categoryFeedLabel } from '@/utils/bookingStatus'
import type { Booking, BookingCategory } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const documentSettingsStore = useDocumentSettingsStore()

/** เงื่อนไขเดียวกับ createTaxInvoiceFromBookings/createTaxInvoiceManual (claim ทางตรง) ทุกประการ */
const isBookingBillable = (b: Booking) => b.status === 'DELIVERED' && !b.taxInvoiceDocId

const eligibleCustomers = computed(() => [...new Set(bookingStore.bookings.filter(isBookingBillable).map((b) => b.customer))].sort())

const customerName = ref('')
const bookingCategory = ref<BookingCategory | ''>('')
const pickerSelectedIds = ref<Set<string>>(new Set())

const bookingCategories = computed<BookingCategory[]>(() => {
  if (!customerName.value.trim()) return []
  const cats = new Set(bookingStore.bookings.filter((b) => b.customer === customerName.value && isBookingBillable(b)).map((b) => b.category))
  return [...cats].sort()
})

const eligibleBookings = computed<Booking[]>(() => {
  if (!bookingCategory.value) return []
  return bookingStore.bookings.filter((b) => b.customer === customerName.value && b.category === bookingCategory.value && isBookingBillable(b))
})

const toggleBooking = (id: string) => {
  if (pickerSelectedIds.value.has(id)) pickerSelectedIds.value.delete(id)
  else pickerSelectedIds.value.add(id)
  pickerSelectedIds.value = new Set(pickerSelectedIds.value)
}

const bookingDestination = (b: Booking) => {
  if (!b.items.length) return '-'
  const first = b.items[0].siteName
  return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
}
const bookingDescription = (b: Booking) => {
  const dest = bookingDestination(b)
  const products = [...new Set(b.items.map((i) => i.product).filter(Boolean))].join(' + ')
  return products ? `${dest} — ${products}` : dest
}
const bookingTotal = (b: Booking) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)

const selectedTotal = computed(() => eligibleBookings.value.filter((b) => pickerSelectedIds.value.has(b.id)).reduce((sum, b) => sum + bookingTotal(b), 0))

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`

const goToForm = () => {
  if (pickerSelectedIds.value.size === 0) return
  router.push({ path: '/tax-invoices/new', query: { bookingIds: [...pickerSelectedIds.value].join(',') } })
}
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
}

.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
