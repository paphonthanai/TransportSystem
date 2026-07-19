<template>
  <div class="space-y-4">
    <div class="card-lg">
      <div class="font-bold text-text mb-3">สรุปสถานะการเงิน</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="border-l-4 border-green-500 pl-2">
          <div class="text-[11px] text-muted">รายรับรวม (ชำระแล้ว)</div>
          <div class="text-sm font-bold text-text">{{ formatBaht(totalPaidRevenue) }}</div>
        </div>
        <div class="border-l-4 border-primary pl-2">
          <div class="text-[11px] text-muted">รอรับชำระ</div>
          <div class="text-sm font-bold text-text">{{ formatBaht(totalPendingReceivable) }}</div>
        </div>
        <div class="border-l-4 border-amber-500 pl-2">
          <div class="text-[11px] text-muted">ค้างชำระเกินกำหนด</div>
          <div class="text-sm font-bold text-text">{{ formatBaht(totalOverdue) }}</div>
        </div>
        <div class="border-l-4 border-indigo-500 pl-2">
          <div class="text-[11px] text-muted">ใบแจ้งหนี้เดือนนี้</div>
          <div class="text-sm font-bold text-text">{{ invoicesThisMonth }} ใบ</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
      <!-- รายรับและรายจ่าย -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-text">รายรับและรายจ่าย</div>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted">
            <span class="material-symbols-rounded text-lg">refresh</span>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div class="text-xs text-muted mb-1">หน่วยงาน</div>
            <select v-model="unitFilter" class="input-field w-full">
              <option value="all">ทุกหน่วยงาน</option>
              <option value="cements">Fleet Cements</option>
              <option value="ceramics">Fleet Ceramics</option>
            </select>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">ช่วงวันที่</div>
            <select v-model="dateRangeFilter" class="input-field w-full">
              <option value="">ไม่กำหนด - ไม่กำหนด</option>
              <option value="month">เดือนนี้</option>
              <option value="quarter">ไตรมาสนี้</option>
              <option value="year">ปีนี้</option>
            </select>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="s in revenueSeries"
            :key="s.key"
            @click="s.visible = !s.visible"
            class="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm font-medium transition-all"
            :class="s.visible ? 'bg-surface-2 text-text' : 'bg-transparent text-muted opacity-50'"
          >
            <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: s.color }"></span>
            {{ s.label }}
          </button>
        </div>
        <DashboardLineChart :labels="monthLabels" :series="revenueSeries" />
      </div>

      <!-- รอรับชำระ/รอจ่าย -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 text-sm font-medium text-text cursor-pointer">
              <input type="checkbox" v-model="showReceivable" class="rounded" />
              ลูกหนี้
            </label>
            <label class="flex items-center gap-1.5 text-sm font-medium text-text cursor-pointer">
              <input type="checkbox" v-model="showPayable" class="rounded" />
              เจ้าหนี้
            </label>
          </div>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted">
            <span class="material-symbols-rounded text-lg">refresh</span>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div v-if="showReceivable" class="border-l-4 border-amber-500 pl-2">
            <div class="text-[11px] text-muted">เกินกำหนด (ลูกหนี้)</div>
            <div class="text-sm font-bold text-text">{{ formatBaht(overdueReceivable) }}</div>
          </div>
          <div v-if="showPayable" class="border-l-4 border-amber-500 pl-2">
            <div class="text-[11px] text-muted">เกินกำหนด (เจ้าหนี้)</div>
            <div class="text-sm font-bold text-text">{{ formatBaht(overduePayable) }}</div>
          </div>
          <div v-if="showReceivable" class="border-l-4 border-primary pl-2">
            <div class="text-[11px] text-muted">รอรับชำระ</div>
            <div class="text-sm font-bold text-text">{{ formatBaht(pendingReceivable) }}</div>
          </div>
          <div v-if="showPayable" class="border-l-4 border-primary pl-2">
            <div class="text-[11px] text-muted">รอจ่าย</div>
            <div class="text-sm font-bold text-text">{{ formatBaht(pendingPayable) }}</div>
          </div>
        </div>
        <DashboardLineChart :labels="nextMonthLabels" :series="arApSeries" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <!-- ถึงกำหนดชำระ -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-1">
          <div class="font-bold text-text">ถึงกำหนดชำระ</div>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted">
            <span class="material-symbols-rounded text-lg">refresh</span>
          </button>
        </div>
        <div class="text-[11px] text-red-500 font-medium mb-3">** ยกเว้นถึงกำหนดภายใน 3 วัน **</div>
        <div class="mb-3">
          <div class="text-xs text-muted mb-1">หน่วยงาน</div>
          <select v-model="dueUnitFilter" class="input-field w-full">
            <option value="all">ทุกหน่วยงาน</option>
            <option value="cements">Fleet Cements</option>
            <option value="ceramics">Fleet Ceramics</option>
          </select>
        </div>
        <div class="space-y-2 min-h-[7rem]">
          <div v-for="item in pagedDueInvoices" :key="item.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <div class="text-sm font-semibold text-text">{{ item.customer }}</div>
              <div class="text-xs text-muted">ครบกำหนด {{ item.dueDate }}</div>
            </div>
            <div class="text-sm font-bold text-text">{{ formatBaht(item.amount) }}</div>
          </div>
          <div v-if="pagedDueInvoices.length === 0" class="py-6 text-center text-muted text-sm">ไม่มีรายการ</div>
        </div>
        <Pager v-model:page="duePage" :total="dueInvoices.length" :per-page="pageSize" />
      </div>

      <!-- ขอวางบิล -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-text">ขอวางบิล</div>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted">
            <span class="material-symbols-rounded text-lg">refresh</span>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div class="text-xs text-muted mb-1">หน่วยงาน</div>
            <select v-model="billingUnitFilter" class="input-field w-full">
              <option value="all">ทุกหน่วยงาน</option>
              <option value="cements">Fleet Cements</option>
              <option value="ceramics">Fleet Ceramics</option>
            </select>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">ช่วงวันที่</div>
            <select v-model="billingDateFilter" class="input-field w-full">
              <option value="">ไม่กำหนด - ไม่กำหนด</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
            </select>
          </div>
        </div>
        <div class="space-y-2 min-h-[7rem]">
          <div v-for="item in pagedBillingRequests" :key="item.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <div class="text-sm font-semibold text-text">{{ item.docNo }}</div>
              <div class="text-xs text-muted">{{ item.customer }}</div>
            </div>
            <div class="text-sm font-bold text-text">{{ formatBaht(item.amount) }}</div>
          </div>
          <div v-if="pagedBillingRequests.length === 0" class="py-6 text-center text-muted text-sm">ไม่มีรายการ</div>
        </div>
        <Pager v-model:page="billingPage" :total="billingRequests.length" :per-page="pageSize" />
      </div>

      <!-- สถานะรถซ่อม -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-text">สถานะรถซ่อม</div>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted">
            <span class="material-symbols-rounded text-lg">refresh</span>
          </button>
        </div>
        <div class="mb-3">
          <div class="text-xs text-muted mb-1">หน่วยงาน</div>
          <select v-model="repairUnitFilter" class="input-field w-full">
            <option value="all">ทุกหน่วยงาน</option>
            <option value="cements">Fleet Cements</option>
            <option value="ceramics">Fleet Ceramics</option>
          </select>
        </div>
        <div class="overflow-hidden rounded-lg border border-border">
          <table class="w-full text-xs">
            <thead class="bg-primary text-white">
              <tr>
                <th class="text-left px-2 py-2 font-semibold">ลำดับ</th>
                <th class="text-left px-2 py-2 font-semibold">ทะเบียนรถ</th>
                <th class="text-left px-2 py-2 font-semibold">สถานะที่ซ่อม</th>
                <th class="text-right px-2 py-2 font-semibold">ระยะเวลาซ่อม (วัน)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in repairVehicles" :key="item.plate" class="border-t border-border">
                <td class="px-2 py-2 text-muted">{{ i + 1 }}</td>
                <td class="px-2 py-2 font-semibold text-text">{{ item.plate }}</td>
                <td class="px-2 py-2 text-text">{{ item.status }}</td>
                <td class="px-2 py-2 text-right text-text">{{ item.days }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="repairVehicles.length === 0" class="py-8 text-center text-muted text-sm flex flex-col items-center gap-2">
            <span class="material-symbols-rounded text-3xl">build</span>
            ไม่มีรายการ
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLineChart from '@/components/DashboardLineChart.vue'
import Pager from '@/components/Pager.vue'
import { useBookingStore } from '@/stores/booking'

const bookingStore = useBookingStore()

const totalPaidRevenue = computed(() =>
  bookingStore.documents.filter((d) => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0)
)
const totalPendingReceivable = computed(() =>
  bookingStore.documents.filter((d) => d.status === 'sent').reduce((sum, d) => sum + d.amount, 0)
)
const totalOverdue = computed(() => {
  const today = new Date()
  return bookingStore.documents
    .filter((d) => d.status === 'sent' && new Date(d.dueDate) < today)
    .reduce((sum, d) => sum + d.amount, 0)
})
const invoicesThisMonth = computed(() => {
  const now = new Date()
  return bookingStore.documents.filter((d) => {
    const docDate = new Date(d.date)
    return docDate.getFullYear() === now.getFullYear() && docDate.getMonth() === now.getMonth()
  }).length
})

const unitFilter = ref('all')
const dateRangeFilter = ref('')
const dueUnitFilter = ref('all')
const billingUnitFilter = ref('all')
const billingDateFilter = ref('')
const repairUnitFilter = ref('all')

const showReceivable = ref(true)
const showPayable = ref(true)

const monthLabels = ['ม.ค.26', 'ก.พ.26', 'มี.ค.26', 'เม.ย.26', 'พ.ค.26', 'มิ.ย.26', 'ก.ค.26', 'ส.ค.25', 'ก.ย.25', 'ต.ค.25', 'พ.ย.25', 'ธ.ค.25']

const revenueSeries = ref([
  { key: 'income', label: 'รายรับ', color: '#2563eb', visible: true, data: [0.42, 0.5, 0.55, 0.6, 0.58, 0.66, 0.7, 0.68, 0.74, 0.8, 0.86, 0.92] },
  { key: 'expense', label: 'รายจ่าย', color: '#f97316', visible: true, data: [0.3, 0.34, 0.36, 0.38, 0.4, 0.42, 0.44, 0.43, 0.46, 0.5, 0.52, 0.55] },
  { key: 'profit', label: 'กำไร', color: '#16a34a', visible: true, data: [0.12, 0.16, 0.19, 0.22, 0.18, 0.24, 0.26, 0.25, 0.28, 0.3, 0.34, 0.37] },
])

const nextMonthLabels = ['เดือนนี้', 'เดือนหน้า', 'ส.ค.26', 'ก.ย.26', 'ต.ค.26', 'พ.ย.26']

const arApSeries = computed(() => [
  { key: 'ar', color: '#2563eb', visible: showReceivable.value, data: [0.4, 0.5, 0.45, 0.6, 0.55, 0.65] },
  { key: 'ap', color: '#f97316', visible: showPayable.value, data: [0.3, 0.35, 0.32, 0.4, 0.38, 0.44] },
])

const overdueReceivable = 186500
const overduePayable = 92300
const pendingReceivable = 452800
const pendingPayable = 214600

const dueInvoices = [
  { id: 1, customer: 'บจก. ศรีไทยคอนกรีต', dueDate: '10/07/2569', amount: 128500 },
  { id: 2, customer: 'บริษัท ABC จำกัด', dueDate: '12/07/2569', amount: 96200 },
  { id: 3, customer: 'บมจ. พฤกษา', dueDate: '15/07/2569', amount: 74300 },
]

const billingRequests = [
  { id: 1, docNo: 'CM2569-0001', customer: 'ABC', amount: 45000 },
  { id: 2, docNo: 'CR2569-0002', customer: 'บจก. ศรีไทยคอนกรีต', amount: 38200 },
]

const repairVehicles: { plate: string; status: string; days: number }[] = [
  { plate: '82-4417 กรุงเทพ', status: 'เปลี่ยนยาง', days: 2 },
]

const pageSize = 2
const duePage = ref(1)
const billingPage = ref(1)

const pagedDueInvoices = computed(() => {
  const start = (duePage.value - 1) * pageSize
  return dueInvoices.slice(start, start + pageSize)
})

const pagedBillingRequests = computed(() => {
  const start = (billingPage.value - 1) * pageSize
  return billingRequests.slice(start, start + pageSize)
})

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.input-field {
  @apply h-9 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}
</style>
