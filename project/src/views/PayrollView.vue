<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">เงินเดือนเสมียน (พนักงานออฟฟิศ)</h2>
      <div class="text-xs text-muted">รายชื่อพนักงานดึงจากทะเบียนเสมียน (ตั้งค่า &gt; สมุดรายชื่อ &gt; เสมียน) — แยกจากพนักงานขับรถซึ่งอยู่ในเมนู "รายได้พนักงานขับรถ" ต่างหาก</div>
      <div class="flex-1"></div>
      <input v-model="search" placeholder="ค้นหาชื่อพนักงาน/เลขที่เอกสาร" class="input-field w-56" />
      <input v-model="period" type="month" class="input-field" />
      <select v-model="statusFilter" class="input-field">
        <option value="all">ทุกสถานะ</option>
        <option value="DRAFT">รอจ่าย</option>
        <option value="PAID">จ่ายแล้ว</option>
      </select>
    </div>

    <div v-if="staffSalaryStore.loading || staffStore.loading" class="card-lg text-center text-muted py-10">กำลังโหลดข้อมูล...</div>
    <div v-else-if="staffPool.length === 0" class="card-lg text-center text-muted py-10 space-y-2">
      <div>ยังไม่มีข้อมูลเสมียนในระบบ — ต้องเพิ่มพนักงานในทะเบียนเสมียนก่อน จึงจะสร้างเงินเดือนได้</div>
      <button @click="router.push('/settings/staff')" class="btn-sm">ไปหน้าทะเบียนเสมียน</button>
    </div>
    <div v-else class="card-lg overflow-x-auto">
      <table class="min-w-[760px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">พนักงาน</th>
            <th class="px-4 py-3 font-semibold">ตำแหน่ง</th>
            <th class="px-4 py-3 font-semibold">รอบเงินเดือน</th>
            <th class="px-4 py-3 font-semibold text-right">เงินเดือนฐาน</th>
            <th class="px-4 py-3 font-semibold text-right">เพิ่ม</th>
            <th class="px-4 py-3 font-semibold text-right">หัก</th>
            <th class="px-4 py-3 font-semibold text-right">สุทธิ</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold">เลขที่เอกสาร</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.staff.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ staffStore.fullName(row.staff) }}</td>
            <td class="px-4 py-3 text-muted">{{ row.staff.position || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ row.record?.period || periodLabel }}</td>
            <td class="px-4 py-3 text-right text-text">{{ row.record ? formatBaht(row.record.baseSalary) : '-' }}</td>
            <td class="px-4 py-3 text-right text-green-600">{{ row.record ? '+' + formatBaht(additionsTotal(row.record)) : '-' }}</td>
            <td class="px-4 py-3 text-right text-red-500">{{ row.record ? '-' + formatBaht(deductionsTotal(row.record)) : '-' }}</td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ row.record ? formatBaht(row.record.netAmount) : '-' }}</td>
            <td class="px-4 py-3">
              <span v-if="row.record" :class="['text-xs font-semibold px-2 py-1 rounded-full', row.record.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
                {{ row.record.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย' }}
              </span>
              <span v-else class="text-xs text-muted">ยังไม่มีข้อมูลรอบนี้</span>
            </td>
            <td class="px-4 py-3 text-muted font-mono text-xs">{{ row.record?.documentNumber || '-' }}</td>
            <td class="px-4 py-3 text-right">
              <button v-if="row.record" @click="router.push(`/payroll/staff/${row.record.id}`)" class="btn-sm">ดูรายละเอียด</button>
              <button v-else @click="router.push({ path: '/payroll/staff/new', query: { staffId: row.staff.id, period: periodLabel } })" class="btn-sm">สร้างเงินเดือน</button>
            </td>
          </tr>
          <tr v-if="filteredRows.length === 0">
            <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่พบพนักงานที่ตรงกับตัวกรอง</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStaffStore } from '@/stores/staff'
import { useStaffSalaryStore, type StaffSalaryRecord } from '@/stores/staffSalaries'

const router = useRouter()
const staffStore = useStaffStore()
const staffSalaryStore = useStaffSalaryStore()

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** แปลง "YYYY-MM" (ค.ศ.) เป็นรอบบัญชี พ.ศ. เช่น "2026-08" -> "2569-08" — ธรรมเนียมเดียวกับ useDriverPayroll.ts */
function toBEPeriodLabel(monthValue: string): string {
  const [y, m] = monthValue.split('-')
  return `${Number(y) + 543}-${m}`
}

const period = ref(currentMonthValue())
const periodLabel = computed(() => toBEPeriodLabel(period.value))
const statusFilter = ref<'all' | 'DRAFT' | 'PAID'>('all')
const search = ref('')

const additionsTotal = (r: StaffSalaryRecord) => r.additions.reduce((sum, a) => sum + a.amount, 0)
const deductionsTotal = (r: StaffSalaryRecord) => r.deductions.reduce((sum, d) => sum + d.amount, 0)

/** พนักงานเสมียน = ทะเบียนเสมียน (StaffRecord) — แยก Entity จากบัญชีผู้ใช้งาน (UserProfile) โดยเจตนา ดูคอมเมนต์ใน
 *  stores/staff.ts (Driver Income แยกเมนูต่างหากตามที่ตกลงไว้ ไม่ปนกัน) */
const staffPool = computed(() => staffStore.staffList)

const rows = computed(() =>
  staffPool.value.map((staff) => ({
    staff,
    record: staffSalaryStore.records.find((r) => r.staffId === staff.id && r.period === periodLabel.value) || null,
  }))
)

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (statusFilter.value !== 'all' && r.record?.status !== statusFilter.value && !(statusFilter.value === 'DRAFT' && !r.record)) return false
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    return staffStore.fullName(r.staff).toLowerCase().includes(q) || (r.record?.documentNumber || '').toLowerCase().includes(q)
  })
)

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-sm {
  @apply h-8 px-3 rounded-lg border border-border bg-surface text-text font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
