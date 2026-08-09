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
        <button @click="mode = 'summary'" :class="['tab-btn', mode === 'summary' && 'tab-btn-active']">สรุปทั้งหมด</button>
        <button @click="mode = 'detail'" :class="['tab-btn', mode === 'detail' && 'tab-btn-active']">รายเที่ยว</button>
      </div>
      <input v-model="period" type="month" class="input-field" />
      <select v-if="mode === 'detail'" v-model="selectedDriver" class="input-field">
        <option value="">ทุกคน</option>
        <option v-for="d in driverOptions" :key="d" :value="d">{{ d }}</option>
      </select>
      <button @click="mode === 'summary' ? exportSummary() : exportDetail()" class="btn-secondary ml-auto">
        <span class="material-symbols-rounded text-base">download</span>
        นำออกเป็น Excel
      </button>
    </div>

    <div v-if="mode === 'summary'" class="card-lg overflow-x-auto">
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
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="row.driver" class="border-t border-border hover:bg-surface-2 transition-colors cursor-pointer" @click="selectDriverDetail(row.driver)">
            <td class="px-4 py-3 font-semibold text-text">{{ row.driver }}</td>
            <td class="px-4 py-3 text-right text-text">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right text-text">{{ formatBaht(row.baseAllowance) }}</td>
            <td class="px-4 py-3 text-right text-muted">{{ formatBaht(row.fuelCost) }}</td>
            <td class="px-4 py-3 text-right" :class="row.debtNet >= 0 ? 'text-red-500' : 'text-green-600'">
              {{ row.debtNet >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(row.debtNet)) }}
            </td>
            <td class="px-4 py-3 text-right text-red-500">-{{ formatBaht(row.deductionTotal) }}</td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(row.finalNet) }}</td>
          </tr>
          <tr v-if="summaryRows.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-muted">ยังไม่มีงานที่จบแล้วในรอบนี้</td>
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
import PayrollDeductionPanel from '@/components/payroll/PayrollDeductionPanel.vue'
import type { VehicleType } from '@/types'

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

const { mode, period, periodLabel, selectedDriver, driverOptions, summaryRows, detailRows, formatDate, formatBaht, exportSummary, exportDetail } =
  useDriverPayroll((department) => departmentFilter.value(department), 'พขร-รถร่วม')

const selectDriverDetail = (driver: string) => {
  selectedDriver.value = driver
  mode.value = 'detail'
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

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
