<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <div class="inline-flex flex-wrap gap-2 rounded-full bg-surface-2 p-2">
        <button
          v-for="tab in jobTabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['px-4 py-2 rounded-full text-sm font-semibold transition', activeTab === tab.id ? 'bg-primary text-white' : 'bg-transparent text-muted hover:bg-surface']"
        >
          {{ tab.label }} <span class="opacity-80">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[860px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">Booking</th>
            <th class="px-4 py-3 font-semibold">ลูกค้า</th>
            <th class="px-4 py-3 font-semibold">เส้นทาง</th>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold">ทะเบียน</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in filteredJobs" :key="job.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-primary">{{ job.id }}</td>
            <td class="px-4 py-3 font-semibold text-text">{{ job.customer }}</td>
            <td class="px-4 py-3 text-muted">{{ job.origin }} → {{ job.dest }}</td>
            <td class="px-4 py-3 text-text">{{ job.driver }}</td>
            <td class="px-4 py-3 text-muted">{{ job.plate }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', job.statusClass]">{{ job.status }}</span>
            </td>
            <td class="px-4 py-3 text-right text-muted">⋯</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const activeTab = ref('all')

const jobTabs = [
  { id: 'all', label: 'ทั้งหมด', count: 6 },
  { id: 'running', label: 'กำลังวิ่ง', count: 3 },
  { id: 'done', label: 'สำเร็จ', count: 2 },
  { id: 'pending', label: 'รอจัดรถ', count: 1 },
]

const jobs = [
  { id: 'BK-2569-0002', customer: 'บริษัท XYZ จำกัด', origin: 'ชลบุรี', dest: 'นนทบุรี', driver: 'ประเสริฐ มั่นคง', plate: '82-4417 กรุงเทพ', status: 'กำลังวิ่ง', statusClass: 'bg-blue-100 text-blue-700' },
  { id: 'BK-2569-0004', customer: 'บจก. แลนด์ดีเวลลอป', origin: 'ราชบุรี', dest: 'ลำปาง', driver: 'วิรัตน์ ใจกล้า', plate: '71-3390 ราชบุรี', status: 'กำลังวิ่ง', statusClass: 'bg-blue-100 text-blue-700' },
  { id: 'BK-2569-0006', customer: 'บจก. ศรีไทยคอนกรีต', origin: 'นครสวรรค์', dest: 'กรุงเทพฯ', driver: 'สมหมาย เพียรงาน', plate: '72-6628 อยุธยา', status: 'รอจัดรถ', statusClass: 'bg-amber-100 text-amber-700' },
  { id: 'BK-2569-0001', customer: 'บริษัท ABC จำกัด', origin: 'นครสวรรค์', dest: 'กรุงเทพฯ', driver: 'สมชาย ทองดี', plate: '70-8821 สระบุรี', status: 'สำเร็จ', statusClass: 'bg-green-100 text-green-700' },
  { id: 'BK-2569-0003', customer: 'บริษัท DEF จำกัด', origin: 'ระยอง', dest: 'ชลบุรี', driver: 'ธนพล เกื้อกูล', plate: '70-9954 สระบุรี', status: 'สำเร็จ', statusClass: 'bg-green-100 text-green-700' },
]

const filteredJobs = computed(() => {
  if (activeTab.value === 'all') return jobs
  if (activeTab.value === 'running') return jobs.filter((job) => job.status === 'กำลังวิ่ง')
  if (activeTab.value === 'done') return jobs.filter((job) => job.status === 'สำเร็จ')
  if (activeTab.value === 'pending') return jobs.filter((job) => job.status === 'รอจัดรถ')
  return jobs
})
</script>
