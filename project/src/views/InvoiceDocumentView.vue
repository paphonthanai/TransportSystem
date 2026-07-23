<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.back()" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <div v-if="doc" class="flex items-center gap-2">
        <div class="flex rounded-lg border border-border overflow-hidden">
          <button
            @click="docMode = 'invoice'"
            :class="['h-10 px-4 text-sm font-semibold', docMode === 'invoice' ? 'bg-primary text-white' : 'bg-surface text-text']"
          >
            ใบกำกับภาษี / ใบแจ้งหนี้
          </button>
          <button
            @click="docMode = 'receipt'"
            :disabled="!doc.receiptNumber"
            :class="['h-10 px-4 text-sm font-semibold', docMode === 'receipt' ? 'bg-primary text-white' : 'bg-surface text-text', !doc.receiptNumber && 'opacity-40 cursor-not-allowed']"
          >
            ใบเสร็จรับเงิน
          </button>
        </div>
        <button @click="printDoc" class="btn-primary">
          <span class="material-symbols-rounded text-base">print</span>
          พิมพ์เอกสาร
        </button>
      </div>
    </div>

    <div v-if="!doc" class="card-lg text-center text-muted py-12">ไม่พบเอกสาร</div>

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
          <div class="text-xl font-bold">{{ docMode === 'invoice' ? 'ใบกำกับภาษี / ใบแจ้งหนี้' : 'ใบเสร็จรับเงิน' }}</div>
          <div class="text-xs text-gray-600">{{ docMode === 'invoice' ? 'TAX INVOICE' : 'RECEIPT' }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <div class="font-semibold mb-1">ลูกค้า</div>
          <div class="font-bold">{{ doc.customer }}</div>
          <div class="text-xs leading-relaxed">{{ customer.address }}</div>
          <div class="text-xs">เลขประจำตัวผู้เสียภาษี: {{ customer.taxId }}</div>
        </div>
        <div class="text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">เลขที่เอกสาร</span>
            <span class="font-bold">{{ docMode === 'invoice' ? doc.number : doc.receiptNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">วันที่ออกเอกสาร</span>
            <span>{{ formatDate(docMode === 'invoice' ? doc.date : doc.paidDate) }}</span>
          </div>
          <div v-if="docMode === 'invoice'" class="flex justify-between">
            <span class="text-gray-600">เครดิต (วัน)</span>
            <span>{{ doc.creditDays }}</span>
          </div>
          <div v-if="docMode === 'invoice'" class="flex justify-between">
            <span class="text-gray-600">วันครบกำหนด</span>
            <span>{{ formatDate(doc.dueDate) }}</span>
          </div>
          <div v-if="doc.reference" class="flex justify-between">
            <span class="text-gray-600">เลขที่อ้างอิง</span>
            <span class="text-right max-w-[60%] truncate">{{ doc.reference }}</span>
          </div>
        </div>
      </div>

      <table class="w-full text-sm border border-gray-400 mb-4">
        <thead class="bg-gray-100">
          <tr>
            <th class="border border-gray-400 px-2 py-1 text-left w-10">ลำดับ</th>
            <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียด</th>
            <th class="border border-gray-400 px-2 py-1 text-right w-16">จำนวน</th>
            <th class="border border-gray-400 px-2 py-1 text-left w-16">หน่วย</th>
            <th class="border border-gray-400 px-2 py-1 text-right w-28">ราคาต่อหน่วย</th>
            <th class="border border-gray-400 px-2 py-1 text-right w-28">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(booking, idx) in docBookings" :key="booking.id">
            <td class="border border-gray-400 px-2 py-1">{{ idx + 1 }}</td>
            <td class="border border-gray-400 px-2 py-1">
              {{ booking.docNo }} · {{ destinationLabel(booking) }}
              <span class="text-xs text-gray-600">- {{ formatDate(booking.completedAt) }}</span>
            </td>
            <td class="border border-gray-400 px-2 py-1 text-right">1</td>
            <td class="border border-gray-400 px-2 py-1">เที่ยว</td>
            <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(bookingTotal(booking)) }}</td>
            <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(bookingTotal(booking)) }}</td>
          </tr>
          <tr v-for="n in fillerRows" :key="'filler' + n">
            <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
            <td class="border border-gray-400 px-2 py-1"></td>
            <td class="border border-gray-400 px-2 py-1"></td>
            <td class="border border-gray-400 px-2 py-1"></td>
            <td class="border border-gray-400 px-2 py-1"></td>
            <td class="border border-gray-400 px-2 py-1"></td>
          </tr>
        </tbody>
      </table>

      <div class="flex justify-between items-start mb-6">
        <div class="text-sm">
          <div class="text-gray-600 text-xs">จำนวนเงินเป็นตัวอักษร</div>
          <div class="font-semibold">({{ bahtText(netPayable) }})</div>
        </div>
        <div class="w-64 text-sm space-y-1">
          <div class="flex justify-between">
            <span class="text-gray-600">รวมเป็นเงิน</span>
            <span>{{ formatBaht(subtotal) }}</span>
          </div>
          <div v-if="showVatRow" class="flex justify-between">
            <span class="text-gray-600">ภาษีมูลค่าเพิ่ม {{ documentSettingsStore.settings.vatRate }}%</span>
            <span>{{ formatBaht(vatAmount) }}</span>
          </div>
          <div class="flex justify-between font-bold border-t border-black pt-1">
            <span>จำนวนเงินรวมทั้งสิ้น</span>
            <span>{{ formatBaht(grandTotal) }}</span>
          </div>
          <template v-if="showWhtRow">
            <div class="flex justify-between text-red-600">
              <span>หัก ภาษี ณ ที่จ่าย {{ documentSettingsStore.settings.whtRate }}%</span>
              <span>-{{ formatBaht(whtAmount) }}</span>
            </div>
            <div class="flex justify-between font-bold border-t border-black pt-1">
              <span>จำนวนเงินที่ต้องชำระ</span>
              <span>{{ formatBaht(netPayable) }}</span>
            </div>
          </template>
        </div>
      </div>

      <div v-if="hasPaymentInfo" class="text-xs border border-gray-300 rounded p-3 mb-6 max-w-sm">
        <div class="font-semibold mb-1">ข้อมูลการรับชำระ</div>
        <div v-if="documentSettingsStore.settings.payment.bankName">ธนาคาร: {{ documentSettingsStore.settings.payment.bankName }}</div>
        <div v-if="documentSettingsStore.settings.payment.accountName">ชื่อบัญชี: {{ documentSettingsStore.settings.payment.accountName }}</div>
        <div v-if="documentSettingsStore.settings.payment.accountNumber">เลขที่บัญชี: {{ documentSettingsStore.settings.payment.accountNumber }}</div>
        <div v-if="documentSettingsStore.settings.payment.promptPay">พร้อมเพย์: {{ documentSettingsStore.settings.payment.promptPay }}</div>
        <div v-if="documentSettingsStore.settings.payment.note" class="mt-1 text-gray-600">{{ documentSettingsStore.settings.payment.note }}</div>
      </div>

      <div v-if="docNote" class="text-xs text-gray-600 mb-6">{{ docNote }}</div>

      <div class="grid grid-cols-2 gap-6 text-sm text-center mt-16">
        <div>
          <div class="border-t border-gray-500 pt-2 mx-8">ผู้รับวางบิล / ผู้รับเงิน</div>
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
import { ref, computed } from 'vue'
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

const doc = computed(() => bookingStore.documents.find((d) => d.id === route.params.docId))
const customer = computed(() => customerStore.lookupCustomer(doc.value?.customer || ''))

const docMode = ref<'invoice' | 'receipt'>('invoice')

const docBookings = computed<Booking[]>(() => {
  if (!doc.value) return []
  return bookingStore.bookings.filter((b) => doc.value!.bookingIds.includes(b.id))
})

const fillerRows = computed(() => Math.max(0, 4 - docBookings.value.length))

const bookingTotal = (booking: Booking) => {
  const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
  return (booking.tripFee || 0) + extras
}

const subtotal = computed(() => doc.value?.amount || 0)
const showVatRow = computed(() => documentSettingsStore.settings.calcMode.sales.vat !== 'included')
const vatAmount = computed(() => (showVatRow.value ? doc.value?.vatAmount ?? 0 : 0))
const grandTotal = computed(() => subtotal.value + vatAmount.value)
const showWhtRow = computed(
  () => documentSettingsStore.settings.calcMode.sales.wht !== 'included' && (doc.value?.whtAmount ?? 0) > 0
)
const whtAmount = computed(() => (showWhtRow.value ? doc.value?.whtAmount ?? 0 : 0))
const netPayable = computed(() => grandTotal.value - whtAmount.value)

const hasPaymentInfo = computed(() => {
  const p = documentSettingsStore.settings.payment
  return !!(p.bankName || p.accountName || p.accountNumber || p.promptPay || p.note)
})

const docNote = computed(() => documentSettingsStore.settings.notes[docMode.value])

const formatBaht = (value: number) =>
  `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

const destinationLabel = (booking: Booking) => {
  if (!booking.destinations.length) return '-'
  const first = booking.destinations[0].name
  return booking.destinations.length > 1 ? `${first} +${booking.destinations.length - 1} ที่อื่น` : first
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
