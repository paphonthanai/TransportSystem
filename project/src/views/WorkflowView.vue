<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in workflowStats"
        :key="stat.label"
        class="card-lg"
      >
        <div class="text-xs text-muted">{{ stat.label }}</div>
        <div :class="['mt-3 text-2xl font-bold', stat.colorClass]">{{ stat.value }}</div>
      </div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[820px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">เลขงาน</th>
            <th class="px-4 py-3 font-semibold">ลูกค้า</th>
            <th class="px-4 py-3 font-semibold">ขั้นตอนปัจจุบัน</th>
            <th class="px-4 py-3 font-semibold">ความคืบหน้า</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in workflowRows" :key="row.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-primary">{{ row.id }}</td>
            <td class="px-4 py-3 font-semibold text-text">{{ row.customer }}</td>
            <td class="px-4 py-3 text-sm text-text flex items-center gap-2"><span class="material-symbols-rounded text-primary">{{ row.icon }}</span>{{ row.stageLabel }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                  <div :style="{ width: row.pct + '%', background: row.barColor }" class="h-full rounded-full"></div>
                </div>
                <span class="text-xs text-muted">{{ row.step }}/12</span>
              </div>
            </td>
            <td class="px-4 py-3 text-right"><button class="btn-sm">จัดการ</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const workflowStats = [
  { label: 'งานทั้งหมด', value: 128, colorClass: 'text-primary' },
  { label: 'กำลังดำเนินการ', value: 37, colorClass: 'text-green-600' },
  { label: 'รอจัดรถ', value: 12, colorClass: 'text-amber-600' },
  { label: 'สำเร็จแล้ว', value: 79, colorClass: 'text-slate-700' },
]

const workflowRows = [
  { id: 'WK-2569-0012', customer: 'บริษัท ABC จำกัด', stageLabel: 'จัดรถ', pct: 62, barColor: '#2563eb', step: 7, icon: 'rocket_launch' },
  { id: 'WK-2569-0018', customer: 'บจก. แลนด์ดีเวลลอป', stageLabel: 'ขนส่ง', pct: 83, barColor: '#16a34a', step: 10, icon: 'local_shipping' },
  { id: 'WK-2569-0025', customer: 'หจก. ทวีทรัพย์', stageLabel: 'ยืนยันเอกสาร', pct: 45, barColor: '#f59e0b', step: 5, icon: 'description' },
  { id: 'WK-2569-0031', customer: 'บมจ. พฤกษา', stageLabel: 'รอจัดรถ', pct: 27, barColor: '#f97316', step: 3, icon: 'pending' },
]
</script>
