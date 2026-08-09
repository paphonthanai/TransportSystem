<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">พนักงานขับรถ (รถบริษัท)</h2>
      <div class="text-xs text-muted">คำนวณจากเบี้ยเลี้ยงของงานที่ส่งของสำเร็จแล้ว</div>
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
      <table class="min-w-[820px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">จำนวนเที่ยว</th>
            <th class="px-4 py-3 font-semibold text-right">เบี้ยเลี้ยงรวม</th>
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
            <td class="px-4 py-3 text-right" :class="row.debtNet >= 0 ? 'text-red-500' : 'text-green-600'">
              {{ row.debtNet >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(row.debtNet)) }}
            </td>
            <td class="px-4 py-3 text-right text-red-500">-{{ formatBaht(row.deductionTotal) }}</td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(row.finalNet) }}</td>
          </tr>
          <tr v-if="summaryRows.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีงานที่จบแล้วในรอบนี้</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="card-lg overflow-x-auto">
      <table class="min-w-[820px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">วันที่ส่งงาน</th>
            <th class="px-4 py-3 font-semibold">เลขชิพเม้นท์</th>
            <th class="px-4 py-3 font-semibold">ชื่อหน้างาน</th>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">รายได้คนขับ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in detailRows" :key="idx" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted">{{ formatDate(row.shipDate) }}</td>
            <td class="px-4 py-3 text-text">{{ row.shipmentNo }}</td>
            <td class="px-4 py-3 text-text">{{ row.siteName }}</td>
            <td class="px-4 py-3 text-text">{{ row.driverName }}</td>
            <td class="px-4 py-3 text-right font-semibold text-text">{{ formatBaht(row.driverIncome) }}</td>
          </tr>
          <tr v-if="detailRows.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีเที่ยวงานในรอบนี้</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PayrollDeductionPanel :driver-name="selectedDriver" :period-label="periodLabel" />
  </div>
</template>

<script setup lang="ts">
import { useDriverPayroll } from '@/composables/useDriverPayroll'
import PayrollDeductionPanel from '@/components/payroll/PayrollDeductionPanel.vue'

const { mode, period, periodLabel, selectedDriver, driverOptions, summaryRows, detailRows, formatDate, formatBaht, exportSummary, exportDetail } =
  useDriverPayroll((department) => department === 'รถบริษัท', 'พขร-บริษัท')

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
