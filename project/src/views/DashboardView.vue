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
import { ref, computed, watch } from 'vue'
import DashboardLineChart from '@/components/DashboardLineChart.vue'
import Pager from '@/components/Pager.vue'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useBookingStore } from '@/stores/booking'

const salesDocumentsStore = useSalesDocumentsStore()
const bookingStore = useBookingStore()

const taxInvoices = computed(() => salesDocumentsStore.documents.filter((d) => d.type === 'TAX_INVOICE'))
const receipts = computed(() => salesDocumentsStore.documents.filter((d) => d.type === 'RECEIPT'))
const billingNotes = computed(() => salesDocumentsStore.documents.filter((d) => d.type === 'BILLING'))

/** หา fleet ของเอกสารจาก booking แรกที่ผูกอยู่ — เอกสารที่กรอกเองไม่ผ่าน booking (ไม่มี bookingIds) จะผ่านทุกตัวกรอง fleet เสมอ */
const fleetOfDoc = (bookingIds: string[]) => {
  for (const id of bookingIds) {
    const b = bookingStore.bookings.find((bk) => bk.id === id)
    if (b) return b.category
  }
  return undefined
}
const matchesFleet = (bookingIds: string[], filter: string) => filter === 'all' || !fleetOfDoc(bookingIds) || fleetOfDoc(bookingIds) === filter

const totalPaidRevenue = computed(() => receipts.value.filter((d) => d.status === 'PAID').reduce((sum, d) => sum + d.amount, 0))
const totalPendingReceivable = computed(() => taxInvoices.value.filter((d) => d.status === 'SENT').reduce((sum, d) => sum + d.amount, 0))
const totalOverdue = computed(() => {
  const today = new Date()
  return taxInvoices.value
    .filter((d) => d.status === 'SENT' && d.dueDate && new Date(d.dueDate) < today)
    .reduce((sum, d) => sum + d.amount, 0)
})
const invoicesThisMonth = computed(() => {
  const now = new Date()
  return taxInvoices.value.filter((d) => {
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

const thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const buddhistYY = (year: number) => String((year + 543) % 100).padStart(2, '0')

const monthLabels = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return `${thaiMonthShort[d.getMonth()]}${buddhistYY(d.getFullYear())}`
  })
})

/** รายรับรายเดือน 12 เดือนล่าสุด = ยอดใบเสร็จที่ชำระแล้วจริง ตามวันที่ชำระจริง (paidDate)
 *  รายจ่าย/กำไร ยังไม่มีข้อมูลจริงในระบบ (ไม่มีฟีเจอร์บันทึกค่าใช้จ่าย) จึงเป็น 0 จนกว่าจะมีฟีเจอร์นั้น */
const monthlyRevenue = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return receipts.value
      .filter((doc) => doc.status === 'PAID' && doc.paidDate)
      .filter((doc) => {
        const paid = new Date(doc.paidDate!)
        return paid.getFullYear() === d.getFullYear() && paid.getMonth() === d.getMonth()
      })
      .reduce((sum, doc) => sum + doc.amount, 0)
  })
})

const revenueSeries = ref([
  { key: 'income', label: 'รายรับ', color: '#2563eb', visible: true, data: [] as number[] },
  { key: 'expense', label: 'รายจ่าย', color: '#f97316', visible: true, data: [] as number[] },
  { key: 'profit', label: 'กำไร', color: '#16a34a', visible: true, data: [] as number[] },
])
watch(
  monthlyRevenue,
  (val) => {
    revenueSeries.value[0].data = val
    revenueSeries.value[1].data = val.map(() => 0)
    revenueSeries.value[2].data = val
  },
  { immediate: true }
)

const nextMonthLabels = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    if (i === 0) return 'เดือนนี้'
    if (i === 1) return 'เดือนหน้า'
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return `${thaiMonthShort[d.getMonth()]}${buddhistYY(d.getFullYear())}`
  })
})

/** ยอดลูกหนี้ (ใบแจ้งหนี้ที่ส่งแล้วแต่ยังไม่ชำระ) แยกตามเดือนครบกำหนด 6 เดือนข้างหน้า — ฝั่งเจ้าหนี้ยังไม่มีข้อมูลจริง (ไม่มีระบบติดตามใบสั่งซื้อ/ค่าใช้จ่าย) จึงเป็น 0 */
const monthlyReceivable = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return taxInvoices.value
      .filter((doc) => doc.status === 'SENT' && doc.dueDate)
      .filter((doc) => {
        const due = new Date(doc.dueDate!)
        return due.getFullYear() === d.getFullYear() && due.getMonth() === d.getMonth()
      })
      .reduce((sum, doc) => sum + doc.amount, 0)
  })
})

const arApSeries = computed(() => [
  { key: 'ar', color: '#2563eb', visible: showReceivable.value, data: monthlyReceivable.value },
  { key: 'ap', color: '#f97316', visible: showPayable.value, data: monthlyReceivable.value.map(() => 0) },
])

const overdueReceivable = computed(() => totalOverdue.value)
const overduePayable = 0
const pendingReceivable = computed(() => totalPendingReceivable.value)
const pendingPayable = 0

const formatDateThai = (date: Date) => {
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`
}

/** ถึงกำหนดชำระ: ใบแจ้งหนี้ที่ส่งแล้วยังไม่ชำระ ไม่รวมที่ครบกำหนดภายใน 3 วันข้างหน้า (งานเร่งด่วนดูที่อื่น) เรียงใกล้ครบกำหนดสุดก่อน */
const dueInvoices = computed(() => {
  const now = new Date()
  const soonThreshold = new Date(now)
  soonThreshold.setDate(soonThreshold.getDate() + 3)
  return taxInvoices.value
    .filter((d) => d.status === 'SENT' && d.dueDate && matchesFleet(d.bookingIds, dueUnitFilter.value))
    .filter((d) => new Date(d.dueDate!) < now || new Date(d.dueDate!) > soonThreshold)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .map((d) => ({ id: d.id, customer: d.customer, dueDate: formatDateThai(d.dueDate!), amount: d.amount }))
})

/** ขอวางบิล: ใบวางบิลที่รอออกใบแจ้งหนี้ (ยังไม่ถูกแปลง) */
const billingRequests = computed(() => {
  const now = new Date()
  let from: Date | null = null
  if (billingDateFilter.value === 'week') {
    from = new Date(now)
    from.setDate(from.getDate() - 7)
  } else if (billingDateFilter.value === 'month') {
    from = new Date(now)
    from.setMonth(from.getMonth() - 1)
  }
  return billingNotes.value
    .filter((d) => d.status === 'BILLING_PENDING' && matchesFleet(d.bookingIds, billingUnitFilter.value))
    .filter((d) => !from || new Date(d.date) >= from)
    .map((d) => ({ id: d.id, docNo: d.number, customer: d.customer, amount: d.amount }))
})

/** ระบบยังไม่มีฟีเจอร์ติดตามสถานะซ่อมรถ (Vehicle ไม่มีฟิลด์นี้) จึงว่างเสมอจนกว่าจะมีฟีเจอร์นั้นจริง แทนที่จะโชว์ข้อมูลตัวอย่าง */
const repairVehicles: { plate: string; status: string; days: number }[] = []

const pageSize = 2
const duePage = ref(1)
const billingPage = ref(1)

const pagedDueInvoices = computed(() => {
  const start = (duePage.value - 1) * pageSize
  return dueInvoices.value.slice(start, start + pageSize)
})

const pagedBillingRequests = computed(() => {
  const start = (billingPage.value - 1) * pageSize
  return billingRequests.value.slice(start, start + pageSize)
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
