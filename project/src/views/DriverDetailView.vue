<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3 flex-wrap">
      <button @click="router.push('/settings/drivers')" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <h2 class="text-lg font-bold text-text flex-1">{{ driver ? driversStore.fullName(driver) : 'รายละเอียดพนักงานขับรถ' }}</h2>
      <input v-model="period" type="month" class="input-field" />
    </div>

    <div v-if="!driver" class="card-lg text-center text-muted py-10">ไม่พบข้อมูลคนขับ</div>

    <template v-else>
      <div class="card-lg grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-xs text-muted">รหัสพนักงาน</div>
          <div class="font-semibold text-text">{{ driver.code }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">เบอร์โทร</div>
          <div class="font-semibold text-text">{{ driver.phone || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">รถที่ผูกอยู่ปัจจุบัน</div>
          <div class="font-semibold text-text">{{ assignedVehicleLabel }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">สถานะ</div>
          <span :class="['text-xs font-semibold px-2 py-1 rounded-full', driver.employmentStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
            {{ driver.employmentStatus === 'active' ? 'ทำงานปกติ' : 'ลาออกแล้ว' }}
          </span>
        </div>
      </div>

      <div class="card-lg grid grid-cols-2 sm:grid-cols-6 gap-4 text-sm">
        <div>
          <div class="text-xs text-muted">จำนวนเที่ยว (รอบนี้)</div>
          <div class="font-semibold text-text">{{ rows.length }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">ค่าเที่ยวรวม</div>
          <div class="font-semibold text-text">{{ formatBaht(totalTripFee) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">รายได้รวม (เบี้ยเลี้ยง)</div>
          <div class="font-semibold text-text">{{ formatBaht(totalIncome) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">รายได้อื่นๆ</div>
          <div class="font-semibold text-green-600">+{{ formatBaht(additionTotal) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">รายการหักรวม</div>
          <div class="font-semibold text-red-500">-{{ formatBaht(deductionTotal) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted mb-1">สถานะการจ่ายเงิน (รอบนี้)</div>
          <select
            :value="paymentStatus"
            @change="setPaymentStatus(($event.target as HTMLSelectElement).value as 'UNPAID' | 'PAID')"
            :class="['status-select', paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']"
          >
            <option value="UNPAID">ยังไม่จ่าย</option>
            <option value="PAID">จ่ายแล้ว</option>
          </select>
        </div>
      </div>

      <div class="card-lg flex items-center justify-between text-sm">
        <span class="font-semibold text-text">รายได้สุทธิ (เบี้ยเลี้ยง + รายได้อื่นๆ − รายการหัก)</span>
        <span class="text-lg font-bold text-primary">{{ formatBaht(totalIncome + additionTotal - deductionTotal) }}</span>
      </div>

      <div class="card-lg overflow-x-auto">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 class="font-semibold text-text">ประวัติงาน — รอบ {{ periodLabel }}</h3>
          <div v-if="selectedIds.size > 0" class="flex items-center gap-3 text-sm">
            <span class="text-muted">เลือกแล้ว {{ selectedIds.size }} งาน • รวม <span class="font-bold text-primary">{{ formatBaht(selectedIncomeTotal) }}</span></span>
            <button @click="createDocument" class="btn-primary">
              <span class="material-symbols-rounded text-base">receipt_long</span>
              สร้างเอกสาร
            </button>
          </div>
        </div>
        <table class="min-w-[960px] w-full text-sm border-separate border-spacing-0">
          <thead class="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-2 w-8">
                <input type="checkbox" :checked="allSelectableChecked" :disabled="selectableRows.length === 0" @change="toggleSelectAll" class="w-4 h-4" />
              </th>
              <th class="px-3 py-2 font-semibold">เลขที่งาน</th>
              <th class="px-3 py-2 font-semibold">วันที่</th>
              <th class="px-3 py-2 font-semibold">รถ</th>
              <th class="px-3 py-2 font-semibold">รายละเอียดงาน</th>
              <th class="px-3 py-2 font-semibold text-right">ค่าเที่ยว</th>
              <th class="px-3 py-2 font-semibold text-right">รายได้</th>
              <th class="px-3 py-2 font-semibold">สถานะงาน</th>
              <th class="px-3 py-2 font-semibold">สถานะเอกสาร</th>
              <th class="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.booking.id" class="border-t border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2">
                <input
                  v-if="!row.booking.driverPayrollDocId"
                  type="checkbox"
                  :checked="selectedIds.has(row.booking.id)"
                  @change="toggleSelect(row.booking.id)"
                  class="w-4 h-4"
                />
              </td>
              <td class="px-3 py-2 font-mono text-text">{{ row.booking.docNo }}</td>
              <td class="px-3 py-2 text-muted">{{ formatDate(row.booking.shipDate || row.booking.completedAt) }}</td>
              <td class="px-3 py-2 text-muted">{{ row.booking.plate || '-' }}</td>
              <td class="px-3 py-2 text-text">{{ destinationLabel(row.booking) }}</td>
              <td class="px-3 py-2 text-right text-text">{{ formatBaht(row.booking.tripFee) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(row.income) }}</td>
              <td class="px-3 py-2">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[row.booking.status]]">{{ bookingStatusLabel[row.booking.status] }}</span>
              </td>
              <td class="px-3 py-2">
                <span v-if="row.booking.driverPayrollDocId" class="text-xs font-semibold px-2 py-1 rounded-full bg-teal-100 text-teal-700">ออกเอกสารแล้ว</span>
                <span v-else class="text-xs text-muted">-</span>
              </td>
              <td class="px-3 py-2 text-right">
                <RouterLink :to="`/job/${row.booking.id}`" class="text-primary hover:underline text-xs">ดูงาน</RouterLink>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="10" class="px-3 py-8 text-center text-muted">ยังไม่มีงานในรอบนี้</td>
            </tr>
          </tbody>
        </table>
        <div class="text-[11px] text-muted mt-2">
          หมายเหตุ: สถานะการจ่ายเงิน (ด้านบน) เป็นสถานะระดับ "รอบเดือน" ต่อคนขับ ไม่ใช่ระดับงานแต่ละเที่ยว จึงไม่มีผลต่อสถานะงาน (สถานะงาน) หรือสถานะเอกสาร (คอลัมน์ขวา) ของแต่ละแถวด้านบนเลย — สถานะเอกสารมาจากการเลือกงานสร้างเอกสารรายได้จริงต่างหาก
        </div>
      </div>

      <div class="card-lg overflow-x-auto">
        <h3 class="font-semibold text-text mb-3">เอกสารที่ออกแล้ว</h3>
        <table class="min-w-[700px] w-full text-sm border-separate border-spacing-0">
          <thead class="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-2 font-semibold">เลขที่เอกสาร</th>
              <th class="px-3 py-2 font-semibold">รอบ</th>
              <th class="px-3 py-2 font-semibold text-right">จำนวนงาน</th>
              <th class="px-3 py-2 font-semibold text-right">รายได้สุทธิ</th>
              <th class="px-3 py-2 font-semibold">สถานะจ่าย</th>
              <th class="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in issuedDocuments" :key="doc.id" class="border-t border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2 font-mono text-primary font-semibold">{{ doc.number }}</td>
              <td class="px-3 py-2 text-muted">{{ doc.period }}</td>
              <td class="px-3 py-2 text-right text-text">{{ doc.bookingIds.length }}</td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(doc.netIncome) }}</td>
              <td class="px-3 py-2">
                <button
                  v-if="doc.paymentStatus === 'UNPAID'"
                  @click="markDocPaid(doc.id)"
                  class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 cursor-pointer hover:opacity-80"
                >
                  รอจ่าย · บันทึกจ่ายแล้ว
                </button>
                <span v-else class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">จ่ายแล้ว</span>
              </td>
              <td class="px-3 py-2 text-right">
                <RouterLink :to="`/payroll/drivers/documents/${doc.id}`" class="text-primary hover:underline text-xs">ดู/พิมพ์</RouterLink>
              </td>
            </tr>
            <tr v-if="issuedDocuments.length === 0">
              <td colspan="6" class="px-3 py-8 text-center text-muted">ยังไม่เคยออกเอกสารรายได้ให้คนขับคนนี้</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PayrollDeductionPanel :driver-name="driversStore.fullName(driver)" :period-label="periodLabel" kind="ADDITION" />
      <PayrollDeductionPanel :driver-name="driversStore.fullName(driver)" :period-label="periodLabel" kind="DEDUCTION" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useBookingStore } from '@/stores/booking'
import { usePayrollDeductionsStore } from '@/stores/payrollDeductions'
import { useDriverPaymentsStore } from '@/stores/driverPayments'
import { useDriverPayrollDocumentsStore } from '@/stores/driverPayrollDocuments'
import PayrollDeductionPanel from '@/components/payroll/PayrollDeductionPanel.vue'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import type { DriverPaymentStatusValue } from '@/types'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()
const bookingStore = useBookingStore()
const deductionsStore = usePayrollDeductionsStore()
const paymentsStore = useDriverPaymentsStore()
const driverPayrollDocumentsStore = useDriverPayrollDocumentsStore()

const driver = computed(() => driversStore.drivers.find((d) => d.id === props.id) || null)
const assignedVehicleLabel = computed(() => {
  if (!driver.value) return '-'
  const vehicle = vehiclesStore.vehicleForDriver(driver.value.code)
  return vehicle ? vehiclesStore.fullPlate(vehicle) : '-'
})

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

/** รอบเดือนเริ่มต้นมาจาก query ?period=YYYY-MM ถ้ามี (เช่น เข้ามาจากหน้า /payroll/drivers ที่เลือกรอบไว้แล้ว) ไม่งั้น fallback เป็นเดือนปัจจุบัน */
const period = ref(typeof route.query.period === 'string' ? route.query.period : currentMonthValue())
const periodLabel = computed(() => toBEPeriodLabel(period.value))

/**
 * จับคู่งานกับคนขับคนนี้: ใช้ driverId ก่อนถ้ามี (แม่นยำกว่า ไม่พลาดเรื่องรูปแบบชื่อ) ถ้าไม่มีค่อย fallback ไปเทียบ
 * driverName แบบเดิม (งานเก่าก่อนมี driverId) — Booking เป็น Source of Truth ของรายได้คนขับอยู่แล้ว ไม่สร้างข้อมูลรายได้ใหม่
 */
const rows = computed(() => {
  if (!driver.value) return []
  const fullName = driversStore.fullName(driver.value)
  return bookingStore.bookings
    .filter((b) => b.status === 'DELIVERED')
    .filter((b) => (driver.value!.id ? b.driverId === driver.value!.id || (!b.driverId && b.driverName === fullName) : b.driverName === fullName))
    .filter((b) => inPeriod(b.shipDate || b.completedAt, period.value))
    .map((b) => ({ booking: b, income: b.finalAllowance ?? b.allowance ?? 0 }))
    .sort((a, b) => new Date(b.booking.shipDate || b.booking.completedAt || 0).getTime() - new Date(a.booking.shipDate || a.booking.completedAt || 0).getTime())
})

const totalTripFee = computed(() => rows.value.reduce((sum, r) => sum + (r.booking.tripFee || 0), 0))
const totalIncome = computed(() => rows.value.reduce((sum, r) => sum + r.income, 0))
const deductionTotal = computed(() => {
  if (!driver.value) return 0
  return deductionsStore.deductionsFor(driversStore.fullName(driver.value), periodLabel.value).reduce((sum, d) => sum + d.amount, 0)
})
const additionTotal = computed(() => {
  if (!driver.value) return 0
  return deductionsStore.additionsFor(driversStore.fullName(driver.value), periodLabel.value).reduce((sum, d) => sum + d.amount, 0)
})

/** สถานะจ่ายรายได้คนขับของรอบนี้ — คนละเรื่องกับสถานะงาน (bookingStatusLabel ด้านบนในตาราง) โดยเจตนา ไม่แตะกันเลย */
const paymentStatus = computed(() => (driver.value ? paymentsStore.statusFor(driversStore.fullName(driver.value), periodLabel.value) : 'UNPAID'))
const setPaymentStatus = (status: DriverPaymentStatusValue) => {
  if (!driver.value) return
  paymentsStore.setStatus(driversStore.fullName(driver.value), periodLabel.value, status)
}

const destinationLabel = (booking: { items: { siteName: string }[] }) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName || '-'
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

/** เลือกงานเพื่อสร้างเอกสารรายได้ — งานที่ออกเอกสารไปแล้ว (driverPayrollDocId) เลือกซ้ำไม่ได้ ไม่มี checkbox ให้เลย */
const selectedIds = ref<Set<string>>(new Set())
const selectableRows = computed(() => rows.value.filter((r) => !r.booking.driverPayrollDocId))
const allSelectableChecked = computed(() => selectableRows.value.length > 0 && selectableRows.value.every((r) => selectedIds.value.has(r.booking.id)))
const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}
const toggleSelectAll = () => {
  selectedIds.value = allSelectableChecked.value ? new Set() : new Set(selectableRows.value.map((r) => r.booking.id))
}
const selectedIncomeTotal = computed(() => rows.value.filter((r) => selectedIds.value.has(r.booking.id)).reduce((sum, r) => sum + r.income, 0))

const createDocument = () => {
  if (!driver.value || selectedIds.value.size === 0) return
  const doc = driverPayrollDocumentsStore.createDriverPayrollDocument(driver.value.id, [...selectedIds.value], period.value)
  if (!doc) {
    alert('สร้างเอกสารไม่สำเร็จ — งานที่เลือกอาจถูกออกเอกสารไปแล้ว กรุณารีเฟรชหน้านี้แล้วลองใหม่')
    return
  }
  selectedIds.value = new Set()
  router.push(`/payroll/drivers/documents/${doc.id}`)
}

const issuedDocuments = computed(() => (driver.value ? driverPayrollDocumentsStore.documentsForDriver(driver.value.id) : []))
const markDocPaid = (docId: string) => {
  if (!confirm('ยืนยันบันทึกว่าจ่ายเงินเอกสารนี้แล้ว?')) return
  driverPayrollDocumentsStore.recordPayment(docId)
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-primary {
  @apply h-9 px-3 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.status-select {
  @apply h-9 px-2 rounded-full border-0 text-xs font-semibold cursor-pointer focus:outline-none;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
