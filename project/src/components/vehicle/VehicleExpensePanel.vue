<template>
  <div class="card-lg space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h3 class="text-sm font-bold text-text">ค่าใช้จ่ายประจำรถ</h3>
      <div class="text-xs text-muted">รวมทั้งหมด {{ formatBaht(totalExpenses) }}</div>
    </div>

    <div v-for="cat in categories" :key="cat.type" class="border border-border rounded-lg p-3 space-y-2">
      <div class="text-xs font-semibold text-text">{{ cat.label }}</div>
      <div v-for="row in rowsFor(cat.type)" :key="row.id" class="flex items-center justify-between text-sm gap-2">
        <div class="flex-1">
          <span class="text-muted">{{ row.description || cat.label }}</span>
          <span class="text-[11px] text-muted ml-1">({{ formatDate(row.date) }})</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold text-text">{{ formatBaht(row.amount) }}</span>
          <button @click="startEdit(row)" class="text-muted hover:text-text text-xs">แก้ไข</button>
          <button @click="remove(row.id)" class="text-red-500 hover:text-red-600 text-xs">ลบ</button>
        </div>
      </div>
      <div class="flex items-center gap-2 pt-1 flex-wrap">
        <input v-model="drafts[cat.type].description" placeholder="รายละเอียด (ไม่บังคับ)" class="input-field flex-1 h-8 text-xs min-w-[120px]" />
        <input v-model.number="drafts[cat.type].amount" type="number" placeholder="จำนวนเงิน" class="input-field w-28 h-8 text-xs" />
        <input v-model="drafts[cat.type].date" type="date" class="input-field w-36 h-8 text-xs" />
        <button @click="save(cat.type)" class="btn-sm">{{ editingId && editingType === cat.type ? 'บันทึก' : 'เพิ่ม' }}</button>
        <button v-if="editingId && editingType === cat.type" @click="cancelEdit" class="btn-sm">ยกเลิก</button>
      </div>
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-border">
      <span class="text-sm font-semibold text-text">รวมค่าใช้จ่ายประจำรถทั้งหมด</span>
      <span class="text-sm font-bold text-red-500">-{{ formatBaht(totalExpenses) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { useVehicleExpensesStore } from '@/stores/vehicleExpenses'
import type { VehicleExpense, VehicleExpenseType } from '@/types'

const props = defineProps<{ vehicleId: string }>()

const expensesStore = useVehicleExpensesStore()

const categories: { type: VehicleExpenseType; label: string }[] = [
  { type: 'INSURANCE', label: 'ประกัน' },
  { type: 'GPS', label: 'GPS' },
  { type: 'INSTALLMENT', label: 'ค่างวด' },
  { type: 'REPAIR', label: 'ค่าซ่อมบำรุง' },
  { type: 'GENERAL', label: 'ค่าใช้จ่ายประจำรถอื่นๆ' },
]

const todayValue = () => new Date().toISOString().slice(0, 10)

type Draft = { description: string; amount: number | undefined; date: string }
const emptyDraft = (): Draft => ({ description: '', amount: undefined, date: todayValue() })

const drafts = reactive<Record<VehicleExpenseType, Draft>>({
  INSURANCE: emptyDraft(),
  GPS: emptyDraft(),
  INSTALLMENT: emptyDraft(),
  REPAIR: emptyDraft(),
  GENERAL: emptyDraft(),
})

const editingId = ref<string | null>(null)
const editingType = ref<VehicleExpenseType | null>(null)

const rowsFor = (type: VehicleExpenseType) => expensesStore.expensesForVehicle(props.vehicleId).filter((e) => e.expenseType === type)

const totalExpenses = computed(() => expensesStore.expensesForVehicle(props.vehicleId).reduce((sum, e) => sum + e.amount, 0))

const startEdit = (row: VehicleExpense) => {
  editingId.value = row.id
  editingType.value = row.expenseType
  drafts[row.expenseType] = { description: row.description || '', amount: row.amount, date: new Date(row.date).toISOString().slice(0, 10) }
}

const cancelEdit = () => {
  if (editingType.value) drafts[editingType.value] = emptyDraft()
  editingId.value = null
  editingType.value = null
}

const save = (type: VehicleExpenseType) => {
  const draft = drafts[type]
  if (!draft.amount || !draft.date) return
  const payload = {
    vehicleId: props.vehicleId,
    expenseType: type,
    description: draft.description || undefined,
    amount: draft.amount,
    date: new Date(draft.date),
  }
  if (editingId.value && editingType.value === type) {
    expensesStore.updateExpense(editingId.value, payload)
    editingId.value = null
    editingType.value = null
  } else {
    expensesStore.addExpense(payload)
  }
  drafts[type] = emptyDraft()
}

const remove = (id: string) => {
  if (editingId.value === id) cancelEdit()
  expensesStore.deleteExpense(id)
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date: Date) => new Date(date).toLocaleDateString('th-TH')
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
