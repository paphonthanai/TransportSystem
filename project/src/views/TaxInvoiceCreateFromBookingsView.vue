<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">สร้างใบแจ้งหนี้/ใบกำกับภาษีรวม</h2>
        <div class="text-xs text-muted mt-0.5">
          เลือกงานขนส่งที่ส่งเสร็จแล้ว (DELIVERED) ของลูกค้ารายเดียวกัน เพื่อรวมออกเป็นใบแจ้งหนี้ฉบับเดียว — เอกสารจะแสดงรายการแยกราย 1 บรรทัดต่อ 1 เที่ยว
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/tax-invoices')" class="btn-secondary">ยกเลิก</button>
        <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">check</span>
          สร้างใบแจ้งหนี้
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

      <div v-if="selectedCustomer" class="max-w-sm">
        <ContactPickerField :customer-id="selectedCustomerId" v-model="contactId" />
      </div>

      <div v-if="selectedCustomer" class="grid grid-cols-2 gap-3 max-w-sm">
        <div>
          <label class="field-label">วันที่เริ่ม <span class="font-normal text-[10px]">(ไม่บังคับ)</span></label>
          <input v-model="dateFrom" type="date" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">วันที่สิ้นสุด <span class="font-normal text-[10px]">(ไม่บังคับ)</span></label>
          <input v-model="dateTo" type="date" class="input-field w-full" />
        </div>
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
            <span class="text-muted">จำนวนเที่ยวที่เลือก:</span>
            <span class="font-bold text-text ml-1">{{ selectedIds.size }} เที่ยว</span>
            <span class="text-muted ml-3">ยอดรวมที่เลือก:</span>
            <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { useContactStore } from '@/stores/contacts'
import ContactPickerField from '@/components/shared/ContactPickerField.vue'
import { sortBookingsForDocumentMerge } from '@/utils/bookingMergeSort'
import type { Booking } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()
const contactStore = useContactStore()

/** เช็คเฉพาะ taxInvoiceDocId ของงาน เป็นอิสระจาก billingNoteDocId/receiptDocId — งานที่วางบิลรวม/รับเงินรวมไปแล้วยังออกใบแจ้งหนี้รวม
 *  ตรงจากงานขนส่งได้อีก ไม่ต้องผ่าน/แปลงจากใบวางบิลก่อน (Booking ยังเป็น Source of Truth เหมือนเดิม) */
const isUnbilledEligible = (b: Booking) => b.status === 'DELIVERED' && !b.taxInvoiceDocId

const eligibleCustomers = computed(() => [...new Set(bookingStore.bookings.filter(isUnbilledEligible).map((b) => b.customer))].sort())

const selectedCustomer = ref('')
const selectedCustomerId = computed(() => customerStore.customers.find((c) => c.name === selectedCustomer.value)?.id)
const contactId = ref<string | undefined>(undefined)
watch(selectedCustomer, (name) => {
  const customer = customerStore.customers.find((c) => c.name === name)
  contactId.value = customer?.id ? contactStore.primaryContactFor(customer.id)?.id : undefined
})
const selectedIds = ref<Set<string>>(new Set())

const dateFrom = ref('')
const dateTo = ref('')

const eligibleBookings = computed(() => {
  const list = bookingStore.bookings.filter((b) => {
    if (b.customer !== selectedCustomer.value || !isUnbilledEligible(b)) return false
    const refDate = b.completedAt ? new Date(b.completedAt) : undefined
    if (dateFrom.value && (!refDate || refDate < new Date(dateFrom.value))) return false
    if (dateTo.value) {
      const endOfDay = new Date(dateTo.value)
      endOfDay.setHours(23, 59, 59, 999)
      if (!refDate || refDate > endOfDay) return false
    }
    return true
  })
  return sortBookingsForDocumentMerge(list)
})

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
  const orderedIds = eligibleBookings.value.filter((b) => selectedIds.value.has(b.id)).map((b) => b.id)
  const result = salesDocumentsStore.createTaxInvoiceFromBookings(orderedIds, { contactId: contactId.value })
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
