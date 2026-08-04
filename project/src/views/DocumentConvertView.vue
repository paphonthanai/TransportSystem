<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">{{ targetTitle }}</h2>
        <div class="text-xs text-muted mt-0.5">
          จาก{{ sourceTypeLabel }} <span class="font-mono font-semibold text-text">{{ sourceDoc?.number }}</span> — ตรวจสอบและแก้ไขข้อมูลก่อนสร้างเอกสารจริง
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="goBack" class="btn-secondary">ยกเลิก</button>
        <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">check</span>
          ยืนยันสร้างเอกสาร
        </button>
      </div>
    </div>

    <div v-if="!sourceDoc" class="card-lg text-center text-muted py-10">ไม่พบเอกสารต้นทาง</div>

    <div v-else class="card-lg space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-3">
          <div>
            <label class="field-label">ชื่อลูกค้า</label>
            <input v-model="customer" class="input-field w-3/4" />
          </div>
          <div>
            <label class="field-label">เลขที่อ้างอิง</label>
            <input v-model="reference" placeholder="เลขที่เอกสารอ้างอิง" class="input-field w-3/4" />
          </div>
        </div>
        <div class="space-y-3">
          <div class="text-right">
            <div class="text-xs text-muted">จำนวนเงินรวมทั้งสิ้น</div>
            <div class="text-2xl font-bold text-primary">{{ formatBaht(grandTotal) }}</div>
          </div>
          <div v-if="targetType === 'invoice'">
            <label class="field-label">เครดิต (วัน)</label>
            <input v-model.number="creditDays" type="number" min="0" class="input-field w-full" />
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="space-y-2 pt-4 border-t border-border">
        <div class="border border-border rounded-xl overflow-x-auto">
          <table class="w-full text-sm min-w-[760px]">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="text-left px-3 py-2 font-semibold w-10">ลำดับ</th>
                <th class="text-left px-3 py-2 font-semibold">ชื่อสินค้า/รายละเอียด</th>
                <th class="text-right px-3 py-2 font-semibold w-20">จำนวน</th>
                <th class="text-left px-3 py-2 font-semibold w-20">หน่วย</th>
                <th class="text-right px-3 py-2 font-semibold w-24">ราคาต่อหน่วย</th>
                <th class="text-right px-3 py-2 font-semibold w-20">ส่วนลด (%)</th>
                <th class="text-right px-3 py-2 font-semibold w-28">ราคารวม</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="idx" class="border-t border-border align-top">
                <td class="px-3 py-2 text-muted">{{ idx + 1 }}</td>
                <td class="px-3 py-2">
                  <input v-model="row.description" placeholder="รายละเอียด" class="input-field w-full" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="row.qty" type="number" min="0" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2">
                  <input v-model="row.unit" class="input-field w-full" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="row.unitPrice" type="number" min="0" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="row.discountPercent" type="number" min="0" max="100" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(rowAmount(row)) }}</td>
                <td class="px-3 py-2 text-right">
                  <button @click="rows.splice(idx, 1)" class="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-red-50 hover:text-red-600">
                    <span class="material-symbols-rounded text-sm">close</span>
                  </button>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td colspan="8" class="px-3 py-6 text-center text-muted">ยังไม่มีรายการ</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="addRow" class="btn-sm">
          <span class="material-symbols-rounded text-base">add</span>
          เพิ่มแถวรายการ
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesDocumentsStore, type SalesDocumentType, type QuotationConvertOverrides } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'

type SourceType = 'quotation' | 'billing'
type TargetType = 'billing' | 'invoice' | 'cash_sale' | 'purchase_order'

const route = useRoute()
const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()

const sourceId = route.params.id as string
const sourceType = route.params.sourceType as SourceType
const targetType = route.params.targetType as TargetType

const sourceDocTypeByType: Record<SourceType, SalesDocumentType> = { quotation: 'QUOTATION', billing: 'BILLING' }
const sourceDoc = salesDocumentsStore.documents.find((d) => d.id === sourceId && d.type === sourceDocTypeByType[sourceType])

const sourceTypeLabel = computed(() => (sourceType === 'billing' ? 'ใบวางบิล' : 'ใบเสนอราคา'))

const targetTitleMap: Record<TargetType, string> = {
  billing: 'สร้างใบวางบิล',
  invoice: 'สร้างใบส่งสินค้า/ใบแจ้งหนี้/ใบกำกับภาษี',
  cash_sale: 'สร้างใบกำกับภาษี/ใบเสร็จรับเงิน (เงินสด)',
  purchase_order: 'สร้างใบสั่งซื้อ',
}
const targetTitle = computed(() => targetTitleMap[targetType] || 'สร้างเอกสาร')

const customer = ref(sourceDoc?.customer || '')
const reference = ref(sourceDoc?.reference || '')
const creditDays = ref(sourceDoc?.creditDays ?? 30)

type Row = {
  description: string
  qty: number
  unit: string
  unitPrice: number
  discountPercent: number
}

const rows = ref<Row[]>(
  sourceDoc
    ? salesDocumentsStore.itemsForDocument(sourceDoc.id).map((i) => ({
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent || 0,
      }))
    : []
)

const addRow = () => {
  rows.value.push({ description: '', qty: 1, unit: '', unitPrice: 0, discountPercent: 0 })
}

const rowAmount = (row: Row) => row.qty * row.unitPrice * (1 - (row.discountPercent || 0) / 100)
const grandTotal = computed(() => rows.value.reduce((sum, r) => sum + rowAmount(r), 0))

const canSubmit = computed(() => customer.value.trim().length > 0 && rows.value.length > 0 && rows.value.every((r) => r.qty > 0))

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`

const goBack = () => router.push(sourceType === 'billing' ? '/billing-notes' : '/quotation')

const submit = () => {
  if (!sourceDoc || !canSubmit.value) return
  const overrides: QuotationConvertOverrides = {
    customer: customer.value.trim(),
    reference: reference.value || undefined,
    items: rows.value.map((r) => ({
      description: r.description || r.unit,
      qty: r.qty,
      unit: r.unit,
      unitPrice: r.unitPrice,
      discountPercent: r.discountPercent,
      amount: rowAmount(r),
    })),
  }
  if (targetType === 'invoice') overrides.creditDays = creditDays.value

  let result
  if (sourceType === 'billing' && targetType === 'invoice') {
    result = salesDocumentsStore.createInvoiceFromBilling(sourceDoc.id, overrides)
  } else if (targetType === 'billing') result = salesDocumentsStore.convertQuotationToBilling(sourceDoc.id, overrides)
  else if (targetType === 'invoice') result = salesDocumentsStore.createInvoiceFromQuotation(sourceDoc.id, overrides)
  else if (targetType === 'cash_sale') result = salesDocumentsStore.convertQuotationToCashSale(sourceDoc.id, overrides)
  else if (targetType === 'purchase_order') result = salesDocumentsStore.convertQuotationToPurchaseOrder(sourceDoc.id, overrides)

  if (result) router.push(`/documents/${result.id}`)
  else router.push(sourceType === 'billing' ? '/billing-notes' : '/quotation')
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

.btn-sm {
  @apply h-9 px-3 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
