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
      <button v-if="record" @click="router.push(`/payroll/staff/${props.id}/edit`)" class="btn-primary">
        <span class="material-symbols-rounded text-base">edit</span>
        แก้ไข
      </button>
    </div>

    <div v-if="staffSalaryStore.loading || staffStore.loading" class="card-lg text-center text-muted py-10">กำลังโหลดข้อมูล...</div>
    <div v-else-if="!record" class="card-lg text-center text-muted py-10">ไม่พบข้อมูลเงินเดือนนี้</div>

    <div v-else class="card-lg space-y-5">
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
          <span :class="['text-xs font-semibold px-2 py-1 rounded-full', record.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
            {{ record.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย' }}
          </span>
        </div>
        <div>
          <div class="text-xs text-muted">แก้ไขล่าสุด</div>
          <div class="text-text">{{ formatDate(record.updatedAt) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">เลขที่เอกสาร</div>
          <div class="font-semibold text-text font-mono">{{ record.documentNumber || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">วันที่ออกเอกสาร</div>
          <div class="text-text">{{ record.documentDate ? formatDate(record.documentDate) : '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">สถานะเอกสาร (Document Status)</div>
          <span
            v-if="record.documentStatus"
            :class="['text-xs font-semibold px-2 py-1 rounded-full', record.documentStatus === 'ISSUED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700']"
          >
            {{ record.documentStatus === 'ISSUED' ? 'ออกเอกสารแล้ว' : 'ร่าง' }}
          </span>
          <span v-else class="text-xs text-muted">-</span>
        </div>
      </div>

      <div class="border-t border-border pt-4">
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

      <div v-if="record.note" class="border-t border-border pt-4">
        <div class="text-xs font-semibold text-muted mb-1">หมายเหตุ</div>
        <div class="text-sm text-text whitespace-pre-line">{{ record.note }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStaffStore } from '@/stores/staff'
import { useStaffSalaryStore } from '@/stores/staffSalaries'

const props = defineProps<{ id: string }>()
const router = useRouter()
const staffStore = useStaffStore()
const staffSalaryStore = useStaffSalaryStore()

const record = computed(() => staffSalaryStore.records.find((r) => r.id === props.id) || null)
const staffName = computed(() => {
  const s = staffStore.staffList.find((s) => s.id === record.value?.staffId)
  return s ? staffStore.fullName(s) : record.value?.staffId || '-'
})

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date: Date) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

const confirmDelete = async () => {
  if (!record.value) return
  if (!confirm(`ยืนยันลบข้อมูลเงินเดือน ${staffName.value} รอบ ${record.value.period}? การลบนี้ไม่สามารถกู้คืนได้`)) return
  await staffSalaryStore.deleteSalary(record.value.id)
  router.push('/payroll/staff')
}
</script>

<style scoped>
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
