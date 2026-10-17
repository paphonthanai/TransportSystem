<template>
  <div class="space-y-4">
    <!-- ส่วนหัว: วันนี้ + ทางลัด -->
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <div class="text-xs font-semibold text-muted">{{ todayLabel }}</div>
        <h2 class="text-xl font-bold text-text">ภาพรวมการดำเนินงาน</h2>
      </div>
      <div class="flex gap-2 flex-wrap">
        <router-link to="/booking/cements" class="quick-link">
          <span class="material-symbols-rounded text-base">local_shipping</span>
          Fleet Cements
        </router-link>
        <router-link to="/booking/ceramics" class="quick-link">
          <span class="material-symbols-rounded text-base">local_shipping</span>
          Fleet Ceramics
        </router-link>
        <router-link to="/completed-jobs" class="quick-link">
          <span class="material-symbols-rounded text-base">task_alt</span>
          งานเสร็จสิ้น
        </router-link>
      </div>
    </div>

    <!-- สถานะงานตอนนี้ — กดเพื่อไปดูรายการ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <router-link v-for="card in opsCards" :key="card.key" :to="card.to" class="ops-card group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-muted">{{ card.label }}</span>
          <span class="w-8 h-8 rounded-lg flex items-center justify-center" :class="card.tone">
            <span class="material-symbols-rounded text-lg">{{ card.icon }}</span>
          </span>
        </div>
        <div class="mt-2 text-3xl font-bold text-text tabular-nums">{{ card.value }}</div>
        <div class="text-[11px] text-muted mt-0.5">{{ card.hint }}</div>
      </router-link>
    </div>

    <!-- สรุปสถานะการเงิน: เลือกประเภทงาน/ช่วงวันที่ได้ — คิดจากงานที่ส่งของเสร็จสิ้น จัดตามวันที่ส่งของเสร็จ (ไม่ต้องรอวางบิล)
         ดู summarizeBilledMoney ใน utils/bookingMoney.ts -->
    <div class="card-lg">
      <div class="flex items-center justify-between mb-3">
        <div class="font-bold text-text">สรุปสถานะการเงิน</div>
        <div class="text-[11px] text-muted">{{ summaryRangeText }}</div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div class="text-xs text-muted mb-1">ประเภทงาน</div>
          <select v-model="summaryUnit" class="input-field w-full">
            <option value="all">ทุกประเภทงาน</option>
            <option value="cements">Fleet Cements</option>
            <option value="ceramics">Fleet Ceramics</option>
          </select>
        </div>
        <div>
          <div class="text-xs text-muted mb-1">ช่วงวันที่ (วันที่ส่งของเสร็จ)</div>
          <select v-model="summaryRange" class="input-field w-full">
            <option value="">ทั้งหมด</option>
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
            <option value="quarter">ไตรมาสนี้</option>
            <option value="year">ปีนี้</option>
            <option value="custom">กำหนดเอง</option>
          </select>
        </div>
      </div>
      <div v-if="summaryRange === 'custom'" class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div class="text-xs text-muted mb-1">ตั้งแต่วันที่</div>
          <input v-model="summaryFrom" type="date" class="input-field w-full" />
        </div>
        <div>
          <div class="text-xs text-muted mb-1">ถึงวันที่</div>
          <input v-model="summaryTo" type="date" class="input-field w-full" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- กรอบเดียวกับการ์ด "รอรับชำระ/ใบแจ้งหนี้เดือนนี้" ด้านล่าง (แถบสีซ้าย + พื้นขาว) -->
        <div class="border-l-4 border-blue-500 bg-surface border border-border rounded-xl px-4 py-3">
          <div class="text-[11px] text-muted">ยอดขายรวม</div>
          <div class="text-lg font-bold text-text tabular-nums">{{ formatBaht(summaryMoney.totals.sales) }}</div>
        </div>
        <div class="border-l-4 border-red-500 bg-surface border border-border rounded-xl px-4 py-3">
          <div class="text-[11px] text-muted">รายจ่าย (ค่าแรง + ค่าน้ำมัน)</div>
          <div class="text-lg font-bold text-text tabular-nums">{{ formatBaht(summaryMoney.totals.expense) }}</div>
        </div>
        <div class="border-l-4 border-green-500 bg-surface border border-border rounded-xl px-4 py-3">
          <div class="text-[11px] text-muted">รายได้บริษัท</div>
          <div class="text-lg font-bold text-text tabular-nums">{{ formatBaht(summaryMoney.totals.companyIncome) }}</div>
        </div>
      </div>
      <div v-if="summaryMoney.uncomputableCount > 0" class="mt-3 text-xs text-amber-700 flex items-center gap-1.5">
        <span class="material-symbols-rounded text-base">info</span>
        {{ summaryMoney.uncomputableCount }} งานในช่วงนี้ยังคิดเงินไม่ได้ จึงไม่ถูกนับในยอดข้างบน
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
      <!-- ต้องดำเนินการ: รายการข้อมูลที่ยังไม่ครบ/รอตรวจ พร้อมลิงก์ไปแก้ -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-text">ต้องดำเนินการ</div>
          <span v-if="attentionItems.length" class="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            {{ attentionItems.length }} เรื่อง
          </span>
        </div>
        <div v-if="attentionItems.length === 0" class="flex items-center gap-2 text-sm text-green-700 py-4">
          <span class="material-symbols-rounded">check_circle</span>
          ข้อมูลครบ ไม่มีรายการที่ต้องดำเนินการ
        </div>
        <div v-else class="divide-y divide-border">
          <router-link
            v-for="item in attentionItems"
            :key="item.key"
            :to="item.to"
            class="flex items-center gap-3 py-2.5 hover:bg-surface-2 -mx-2 px-2 rounded-lg transition-colors"
          >
            <span class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :class="item.tone">
              <span class="material-symbols-rounded text-lg">{{ item.icon }}</span>
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-text">{{ item.title }}</div>
              <div class="text-xs text-muted">{{ item.detail }}</div>
            </div>
            <span class="material-symbols-rounded text-muted">chevron_right</span>
          </router-link>
        </div>
      </div>

      <!-- ราคาน้ำมันวันนี้ -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-text">ราคาน้ำมันวันนี้ (บาท/ลิตร)</div>
          <router-link to="/settings/fuel" class="text-xs font-semibold text-primary hover:underline">ตั้งค่า</router-link>
        </div>
        <div class="space-y-2">
          <div v-for="row in fuelToday" :key="row.type" class="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
            <div class="text-sm font-medium text-text">{{ row.type }}</div>
            <div class="text-right">
              <div v-if="row.rate > 0" class="text-sm font-bold text-text tabular-nums">฿{{ row.rate.toFixed(2) }}</div>
              <div v-else class="text-sm font-semibold text-amber-700">ยังไม่มีราคา</div>
              <div v-if="row.priceDate" class="text-[11px] text-muted">ตั้งแต่ {{ row.priceDate }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- สถานะลูกหนี้ -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="border-l-4 border-primary bg-surface border border-border rounded-xl px-4 py-3">
        <div class="text-[11px] text-muted">รอรับชำระ</div>
        <div class="text-lg font-bold text-text tabular-nums">{{ formatBaht(totalPendingReceivable) }}</div>
      </div>
      <div class="border-l-4 border-amber-500 bg-surface border border-border rounded-xl px-4 py-3">
        <div class="text-[11px] text-muted">ค้างชำระเกินกำหนด</div>
        <div class="text-lg font-bold text-text tabular-nums">{{ formatBaht(totalOverdue) }}</div>
      </div>
      <div class="border-l-4 border-indigo-500 bg-surface border border-border rounded-xl px-4 py-3">
        <div class="text-[11px] text-muted">ใบแจ้งหนี้เดือนนี้</div>
        <div class="text-lg font-bold text-text tabular-nums">{{ invoicesThisMonth }} ใบ</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
      <!-- รายรับและรายจ่าย -->
      <div class="card-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-text">ยอดขาย รายจ่าย และรายได้บริษัท</div>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted">
            <span class="material-symbols-rounded text-lg">refresh</span>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div class="text-xs text-muted mb-1">ประเภทงาน</div>
            <select v-model="unitFilter" class="input-field w-full">
              <option value="all">ทุกประเภทงาน</option>
              <option value="cements">Fleet Cements</option>
              <option value="ceramics">Fleet Ceramics</option>
            </select>
          </div>
          <div>
            <div class="text-xs text-muted mb-1">ช่วงวันที่ (วันที่ส่งของเสร็จ)</div>
            <select v-model="dateRangeFilter" class="input-field w-full">
              <option value="">ทั้งหมด</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
              <option value="quarter">ไตรมาสนี้</option>
              <option value="year">ปีนี้</option>
              <option value="custom">กำหนดเอง</option>
            </select>
          </div>
        </div>
        <div v-if="dateRangeFilter === 'custom'" class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div class="text-xs text-muted mb-1">ตั้งแต่วันที่</div>
            <input v-model="customFrom" type="date" class="input-field w-full" />
          </div>
          <div>
            <div class="text-xs text-muted mb-1">ถึงวันที่</div>
            <input v-model="customTo" type="date" class="input-field w-full" />
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
        <DashboardBarChart :labels="monthLabels" :series="revenueSeries" />
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
          <div class="text-xs text-muted mb-1">ประเภทงาน</div>
          <select v-model="dueUnitFilter" class="input-field w-full">
            <option value="all">ทุกประเภทงาน</option>
            <option value="cements">Fleet Cements</option>
            <option value="ceramics">Fleet Ceramics</option>
          </select>
        </div>
        <div class="space-y-2 min-h-[7rem]">
          <div v-for="item in pagedDueInvoices" :key="item.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <div class="text-sm font-semibold text-text inline-flex items-center gap-1.5" :title="item.customer">
                <span
                  v-if="customerStore.findByName(item.customer)?.color"
                  :style="{ background: customerStore.findByName(item.customer)!.color }"
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                ></span>
                {{ customerStore.findByName(item.customer)?.code || item.customer }}
              </div>
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
            <div class="text-xs text-muted mb-1">ประเภทงาน</div>
            <select v-model="billingUnitFilter" class="input-field w-full">
              <option value="all">ทุกประเภทงาน</option>
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
              <div class="text-xs text-muted inline-flex items-center gap-1.5" :title="item.customer">
                <span
                  v-if="customerStore.findByName(item.customer)?.color"
                  :style="{ background: customerStore.findByName(item.customer)!.color }"
                  class="w-2 h-2 rounded-full flex-shrink-0"
                ></span>
                {{ customerStore.findByName(item.customer)?.code || item.customer }}
              </div>
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
          <div class="text-xs text-muted mb-1">ประเภทงาน</div>
          <select v-model="repairUnitFilter" class="input-field w-full">
            <option value="all">ทุกประเภทงาน</option>
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
import DashboardBarChart from '@/components/DashboardBarChart.vue'
import Pager from '@/components/Pager.vue'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useBookingStore } from '@/stores/booking'
import { useCustomerStore } from '@/stores/customers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useFuelRateStore } from '@/stores/fuelRates'
import { summarizeBilledMoney, computeBookingMoney } from '@/utils/bookingMoney'
import { useDriversStore } from '@/stores/drivers'
import { bangkokDay } from '@/utils/fuelPrice'
import { rangeFor, inRange, startOfDay, endOfDay, type DateRange } from '@/utils/dateRanges'

const salesDocumentsStore = useSalesDocumentsStore()
const bookingStore = useBookingStore()
const customerStore = useCustomerStore()
const vehiclesStore = useVehiclesStore()
const fuelRateStore = useFuelRateStore()
const driversStore = useDriversStore()

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

/** ยอดขายรวม/รายจ่าย/รายได้บริษัท — คิดจากงานที่ส่งของเสร็จสิ้น (DELIVERED) ตามประเภทรถของทะเบียนรถ
 *  คิดสดทุกครั้งจากข้อมูลปัจจุบัน แก้ทะเบียน/ประเภทรถแล้วตัวเลขเปลี่ยนตามเอง */
const billedMoney = computed(() => summarizeBilledMoney(bookingStore.bookings, (plate) => vehiclesStore.findByFullPlate(plate)?.department))
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

/** วันนี้ (ภาษาไทย) ใช้เป็นหัวหน้าแดชบอร์ด */
const todayLabel = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// ---------- สถานะงานตอนนี้ ----------
const IN_TRANSIT_STATUSES = ['ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'DELIVERING']
const waitingDispatchCount = computed(() => bookingStore.bookings.filter((b) => b.status === 'WAITING_DISPATCH').length)
const inTransitCount = computed(() => bookingStore.bookings.filter((b) => IN_TRANSIT_STATUSES.includes(b.status)).length)
const podReviewCount = computed(() => bookingStore.bookings.filter((b) => b.podReviewStatus === 'PENDING_REVIEW').length)
const deliveredThisMonthCount = computed(() => {
  const now = new Date()
  return bookingStore.bookings.filter((b) => {
    if (b.status !== 'DELIVERED' || !b.completedAt) return false
    const d = new Date(b.completedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
})

const opsCards = computed(() => [
  { key: 'waiting', label: 'รอจัดรถ', value: waitingDispatchCount.value, hint: 'งานที่ยังไม่ได้จ่ายให้คนขับ', icon: 'pending_actions', tone: 'bg-amber-500/10 text-amber-600', to: '/booking/cements' },
  { key: 'transit', label: 'กำลังดำเนินการ/ขนส่ง', value: inTransitCount.value, hint: 'จ่ายงานแล้ว ยังส่งไม่เสร็จ', icon: 'local_shipping', tone: 'bg-blue-500/10 text-blue-600', to: '/booking/cements' },
  { key: 'pod', label: 'รอตรวจ POD', value: podReviewCount.value, hint: 'คนขับส่งของแล้ว รอออฟฟิศตรวจ', icon: 'fact_check', tone: 'bg-indigo-500/10 text-indigo-600', to: '/booking/cements' },
  { key: 'done', label: 'ส่งเสร็จเดือนนี้', value: deliveredThisMonthCount.value, hint: 'งานที่จบเดือนนี้', icon: 'task_alt', tone: 'bg-green-500/10 text-green-600', to: '/completed-jobs' },
])

// ---------- สรุปการเงินแยกตามช่วงเวลา + ตัวกรองกราฟ ----------
const formatShortDay = (d: Date) => `${d.getDate()} ${thaiMonthShort[d.getMonth()]} ${buddhistYY(d.getFullYear())}`
const rangeText = (r: DateRange) => (r.from && r.to ? `${formatShortDay(r.from)} – ${formatShortDay(r.to)}` : 'ทุกงานที่ส่งเสร็จ')

const vehicleTypeOf = (plate: string) => vehiclesStore.findByFullPlate(plate)?.department

/** ช่วงวันที่จากตัวเลือก (รวม "กำหนดเอง") — ใช้ร่วมกันทั้งการ์ดสรุปและกราฟ */
const resolveRange = (kind: string, from: string, to: string, now: Date): DateRange => {
  if (kind === 'custom') {
    return {
      from: from ? startOfDay(new Date(from + 'T00:00:00')) : null,
      to: to ? endOfDay(new Date(to + 'T00:00:00')) : null,
    }
  }
  return rangeFor(kind, now)
}

const summaryUnit = ref('all')
const summaryRange = ref('')
const summaryFrom = ref('')
const summaryTo = ref('')

const summaryDateRange = computed(() => resolveRange(summaryRange.value, summaryFrom.value, summaryTo.value, new Date()))
const summaryRangeText = computed(() => {
  const r = summaryDateRange.value
  if (r.from && r.to) return rangeText(r)
  if (r.from) return `ตั้งแต่ ${formatShortDay(r.from)}`
  if (r.to) return `ถึง ${formatShortDay(r.to)}`
  return 'ทุกงานที่ส่งเสร็จ'
})
const summaryMoney = computed(() =>
  summarizeBilledMoney(
    bookingStore.bookings.filter((b) => (summaryUnit.value === 'all' || b.category === summaryUnit.value) && inRange(b, summaryDateRange.value)),
    vehicleTypeOf,
    new Date()
  )
)

/** งานที่ผ่านตัวกรอง "ประเภทงาน" + "ช่วงวันที่" ของกราฟ (ใช้กับทั้งกราฟและยอดรวมใต้ตัวกรอง) */
const chartBookings = computed(() => {
  const range = resolveRange(dateRangeFilter.value, customFrom.value, customTo.value, new Date())
  return bookingStore.bookings.filter((b) => (unitFilter.value === 'all' || b.category === unitFilter.value) && inRange(b, range))
})
const chartMoney = computed(() => summarizeBilledMoney(chartBookings.value, vehicleTypeOf, new Date()))

// ---------- ราคาน้ำมันวันนี้ ----------
const FUEL_TYPES = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม'] as const
const formatPriceDate = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${thaiMonthShort[m - 1]} ${buddhistYY(y)}`
}
const fuelToday = computed(() =>
  FUEL_TYPES.map((type) => {
    const r = fuelRateStore.fuelRateFor(type, bangkokDay(new Date()))
    return { type, rate: r.rate, priceDate: formatPriceDate(r.priceDate) }
  })
)

// ---------- ต้องดำเนินการ ----------
/** สาเหตุที่คิดเงินไม่ได้ (incomeNote ของ computeBookingMoney) ย่อเป็นป้ายสั้น ๆ ไว้นับแยกกลุ่ม */
const shortReason = (note: string) => {
  if (note.includes('ยอดขาย 0')) return 'ไม่มีค่าเที่ยว'
  if (note.includes('อ่านค่าน้ำมัน')) return 'อ่านค่าน้ำมันไม่ได้'
  if (note.includes('เรทน้ำมัน')) return 'ไม่มีเรทน้ำมัน'
  if (note.includes('ยังไม่มีทะเบียน')) return 'ไม่มีทะเบียน'
  if (note.includes('ไม่พบรถทะเบียน')) return 'ไม่พบรถในทะเบียนรถ'
  if (note.includes('แบบเก่า')) return 'ประเภทรถแบบเก่า'
  return 'อื่น ๆ'
}

const squish = (v?: string) => (v || '').replace(/\s+/g, ' ').trim()

const attentionItems = computed(() => {
  const items: { key: string; icon: string; tone: string; title: string; detail: string; to: string }[] = []
  const bs = bookingStore.bookings

  // 1) ราคาน้ำมันวันนี้
  const missingPrice = fuelToday.value.filter((r) => !(r.rate > 0)).map((r) => r.type)
  if (missingPrice.length) {
    items.push({
      key: 'fuel-price',
      icon: 'local_gas_station',
      tone: 'bg-amber-500/10 text-amber-600',
      title: 'ยังไม่มีราคาน้ำมันของวันนี้',
      detail: `${missingPrice.join(', ')} — งานที่สร้าง/นำเข้าวันนี้จะยังไม่มีเรทน้ำมัน`,
      to: '/settings/fuel',
    })
  }

  // 2) งานไม่มีคนขับ / ไม่มีทะเบียน — แยกคนละเรื่อง ลิงก์ไปกลุ่มนั้นของหน้าตรวจข้อมูลคนขับ (กรองให้แล้ว)
  const docList = (jobs: typeof bs) => {
    const ids = [...new Set(jobs.map((b) => b.docNo))]
    return ids.length <= 3 ? ` (${ids.join(', ')})` : ''
  }
  const noDriverJobs = bs.filter((b) => !b.driverName)
  const noPlateJobs = bs.filter((b) => !b.plate)
  if (noDriverJobs.length) {
    items.push({
      key: 'no-driver',
      icon: 'badge',
      tone: 'bg-red-500/10 text-red-600',
      title: 'งานที่ไม่มีชื่อคนขับ',
      detail: `${noDriverJobs.length} งาน${docList(noDriverJobs)} — กดเพื่อดูเฉพาะงานกลุ่มนี้และอัปเดตคนขับ`,
      to: '/settings/driver-data?group=noDriver',
    })
  }
  if (noPlateJobs.length) {
    items.push({
      key: 'no-plate',
      icon: 'local_shipping',
      tone: 'bg-red-500/10 text-red-600',
      title: 'งานที่ไม่มีทะเบียนรถ',
      detail: `${noPlateJobs.length} งาน${docList(noPlateJobs)} — กดเพื่อดูเฉพาะงานกลุ่มนี้และอัปเดตทะเบียน`,
      to: '/settings/driver-data?group=noPlate',
    })
  }

  // 2.1) งานที่ยังไม่จบและยังไม่ระบุราคา (ค่าเที่ยว 0 — จบงานไม่ได้) แยกตามกองรถ ลิงก์ไปหน้า Booking ของกองนั้นที่กรองราคาให้แล้ว
  for (const fleet of ['cements', 'ceramics'] as const) {
    const n = bs.filter((b) => b.category === fleet && b.status !== 'DELIVERED' && !((b.tripFee || 0) > 0)).length
    if (!n) continue
    items.push({
      key: 'no-price-' + fleet,
      icon: 'payments',
      tone: 'bg-amber-500/10 text-amber-600',
      title: `งานที่ยังไม่ระบุราคา · ${fleet === 'cements' ? 'Cements' : 'Ceramics'}`,
      detail: `${n} งานที่ยังไม่จบ — ต้องใส่ค่าเที่ยวก่อนจบงานได้ กดเพื่อดูเฉพาะงานที่ยังไม่ระบุราคา`,
      to: `/booking/${fleet}?price=none`,
    })
  }

  // 3) ข้อมูลคนขับในงานไม่ตรงทะเบียนคนขับ / ไม่มีชื่อ-นามสกุลแยก / หมายเหตุชื่อเล่นค้าง — แยกเป็น 3 เรื่อง ลิงก์ไปกลุ่มของตัวเอง
  let mismatch = 0
  let noSnapshot = 0
  let staleNote = 0
  for (const b of bs) {
    if (!b.driverName) continue
    const d = b.driverId ? driversStore.drivers.find((x) => x.id === b.driverId) : undefined
    if (d) {
      if (squish(b.driverName) !== squish(`${d.firstName} ${d.lastName}`)) mismatch++
      else if (!b.driverFirstName || !b.driverLastName) noSnapshot++
    }
    if ((b.note || '').split(' | ').some((part) => part.startsWith('ชื่อเล่นคนขับ'))) staleNote++
  }
  const driverDataItems = [
    { key: 'mismatch', n: mismatch, title: 'ชื่อคนขับในงานไม่ตรงทะเบียนคนขับ', hint: 'สะกดผิด/นามสกุลซ้ำ — ซิงก์จากทะเบียนคนขับ' },
    { key: 'noSnapshot', n: noSnapshot, title: 'งานที่ยังไม่มีชื่อ/นามสกุลแยก', hint: 'งานนำเข้าเก่า — ซิงก์เพื่อเติมให้ (ไม่เร่งด่วน)' },
    { key: 'staleNote', n: staleNote, title: 'หมายเหตุ "ชื่อเล่นไม่ตรง" ที่ค้างอยู่', hint: 'จัดคนขับแล้วแต่หมายเหตุยังค้าง — ซิงก์เพื่อลบ' },
  ]
  for (const d of driverDataItems) {
    if (!d.n) continue
    items.push({
      key: 'driver-data-' + d.key,
      icon: 'person_search',
      tone: 'bg-orange-500/10 text-orange-600',
      title: d.title,
      detail: `${d.n} งาน — ${d.hint}`,
      to: `/settings/driver-data?group=${d.key}`,
    })
  }

  // 4) งานมีลิตรแต่ไม่มีเรทน้ำมัน
  const noRate = bs.filter((b) => b.plate && (b.fuelLiters || 0) > 0 && !(b.fuelRate > 0)).length
  if (noRate) {
    items.push({
      key: 'no-rate',
      icon: 'warning',
      tone: 'bg-amber-500/10 text-amber-600',
      title: 'งานที่มีลิตรน้ำมันแต่ยังไม่มีเรท',
      detail: `${noRate} งาน — ไม่ถูกนับในรายได้จนกว่าจะมีราคาน้ำมันของวันนั้น`,
      to: '/settings/fuel',
    })
  }

  // 5) งานที่คิดเงินไม่ได้ แยกตามสาเหตุ
  if (billedMoney.value.uncomputableCount > 0) {
    const reasons = new Map<string, number>()
    for (const b of bs) {
      if (b.status !== 'DELIVERED') continue
      const m = computeBookingMoney(b, b.plate ? vehicleTypeOf(b.plate) : undefined)
      if (m.companyIncome === null) {
        const label = shortReason(m.incomeNote || '')
        reasons.set(label, (reasons.get(label) || 0) + 1)
      }
    }
    const breakdown = [...reasons.entries()].sort((x, y) => y[1] - x[1]).map(([label, n]) => `${label} ${n}`).join(' · ')
    items.push({
      key: 'uncomputable',
      icon: 'calculate',
      tone: 'bg-orange-500/10 text-orange-600',
      title: `งานที่ยังคิดเงินไม่ได้ ${billedMoney.value.uncomputableCount} งาน`,
      detail: `${breakdown} — ไม่ถูกนับในยอดขาย/รายจ่าย/รายได้`,
      to: '/completed-jobs?money=UNCOMPUTABLE',
    })
  }

  // 6) รอตรวจ POD — แยกตามกองรถ ลิงก์ไปหน้า Booking ของกองนั้นที่กรองเฉพาะงานรอตรวจ POD ให้แล้ว
  for (const fleet of ['cements', 'ceramics'] as const) {
    const n = bs.filter((b) => b.category === fleet && b.podReviewStatus === 'PENDING_REVIEW').length
    if (!n) continue
    items.push({
      key: 'pod-' + fleet,
      icon: 'fact_check',
      tone: 'bg-indigo-500/10 text-indigo-600',
      title: `งานรอตรวจ POD · ${fleet === 'cements' ? 'Cements' : 'Ceramics'}`,
      detail: `${n} งาน — ตรวจรูปส่งของแล้วยืนยันการจบงาน`,
      to: `/booking/${fleet}?issue=pod`,
    })
  }

  // 7) ข้อมูลทดสอบค้างในรายชื่อคนขับ
  const testDrivers = driversStore.drivers.filter((d) => /smoketest/i.test(`${d.firstName} ${d.lastName}`))
  if (testDrivers.length) {
    items.push({
      key: 'test-drivers',
      icon: 'bug_report',
      tone: 'bg-slate-500/10 text-slate-600',
      title: 'คนขับทดสอบค้างในรายชื่อ',
      detail: `${testDrivers.length} รายการ (${testDrivers.map((d) => d.firstName + ' ' + d.lastName).join(', ')}) — ควรลบออกเพื่อไม่ให้เลือกผิด`,
      to: '/settings/personnel?role=DRIVER',
    })
  }

  return items
})

const unitFilter = ref('all')
const dateRangeFilter = ref('')
const customFrom = ref('')
const customTo = ref('')
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

/** กราฟรายเดือน 12 เดือนล่าสุด — ยอดขายรวม/รายจ่าย/รายได้บริษัท ของงานที่ส่งของเสร็จสิ้น จัดเดือนตามวันที่ส่งของเสร็จ
 *  (ดู summarizeBilledMoney) */
const revenueSeries = ref([
  { key: 'income', label: 'ยอดขายรวม', color: '#2563eb', visible: true, data: [] as number[] },
  { key: 'expense', label: 'รายจ่าย', color: '#f97316', visible: true, data: [] as number[] },
  { key: 'profit', label: 'รายได้บริษัท', color: '#16a34a', visible: true, data: [] as number[] },
])
watch(
  chartMoney,
  (val) => {
    revenueSeries.value[0].data = val.monthly.sales
    revenueSeries.value[1].data = val.monthly.expense
    revenueSeries.value[2].data = val.monthly.income
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
  { key: 'ar', label: 'ลูกหนี้', color: '#2563eb', visible: showReceivable.value, data: monthlyReceivable.value },
  { key: 'ap', label: 'เจ้าหนี้', color: '#f97316', visible: showPayable.value, data: monthlyReceivable.value.map(() => 0) },
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

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.quick-link {
  @apply h-9 px-3 rounded-lg border border-border bg-surface text-text text-sm font-medium inline-flex items-center gap-1.5 hover:bg-surface-2 transition-colors;
}

.ops-card {
  @apply block bg-surface border border-border rounded-xl p-4 shadow-default transition-all hover:border-primary hover:shadow-md;
}

.money-card {
  @apply bg-surface border border-border rounded-xl p-4 shadow-default;
}

.input-field {
  @apply h-9 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}
</style>
