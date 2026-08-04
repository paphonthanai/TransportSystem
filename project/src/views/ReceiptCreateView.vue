<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">สร้างใบเสร็จรับเงิน</h2>
        <div class="text-xs text-muted mt-0.5">ข้อมูลซิงก์มาจากใบแจ้งหนี้ที่เลือกไว้โดยอัตโนมัติ</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/receipts/select')" class="btn-secondary">ย้อนกลับ</button>
        <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">check</span>
          สร้างใบเสร็จรับเงิน
        </button>
      </div>
    </div>

    <div v-if="sourceInvoices.length === 0" class="card-lg text-center text-muted py-10">ไม่พบใบแจ้งหนี้ต้นทาง</div>

    <div v-else class="card-lg space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-3">
          <div>
            <label class="field-label">ชื่อลูกค้า</label>
            <input v-model="customer" class="input-field w-3/4" />
          </div>
          <div>
            <label class="field-label">เลขที่อ้างอิง</label>
            <input v-model="reference" class="input-field w-3/4" />
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-muted">จำนวนเงินรวมทั้งสิ้น</div>
          <div class="text-2xl font-bold text-primary">{{ formatBaht(grandTotal) }}</div>
        </div>
      </div>

      <div class="pt-4 border-t border-border">
        <div class="border border-border rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="text-left px-3 py-2 font-semibold">เลขที่ใบแจ้งหนี้</th>
                <th class="text-left px-3 py-2 font-semibold">วันครบกำหนด</th>
                <th class="text-right px-3 py-2 font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in sourceInvoices" :key="inv.id" class="border-t border-border">
                <td class="px-3 py-2 font-mono text-text">{{ inv.number }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(inv.dueDate) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(inv.amount) }}</td>
              </tr>
            </tbody>
          </table>
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

const invoiceIds = ((route.query.ids as string) || '').split(',').filter(Boolean)
const sourceInvoices = salesDocumentsStore.documents.filter((d) => invoiceIds.includes(d.id) && d.type === 'TAX_INVOICE')

const customer = ref(sourceInvoices[0]?.customer || '')
const reference = ref(sourceInvoices.map((d) => d.number).join(', '))

const grandTotal = computed(() => sourceInvoices.reduce((sum, d) => sum + d.amount, 0))
const canSubmit = computed(() => sourceInvoices.length > 0 && customer.value.trim().length > 0)

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

const submit = () => {
  if (!canSubmit.value) return
  const result = salesDocumentsStore.createReceiptFromInvoices(invoiceIds, {
    customer: customer.value.trim(),
    reference: reference.value || undefined,
  })
  if (result) router.push(`/documents/${result.id}`)
  else router.push('/receipts')
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
