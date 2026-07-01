<template>
  <div class="space-y-6">
    <!-- Dashboard Variant Toggle -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="text-sm text-muted">รูปแบบแดชบอร์ด</div>
      <div class="flex gap-1 p-1 rounded-lg bg-surface-2 border border-border">
        <button
          @click="variantA = true"
          :class="[
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
            variantA
              ? 'bg-primary text-white'
              : 'bg-transparent text-muted hover:text-text',
          ]"
        >
          แบบที่ 1 · ภาพรวม
        </button>
        <button
          @click="variantA = false"
          :class="[
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
            !variantA
              ? 'bg-primary text-white'
              : 'bg-transparent text-muted hover:text-text',
          ]"
        >
          แบบที่ 2 · โฟกัสกราฟ
        </button>
      </div>
      <div class="flex-1"></div>
      <div class="text-xs text-muted flex items-center gap-2">
        <span class="material-symbols-rounded text-base">calendar_today</span>
        {{ formatDate(new Date()) }}
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpis" :key="kpi.id" class="card-lg">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="text-xs text-muted font-medium">{{ kpi.label }}</div>
          <div
            :style="{ background: kpi.soft, color: kpi.color }"
            class="w-8 h-8 rounded-lg flex items-center justify-center"
          >
            <span class="material-symbols-rounded text-base">{{ kpi.icon }}</span>
          </div>
        </div>
        <div class="text-3xl font-bold text-text">{{ kpi.value }}</div>
        <div class="flex items-center gap-1 mt-2 text-sm" :style="{ color: kpi.deltaColor }">
          <span class="material-symbols-rounded text-base">{{ kpi.deltaIcon }}</span>
          {{ kpi.delta }}
          <span class="text-muted">{{ kpi.deltaNote }}</span>
        </div>
      </div>
    </div>

    <!-- Variant A: Overview -->
    <div v-if="variantA" class="space-y-6">
      <!-- Revenue & Trips Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Monthly Revenue Chart -->
        <div class="card-lg">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="text-base font-bold text-text">รายได้รายเดือน</div>
              <div class="text-xs text-muted">ปีงบประมาณ 2569 · หน่วย: ล้านบาท</div>
            </div>
            <div class="text-sm font-semibold text-green-600 flex items-center gap-1">
              <span class="material-symbols-rounded text-base">trending_up</span>
              +18.4%
            </div>
          </div>
          <DashboardChart type="revenue" />
        </div>

        <!-- Weekly Trips Chart -->
        <div class="card-lg">
          <div class="mb-4">
            <div class="text-base font-bold text-text">จำนวนเที่ยว</div>
            <div class="text-xs text-muted">รายสัปดาห์ (เที่ยว/วัน)</div>
          </div>
          <DashboardChart type="trips" />
        </div>
      </div>

      <!-- Top Customers & Drivers -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardTopList type="customers" title="Top 10 ลูกค้า" />
        <DashboardTopList type="drivers" title="Top 10 คนขับ" />
      </div>

      <!-- Recent Jobs & Running Vehicles -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardTable type="recent-jobs" title="งานล่าสุด" />
        <DashboardRunningVehicles />
      </div>
    </div>

    <!-- Variant B: Chart Focus -->
    <div v-if="!variantA" class="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 items-start">
      <!-- Main Revenue Chart -->
      <div class="card-lg">
        <div class="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <div class="text-xs text-muted">รายได้รวมปีนี้</div>
            <div class="text-4xl font-bold text-text">฿ 28.6M</div>
            <div class="text-sm text-green-600 font-semibold flex items-center gap-1 mt-1">
              <span class="material-symbols-rounded text-base">trending_up</span>
              +18.4% เทียบปีก่อน
            </div>
          </div>
          <div class="flex gap-6">
            <div>
              <div class="text-xs text-muted">เที่ยวสะสม</div>
              <div class="text-2xl font-bold text-text">4,182</div>
            </div>
            <div>
              <div class="text-xs text-muted">กำไรเฉลี่ย/เที่ยว</div>
              <div class="text-2xl font-bold text-text">฿2,140</div>
            </div>
          </div>
        </div>
        <DashboardChart type="area-chart" />
      </div>

      <!-- Recent Activity -->
      <div class="card-lg">
        <div class="text-base font-bold text-text mb-3">กิจกรรมล่าสุด</div>
        <div class="space-y-3 max-h-80 overflow-y-auto">
          <div v-for="i in 6" :key="i" class="flex gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-100 text-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-rounded text-base">local_shipping</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-text">สร้างงาน BK-2569-00{{ i }}</div>
              <div class="text-xs text-muted">{{ i }} นาทีที่แล้ว</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardTopList type="customers" title="Top 10 ลูกค้า" />
        <DashboardTopList type="drivers" title="Top 10 คนขับ" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DashboardChart from '@/components/DashboardChart.vue'
import DashboardTopList from '@/components/DashboardTopList.vue'
import DashboardTable from '@/components/DashboardTable.vue'
import DashboardRunningVehicles from '@/components/DashboardRunningVehicles.vue'

const variantA = ref(true)

const kpis = [
  {
    id: 1,
    label: 'ยอดรวมทั้งหมด',
    value: '฿28.6M',
    icon: 'trending_up',
    color: '#2563eb',
    soft: '#eff6ff',
    delta: '+18.4%',
    deltaIcon: 'arrow_upward',
    deltaColor: '#16a34a',
    deltaNote: 'เทียบเดือนก่อน',
  },
  {
    id: 2,
    label: 'เที่ยวรถทั้งหมด',
    value: '4,182',
    icon: 'local_shipping',
    color: '#f97316',
    soft: '#fed7aa',
    delta: '+12%',
    deltaIcon: 'arrow_upward',
    deltaColor: '#16a34a',
    deltaNote: 'สัปดาห์นี้',
  },
  {
    id: 3,
    label: 'เที่ยวที่กำลังวิ่ง',
    value: '142',
    icon: 'route',
    color: '#10b981',
    soft: '#d1fae5',
    delta: '+5',
    deltaIcon: 'arrow_upward',
    deltaColor: '#16a34a',
    deltaNote: 'เทียบ 1 ชม.',
  },
  {
    id: 4,
    label: 'ประสิทธิภาพ',
    value: '94.2%',
    icon: 'speed',
    color: '#7c3aed',
    soft: '#ede9fe',
    delta: '+2.1%',
    deltaIcon: 'arrow_upward',
    deltaColor: '#16a34a',
    deltaNote: 'เทียบเดือนก่อน',
  },
]

const formatDate = (date: Date) => {
  return date.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
