<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">{{ isCompanyFleet ? 'รถบริษัท' : 'รถร่วม / รถหุ้นส่วน' }}</h2>
      <div v-if="isCompanyFleet" class="text-xs text-muted">
        ข้อมูลของรถบริษัท (รายได้/ค่าแรงคนขับ Sync จาก Booking, ค่าน้ำมัน/ค่าใช้จ่ายประจำรถระบบคำนวณให้ แก้ได้ต่องานที่หน้ารายละเอียดรถ) — ค่าแรงคนขับ = เบี้ยเลี้ยงหลังเพิ่ม/ลดหนี้ของงานที่จบแล้ว
      </div>
      <div v-else class="text-xs text-muted">
        ข้อมูลของ "รถ" เท่านั้น (รายได้ Sync จาก Booking, ค่าน้ำมัน/ค่าใช้จ่ายประจำรถระบบคำนวณให้ แก้ได้ต่องานที่หน้ารายละเอียดรถ) — รายได้คนขับดูที่หน้า
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
      <select v-model="docStatusFilter" class="input-field" title="สถานะเอกสารรายได้ของงานในรอบนี้">
        <option value="ALL">สถานะเอกสาร: ทั้งหมด</option>
        <option value="NOT_ISSUED">ยังไม่ได้ออก</option>
        <option value="ISSUED">ออกเอกสารแล้ว</option>
      </select>
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
        <div class="text-xs text-muted">ค่าใช้จ่ายรวม (น้ำมันรอบนี้{{ isCompanyFleet ? ' + ค่าแรงคนขับรอบนี้' : '' }} + ค่าใช้จ่ายประจำรถรอบนี้)</div>
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
            <th v-if="!isCompanyFleet" class="px-4 py-3 font-semibold text-right">ค่าเบี้ยเลี้ยง</th>
            <th class="px-4 py-3 font-semibold text-right">ค่าน้ำมันที่ใช้</th>
            <th v-if="isCompanyFleet" class="px-4 py-3 font-semibold text-right">ค่าแรงคนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">ค่าใช้จ่ายประจำรถ</th>
            <th class="px-4 py-3 font-semibold text-right">ยอดสุทธิ</th>
            <th class="px-4 py-3 font-semibold">สถานะเอกสาร</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in displayedRows" :key="row.vehicle.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ vehiclesStore.fullPlate(row.vehicle) }}</td>
            <td class="px-4 py-3 text-muted">{{ row.vehicle.department }}</td>
            <td class="px-4 py-3 text-right text-text">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right text-green-600">{{ formatBaht(row.income) }}</td>
            <td v-if="!isCompanyFleet" class="px-4 py-3 text-right text-red-500">
              -{{ formatBaht(row.allowance) }}
              <RouterLink :to="{ path: `/payroll/vendor-fleet/${row.vehicle.id}`, query: { period } }" class="edit-link ml-1" title="แก้ค่าเบี้ยเลี้ยงต่องานที่หน้ารายละเอียดรถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
            </td>
            <td class="px-4 py-3 text-right text-red-500">
              -{{ formatBaht(row.fuelCost) }}
              <RouterLink :to="`/payroll/vendor-fleet/${row.vehicle.id}`" class="edit-link ml-1" title="แก้ค่าน้ำมันต่องานที่หน้ารายละเอียดรถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
            </td>
            <td v-if="isCompanyFleet" class="px-4 py-3 text-right text-red-500">-{{ formatBaht(row.driverWage) }}</td>
            <td class="px-4 py-3 text-right text-red-500">
              -{{ formatBaht(row.vehicleExpense) }}
              <RouterLink :to="`/payroll/vendor-fleet/${row.vehicle.id}`" class="edit-link ml-1" title="แก้ค่าใช้จ่ายประจำรถต่องานที่หน้ารายละเอียดรถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
            </td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(row.net) }}</td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span v-if="row.trips === 0" class="text-xs text-muted">-</span>
              <span v-else-if="row.notIssued === 0" class="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700">ออกเอกสารแล้ว</span>
              <span v-else class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">ยังไม่ได้ออก {{ row.notIssued }} งาน</span>
            </td>
            <td class="px-4 py-3 text-right">
              <RouterLink :to="{ path: `/payroll/vendor-fleet/${row.vehicle.id}`, query: { period } }" class="btn-sm" title="เลือกงาน/สร้างเอกสารรายได้">
                <span class="material-symbols-rounded text-sm">receipt_long</span>
                เลือกงาน/สร้างเอกสาร
              </RouterLink>
            </td>
          </tr>
          <tr v-if="displayedRows.length === 0">
            <td :colspan="10" class="px-4 py-8 text-center text-muted">{{ isCompanyFleet ? 'ยังไม่มีรถบริษัท' : 'ยังไม่มีรถร่วมในหมวดที่เลือก' }}</td>
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
import { useVehicleIncomeDocumentsStore, vendorAllowanceOf, vendorFuelCostOf } from '@/stores/vehicleIncomeDocuments'
import { exportRowsToExcel } from '@/utils/exportExcel'
import { roundMoney } from '@/utils/bookingMoney'
import type { Booking, Vehicle, VehicleType } from '@/types'
import { vehicleGroupOf, type VehicleGroup } from '@/utils/vehicleType'

/**
 * ข้อมูลของ "รถร่วม/รถหุ้นส่วน" เท่านั้น (Vehicle Income/Fuel Cost/Vehicle Expense/Net) — ไม่แสดงเบี้ยเลี้ยง/รายได้คนขับ
 * ที่นี่อีกต่อไป (ย้ายไปเป็นความรับผิดชอบของหน้า "พนักงานขับรถ" ทั้งหมด ดู IncomeView.vue) เพื่อไม่ให้ Driver Income
 * ปนกับ Vehicle Income ตาม Data Ownership ที่ต้องแยกกัน — รายได้/ค่าน้ำมัน Trace ตรงจาก Booking.plate เหมือนกับที่
 * VendorFleetVehicleDetailView.vue ใช้ (ไม่สร้าง Calculation Engine ใหม่ ใช้ Logic เดียวกันเป๊ะ)
 */
type CategoryFilter = VehicleType | VehicleGroup | 'ALL'
const categoryOptions: { value: CategoryFilter; label: string }[] = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'ร่วมใน', label: 'หมวดร่วมใน' },
  { value: 'รถหุ้นส่วน', label: '- รถหุ้นส่วน' },
  { value: 'ร่วมนอก', label: 'หมวดร่วมนอก' },
  { value: 'รถร่วม', label: '- รถร่วม' },
  { value: 'รถอู่เสริม', label: '- รถอู่เสริม' },
  { value: 'รถบริษัท', label: 'รถบริษัท' },
]

const category = ref<CategoryFilter>('ALL')
/** แท็บ "รถบริษัท" — ดูเฉพาะรถบริษัท และหักค่าแรงคนขับ (เบี้ยเลี้ยงหลังเพิ่ม/ลดหนี้) ออกจากยอดสุทธิของรถด้วย
 *  (รถร่วม/รถหุ้นส่วนไม่หัก เพราะค่าแรงคนขับเป็นเรื่องระหว่างคนขับกับเจ้าของรถ ดูที่หน้า "พนักงานขับรถ" แทน) */
const isCompanyFleet = computed(() => category.value === 'รถบริษัท')

/** ตัวกรองเป็นได้ทั้งหมวดใหญ่ (ร่วมใน/ร่วมนอก) หรือหมวดย่อย — "ทั้งหมด" ไม่รวมรถบริษัท (รถบริษัทดูที่แท็บของตัวเอง) */
const departmentFilter = (department: VehicleType | undefined) => {
  if (!department) return false
  if (category.value === 'รถบริษัท') return department === 'รถบริษัท'
  if (department === 'รถบริษัท') return false
  if (category.value === 'ALL') return true
  if (category.value === 'ร่วมใน' || category.value === 'ร่วมนอก') return vehicleGroupOf(department) === category.value
  return department === category.value
}

const vehiclesStore = useVehiclesStore()
const bookingStore = useBookingStore()
const vehicleIncomeDocumentsStore = useVehicleIncomeDocumentsStore()

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

/** ค่าน้ำมัน (ลิตร × เรท) และค่าใช้จ่ายประจำรถ (เฉลี่ยต่องานจากยอดเดือน) ระบบคำนวณให้ แก้ทับได้ต่องานในหน้ารายละเอียดรถ
 *  — ให้ตรงกับ VendorFleetVehicleDetailView.vue และเอกสารรายได้รถร่วม */
const fuelCost = (booking: Booking) => vendorFuelCostOf(booking)

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
    const vehicleExpense = bookings.reduce((sum, b) => sum + vehicleIncomeDocumentsStore.vehicleExpenseOf(b), 0)
    /** ค่าแรงคนขับ = เบี้ยเลี้ยงหลังกระทบยอดเพิ่ม/ลดหนี้ (สูตรเดียวกับ computeBookingMoney/เงินเดือนคนขับ) — หักเฉพาะรถบริษัท */
    const driverWage = isCompanyFleet.value ? bookings.reduce((sum, b) => sum + roundMoney(b.finalAllowance ?? b.allowance ?? 0), 0) : 0
    /** รถร่วม/รถหุ้นส่วน: เบี้ยเลี้ยงเป็นรายจ่ายที่หักจากรถร่วม บริษัทนำไปจ่ายคนขับ (สูตรเดียวกับเอกสารรายได้รถร่วม) */
    const allowance = isCompanyFleet.value ? 0 : bookings.reduce((sum, b) => sum + vendorAllowanceOf(b), 0)
    const net = income - allowance - fuelTotal - driverWage - vehicleExpense
    const notIssued = bookings.filter((b) => !b.vehicleIncomeDocId).length
    return { vehicle, trips, income, allowance, fuelCost: fuelTotal, driverWage, vehicleExpense, net, notIssued }
  })
)

/** กรองตามสถานะเอกสารรายได้ของงานในรอบนี้ — ยังไม่ได้ออก = มีงานที่ยังไม่ออกเอกสารอย่างน้อย 1 งาน, ออกแล้ว = ออกครบทุกงาน */
const docStatusFilter = ref<'ALL' | 'ISSUED' | 'NOT_ISSUED'>('ALL')
const displayedRows = computed(() =>
  vehicleRows.value.filter((r) =>
    docStatusFilter.value === 'NOT_ISSUED' ? r.notIssued > 0 : docStatusFilter.value === 'ISSUED' ? r.trips > 0 && r.notIssued === 0 : true
  )
)

const grandTotals = computed(() =>
  vehicleRows.value.reduce(
    (acc, r) => ({ income: acc.income + r.income, expense: acc.expense + r.allowance + r.fuelCost + r.driverWage + r.vehicleExpense, net: acc.net + r.net }),
    { income: 0, expense: 0, net: 0 }
  )
)

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const exportSummary = () => {
  exportRowsToExcel(
    `${isCompanyFleet.value ? 'รถบริษัท' : 'รถร่วม'}-สรุป-${period.value}`,
    vehicleRows.value.map((r) => ({
      ทะเบียนรถ: vehiclesStore.fullPlate(r.vehicle),
      ประเภท: r.vehicle.department,
      จำนวนงาน: r.trips,
      รายได้จากงาน: r.income,
      ...(isCompanyFleet.value ? {} : { ค่าเบี้ยเลี้ยง: r.allowance }),
      ค่าน้ำมันที่ใช้: r.fuelCost,
      ...(isCompanyFleet.value ? { ค่าแรงคนขับ: r.driverWage } : {}),
      ค่าใช้จ่ายประจำรถ: r.vehicleExpense,
      ยอดสุทธิ: r.net,
    }))
  )
}
</script>

<style scoped>
.edit-link {
  @apply inline-flex items-center gap-0.5 text-xs font-normal text-primary hover:underline;
}

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
