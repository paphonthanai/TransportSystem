<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">สร้างใบวางบิลรวม</h2>
        <div class="text-xs text-muted mt-0.5">เลือกงานขนส่งที่ส่งเสร็จแล้ว (DELIVERED) ของลูกค้ารายเดียวกัน เพื่อรวมออกเป็นใบวางบิล</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/billing-notes')" class="btn-secondary">ยกเลิก</button>
        <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">check</span>
          สร้างใบวางบิล
        </button>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div>
        <label class="field-label">ลูกค้า</label>
        <select v-model="selectedCustomer" class="input-field w-full max-w-sm">
          <option value="">เลือกลูกค้า...</option>
          <option v-for="c in eligibleCustomers" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div v-if="selectedCustomer" class="space-y-2">
        <div class="border border-border rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="px-3 py-2 w-8"></th>
                <th class="text-left px-3 py-2 font-semibold">เลขที่งาน</th>
                <th class="text-left px-3 py-2 font-semibold">ปลายทาง</th>
                <th class="text-left px-3 py-2 font-semibold">วันที่ส่งเสร็จ</th>
                <th class="text-right px-3 py-2 font-semibold">ยอดเที่ยว</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in eligibleBookings" :key="b.id" class="border-t border-border">
                <td class="px-3 py-2">
                  <input type="checkbox" :checked="selectedIds.has(b.id)" @change="toggleBooking(b.id)" class="w-4 h-4" />
                </td>
                <td class="px-3 py-2 font-mono text-text">{{ b.docNo }}</td>
                <td class="px-3 py-2 text-muted">{{ destinationLabel(b) }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(b.completedAt) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(b)) }}</td>
              </tr>
              <tr v-if="eligibleBookings.length === 0">
                <td colspan="5" class="px-3 py-6 text-center text-muted">ลูกค้ารายนี้ไม่มีงานที่รอวางบิล</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end">
          <div class="text-sm">
            <span class="text-muted">ยอดรวมที่เลือก:</span>
            <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import type { Booking } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()

const isUnbilledEligible = (b: Booking) => b.status === 'DELIVERED' && (b.billingStatus ?? 'UNBILLED') === 'UNBILLED'

const eligibleCustomers = computed(() => [...new Set(bookingStore.bookings.filter(isUnbilledEligible).map((b) => b.customer))].sort())

const selectedCustomer = ref('')
const selectedIds = ref<Set<string>>(new Set())

const eligibleBookings = computed(() => bookingStore.bookings.filter((b) => b.customer === selectedCustomer.value && isUnbilledEligible(b)))

const toggleBooking = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

const bookingTotal = (b: Booking) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
const destinationLabel = (b: Booking) => {
  if (!b.items.length) return '-'
  const first = b.items[0].siteName
  return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
}

const selectedTotal = computed(() => eligibleBookings.value.filter((b) => selectedIds.value.has(b.id)).reduce((sum, b) => sum + bookingTotal(b), 0))

const canSubmit = computed(() => selectedIds.value.size > 0)

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

const submit = () => {
  if (!canSubmit.value) return
  const result = salesDocumentsStore.createBillingFromBookings([...selectedIds.value])
  if (result) router.push(`/documents/${result.id}`)
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
