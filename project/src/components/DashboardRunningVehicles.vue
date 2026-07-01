<template>
  <div class="card-lg">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-2 h-2 rounded-full bg-green-600 shadow-lg shadow-green-600"></span>
      <div class="font-bold text-text">รถที่กำลังวิ่ง</div>
    </div>
    <div class="space-y-2">
      <div v-for="vehicle in vehicles" :key="vehicle.id" class="flex items-center gap-3 py-2 border-b border-border last:border-0">
        <div class="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-rounded text-base">local_shipping</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-text">{{ vehicle.plate }} · {{ vehicle.driver }}</div>
          <div class="text-xs text-muted">{{ vehicle.route }}</div>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold" :class="vehicle.active ? 'text-green-600' : 'text-amber-600'">{{ vehicle.progress }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const vehicles = computed(() => [
  { id: 1, plate: 'กก 1001', driver: 'สมชาย', route: 'นครสวรรค์ → กรุงเทพฯ', progress: 72, active: true },
  { id: 2, plate: 'กก 1002', driver: 'วิชัย', route: 'พิษณุโลก → ลพบุรี', progress: 64, active: true },
  { id: 3, plate: 'กก 1003', driver: 'กัญญา', route: 'ชลบุรี → ระยอง', progress: 88, active: true },
  { id: 4, plate: 'กก 1004', driver: 'มาลี', route: 'ราชบุรี → นครปฐม', progress: 43, active: false },
  { id: 5, plate: 'กก 1005', driver: 'ดำรง', route: 'ขอนแก่น → นครราชสีมา', progress: 51, active: true },
])
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
