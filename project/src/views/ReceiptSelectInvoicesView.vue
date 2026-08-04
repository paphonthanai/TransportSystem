<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">เลือกลูกค้าและเอกสาร</h2>
        <div class="text-xs text-muted mt-0.5">เลือกใบแจ้งหนี้/ใบกำกับภาษีที่ยังไม่ชำระของลูกค้ารายเดียว หนึ่งใบหรือหลายใบมารวมกันได้</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/receipts/new')" class="btn-secondary">ยกเลิก</button>
        <button @click="proceed" :disabled="selectedIds.size === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">arrow_forward</span>
          ถัดไป
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
                <th class="text-left px-3 py-2 font-semibold">เลขที่เอกสาร</th>
                <th class="text-left px-3 py-2 font-semibold">วันครบกำหนด</th>
                <th class="text-right px-3 py-2 font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in eligibleInvoices" :key="inv.id" class="border-t border-border">
                <td class="px-3 py-2">
                  <input type="checkbox" :checked="selectedIds.has(inv.id)" @change="toggle(inv.id)" class="w-4 h-4" />
                </td>
                <td class="px-3 py-2 font-mono text-text">{{ inv.number }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(inv.dueDate) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(inv.amount) }}</td>
              </tr>
              <tr v-if="eligibleInvoices.length === 0">
                <td colspan="4" class="px-3 py-6 text-center text-muted">ลูกค้ารายนี้ไม่มีใบแจ้งหนี้ที่รอชำระ</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-between text-sm">
          <div class="text-muted">เลือกแล้ว {{ selectedIds.size }} รายการ</div>
          <div><span class="text-muted">รวมทั้งสิ้น:</span> <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'

const route = useRoute()
const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()

const isUnpaid = (d: { status: string }) => d.status !== 'PAID'

const eligibleCustomers = computed(() =>
  [...new Set(salesDocumentsStore.documents.filter((d) => d.type === 'TAX_INVOICE' && isUnpaid(d)).map((d) => d.customer))].sort()
)

const selectedCustomer = ref((route.query.customer as string) || '')
const selectedIds = ref<Set<string>>(new Set(route.query.invoiceId ? [route.query.invoiceId as string] : []))

const eligibleInvoices = computed(() =>
  salesDocumentsStore.documents.filter((d) => d.type === 'TAX_INVOICE' && d.customer === selectedCustomer.value && isUnpaid(d))
)

const toggle = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

const selectedTotal = computed(() => eligibleInvoices.value.filter((d) => selectedIds.value.has(d.id)).reduce((sum, d) => sum + d.amount, 0))

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

const proceed = () => {
  if (selectedIds.value.size === 0) return
  router.push(`/receipts/create?ids=${[...selectedIds.value].join(',')}`)
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
