<template>
  <div class="card-lg space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h3 class="text-sm font-bold text-text">รายการหักเงินเดือน</h3>
      <div class="text-xs text-muted">รอบ {{ periodLabel }}{{ driverName ? ` · ${driverName}` : '' }}</div>
    </div>

    <div v-if="!driverName" class="text-sm text-muted py-4 text-center">เลือกคนขับเพื่อดู/เพิ่มรายการหักเงินเดือน</div>

    <template v-else>
      <div v-for="cat in categories" :key="cat.type" class="border border-border rounded-lg p-3 space-y-2">
        <div class="text-xs font-semibold text-text">{{ cat.label }}</div>
        <template v-for="row in rowsFor(cat.type)" :key="row.id">
          <div v-if="editingId === row.id" class="flex items-center gap-2 text-sm bg-surface-2 rounded-lg p-1.5">
            <input v-model="editDraft.label" placeholder="รายละเอียด (ไม่บังคับ)" class="input-field flex-1 h-8 text-xs" />
            <input v-model.number="editDraft.amount" type="number" placeholder="จำนวนเงิน" class="input-field w-24 h-8 text-xs" />
            <button @click="saveEdit(row.id)" :disabled="!editDraft.amount" class="text-primary hover:underline text-xs disabled:opacity-40">บันทึก</button>
            <button @click="cancelEdit" class="text-muted hover:text-text text-xs">ยกเลิก</button>
          </div>
          <div v-else class="flex items-center justify-between text-sm gap-2">
            <span class="text-muted">{{ row.label || cat.label }}</span>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-text">{{ formatBaht(row.amount) }}</span>
              <button @click="startEdit(row)" class="text-muted hover:text-text text-xs">แก้ไข</button>
              <button @click="remove(row.id)" class="text-red-500 hover:text-red-600 text-xs">ลบ</button>
            </div>
          </div>
        </template>
        <div class="flex items-center gap-2 pt-1">
          <input v-model="drafts[cat.type].label" placeholder="รายละเอียด (ไม่บังคับ)" class="input-field flex-1 h-8 text-xs" />
          <input v-model.number="drafts[cat.type].amount" type="number" placeholder="จำนวนเงิน" class="input-field w-28 h-8 text-xs" />
          <button @click="add(cat.type)" class="btn-sm">เพิ่ม</button>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-border">
        <span class="text-sm font-semibold text-text">รวมรายการหักทั้งหมด</span>
        <span class="text-sm font-bold text-red-500">-{{ formatBaht(totalDeductions) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { usePayrollDeductionsStore } from '@/stores/payrollDeductions'
import type { PayrollDeduction, PayrollDeductionType } from '@/types'

const props = defineProps<{ driverName: string; periodLabel: string }>()

const deductionsStore = usePayrollDeductionsStore()

const categories: { type: PayrollDeductionType; label: string }[] = [
  { type: 'WHT', label: 'หักภาษี ณ ที่จ่าย / ค่าดำเนินการบริษัท-หุ้นส่วน / 50 ทวิ' },
  { type: 'GENERAL', label: 'หักค่าใช้จ่ายทั่วไป' },
  { type: 'INSURANCE', label: 'หักค่าประกันงาน' },
  { type: 'GPS', label: 'หักค่า GPS / ค่าใช้จ่ายประจำ' },
  { type: 'INSTALLMENT', label: 'หักค่างวด' },
]

const drafts = reactive<Record<PayrollDeductionType, { label: string; amount: number | undefined }>>({
  WHT: { label: '', amount: undefined },
  GENERAL: { label: '', amount: undefined },
  INSURANCE: { label: '', amount: undefined },
  GPS: { label: '', amount: undefined },
  INSTALLMENT: { label: '', amount: undefined },
})

const rowsFor = (type: PayrollDeductionType) =>
  deductionsStore.deductionsFor(props.driverName, props.periodLabel).filter((d) => d.type === type)

const totalDeductions = computed(() =>
  deductionsStore.deductionsFor(props.driverName, props.periodLabel).reduce((sum, d) => sum + d.amount, 0)
)

const add = (type: PayrollDeductionType) => {
  const draft = drafts[type]
  if (!draft.amount) return
  deductionsStore.addDeduction({
    driverName: props.driverName,
    periodLabel: props.periodLabel,
    type,
    label: draft.label,
    amount: draft.amount,
  })
  draft.label = ''
  draft.amount = undefined
}

const remove = (id: string) => deductionsStore.deleteDeduction(id)

const editingId = ref<string | null>(null)
const editDraft = reactive<{ label: string; amount: number | undefined }>({ label: '', amount: undefined })

const startEdit = (row: PayrollDeduction) => {
  editingId.value = row.id
  editDraft.label = row.label
  editDraft.amount = row.amount
}

const cancelEdit = () => {
  editingId.value = null
  editDraft.label = ''
  editDraft.amount = undefined
}

const saveEdit = (id: string) => {
  if (!editDraft.amount) return
  deductionsStore.updateDeduction(id, { label: editDraft.label, amount: editDraft.amount })
  cancelEdit()
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

defineExpose({ totalDeductions })
</script>

<style scoped>
.input-field {
  @apply px-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-sm {
  @apply h-8 px-3 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
