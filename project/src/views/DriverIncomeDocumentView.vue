<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.push(`/settings/drivers/${props.id}`)" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <button v-if="driver" @click="printDoc" class="btn-primary">
        <span class="material-symbols-rounded text-base">print</span>
        พิมพ์เอกสาร
      </button>
    </div>

    <div v-if="!driver" class="card-lg text-center text-muted py-12">ไม่พบข้อมูลคนขับ</div>

    <div v-else id="print-area">
      <div class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-8 max-w-3xl mx-auto relative">
        <!-- หัวเอกสาร -->
        <div class="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
          <div class="flex items-start gap-3">
            <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-12 h-12 object-contain flex-shrink-0" />
            <div>
              <div class="text-base font-bold">{{ documentSettingsStore.settings.company.name }}</div>
              <div class="text-sm font-semibold text-primary">เอกสารรายได้พนักงานขับรถ</div>
              <div v-if="documentSettingsStore.settings.company.phone" class="text-xs text-gray-600">โทร. {{ documentSettingsStore.settings.company.phone }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm">
              ประจำเดือน <span class="font-bold">{{ periodThaiLabel }}</span>
            </div>
          </div>
        </div>

        <!-- ข้อมูลคนขับ -->
        <div class="flex items-start justify-between mb-4 text-xs">
          <div>
            <div class="font-bold text-sm bg-yellow-100 inline-block px-1">{{ driverName }}</div>
            <div v-if="driver.phone" class="text-gray-700 mt-0.5">โทร. {{ driver.phone }}</div>
          </div>
          <div class="text-right space-y-0.5">
            <div>รหัสพนักงาน/รหัสคนขับ : <span class="font-semibold">{{ driver.code || '-' }}</span></div>
            <div>ช่วงวันที่ : <span class="font-semibold">{{ periodThaiLabel }}</span></div>
            <div>เลขที่เอกสาร : <span class="font-semibold">-</span></div>
            <div>วันที่ออกเอกสาร : <span class="font-semibold">{{ formatDate(new Date()) }}</span></div>
          </div>
        </div>

        <!-- ตารางเที่ยวงาน (Trace กลับ Booking) -->
        <table class="w-full text-xs border border-gray-400 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-400 px-2 py-1 text-left w-8">#</th>
              <th class="border border-gray-400 px-2 py-1 text-left w-24">เลขที่งาน</th>
              <th class="border border-gray-400 px-2 py-1 text-left w-20">วันที่</th>
              <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียดงาน</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-24">รายได้ (เบี้ยเลี้ยง)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="row.booking.id">
              <td class="border border-gray-400 px-2 py-1">{{ idx + 1 }}</td>
              <td class="border border-gray-400 px-2 py-1 font-mono">{{ row.booking.docNo }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ formatDate(row.booking.shipDate || row.booking.completedAt) }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ destinationLabel(row.booking) }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.income) }}</td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="5" class="border border-gray-400 px-2 py-4 text-center text-gray-400">ไม่มีเที่ยวงานในรอบนี้</td>
            </tr>
          </tbody>
        </table>

        <!-- ตารางเงินได้ / รายการหัก สองคอลัมน์ -->
        <div class="grid grid-cols-2 gap-4 text-xs border-t border-b border-gray-400 py-3">
          <div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold text-primary border-b border-gray-300 pb-1 mb-1">
              <span>รายได้</span>
              <span>จำนวนเงิน</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>รายได้จากเที่ยว (เบี้ยเลี้ยง)</span>
              <span class="text-right tabular-nums">{{ formatBaht(totalIncome) }}</span>
            </div>
            <div v-for="a in additions" :key="a.id" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>{{ a.type }}{{ a.label ? ` (${a.label})` : '' }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(a.amount) }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมรายได้</span>
              <span class="text-right tabular-nums">{{ formatBaht(totalIncome + additionTotal) }}</span>
            </div>
          </div>
          <div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold text-primary border-b border-gray-300 pb-1 mb-1">
              <span>รายการหัก</span>
              <span>จำนวนเงิน</span>
            </div>
            <div v-if="deductions.length === 0" class="text-gray-400 py-0.5">ไม่มีรายการหัก</div>
            <div v-for="d in deductions" :key="d.id" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>{{ d.type }}{{ d.label ? ` (${d.label})` : '' }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(d.amount) }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมรายการหัก</span>
              <span class="text-right tabular-nums">{{ formatBaht(deductionTotal) }}</span>
            </div>
          </div>
        </div>

        <!-- ยอดสุทธิ -->
        <div class="flex justify-between items-center mt-3 mb-6">
          <div class="text-xs">
            <div class="text-gray-600">จำนวนเงินเป็นตัวอักษร</div>
            <div class="font-semibold">({{ bahtText(netIncome) }})</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold">รายได้สุทธิ</span>
            <span class="text-xl font-bold bg-yellow-100 px-3 py-1 rounded">{{ formatBaht(netIncome) }}</span>
          </div>
        </div>
        <div class="flex justify-end -mt-4 mb-6">
          <span class="text-xs" :class="paymentStatus === 'PAID' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'">
            สถานะจ่ายเงิน: {{ paymentStatus === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย' }}
          </span>
        </div>

        <!-- ลายเซ็น -->
        <div class="grid grid-cols-2 gap-8 text-sm mt-12">
          <div>
            <div class="font-semibold mb-8">ในนาม {{ driverName }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้รับเงิน</div>
              <div class="border-t border-gray-500 pt-2">วันที่</div>
            </div>
          </div>
          <div class="relative">
            <img
              v-if="documentSettingsStore.settings.company.stamp"
              :src="documentSettingsStore.settings.company.stamp"
              class="w-14 h-14 object-contain absolute right-6 -top-12 opacity-90"
            />
            <div class="font-semibold mb-8">ในนาม {{ documentSettingsStore.settings.company.name }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้มีอำนาจอนุมัติ</div>
              <div class="border-t border-gray-500 pt-2">วันที่</div>
            </div>
          </div>
        </div>

        <!-- Footer ข้อมูลการพิมพ์ -->
        <div class="flex justify-between text-[10px] text-gray-500 mt-8 pt-2 border-t border-gray-300">
          <span>ข้อมูลคำนวณสดจากงานขนส่งที่ส่งสำเร็จ ณ เวลาที่พิมพ์</span>
          <span>พิมพ์เมื่อ: {{ formatDateTime(new Date()) }} โดย {{ authStore.userName || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDriversStore } from '@/stores/drivers'
import { useBookingStore } from '@/stores/booking'
import { usePayrollDeductionsStore } from '@/stores/payrollDeductions'
import { useDriverPaymentsStore } from '@/stores/driverPayments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useAuthStore } from '@/stores/auth'
import { bahtText } from '@/utils/companyInfo'

/**
 * เอกสารรายได้พนักงานขับรถ — ไม่มี Firestore record ของตัวเอง (ต่างจากใบจ่ายเงินเดือนเสมียนที่มี StaffSalaryRecord)
 * คำนวณสดจาก Booking + PayrollDeduction + DriverPaymentStatus ทุกครั้งที่เปิดหน้านี้ ใช้ logic เดียวกับ
 * DriverDetailView.vue เป๊ะ (ไม่สร้าง Calculation Engine ใหม่) เพื่อให้ตัวเลขตรงกับหน้ารายละเอียดคนขับเสมอ แม้ reload
 * ก็คำนวณใหม่จากข้อมูลต้นทางเดิม ไม่มีการ freeze ค่าไว้ ณ ตอนสร้าง — "สร้างเอกสาร" ในที่นี้คือนำทางมาหน้านี้เพื่อพิมพ์
 */
const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const driversStore = useDriversStore()
const bookingStore = useBookingStore()
const deductionsStore = usePayrollDeductionsStore()
const paymentsStore = useDriverPaymentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const authStore = useAuthStore()

const driver = computed(() => driversStore.drivers.find((d) => d.id === props.id) || null)
const driverName = computed(() => (driver.value ? driversStore.fullName(driver.value) : '-'))

/** รอบเดือนมาจาก query ?period=YYYY-MM (ค.ศ.) ถ้าไม่ระบุ fallback เป็นเดือนปัจจุบัน — ตรงกับ input type=month ของ DriverDetailView.vue */
function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function toBEPeriodLabel(monthValue: string): string {
  const [y, m] = monthValue.split('-')
  return `${Number(y) + 543}-${m}`
}
function inPeriod(date: Date | undefined, monthValue: string): boolean {
  if (!date) return false
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthValue
}

const period = computed(() => (typeof route.query.period === 'string' ? route.query.period : currentMonthValue()))
const periodLabel = computed(() => toBEPeriodLabel(period.value))

const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const periodThaiLabel = computed(() => {
  const [y, m] = period.value.split('-')
  const monthIndex = Number(m) - 1
  return `${thaiMonths[monthIndex] || m} ${Number(y) + 543}`
})

/** จับคู่งานกับคนขับคนนี้เหมือน DriverDetailView.vue เป๊ะ: ใช้ driverId ก่อนถ้ามี ไม่มีค่อย fallback ไปเทียบ driverName */
const rows = computed(() => {
  if (!driver.value) return []
  const fullName = driverName.value
  return bookingStore.bookings
    .filter((b) => b.status === 'DELIVERED')
    .filter((b) => (driver.value!.id ? b.driverId === driver.value!.id || (!b.driverId && b.driverName === fullName) : b.driverName === fullName))
    .filter((b) => inPeriod(b.shipDate || b.completedAt, period.value))
    .map((b) => ({ booking: b, income: b.finalAllowance ?? b.allowance ?? 0 }))
    .sort((a, b) => new Date(a.booking.shipDate || a.booking.completedAt || 0).getTime() - new Date(b.booking.shipDate || b.booking.completedAt || 0).getTime())
})

const totalIncome = computed(() => rows.value.reduce((sum, r) => sum + r.income, 0))
const additions = computed(() => (driver.value ? deductionsStore.additionsFor(driverName.value, periodLabel.value) : []))
const deductions = computed(() => (driver.value ? deductionsStore.deductionsFor(driverName.value, periodLabel.value) : []))
const additionTotal = computed(() => additions.value.reduce((sum, a) => sum + a.amount, 0))
const deductionTotal = computed(() => deductions.value.reduce((sum, d) => sum + d.amount, 0))
const netIncome = computed(() => totalIncome.value + additionTotal.value - deductionTotal.value)
const paymentStatus = computed(() => (driver.value ? paymentsStore.statusFor(driverName.value, periodLabel.value) : 'UNPAID'))

const destinationLabel = (booking: { items: { siteName: string }[] }) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName || '-'
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')
const formatDateTime = (date: Date) => new Date(date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

const printDoc = () => window.print()
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

@media print {
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
}
</style>
