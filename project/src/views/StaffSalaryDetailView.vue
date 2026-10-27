<template>
  <div class="space-y-4 max-w-3xl">
    <div class="flex items-center gap-3 flex-wrap">
      <button @click="router.push('/payroll/staff')" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <h2 class="text-lg font-bold text-text flex-1">รายละเอียดเงินเดือน</h2>
      <button v-if="record" @click="confirmDelete" class="btn-secondary text-red-600 hover:bg-red-50">
        <span class="material-symbols-rounded text-base">delete</span>
        ลบ
      </button>
      <button v-if="record" @click="router.push(`/payroll/staff/${props.id}/print`)" class="btn-secondary">
        <span class="material-symbols-rounded text-base">print</span>
        พิมพ์เอกสาร
      </button>
    </div>

    <div v-if="staffSalaryStore.loading || staffStore.loading" class="card-lg text-center text-muted py-10">กำลังโหลดข้อมูล...</div>
    <div v-else-if="!record" class="card-lg text-center text-muted py-10">ไม่พบข้อมูลเงินเดือนนี้</div>

    <div v-else class="card-lg space-y-5">
      <div v-if="editError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{{ editError }}</div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-muted">พนักงาน</div>
          <div class="font-semibold text-text">{{ staffName }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">รอบเงินเดือน</div>
          <div class="font-semibold text-text">{{ record.period }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">สถานะจ่ายเงิน (Payment Status)</div>
          <div v-if="editing === 'status'" class="flex items-center gap-2 mt-1">
            <select v-model="draft" class="input-field h-8 text-xs">
              <option value="DRAFT">รอจ่าย</option>
              <option value="PAID">จ่ายแล้ว</option>
            </select>
            <button @click="saveEdit" :disabled="saving" class="btn-sm">บันทึก</button>
            <button @click="cancelEdit" class="btn-sm-ghost">ยกเลิก</button>
          </div>
          <div v-else class="flex items-center gap-2">
            <span :class="['text-xs font-semibold px-2 py-1 rounded-full', record.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
              {{ record.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย' }}
            </span>
            <button @click="startEdit('status', record.status)" class="edit-link" title="แก้สถานะจ่ายเงิน">
              <span class="material-symbols-rounded text-sm">edit</span>แก้
            </button>
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">แก้ไขล่าสุด</div>
          <div class="text-text">{{ formatDate(record.updatedAt) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">เลขที่เอกสาร</div>
          <div v-if="editing === 'documentNumber'" class="flex items-center gap-2 mt-1">
            <input v-model="draft" placeholder="เช่น SLR2569-0001" class="input-field h-8 text-xs w-40" />
            <button @click="saveEdit" :disabled="saving" class="btn-sm">บันทึก</button>
            <button @click="cancelEdit" class="btn-sm-ghost">ยกเลิก</button>
          </div>
          <div v-else class="flex items-center gap-2">
            <span class="font-semibold text-text font-mono">{{ record.documentNumber || '-' }}</span>
            <button v-if="!paidLock" @click="startEdit('documentNumber', record.documentNumber || '')" class="edit-link" title="แก้เลขที่เอกสาร">
              <span class="material-symbols-rounded text-sm">edit</span>แก้
            </button>
            <span v-else class="lock-note">(จ่ายแล้ว)</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">วันที่ออกเอกสาร</div>
          <div v-if="editing === 'documentDate'" class="flex items-center gap-2 mt-1">
            <input v-model="draft" type="date" :max="todayValue" class="input-field h-8 text-xs" />
            <button @click="saveEdit" :disabled="saving" class="btn-sm">บันทึก</button>
            <button @click="cancelEdit" class="btn-sm-ghost">ยกเลิก</button>
          </div>
          <div v-else class="flex items-center gap-2">
            <span class="text-text">{{ record.documentDate ? formatDate(record.documentDate) : '-' }}</span>
            <button v-if="!paidLock" @click="startEdit('documentDate', toDateValue(record.documentDate))" class="edit-link" title="แก้วันที่ออกเอกสาร">
              <span class="material-symbols-rounded text-sm">edit</span>แก้
            </button>
            <span v-else class="lock-note">(จ่ายแล้ว)</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">สถานะเอกสาร (Document Status)</div>
          <div v-if="editing === 'documentStatus'" class="flex items-center gap-2 mt-1">
            <select v-model="draft" class="input-field h-8 text-xs">
              <option value="DRAFT">ร่าง</option>
              <option value="ISSUED">ออกเอกสารแล้ว</option>
            </select>
            <button @click="saveEdit" :disabled="saving" class="btn-sm">บันทึก</button>
            <button @click="cancelEdit" class="btn-sm-ghost">ยกเลิก</button>
          </div>
          <div v-else class="flex items-center gap-2">
            <span
              v-if="record.documentStatus"
              :class="['text-xs font-semibold px-2 py-1 rounded-full', record.documentStatus === 'ISSUED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700']"
            >
              {{ record.documentStatus === 'ISSUED' ? 'ออกเอกสารแล้ว' : 'ร่าง' }}
            </span>
            <span v-else class="text-xs text-muted">-</span>
            <button v-if="!paidLock" @click="startEdit('documentStatus', record.documentStatus || 'DRAFT')" class="edit-link" title="แก้สถานะเอกสาร">
              <span class="material-symbols-rounded text-sm">edit</span>แก้
            </button>
            <span v-else class="lock-note">(จ่ายแล้ว)</span>
          </div>
        </div>
      </div>

      <div class="border-t border-border pt-4">
        <div class="flex justify-end mb-1">
          <button v-if="!paidLock" @click="router.push(`/payroll/staff/${props.id}/edit`)" class="edit-link" title="แก้เงินเดือนฐาน/รายการเพิ่ม/หัก">
            <span class="material-symbols-rounded text-sm">edit</span>แก้ยอดเงิน
          </button>
          <span v-else class="lock-note">(ยอดเงินล็อก — {{ paidLock }})</span>
        </div>
        <div class="flex justify-between text-sm py-1">
          <span class="text-muted">เงินเดือนฐาน</span>
          <span class="text-text">{{ formatBaht(record.baseSalary) }}</span>
        </div>

        <div v-if="record.additions.length" class="pt-2">
          <div class="text-xs font-semibold text-muted mb-1">รายการเพิ่ม</div>
          <div v-for="a in record.additions" :key="a.id" class="flex justify-between text-sm py-1">
            <span class="text-text">{{ a.label }}</span>
            <span class="text-green-600">+{{ formatBaht(a.amount) }}</span>
          </div>
        </div>

        <div v-if="record.deductions.length" class="pt-2">
          <div class="text-xs font-semibold text-muted mb-1">รายการหัก</div>
          <div v-for="d in record.deductions" :key="d.id" class="flex justify-between text-sm py-1">
            <span class="text-text">{{ d.label }}</span>
            <span class="text-red-500">-{{ formatBaht(d.amount) }}</span>
          </div>
        </div>

        <div class="flex justify-between text-base font-bold border-t border-border mt-3 pt-3">
          <span class="text-text">ยอดสุทธิ</span>
          <span class="text-primary">{{ formatBaht(record.netAmount) }}</span>
        </div>
      </div>

      <div class="border-t border-border pt-4">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-semibold text-muted">หมายเหตุ</span>
          <button v-if="editing !== 'note'" @click="startEdit('note', record.note || '')" class="edit-link" title="แก้หมายเหตุ">
            <span class="material-symbols-rounded text-sm">edit</span>แก้
          </button>
        </div>
        <div v-if="editing === 'note'" class="space-y-2">
          <textarea v-model="draft" rows="2" class="input-field w-full py-2" />
          <div class="flex gap-2">
            <button @click="saveEdit" :disabled="saving" class="btn-sm">บันทึก</button>
            <button @click="cancelEdit" class="btn-sm-ghost">ยกเลิก</button>
          </div>
        </div>
        <div v-else class="text-sm text-text whitespace-pre-line">{{ record.note || '-' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStaffStore } from '@/stores/staff'
import { useStaffSalaryStore, type StaffSalaryDocumentStatus, type StaffSalaryStatus } from '@/stores/staffSalaries'

const props = defineProps<{ id: string }>()
const router = useRouter()
const staffStore = useStaffStore()
const staffSalaryStore = useStaffSalaryStore()

const record = computed(() => staffSalaryStore.records.find((r) => r.id === props.id) || null)
const staffName = computed(() => {
  const s = staffStore.staffList.find((s) => s.id === record.value?.staffId)
  return s ? staffStore.fullName(s) : record.value?.staffId || '-'
})
/** จ่ายแล้ว = ล็อกยอดเงินและเลขที่/วันที่/สถานะเอกสาร (หมายเหตุ/สถานะจ่ายยังแก้ได้) — store บังคับซ้ำอีกชั้น */
const paidLock = computed(() => (record.value ? staffSalaryStore.paidLockReason(record.value) : ''))

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (date: Date) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
const toDateValue = (date?: Date) => (date ? new Date(date).toISOString().slice(0, 10) : '')
const todayValue = toDateValue(new Date())

/** inline "แก้" ทีละ field — เปิดได้ทีละช่อง บันทึกผ่าน updateSalaryFields (เช็คสิทธิ์/ล็อก/เลขซ้ำ + เขียน log ที่ store) */
type EditField = 'status' | 'documentNumber' | 'documentDate' | 'documentStatus' | 'note'
const editing = ref<EditField | null>(null)
const draft = ref('')
const saving = ref(false)
const editError = ref('')

const startEdit = (field: EditField, value: string) => {
  editing.value = field
  draft.value = value
  editError.value = ''
}
const cancelEdit = () => {
  editing.value = null
  editError.value = ''
}
const saveEdit = async () => {
  if (!record.value || !editing.value) return
  const field = editing.value
  const patch =
    field === 'status'
      ? { status: draft.value as StaffSalaryStatus }
      : field === 'documentStatus'
        ? { documentStatus: draft.value as StaffSalaryDocumentStatus }
        : field === 'documentDate'
          ? { documentDate: draft.value ? new Date(draft.value) : undefined }
          : { [field]: draft.value }
  saving.value = true
  const result = await staffSalaryStore.updateSalaryFields(record.value.id, patch)
  saving.value = false
  if (!result.ok) {
    editError.value = result.message || 'บันทึกไม่สำเร็จ'
    return
  }
  editing.value = null
}

const confirmDelete = async () => {
  if (!record.value) return
  if (!confirm(`ยืนยันลบข้อมูลเงินเดือน ${staffName.value} รอบ ${record.value.period}? การลบนี้ไม่สามารถกู้คืนได้`)) return
  await staffSalaryStore.deleteSalary(record.value.id)
  router.push('/payroll/staff')
}
</script>

<style scoped>
.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-3 rounded-lg border-0 bg-primary text-white font-semibold text-xs cursor-pointer hover:opacity-90 disabled:opacity-40;
}

.btn-sm-ghost {
  @apply h-8 px-3 rounded-lg border border-border bg-surface text-text text-xs cursor-pointer hover:bg-surface-2;
}

.input-field {
  @apply px-3 border border-border rounded-lg bg-surface text-text font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.edit-link {
  @apply inline-flex items-center gap-0.5 text-xs font-normal text-primary hover:underline;
}

.lock-note {
  @apply text-xs text-muted;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
