<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">เงินเดือนเสมียน (พนักงานออฟฟิศ)</h2>
      <div class="text-xs text-muted">รายชื่อพนักงานดึงจากทะเบียนเสมียน และบัญชี login role เสมียนที่ยังไม่มีทะเบียน — แยกจากพนักงานขับรถซึ่งอยู่ในเมนู "รายได้พนักงานขับรถ" ต่างหาก</div>
      <div class="flex-1"></div>
      <input v-model="search" placeholder="ค้นหาชื่อพนักงาน/เลขที่เอกสาร" class="input-field w-56" />
      <input v-model="period" type="month" class="input-field" />
      <select v-model="statusFilter" class="input-field">
        <option value="all">ทุกสถานะ</option>
        <option value="DRAFT">รอจ่าย</option>
        <option value="PAID">จ่ายแล้ว</option>
      </select>
    </div>

    <div v-if="staffSalaryStore.loading || staffStore.loading || userStore.loading" class="card-lg text-center text-muted py-10">กำลังโหลดข้อมูล...</div>
    <div v-else-if="rows.length === 0" class="card-lg text-center text-muted py-10 space-y-2">
      <div>ยังไม่มีข้อมูลเสมียนในระบบ — ต้องเพิ่มพนักงานในทะเบียนเสมียนก่อน จึงจะสร้างเงินเดือนได้</div>
      <button @click="router.push('/settings/personnel?role=STAFF')" class="btn-sm">ไปหน้าทะเบียนเสมียน</button>
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
          <tr v-for="row in filteredRows" :key="row.key" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">
              {{ row.name }}
              <span v-if="row.account" class="ml-1 text-[10px] font-normal text-muted" title="มีบัญชี login แต่ยังไม่มีทะเบียนเสมียน — กดสร้างเงินเดือนแล้วระบบจะสร้างทะเบียนเสมียนให้">(บัญชี login)</span>
            </td>
            <td class="px-4 py-3 text-muted">{{ row.position || '-' }}</td>
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
              <button v-else @click="createSalary(row)" :disabled="creatingFor === row.key" class="btn-sm disabled:opacity-60">สร้างเงินเดือน</button>
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
import { useUserStore, type UserProfile } from '@/stores/users'
import { staffAccountsWithoutRecord, staffRecordFromAccount } from '@/utils/personnelDirectory'
import { useStaffSalaryStore, type StaffSalaryRecord } from '@/stores/staffSalaries'
import { useRememberedState } from '@/composables/useRememberedState'

const router = useRouter()
const staffStore = useStaffStore()
const staffSalaryStore = useStaffSalaryStore()
const userStore = useUserStore()

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
// จำคำค้น/ตัวกรอง/การเรียง/หน้าที่เปิดอยู่ — กดแก้ไข/ดูเอกสารแล้วกลับมาไม่ต้องกรองใหม่ (ดู useRememberedState)
useRememberedState('payroll', { period, search })

const additionsTotal = (r: StaffSalaryRecord) => r.additions.reduce((sum, a) => sum + a.amount, 0)
const deductionsTotal = (r: StaffSalaryRecord) => r.deductions.reduce((sum, d) => sum + d.amount, 0)

/** พนักงานเสมียน = ทะเบียนเสมียน (StaffRecord) + บัญชี login role เสมียนที่ยังไม่มีทะเบียน (เดิมเห็นแค่ทะเบียน เสมียนที่มีแค่
 *  บัญชี login เลยไม่ขึ้น) เงินเดือนผูกกับทะเบียนเสมียนเสมอ — แถวบัญชี login กด "สร้างเงินเดือน" แล้วระบบสร้างทะเบียนให้ก่อน */
interface PayrollRow {
  key: string
  name: string
  position: string
  staffId?: string
  account?: UserProfile
  record: StaffSalaryRecord | null
}

const rows = computed<PayrollRow[]>(() => [
  ...staffStore.staffList.map((staff) => ({
    key: `staff:${staff.id}`,
    name: staffStore.fullName(staff),
    position: staff.position,
    staffId: staff.id,
    record: staffSalaryStore.records.find((r) => r.staffId === staff.id && r.period === periodLabel.value) || null,
  })),
  ...staffAccountsWithoutRecord(userStore.users, staffStore.staffList).map((account) => ({
    key: `user:${account.id}`,
    name: account.name,
    position: 'เสมียน',
    account,
    record: null,
  })),
])

const creatingFor = ref('')
async function createSalary(row: PayrollRow) {
  let staffId = row.staffId
  if (!staffId && row.account) {
    creatingFor.value = row.key
    try {
      await staffStore.createStaff(staffStore.sanitizeStaff(staffRecordFromAccount(row.account)))
      staffId = staffStore.staffList[0]?.id
    } catch (err: any) {
      alert(`สร้างทะเบียนเสมียนไม่สำเร็จ: ${err?.message || err}`)
      return
    } finally {
      creatingFor.value = ''
    }
  }
  if (staffId) router.push({ path: '/payroll/staff/new', query: { staffId, period: periodLabel.value } })
}

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (statusFilter.value !== 'all' && r.record?.status !== statusFilter.value && !(statusFilter.value === 'DRAFT' && !r.record)) return false
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    return r.name.toLowerCase().includes(q) || (r.record?.documentNumber || '').toLowerCase().includes(q)
  })
)

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
