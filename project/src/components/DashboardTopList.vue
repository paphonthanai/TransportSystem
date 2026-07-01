<template>
  <div class="card-lg">
    <div class="flex items-center justify-between mb-3">
      <div class="font-bold text-text">{{ title }}</div>
      <span class="text-xs text-primary cursor-pointer">ดูทั้งหมด</span>
    </div>
    <div class="space-y-2">
      <div v-for="(item, index) in items" :key="index" class="flex items-center gap-2 py-2 border-b border-border last:border-0">
        <div v-if="type === 'drivers'" :style="{ background: item.color }" class="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {{ item.initial }}
        </div>
        <div v-else class="w-6 text-xs font-bold text-muted">{{ item.rank }}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-text truncate">{{ item.name }}</div>
          <div v-if="type === 'drivers'" class="text-xs text-muted">{{ item.trips }} เที่ยว</div>
          <div v-else class="h-1.5 bg-surface-2 rounded-full mt-1 overflow-hidden">
            <div :style="{ width: item.percentage + '%' }" class="h-full bg-primary rounded-full"></div>
          </div>
        </div>
        <div class="text-sm font-bold text-text whitespace-nowrap">{{ item.amount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

const props = defineProps({
  type: {
    type: String as PropType<'customers' | 'drivers'>,
    default: 'customers',
  },
  title: String,
})

const items = computed(() => {
  if (props.type === 'customers') {
    return [
      { rank: 1, name: 'บริษัท ABC จำกัด', percentage: 95, amount: '฿45.2M' },
      { rank: 2, name: 'บริษัท XYZ จำกัด', percentage: 78, amount: '฿28.5M' },
      { rank: 3, name: 'บริษัท DEF จำกัด', percentage: 65, amount: '฿18.3M' },
      { rank: 4, name: 'บริษัท GHI จำกัด', percentage: 52, amount: '฿12.1M' },
      { rank: 5, name: 'บริษัท JKL จำกัด', percentage: 45, amount: '฿8.7M' },
      { rank: 6, name: 'บริษัท MNO จำกัด', percentage: 42, amount: '฿7.6M' },
      { rank: 7, name: 'บริษัท PQR จำกัด', percentage: 37, amount: '฿6.9M' },
      { rank: 8, name: 'บริษัท STU จำกัด', percentage: 33, amount: '฿5.8M' },
      { rank: 9, name: 'บริษัท VWX จำกัด', percentage: 28, amount: '฿4.4M' },
      { rank: 10, name: 'บริษัท YZA จำกัด', percentage: 24, amount: '฿3.9M' },
    ]
  } else {
    return [
      { initial: 'ส', name: 'สมชาย ใจกล้า', color: '#3b82f6', trips: 284, amount: '฿142.5K' },
      { initial: 'ว', name: 'วิชัย เสียงแจ่ม', color: '#f97316', trips: 248, amount: '฿124.0K' },
      { initial: 'ก', name: 'กัญญา ใจดี', color: '#10b981', trips: 215, amount: '฿107.5K' },
      { initial: 'ม', name: 'มาลี ม่วงทอง', color: '#8b5cf6', trips: 198, amount: '฿99.0K' },
      { initial: 'ด', name: 'ดำรง สายสุข', color: '#ec4899', trips: 182, amount: '฿91.0K' },
      { initial: 'อ', name: 'อรทัย ศรีทอง', color: '#22c55e', trips: 176, amount: '฿86.4K' },
      { initial: 'ณ', name: 'ณัฐวุฒิ แก้วใส', color: '#8b5cf6', trips: 161, amount: '฿80.9K' },
      { initial: 'ป', name: 'ปวีณา ทองดี', color: '#fb923c', trips: 149, amount: '฿74.2K' },
      { initial: 'ธ', name: 'ธนพล เกื้อกูล', color: '#0ea5e9', trips: 135, amount: '฿68.7K' },
      { initial: 'ญ', name: 'ญาดา บุญมี', color: '#ec4899', trips: 126, amount: '฿63.1K' },
    ]
  }
})
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
