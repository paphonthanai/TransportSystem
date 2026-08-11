<template>
  <div class="space-y-4 max-w-3xl">
    <div class="flex items-center gap-3 flex-wrap">
      <button @click="goBack" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <h2 class="text-lg font-bold text-text flex-1">{{ isEditMode ? 'แก้ไขเงินเดือน' : 'สร้างเงินเดือน' }}</h2>
    </div>

    <div v-if="isEditMode && !record" class="card-lg text-center text-muted py-10">ไม่พบข้อมูลเงินเดือนนี้</div>

    <div v-else class="card-lg space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label">พนักงาน</label>
          <select v-model="staffId" :disabled="isEditMode" class="input-field w-full disabled:opacity-70">
            <option value="">เลือกพนักงาน...</option>
            <option v-for="u in staffPool" :key="u.id" :value="u.id">{{ u.name }} ({{ roleLabel[u.role] || u.role }})</option>
          </select>
        </div>
        <div>
          <label class="field-label">รอบเงินเดือน</label>
          <input v-model="periodMonth" type="month" :disabled="isEditMode" class="input-field w-full disabled:opacity-70" />
        </div>
        <div>
          <label class="field-label">เงินเดือนฐาน</label>
          <input v-model.number="baseSalary" type="number" min="0" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">สถานะ</label>
          <select v-model="status" class="input-field w-full">
            <option value="DRAFT">รอจ่าย</option>
            <option value="PAID">จ่ายแล้ว</option>
          </select>
        </div>
      </div>

      <div v-if="duplicateWarning" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
        พนักงานคนนี้มีข้อมูลเงินเดือนของรอบ {{ periodLabel }} อยู่แล้ว — แก้ไขใบเดิมแทนการสร้างซ้ำ
      </div>

      <div class="border-t border-border pt-4 space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">รายการเพิ่ม</div>
          <button @click="additions.push({ id: genId(), label: '', amount: 0 })" class="btn-sm">
            <span class="material-symbols-rounded text-sm">add</span>
            เพิ่มรายการ
          </button>
        </div>
        <div v-for="(a, idx) in additions" :key="a.id" class="flex items-center gap-2">
          <input v-model="a.label" placeholder="รายการ เช่น ค่าล่วงเวลา" class="input-field flex-1" />
          <input v-model.number="a.amount" type="number" placeholder="0" class="input-field w-32" />
          <button @click="additions.splice(idx, 1)" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-red-50 hover:text-red-600 flex-shrink-0">
            <span class="material-symbols-rounded text-sm">close</span>
          </button>
        </div>
      </div>

      <div class="border-t border-border pt-4 space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">รายการหัก</div>
          <button @click="deductions.push({ id: genId(), label: '', amount: 0 })" class="btn-sm">
            <span class="material-symbols-rounded text-sm">add</span>
            เพิ่มรายการ
          </button>
        </div>
        <div v-for="(d, idx) in deductions" :key="d.id" class="flex items-center gap-2">
          <input v-model="d.label" placeholder="รายการ เช่น ประกันสังคม" class="input-field flex-1" />
          <input v-model.number="d.amount" type="number" placeholder="0" class="input-field w-32" />
          <button @click="deductions.splice(idx, 1)" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-red-50 hover:text-red-600 flex-shrink-0">
            <span class="material-symbols-rounded text-sm">close</span>
          </button>
        </div>
      </div>

      <div class="border-t border-border pt-4">
        <label class="field-label">หมายเหตุ</label>
        <textarea v-model="note" rows="2" class="input-field w-full" />
      </div>

      <div class="bg-surface-2 rounded-xl p-4 flex justify-between items-center">
        <span class="font-semibold text-text">ยอดสุทธิ</span>
        <span class="text-xl font-bold text-primary">{{ formatBaht(netAmount) }}</span>
      </div>

      <div v-if="submitError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{{ submitError }}</div>

      <div class="flex justify-end gap-2">
        <button @click="goBack" class="btn-secondary">ยกเลิก</button>
        <button @click="save" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึก
        </button>
      </div>
    </div>

    <Teleport to="body" v-if="confirmOpen">
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl p-6 space-y-4">
          <div class="font-bold text-text">ยืนยันบันทึกเงินเดือน</div>
          <div class="text-sm text-muted">
            บันทึกเงินเดือน {{ staffPool.find((u) => u.id === staffId)?.name }} รอบ {{ periodLabel }} ยอดสุทธิ {{ formatBaht(netAmount) }} — ยืนยันหรือไม่?
          </div>
          <div class="flex justify-end gap-2">
            <button @click="confirmOpen = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmSave" class="btn-primary">ยืนยันบันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/users'
import { useStaffSalaryStore, type SalaryLineItem, type StaffSalaryStatus } from '@/stores/staffSalaries'

const props = defineProps<{ id?: string }>()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const staffSalaryStore = useStaffSalaryStore()

const isEditMode = !!props.id

const roleLabel: Record<string, string> = { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'เสมียน', DISPATCHER: 'จัดรถ', ACCOUNTING: 'บัญชี' }
const staffPool = computed(() => userStore.users.filter((u) => u.role !== 'DRIVER'))

const record = computed(() => (props.id ? staffSalaryStore.records.find((r) => r.id === props.id) || null : null))

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function toBEPeriodLabel(monthValue: string): string {
  const [y, m] = monthValue.split('-')
  return `${Number(y) + 543}-${m}`
}
/** "2569-08" (พ.ศ.) -> "2026-08" (ค.ศ.) สำหรับ <input type="month"> */
function fromBEPeriodLabel(periodLabel: string): string {
  const [y, m] = periodLabel.split('-')
  return `${Number(y) - 543}-${m}`
}

const genId = () => `sal${Date.now()}${Math.random().toString(36).slice(2, 6)}`

const staffId = ref((route.query.staffId as string) || '')
const periodMonth = ref((route.query.period as string) ? fromBEPeriodLabel(route.query.period as string) : currentMonthValue())
const periodLabel = computed(() => toBEPeriodLabel(periodMonth.value))
const baseSalary = ref(0)
const additions = ref<SalaryLineItem[]>([])
const deductions = ref<SalaryLineItem[]>([])
const status = ref<StaffSalaryStatus>('DRAFT')
const note = ref('')

/** โหลดข้อมูลเดิมมาเติมฟอร์มทันทีที่ record ปรากฏจริง (กันกรณี hard reload เข้าหน้าแก้ไขตรงๆ ก่อน store โหลดจาก Firestore เสร็จ) */
const prefilled = ref(false)
watch(
  record,
  (r) => {
    if (!r || prefilled.value) return
    prefilled.value = true
    staffId.value = r.staffId
    periodMonth.value = fromBEPeriodLabel(r.period)
    baseSalary.value = r.baseSalary
    additions.value = r.additions.map((a) => ({ ...a }))
    deductions.value = r.deductions.map((d) => ({ ...d }))
    status.value = r.status
    note.value = r.note || ''
  },
  { immediate: true }
)

const netAmount = computed(() => staffSalaryStore.computeNet(baseSalary.value, additions.value, deductions.value))
const duplicateWarning = computed(() => !!staffId.value && staffSalaryStore.recordExistsFor(staffId.value, periodLabel.value, props.id))
const canSave = computed(() => !!staffId.value && !!periodLabel.value && !duplicateWarning.value)

const submitError = ref('')
const confirmOpen = ref(false)

const goBack = () => router.push(props.id ? `/payroll/staff/${props.id}` : '/payroll/staff')

const save = () => {
  if (!canSave.value) return
  submitError.value = ''
  confirmOpen.value = true
}

const confirmSave = async () => {
  confirmOpen.value = false
  const payload = {
    staffId: staffId.value,
    period: periodLabel.value,
    baseSalary: baseSalary.value || 0,
    additions: additions.value.filter((a) => a.label),
    deductions: deductions.value.filter((d) => d.label),
    status: status.value,
    note: note.value || undefined,
  }
  const result = props.id ? await staffSalaryStore.updateSalary(props.id, payload) : await staffSalaryStore.createSalary(payload)
  if (!result) {
    submitError.value = 'บันทึกไม่สำเร็จ — พนักงานคนนี้อาจมีข้อมูลเงินเดือนของรอบนี้อยู่แล้ว'
    return
  }
  router.push(`/payroll/staff/${result.id}`)
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
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
  @apply h-8 px-3 rounded-lg border border-border bg-surface text-text font-medium text-xs inline-flex items-center gap-1 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
