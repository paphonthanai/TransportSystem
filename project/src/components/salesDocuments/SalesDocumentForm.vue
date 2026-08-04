<template>
  <Teleport to="body" v-if="open">
    <div @click="$emit('close')" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
      <div @click.stop class="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div class="font-bold text-text">สร้าง{{ salesDocumentTypeLabel[documentType] }}</div>
          <button @click="$emit('close')" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <div class="px-6 py-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ลูกค้า</label>
              <input v-model="customer" placeholder="ชื่อลูกค้า" class="input-field w-full" />
            </div>
            <div v-if="documentType === 'QUOTATION'">
              <label class="block text-xs font-semibold text-muted mb-1">เครดิต (วัน)</label>
              <input v-model.number="creditDays" type="number" min="0" placeholder="30" class="input-field w-full" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">อ้างอิง (ถ้ามี)</label>
            <input v-model="reference" placeholder="เลขที่อ้างอิง/หมายเหตุ" class="input-field w-full" />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-muted">รายการสินค้า/บริการ</label>
              <button @click="addRow" class="btn-sm">
                <span class="material-symbols-rounded text-base">add</span>
                เพิ่มรายการ
              </button>
            </div>
            <div class="border border-border rounded-xl overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-surface-2 text-xs text-muted">
                  <tr>
                    <th class="text-left px-3 py-2 font-semibold">สินค้า</th>
                    <th class="text-left px-3 py-2 font-semibold">รายละเอียด</th>
                    <th class="text-right px-3 py-2 font-semibold w-20">จำนวน</th>
                    <th class="text-left px-3 py-2 font-semibold w-20">หน่วย</th>
                    <th class="text-right px-3 py-2 font-semibold w-28">ราคา/หน่วย</th>
                    <th class="text-right px-3 py-2 font-semibold w-28">ยอดรวม</th>
                    <th class="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in rows" :key="idx" class="border-t border-border">
                    <td class="px-3 py-2">
                      <select :value="row.productId || ''" @change="onProductSelected(idx, ($event.target as HTMLSelectElement).value)" class="input-field w-full">
                        <option value="">กำหนดเอง</option>
                        <option v-for="p in inventoryStore.products" :key="p.id" :value="p.id">{{ p.name }}</option>
                      </select>
                    </td>
                    <td class="px-3 py-2">
                      <input v-model="row.description" class="input-field w-full" />
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
                    <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(row.qty * row.unitPrice) }}</td>
                    <td class="px-3 py-2 text-right">
                      <button @click="rows.splice(idx, 1)" class="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-red-50 hover:text-red-600">
                        <span class="material-symbols-rounded text-sm">close</span>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="rows.length === 0">
                    <td colspan="7" class="px-3 py-6 text-center text-muted">ยังไม่มีรายการ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="text-right text-sm font-bold text-text">ยอดรวมทั้งสิ้น: {{ formatBaht(totalAmount) }}</div>
          </div>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button @click="$emit('close')" class="btn-secondary">ยกเลิก</button>
          <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึก</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import type { SalesDocumentType, SalesDocumentItem } from '@/stores/salesDocuments'
import { salesDocumentTypeLabel } from '@/utils/salesDocumentStatus'

export interface SalesDocumentFormInitial {
  customer: string
  items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>
  creditDays?: number
  reference?: string
}

const props = defineProps<{ documentType: Extract<SalesDocumentType, 'QUOTATION' | 'CASH_SALE'>; open: boolean; initial?: SalesDocumentFormInitial | null }>()
const emit = defineEmits<{
  close: []
  submit: [payload: { customer: string; items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>>; creditDays?: number; reference?: string }]
}>()

const inventoryStore = useInventoryStore()

type Row = { productId?: string; description: string; qty: number; unit: string; unitPrice: number; vatRate?: number }

const customer = ref('')
const creditDays = ref<number | undefined>(30)
const reference = ref('')
const rows = ref<Row[]>([])

const resetForm = () => {
  if (props.initial) {
    customer.value = props.initial.customer
    creditDays.value = props.initial.creditDays ?? 30
    reference.value = props.initial.reference || ''
    rows.value = props.initial.items.map((i) => ({ productId: i.productId, description: i.description, qty: i.qty, unit: i.unit, unitPrice: i.unitPrice, vatRate: i.vatRate }))
    return
  }
  customer.value = ''
  creditDays.value = 30
  reference.value = ''
  rows.value = []
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
  { immediate: true }
)

const addRow = () => {
  rows.value.push({ description: '', qty: 1, unit: '', unitPrice: 0 })
}

const onProductSelected = (idx: number, productId: string) => {
  const row = rows.value[idx]
  if (!productId) {
    row.productId = undefined
    return
  }
  const product = inventoryStore.products.find((p) => p.id === productId)
  if (!product) return
  row.productId = product.id
  row.description = product.description || product.name
  row.unit = product.unit
  row.unitPrice = product.price ?? row.unitPrice
  row.vatRate = product.vatRate
}

const totalAmount = computed(() => rows.value.reduce((sum, r) => sum + r.qty * r.unitPrice, 0))

const canSubmit = computed(() => customer.value.trim().length > 0 && rows.value.length > 0 && rows.value.every((r) => r.qty > 0))

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const submit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    customer: customer.value.trim(),
    items: rows.value.map((r) => ({ description: r.description || r.unit, productId: r.productId, qty: r.qty, unit: r.unit, unitPrice: r.unitPrice, vatRate: r.vatRate, amount: r.qty * r.unitPrice })),
    creditDays: props.documentType === 'QUOTATION' ? creditDays.value : undefined,
    reference: reference.value || undefined,
  })
}
</script>

<style scoped>
.input-field {
  @apply h-9 px-2 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}
</style>
