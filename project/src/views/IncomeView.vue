<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">พนักงานขับรถ</h2>
      <div class="text-xs text-muted">รายได้คนขับทุกคน (รถบริษัท + รถร่วม/รถหุ้นส่วน) คำนวณจากเบี้ยเลี้ยงของงานที่ส่งของสำเร็จแล้ว — เจ้าของข้อมูลรายได้คนขับคือหน้านี้เพียงที่เดียว</div>
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
            <th class="px-4 py-3 font-semibold text-right">รายได้อื่นๆ</th>
            <th class="px-4 py-3 font-semibold text-right">รายการหักรวม</th>
            <th class="px-4 py-3 font-semibold text-right">รายได้สุทธิ</th>
            <th class="px-4 py-3 font-semibold">สถานะจ่าย</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in summaryRows" :key="row.driver" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ row.driver }}</td>
            <td class="px-4 py-3 text-right text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right text-text cursor-pointer" @click="selectDriverDetail(row.driver)">{{ formatBaht(row.baseAllowance) }}</td>
            <td class="px-4 py-3 text-right cursor-pointer" :class="row.debtNet >= 0 ? 'text-red-500' : 'text-green-600'" @click="selectDriverDetail(row.driver)">
              {{ row.debtNet >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(row.debtNet)) }}
            </td>
            <td class="px-4 py-3 text-right text-green-600 cursor-pointer" @click="selectDriverDetail(row.driver)">+{{ formatBaht(row.additionTotal) }}</td>
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
            <td class="px-4 py-3 text-right">
              <button
                v-if="driverIdFor(row.driver)"
                @click="router.push({ path: `/settings/drivers/${driverIdFor(row.driver)}`, query: { period } })"
                class="btn-sm"
                title="เลือกงาน/สร้างเอกสารรายได้"
              >
                <span class="material-symbols-rounded text-sm">receipt_long</span>
                เลือกงาน/สร้างเอกสาร
              </button>
              <span v-else class="text-xs text-muted" title="ไม่พบทะเบียนคนขับนี้ในสมุดรายชื่อ">-</span>
            </td>
          </tr>
          <tr v-if="summaryRows.length === 0">
            <td colspan="9" class="px-4 py-8 text-center text-muted">ยังไม่มีงานที่จบแล้วในรอบนี้</td>
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

    <PayrollDeductionPanel :driver-name="selectedDriver" :period-label="periodLabel" kind="ADDITION" />
    <PayrollDeductionPanel :driver-name="selectedDriver" :period-label="periodLabel" kind="DEDUCTION" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useDriverPayroll } from '@/composables/useDriverPayroll'
import PayrollDeductionPanel from '@/components/payroll/PayrollDeductionPanel.vue'

/** พนักงานขับรถเป็นเจ้าของข้อมูลรายได้คนขับทั้งหมด ไม่ว่าจะขับรถบริษัทหรือรถร่วม/รถหุ้นส่วน — ไม่กรองตามประเภทรถ
 *  (ต่างจากเดิมที่กรองเฉพาะ 'รถบริษัท' ทำให้รายได้คนขับรถร่วมไปโผล่ปนอยู่ในหน้า "เงินเดือน · รถร่วม" แทน ซึ่งหน้านั้น
 *  ควรมีแต่ข้อมูลของ "รถ" เท่านั้น ดู PayrollVendorFleetView.vue) */
const { mode, period, periodLabel, selectedDriver, driverOptions, summaryRows, detailRows, driverIdFor, formatDate, formatBaht, exportSummary, exportDetail, setPaymentStatus } =
  useDriverPayroll(() => true, 'พขร')

const router = useRouter()

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

.status-select {
  @apply h-8 px-2 rounded-full border-0 text-xs font-semibold cursor-pointer focus:outline-none;
}

.btn-sm {
  @apply h-8 px-3 rounded-lg border border-border bg-surface text-text font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
