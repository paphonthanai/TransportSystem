<template>
  <div class="card-lg space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h3 class="text-sm font-bold text-text">ค่าใช้จ่ายประจำรถ</h3>
      <div class="flex items-center gap-3">
        <div class="text-xs text-muted">รวมทั้งหมด {{ formatBaht(totalExpenses) }}</div>
        <button v-if="!formOpen" @click="openAddForm" class="btn-sm">
          <span class="material-symbols-rounded text-sm align-middle">add</span>
          เพิ่มค่าใช้จ่าย
        </button>
      </div>
    </div>

    <div v-if="formOpen" class="border border-dashed border-border rounded-lg p-3 space-y-2">
      <div class="text-xs font-semibold text-muted">{{ editingId ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่ายใหม่' }}</div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input v-model="draft.type" placeholder="ประเภท/รายการ เช่น ประกัน, ค่าผ่านทาง" class="input-field h-9 text-xs sm:col-span-2" />
        <input v-model="draft.description" placeholder="รายละเอียด (ไม่บังคับ)" class="input-field h-9 text-xs sm:col-span-2" />
        <input v-model.number="draft.amount" type="number" placeholder="จำนวนเงิน" class="input-field h-9 text-xs" />
        <input v-model="draft.date" type="date" class="input-field h-9 text-xs" />
      </div>
      <div class="flex items-center gap-2 justify-end">
        <button @click="closeForm" class="btn-sm">ยกเลิก</button>
        <button @click="save" :disabled="!draft.type || !draft.amount" class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed">
          {{ editingId ? 'บันทึก' : 'เพิ่ม' }}
        </button>
      </div>
    </div>

    <div class="border border-border rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-surface-2 text-xs text-muted">
          <tr>
            <th class="text-left px-3 py-2 font-semibold">ประเภท/รายละเอียด</th>
            <th class="text-left px-3 py-2 font-semibold">วันที่</th>
            <th class="text-right px-3 py-2 font-semibold">จำนวนเงิน</th>
            <th class="px-3 py-2 font-semibold w-24"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in expenses" :key="row.id" class="border-t border-border">
            <td class="px-3 py-2">
              <div class="font-semibold text-text">{{ row.expenseType }}</div>
              <div v-if="row.description" class="text-xs text-muted">{{ row.description }}</div>
            </td>
            <td class="px-3 py-2 text-muted">{{ formatDate(row.date) }}</td>
            <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(row.amount) }}</td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              <button @click="startEdit(row)" class="text-muted hover:text-text text-xs">แก้ไข</button>
              <button @click="remove(row.id)" class="text-red-500 hover:text-red-600 text-xs ml-2">ลบ</button>
            </td>
          </tr>
          <tr v-if="expenses.length === 0">
            <td colspan="4" class="px-3 py-6 text-center text-muted">ยังไม่มีค่าใช้จ่ายประจำรถ</td>
          </tr>
        </tbody>
      </table>
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
import type { VehicleExpense } from '@/types'

/**
 * ค่าใช้จ่ายประจำรถเป็นข้อมูล User-defined ล้วนๆ — ไม่มี predefined category (ประกัน/GPS/ค่างวด ฯลฯ เป็นแค่ตัวอย่าง
 * placeholder ไม่ใช่ default ของระบบ) ผู้ใช้กรอกประเภท/รายการเองเป็นข้อความอิสระ เก็บลง field expenseType เดิม
 * (ยังคง Reuse store/repository/collection เดิมทั้งหมด ไม่มีการสร้างใหม่)
 */
const props = defineProps<{ vehicleId: string }>()

const expensesStore = useVehicleExpensesStore()

const expenses = computed(() =>
  [...expensesStore.expensesForVehicle(props.vehicleId)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
)

const totalExpenses = computed(() => expensesStore.expensesForVehicle(props.vehicleId).reduce((sum, e) => sum + e.amount, 0))

const todayValue = () => new Date().toISOString().slice(0, 10)

type Draft = { type: string; description: string; amount: number | undefined; date: string }
const emptyDraft = (): Draft => ({ type: '', description: '', amount: undefined, date: todayValue() })

const draft = reactive<Draft>(emptyDraft())
const formOpen = ref(false)
const editingId = ref<string | null>(null)

const openAddForm = () => {
  Object.assign(draft, emptyDraft())
  editingId.value = null
  formOpen.value = true
}

const closeForm = () => {
  formOpen.value = false
  editingId.value = null
  Object.assign(draft, emptyDraft())
}

const startEdit = (row: VehicleExpense) => {
  editingId.value = row.id
  Object.assign(draft, { type: row.expenseType, description: row.description || '', amount: row.amount, date: new Date(row.date).toISOString().slice(0, 10) })
  formOpen.value = true
}

const save = () => {
  if (!draft.type || !draft.amount || !draft.date) return
  const payload = {
    vehicleId: props.vehicleId,
    expenseType: draft.type,
    description: draft.description || undefined,
    amount: draft.amount,
    date: new Date(draft.date),
  }
  if (editingId.value) {
    expensesStore.updateExpense(editingId.value, payload)
  } else {
    expensesStore.addExpense(payload)
  }
  closeForm()
}

const remove = (id: string) => {
  if (editingId.value === id) closeForm()
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
