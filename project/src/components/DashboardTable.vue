<template>
  <div class="card-lg overflow-hidden">
    <div class="flex items-center justify-between mb-4">
      <div class="font-bold text-text">{{ title }}</div>
      <button class="text-xs text-primary transition hover:text-primary-dark">ดูทั้งหมด</button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr class="text-left text-xs uppercase text-muted tracking-wide">
            <th class="py-3 px-2">Booking</th>
            <th class="py-3 px-2">ลูกค้า</th>
            <th class="py-3 px-2">ปลายทาง</th>
            <th class="py-3 px-2">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.id" class="border-t border-border">
            <td class="py-3 px-2 font-semibold text-text">{{ job.booking }}</td>
            <td class="py-3 px-2 text-muted">{{ job.customer }}</td>
            <td class="py-3 px-2 text-muted">{{ job.destination }}</td>
            <td class="py-3 px-2">
              <span
                :class="[
                  'text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center',
                  job.status === 'สำเร็จ' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-amber-700',
                ]"
              >
                {{ job.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

const props = defineProps({
  type: String as PropType<'recent-jobs'>,
  title: String,
})

const jobs = computed(() => {
  return [
    { id: 1, booking: 'BK-2569-0001', customer: 'บริษัท ABC จำกัด', destination: 'กรุงเทพฯ', status: 'สำเร็จ' },
    { id: 2, booking: 'BK-2569-0002', customer: 'บริษัท XYZ จำกัด', destination: 'นครราชสีมา', status: 'สำเร็จ' },
    { id: 3, booking: 'BK-2569-0003', customer: 'บริษัท DEF จำกัด', destination: 'ชลบุรี', status: 'กำลังวิ่ง' },
    { id: 4, booking: 'BK-2569-0004', customer: 'บริษัท GHI จำกัด', destination: 'เชียงใหม่', status: 'สำเร็จ' },
    { id: 5, booking: 'BK-2569-0005', customer: 'บริษัท JKL จำกัด', destination: 'อุดรธานี', status: 'สำเร็จ' },
  ]
})
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
