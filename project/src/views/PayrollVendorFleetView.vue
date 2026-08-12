<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">รถร่วม / รถหุ้นส่วน</h2>
      <div class="text-xs text-muted">คำนวณจากเบี้ยเลี้ยงของงานที่ส่งของสำเร็จแล้ว รวมค่าน้ำมันที่ใช้ในแต่ละเที่ยว</div>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-2">
        <button v-for="opt in categoryOptions" :key="opt.value" @click="category = opt.value" :class="['tab-btn', category === opt.value && 'tab-btn-active']">
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-2">
        <button @click="viewMode = 'summary'" :class="['tab-btn', viewMode === 'summary' && 'tab-btn-active']">สรุปทั้งหมด</button>
        <button @click="viewMode = 'detail'" :class="['tab-btn', viewMode === 'detail' && 'tab-btn-active']">รายเที่ยว</button>
        <button @click="viewMode = 'vehicle'" :class="['tab-btn', viewMode === 'vehicle' && 'tab-btn-active']">เลือกรถ</button>
      </div>
      <input v-model="period" type="month" class="input-field" />
      <select v-if="viewMode === 'detail'" v-model="selectedDriver" class="input-field">
        <option value="">ทุกคน</option>
        <option v-for="d in driverOptions" :key="d" :value="d">{{ d }}</option>
      </select>
      <button v-if="viewMode !== 'vehicle'" @click="viewMode === 'summary' ? exportSummary() : exportDetail()" class="btn-secondary ml-auto">
        <span class="material-symbols-rounded text-base">download</span>
        นำออกเป็น Excel
      </button>
    </div>

    <div v-if="viewMode === 'vehicle'" class="card-lg overflow-x-auto">
      <table class="min-w-[700px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ทะเบียนรถ</th>
            <th class="px-4 py-3 font-semibold">ประเภท</th>
            <th class="px-4 py-3 font-semibold">ยี่ห้อ/รูปแบบตัวถัง</th>
            <th class="px-4 py-3 font-semibold">คนขับประจำปัจจุบัน</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in vendorFleetVehicles" :key="v.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ vehiclesStore.fullPlate(v) }}</td>
            <td class="px-4 py-3 text-muted">{{ v.department }}</td>
            <td class="px-4 py-3 text-muted">{{ v.brand }} {{ v.bodyType }}</td>
            <td class="px-4 py-3 text-muted">{{ driverLabelFor(v) }}</td>
            <td class="px-4 py-3 text-right">
              <RouterLink :to="`/payroll/vendor-fleet/${v.id}`" class="btn-sm">รายละเอียด</RouterLink>
            </td>
          </tr>
          <tr v-if="vendorFleetVehicles.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีรถร่วมในหมวดที่เลือก</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="viewMode === 'summary'" class="card-lg overflow-x-auto">
      <table class="min-w-[900px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">จำนวนเที่ยว</th>
            <th class="px-4 py-3 font-semibold text-right">เบี้ยเลี้ยงรวม</th>
            <th class="px-4 py-3 font-semibold text-right">ค่าน้ำมันที่ใช้</th>
            <th class="px-4 py-3 font-semibold text-right">เพิ่ม/ลดหนี้สะสม</th>
            <th class="px-4 py-3 font-semibold text-right">รายการหักรวม</th>
            <th class="px-4 py-3 font-semibold text-right">รายได้สุทธิ</th>
            <th class="px-4 py-3 font-semibold">สถานะจ่าย</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="row.driver" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ row.driver }}</td>
            <td class="px-4 py-3 text-right text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ formatBaht(row.baseAllowance) }}</td>
            <td class="px-4 py-3 text-right text-muted cursor-pointer" @click="selectDriverDetail(row.driver)">{{ formatBaht(row.fuelCost) }}</td>
            <td class="px-4 py-3 text-right cursor-pointer" :class="row.debtNet >= 0 ? 'text-red-500' : 'text-green-600'" @click="selectDriverDetail(row.driver)">
              {{ row.debtNet >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(row.debtNet)) }}
            </td>
            <td class="px-4 py-3 text-right text-red-500 cursor-pointer" @click="selectDriverDetail(row.driver)">-{{ formatBaht(row.deductionTotal) }}</td>
            <td class="px-4 py-3 text-right font-bold text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ formatBaht(row.finalNet) }}</td>
            <td class="px-4 py-3">
              <select
                :value="row.paymentStatus"
                @change="setPaymentStatus(row.driver, ($event.target as HTMLSelectElement).value as 'UNPAID' | 'PAID')"
                :class="['status-select', row.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']"
              >
                <option value="UNPAID">ยังไม่จ่าย</option>
                <option value="PAID">จ่ายแล้ว</option>
              </select>
            </td>
          </tr>
          <tr v-if="summaryRows.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-muted">ยังไม่มีงานที่จบแล้วในรอบนี้</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="card-lg overflow-x-auto">
      <table class="min-w-[900px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">วันที่ส่งงาน</th>
            <th class="px-4 py-3 font-semibold">เลขชิพเม้นท์</th>
            <th class="px-4 py-3 font-semibold">ชื่อหน้างาน</th>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">รายได้คนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">ค่าน้ำมันที่ใช้</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in detailRows" :key="idx" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted">{{ formatDate(row.shipDate) }}</td>
            <td class="px-4 py-3 text-text">{{ row.shipmentNo }}</td>
            <td class="px-4 py-3 text-text">{{ row.siteName }}</td>
            <td class="px-4 py-3 text-text">{{ row.driverName }}</td>
            <td class="px-4 py-3 text-right font-semibold text-text">{{ formatBaht(row.driverIncome) }}</td>
            <td class="px-4 py-3 text-right text-muted">{{ formatBaht(row.fuelCost) }}</td>
          </tr>
          <tr v-if="detailRows.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีเที่ยวงานในรอบนี้</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PayrollDeductionPanel :driver-name="selectedDriver" :period-label="periodLabel" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDriverPayroll } from '@/composables/useDriverPayroll'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import PayrollDeductionPanel from '@/components/payroll/PayrollDeductionPanel.vue'
import type { Vehicle, VehicleType } from '@/types'

const categoryOptions: { value: VehicleType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'รถร่วมใน', label: 'รถร่วมใน' },
  { value: 'รถร่วมนอก', label: 'รถร่วมนอก' },
  { value: 'รถหุ้นส่วน', label: 'รถหุ้นส่วน' },
]

const category = ref<VehicleType | 'ALL'>('ALL')

const departmentFilter = computed(() => (department: VehicleType | undefined) => {
  if (!department || department === 'รถบริษัท') return false
  return category.value === 'ALL' || department === category.value
})

const { mode, period, periodLabel, selectedDriver, driverOptions, summaryRows, detailRows, formatDate, formatBaht, exportSummary, exportDetail, setPaymentStatus } =
  useDriverPayroll((department) => departmentFilter.value(department), 'พขร-รถร่วม')

/** แท็บ "เลือกรถ" เป็นมุมมองเพิ่มเติมของหน้านี้ แยกจาก mode ของ useDriverPayroll (ซึ่งใช้ร่วมกับหน้าพนักงานขับรถด้วย
 *  จึงไม่ควรมีค่า 'vehicle' ปนอยู่ในนั้น) — sync กลับไปที่ mode เฉพาะตอนสลับ summary/detail เท่านั้น */
const viewMode = ref<'summary' | 'detail' | 'vehicle'>('summary')

const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()

const vendorFleetVehicles = computed(() => vehiclesStore.vehicles.filter((v) => departmentFilter.value(v.department)))

const driverLabelFor = (v: Vehicle) => {
  if (!v.driverCode) return 'ไม่มีคนขับประจำ'
  const driver = driversStore.drivers.find((d) => d.code === v.driverCode)
  return driver ? driversStore.fullName(driver) : v.driverCode
}

const selectDriverDetail = (driver: string) => {
  selectedDriver.value = driver
  mode.value = 'detail'
  viewMode.value = 'detail'
}
</script>

<style scoped>
.input-field {
  @apply h-9 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-secondary {
  @apply h-9 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.tab-btn {
  @apply h-9 px-4 rounded-lg border border-border bg-surface text-text text-sm font-medium cursor-pointer hover:bg-surface-2;
}

.tab-btn-active {
  @apply bg-primary text-white border-primary;
}

.status-select {
  @apply h-8 px-2 rounded-full border-0 text-xs font-semibold cursor-pointer focus:outline-none;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
