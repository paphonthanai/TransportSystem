<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.back()" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <button v-if="batch" @click="printDoc" class="btn-primary">
        <span class="material-symbols-rounded text-base">print</span>
        พิมพ์เอกสาร
      </button>
    </div>

    <div v-if="!batch" class="card-lg text-center text-muted py-12">ไม่พบรายการวางบิล</div>

    <div v-else id="print-area" class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-10 max-w-3xl mx-auto">
      <div class="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
        <div class="flex items-start gap-3">
          <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-14 h-14 object-contain flex-shrink-0" />
          <div>
            <div class="text-lg font-bold">{{ documentSettingsStore.settings.company.name }}</div>
            <div class="text-xs leading-relaxed max-w-xs">{{ documentSettingsStore.settings.company.address }}</div>
            <div class="text-xs">เลขประจำตัวผู้เสียภาษี: {{ documentSettingsStore.settings.company.taxId }}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold">ใบวางบิล</div>
          <div class="text-xs text-gray-600">BILLING NOTE</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <div class="font-semibold mb-1">ลูกค้า</div>
          <div class="font-bold">{{ batch.customer || 'ทุกลูกค้า' }}</div>
          <div class="text-xs leading-relaxed">{{ customer.address }}{{ customer.zipCode ? ' ' + customer.zipCode : '' }}</div>
          <div class="text-xs">เลขประจำตัวผู้เสียภาษี: {{ customer.taxId }}</div>
        </div>
        <div class="text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">เลขที่วางบิล</span>
            <span class="font-bold">{{ batch.number }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">วันที่ออกเอกสาร</span>
            <span>{{ formatDate(batch.createdAt) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">ช่วงวันที่งาน</span>
            <span>{{ formatDate(batch.dateFrom) }} - {{ formatDate(batch.dateTo) }}</span>
          </div>
        </div>
      </div>

      <table class="w-full text-sm border border-gray-400 mb-4">
        <thead class="bg-gray-100">
          <tr>
            <th class="border border-gray-400 px-2 py-1 text-left w-10">ลำดับ</th>
            <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียด</th>
            <th class="border border-gray-400 px-2 py-1 text-right w-16">จำนวนเที่ยว (เที่ยว)</th>
            <th class="border border-gray-400 px-2 py-1 text-right w-28">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(booking, idx) in batchBookings" :key="booking.id">
            <td class="border border-gray-400 px-2 py-1">{{ idx + 1 }}</td>
            <td class="border border-gray-400 px-2 py-1">
              {{ booking.docNo }} · {{ destinationLabel(booking) }}
              <span class="text-xs text-gray-600">- {{ formatDate(booking.dispatchedAt || booking.createdAt) }}</span>
            </td>
            <td class="border border-gray-400 px-2 py-1 text-right">1</td>
            <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(bookingTotal(booking)) }}</td>
          </tr>
          <tr v-for="n in fillerRows" :key="'filler' + n">
            <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
            <td class="border border-gray-400 px-2 py-1"></td>
            <td class="border border-gray-400 px-2 py-1"></td>
            <td class="border border-gray-400 px-2 py-1"></td>
          </tr>
        </tbody>
      </table>

      <div class="flex justify-between items-start mb-6">
        <div class="text-sm">
          <div class="text-gray-600 text-xs">จำนวนเงินเป็นตัวอักษร</div>
          <div class="font-semibold">({{ bahtText(totalAmount) }})</div>
        </div>
        <div class="w-64 text-sm space-y-1">
          <div class="flex justify-between font-bold border-t border-black pt-1">
            <span>จำนวนเงินรวมทั้งสิ้น</span>
            <span>{{ formatBaht(totalAmount) }}</span>
          </div>
        </div>
      </div>

      <div class="text-xs text-gray-600 mb-6">เอกสารนี้เป็นการแจ้งรายการงานที่จะเรียกเก็บเงิน ยังไม่ใช่ใบกำกับภาษี</div>

      <div class="grid grid-cols-2 gap-6 text-sm text-center mt-16">
        <div>
          <div class="border-t border-gray-500 pt-2 mx-8">ผู้จัดทำรายการ</div>
        </div>
        <div class="relative">
          <img v-if="documentSettingsStore.settings.company.stamp" :src="documentSettingsStore.settings.company.stamp" class="w-16 h-16 object-contain mx-auto mb-1 opacity-90" />
          <div class="border-t border-gray-500 pt-2 mx-8">ผู้มีอำนาจลงนาม</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { bahtText } from '@/utils/companyInfo'
import type { Booking } from '@/types'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()

const batch = computed(() => bookingStore.batches.find((b) => b.id === route.params.batchId))
const customer = computed(() => customerStore.lookupCustomer(batch.value?.customer || ''))

const batchBookings = computed<Booking[]>(() => {
  if (!batch.value) return []
  return bookingStore.bookings.filter((b) => batch.value!.bookingIds.includes(b.id))
})

const fillerRows = computed(() => Math.max(0, 4 - batchBookings.value.length))

const bookingTotal = (booking: Booking) => {
  const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
  return (booking.tripFee || 0) + extras
}

const totalAmount = computed(() => batchBookings.value.reduce((sum, b) => sum + bookingTotal(b), 0))

const formatBaht = (value: number) =>
  `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

const destinationLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const printDoc = () => window.print()
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
}
</style>
