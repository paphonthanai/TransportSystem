<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">เลือกลูกค้าและเอกสาร</h2>
        <div class="text-xs text-muted mt-0.5">{{ isBilling ? 'เลือกใบวางบิลที่ยังไม่ออกใบแจ้งหนี้ของลูกค้ารายเดียว หนึ่งใบหรือหลายใบมารวมกันได้' : 'เลือกใบแจ้งหนี้/ใบกำกับภาษีที่ยังไม่ชำระของลูกค้ารายเดียว หนึ่งใบหรือหลายใบมารวมกันได้' }}</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="cancel" class="btn-secondary">ยกเลิก</button>
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
              <tr v-for="inv in eligibleDocs" :key="inv.id" class="border-t border-border">
                <td class="px-3 py-2">
                  <input type="checkbox" :checked="selectedIds.has(inv.id)" @change="toggle(inv.id)" class="w-4 h-4" />
                </td>
                <td class="px-3 py-2 font-mono text-text">{{ inv.number }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(inv.dueDate) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(inv.amount) }}</td>
              </tr>
              <tr v-if="eligibleDocs.length === 0">
                <td colspan="4" class="px-3 py-6 text-center text-muted">{{ isBilling ? 'ลูกค้ารายนี้ไม่มีใบวางบิลที่รอออกใบแจ้งหนี้' : 'ลูกค้ารายนี้ไม่มีใบแจ้งหนี้ที่รอชำระ' }}</td>
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

/** source=billing เลือกใบวางบิลตรงๆ (ข้ามใบแจ้งหนี้ทั้งขั้นตอน) — ไม่ระบุ/อื่นๆ = เส้นทางเดิม เลือกจากใบแจ้งหนี้ */
const isBilling = (route.query.source as string) === 'billing'
const sourceDocType = isBilling ? 'BILLING' : 'TAX_INVOICE'
const isEligible = (d: { status: string }) => (isBilling ? d.status === 'BILLING_PENDING' : d.status !== 'PAID')

/** เอกสารกำลังแก้ไขอยู่ (ถ้ามี) — เอกสารต้นทางที่ใบเสร็จนี้อ้างอิงอยู่แล้วต้องไม่ถูกกันออกเพราะ "ถูกใบเสร็จอื่นจับจองไปแล้ว" (มันคือใบเสร็จตัวเองนี่แหละ) */
const editId = (route.query.editId as string) || undefined

const eligibleCustomers = computed(() =>
  [...new Set(salesDocumentsStore.documents.filter((d) => d.type === sourceDocType && isEligible(d)).map((d) => d.customer))].sort()
)

const selectedCustomer = ref((route.query.customer as string) || '')
const preselectIds = ((route.query.preselect as string) || '').split(',').filter(Boolean)
const selectedIds = ref<Set<string>>(new Set([...preselectIds, ...(route.query.invoiceId ? [route.query.invoiceId as string] : [])]))

/** เอกสารที่ถูกใบเสร็จรับเงินอื่น (ที่ไม่ใช่ใบที่กำลังแก้ไขอยู่) จับจองไปแล้ว — กันเลือกซ้ำ ไม่ให้ใบเสร็จ 2 ใบอ้างอิงเอกสารต้นทางเดียวกัน */
const claimedByOthers = computed(() => new Set(salesDocumentsStore.sourceDocsClaimedByOtherReceipts(
  salesDocumentsStore.documents.filter((d) => d.type === sourceDocType).map((d) => d.id),
  editId
)))

const eligibleDocs = computed(() =>
  salesDocumentsStore.documents.filter(
    (d) => d.type === sourceDocType && d.customer === selectedCustomer.value && isEligible(d) && !claimedByOthers.value.has(d.id)
  )
)

const toggle = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

const selectedTotal = computed(() => eligibleDocs.value.filter((d) => selectedIds.value.has(d.id)).reduce((sum, d) => sum + d.amount, 0))

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

const cancel = () => {
  if (editId) router.push(`/receipts/create/${editId}/edit`)
  else router.push('/receipts/new')
}

const proceed = () => {
  if (selectedIds.value.size === 0) return
  const ids = [...selectedIds.value].join(',')
  const sourceQuery = isBilling ? '&source=billing' : ''
  if (editId) router.push(`/receipts/create/${editId}/edit?ids=${ids}${sourceQuery}`)
  else router.push(`/receipts/create?ids=${ids}${sourceQuery}`)
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
