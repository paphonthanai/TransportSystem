<template>
  <div class="card-lg space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h3 class="text-sm font-bold text-text">{{ isAddition ? 'รายได้อื่นๆ' : 'รายการหักเงินเดือน' }}</h3>
      <div class="flex items-center gap-3">
        <div class="text-xs text-muted">รอบ {{ periodLabel }}{{ driverName ? ` · ${driverName}` : '' }}</div>
        <button v-if="driverName && !formOpen" @click="openAddForm" class="btn-sm">
          <span class="material-symbols-rounded text-sm align-middle">add</span>
          {{ isAddition ? 'เพิ่มรายการ' : 'เพิ่มรายการหัก' }}
        </button>
      </div>
    </div>

    <div v-if="!driverName" class="text-sm text-muted py-4 text-center">
      เลือกคนขับเพื่อดู/เพิ่ม{{ isAddition ? 'รายได้อื่นๆ' : 'รายการหักเงินเดือน' }}
    </div>

    <template v-else>
      <div v-if="formOpen" class="border border-dashed border-border rounded-lg p-3 space-y-2">
        <div class="text-xs font-semibold text-muted">
          {{ editingId ? `แก้ไข${isAddition ? 'รายได้อื่นๆ' : 'รายการหัก'}` : `เพิ่ม${isAddition ? 'รายได้อื่นๆ' : 'รายการหัก'}ใหม่` }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input v-model="draft.type" :placeholder="isAddition ? 'ประเภท/รายการ เช่น ค่าล่วงเวลา, โบนัส' : 'ประเภท/รายการ เช่น หักภาษี ณ ที่จ่าย'" class="input-field h-9 text-xs sm:col-span-2" />
          <input v-model="draft.label" placeholder="รายละเอียด (ไม่บังคับ)" class="input-field h-9 text-xs sm:col-span-2" />
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
            <tr v-for="row in rows" :key="row.id" class="border-t border-border">
              <td class="px-3 py-2">
                <div class="font-semibold text-text">{{ row.type }}</div>
                <div v-if="row.label" class="text-xs text-muted">{{ row.label }}</div>
              </td>
              <td class="px-3 py-2 text-muted">{{ row.date ? formatDate(row.date) : formatDate(row.createdAt) }}</td>
              <td class="px-3 py-2 text-right font-semibold" :class="isAddition ? 'text-green-600' : 'text-text'">{{ formatBaht(row.amount) }}</td>
              <td class="px-3 py-2 text-right whitespace-nowrap">
                <button @click="startEdit(row)" class="text-muted hover:text-text text-xs">แก้ไข</button>
                <button @click="remove(row.id)" class="text-red-500 hover:text-red-600 text-xs ml-2">ลบ</button>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="4" class="px-3 py-6 text-center text-muted">ยังไม่มี{{ isAddition ? 'รายได้อื่นๆ' : 'รายการหักเงินเดือน' }}รอบนี้</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-border">
        <span class="text-sm font-semibold text-text">{{ isAddition ? 'รวมรายได้อื่นๆ ทั้งหมด' : 'รวมรายการหักทั้งหมด' }}</span>
        <span class="text-sm font-bold" :class="isAddition ? 'text-green-600' : 'text-red-500'">{{ isAddition ? '+' : '-' }}{{ formatBaht(total) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { usePayrollDeductionsStore } from '@/stores/payrollDeductions'
import type { PayrollDeduction, PayrollLineKind } from '@/types'

/**
 * รายการหักเงินเดือน/รายได้อื่นๆ เป็นข้อมูล User-defined ล้วนๆ — ไม่มี predefined category (หักภาษี ณ ที่จ่าย/ค่าล่วงเวลา
 * ฯลฯ เป็นแค่ตัวอย่าง placeholder ไม่ใช่ default ของระบบ) ผู้ใช้กรอกประเภท/รายการเองเป็นข้อความอิสระ เก็บลง field type เดิม
 * Component เดียวใช้ได้ทั้งสองแบบ แยกกันด้วย prop kind เท่านั้น (ไม่แยก component/store/collection ซ้ำ) — ADDITION
 * บวกเข้ารายได้สุทธิ, DEDUCTION (ค่าเริ่มต้น) หักออก ห้ามสร้างรายการอัตโนมัติจาก Vehicle Expense/Booking/Vehicle
 * Income/Driver Income/Fuel Cost — ยังคง Reuse store/repository/collection เดิมทั้งหมด ไม่มีการสร้างใหม่
 */
const props = withDefaults(defineProps<{ driverName: string; periodLabel: string; kind?: PayrollLineKind }>(), { kind: 'DEDUCTION' })

const isAddition = computed(() => props.kind === 'ADDITION')

const deductionsStore = usePayrollDeductionsStore()

const rows = computed(() =>
  [...(isAddition.value ? deductionsStore.additionsFor(props.driverName, props.periodLabel) : deductionsStore.deductionsFor(props.driverName, props.periodLabel))].sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  )
)

const total = computed(() => rows.value.reduce((sum, d) => sum + d.amount, 0))

const todayValue = () => new Date().toISOString().slice(0, 10)

type Draft = { type: string; label: string; amount: number | undefined; date: string }
const emptyDraft = (): Draft => ({ type: '', label: '', amount: undefined, date: todayValue() })

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

const startEdit = (row: PayrollDeduction) => {
  editingId.value = row.id
  Object.assign(draft, { type: row.type, label: row.label || '', amount: row.amount, date: (row.date ? new Date(row.date) : new Date(row.createdAt)).toISOString().slice(0, 10) })
  formOpen.value = true
}

const save = () => {
  if (!draft.type || !draft.amount) return
  if (editingId.value) {
    deductionsStore.updateDeduction(editingId.value, { type: draft.type, label: draft.label, amount: draft.amount, date: draft.date ? new Date(draft.date) : undefined })
  } else {
    deductionsStore.addDeduction({
      driverName: props.driverName,
      periodLabel: props.periodLabel,
      type: draft.type,
      label: draft.label,
      amount: draft.amount,
      date: draft.date ? new Date(draft.date) : undefined,
      kind: props.kind,
    })
  }
  closeForm()
}

const remove = (id: string) => {
  if (editingId.value === id) closeForm()
  deductionsStore.deleteDeduction(id)
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date: Date) => new Date(date).toLocaleDateString('th-TH')

defineExpose({ total })
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
