<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">รถร่วม / รถหุ้นส่วน</h2>
      <div class="text-xs text-muted">
        ข้อมูลของ "รถ" เท่านั้น (รายได้/ค่าน้ำมัน Sync จาก Booking, ค่าใช้จ่ายประจำรถกรอกเอง) — รายได้คนขับดูที่หน้า
        <RouterLink to="/payroll/drivers" class="text-primary hover:underline">พนักงานขับรถ</RouterLink> แทน
      </div>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-2">
        <button v-for="opt in categoryOptions" :key="opt.value" @click="category = opt.value" :class="['tab-btn', category === opt.value && 'tab-btn-active']">
          {{ opt.label }}
        </button>
      </div>
      <input v-model="period" type="month" class="input-field" />
      <button @click="exportSummary" class="btn-secondary ml-auto">
        <span class="material-symbols-rounded text-base">download</span>
        นำออกเป็น Excel
      </button>
    </div>

    <div class="card-lg grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
      <div>
        <div class="text-xs text-muted">จำนวนรถ</div>
        <div class="font-semibold text-text">{{ vehicleRows.length }}</div>
      </div>
      <div>
        <div class="text-xs text-muted">รายได้รวม (รอบนี้)</div>
        <div class="font-semibold text-green-600">{{ formatBaht(grandTotals.income) }}</div>
      </div>
      <div>
        <div class="text-xs text-muted">ค่าใช้จ่ายรวม (น้ำมันรอบนี้ + ค่าใช้จ่ายประจำรถสะสม)</div>
        <div class="font-semibold text-red-500">-{{ formatBaht(grandTotals.expense) }}</div>
      </div>
      <div>
        <div class="text-xs text-muted">ยอดสุทธิรวม</div>
        <div class="font-bold text-primary">{{ formatBaht(grandTotals.net) }}</div>
      </div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[900px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ทะเบียนรถ</th>
            <th class="px-4 py-3 font-semibold">ประเภท</th>
            <th class="px-4 py-3 font-semibold text-right">จำนวนงาน</th>
            <th class="px-4 py-3 font-semibold text-right">รายได้จากงาน</th>
            <th class="px-4 py-3 font-semibold text-right">ค่าน้ำมันที่ใช้</th>
            <th class="px-4 py-3 font-semibold text-right">ค่าใช้จ่ายประจำรถ</th>
            <th class="px-4 py-3 font-semibold text-right">ยอดสุทธิ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in vehicleRows" :key="row.vehicle.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ vehiclesStore.fullPlate(row.vehicle) }}</td>
            <td class="px-4 py-3 text-muted">{{ row.vehicle.department }}</td>
            <td class="px-4 py-3 text-right text-text">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right text-green-600">{{ formatBaht(row.income) }}</td>
            <td class="px-4 py-3 text-right text-red-500">-{{ formatBaht(row.fuelCost) }}</td>
            <td class="px-4 py-3 text-right text-red-500">-{{ formatBaht(row.vehicleExpense) }}</td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(row.net) }}</td>
            <td class="px-4 py-3 text-right">
              <RouterLink :to="`/payroll/vendor-fleet/${row.vehicle.id}`" class="btn-sm">รายละเอียด</RouterLink>
            </td>
          </tr>
          <tr v-if="vehicleRows.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-muted">ยังไม่มีรถร่วมในหมวดที่เลือก</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVehiclesStore } from '@/stores/vehicles'
import { useBookingStore } from '@/stores/booking'
import { useVehicleExpensesStore } from '@/stores/vehicleExpenses'
import { exportRowsToExcel } from '@/utils/exportExcel'
import type { Booking, Vehicle, VehicleType } from '@/types'

/**
 * ข้อมูลของ "รถร่วม/รถหุ้นส่วน" เท่านั้น (Vehicle Income/Fuel Cost/Vehicle Expense/Net) — ไม่แสดงเบี้ยเลี้ยง/รายได้คนขับ
 * ที่นี่อีกต่อไป (ย้ายไปเป็นความรับผิดชอบของหน้า "พนักงานขับรถ" ทั้งหมด ดู IncomeView.vue) เพื่อไม่ให้ Driver Income
 * ปนกับ Vehicle Income ตาม Data Ownership ที่ต้องแยกกัน — รายได้/ค่าน้ำมัน Trace ตรงจาก Booking.plate เหมือนกับที่
 * VendorFleetVehicleDetailView.vue ใช้ (ไม่สร้าง Calculation Engine ใหม่ ใช้ Logic เดียวกันเป๊ะ)
 */
const categoryOptions: { value: VehicleType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'รถร่วมใน', label: 'รถร่วมใน' },
  { value: 'รถร่วมนอก', label: 'รถร่วมนอก' },
  { value: 'รถหุ้นส่วน', label: 'รถหุ้นส่วน' },
]

const category = ref<VehicleType | 'ALL'>('ALL')

const departmentFilter = (department: VehicleType | undefined) => {
  if (!department || department === 'รถบริษัท') return false
  return category.value === 'ALL' || department === category.value
}

const vehiclesStore = useVehiclesStore()
const bookingStore = useBookingStore()
const vehicleExpensesStore = useVehicleExpensesStore()

const vendorFleetVehicles = computed(() => vehiclesStore.vehicles.filter((v) => departmentFilter(v.department)))

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function inPeriod(date: Date | undefined, monthValue: string): boolean {
  if (!date) return false
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthValue
}

const period = ref(currentMonthValue())

const fuelCost = (booking: Booking) => Math.round((booking.fuelLiters || 0) * (booking.fuelRate || 0))

/** งานของรถคันนี้ในรอบที่เลือก — Trace ตรงจาก Booking.plate เหมือน VendorFleetVehicleDetailView.vue (ไม่ใช้ currentDriver ของรถมาไล่ย้อนหลัง) */
const bookingsForVehicle = (vehicle: Vehicle) => {
  const full = vehiclesStore.fullPlate(vehicle)
  return bookingStore.bookings.filter(
    (b) => b.status === 'DELIVERED' && (b.plate === full || b.plate === vehicle.plate) && inPeriod(b.shipDate || b.completedAt, period.value)
  )
}

const vehicleRows = computed(() =>
  vendorFleetVehicles.value.map((vehicle) => {
    const bookings = bookingsForVehicle(vehicle)
    const trips = bookings.length
    const income = bookings.reduce((sum, b) => sum + (b.tripFee || 0), 0)
    const fuelTotal = bookings.reduce((sum, b) => sum + fuelCost(b), 0)
    /** ค่าใช้จ่ายประจำรถเป็นยอดสะสมทั้งหมด ไม่กรองตามรอบเดือน เหมือน VendorFleetVehicleDetailView.vue (ประกันต่อปี ฯลฯ กรองตามรอบจะทำให้ยอดหายไปผิดๆ) */
    const vehicleExpense = vehicleExpensesStore.expensesForVehicle(vehicle.id).reduce((sum, e) => sum + e.amount, 0)
    const net = income - fuelTotal - vehicleExpense
    return { vehicle, trips, income, fuelCost: fuelTotal, vehicleExpense, net }
  })
)

const grandTotals = computed(() =>
  vehicleRows.value.reduce(
    (acc, r) => ({ income: acc.income + r.income, expense: acc.expense + r.fuelCost + r.vehicleExpense, net: acc.net + r.net }),
    { income: 0, expense: 0, net: 0 }
  )
)

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const exportSummary = () => {
  exportRowsToExcel(
    `รถร่วม-สรุป-${period.value}`,
    vehicleRows.value.map((r) => ({
      ทะเบียนรถ: vehiclesStore.fullPlate(r.vehicle),
      ประเภท: r.vehicle.department,
      จำนวนงาน: r.trips,
      รายได้จากงาน: r.income,
      ค่าน้ำมันที่ใช้: r.fuelCost,
      ค่าใช้จ่ายประจำรถ: r.vehicleExpense,
      ยอดสุทธิ: r.net,
    }))
  )
}
</script>

<style scoped>
.input-field {
  @apply h-9 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-secondary {
  @apply h-9 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-3 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.tab-btn {
  @apply h-9 px-4 rounded-lg border border-border bg-surface text-text text-sm font-medium cursor-pointer hover:bg-surface-2;
}

.tab-btn-active {
  @apply bg-primary text-white border-primary;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
