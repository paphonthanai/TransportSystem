<template>
  <div class="h-52">
    <div class="flex items-end justify-between gap-2 h-full">
      <div
        v-for="item in chartItems"
        :key="item.label"
        class="flex flex-col items-center justify-end gap-2"
      >
        <div
          :style="{ height: item.height + '%', background: item.color }"
          class="w-full max-w-[28px] rounded-t-2xl transition-all duration-500"
        ></div>
        <span class="text-[10px] text-muted text-center">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

const props = defineProps({
  type: {
    type: String as PropType<'revenue' | 'trips' | 'area-chart'>,
    default: 'revenue',
  },
})

const revenueData = [
  { label: 'ม.ค.', value: 45 },
  { label: 'ก.พ.', value: 52 },
  { label: 'มี.ค.', value: 62 },
  { label: 'เม.ย.', value: 58 },
  { label: 'พ.ค.', value: 72 },
  { label: 'มิ.ย.', value: 81 },
  { label: 'ก.ค.', value: 90 },
  { label: 'ส.ค.', value: 84 },
  { label: 'ก.ย.', value: 76 },
  { label: 'ต.ค.', value: 88 },
  { label: 'พ.ย.', value: 94 },
  { label: 'ธ.ค.', value: 100 },
]

const tripsData = [
  { label: 'จ.', value: 56 },
  { label: 'อ.', value: 48 },
  { label: 'พ.', value: 67 },
  { label: 'พฤ.', value: 72 },
  { label: 'ศ.', value: 58 },
  { label: 'ส.', value: 80 },
  { label: 'อา.', value: 63 },
]

const areaData = [
  { label: 'ม.ค.', value: 40 },
  { label: 'ก.พ.', value: 55 },
  { label: 'มี.ค.', value: 70 },
  { label: 'เม.ย.', value: 65 },
  { label: 'พ.ค.', value: 80 },
  { label: 'มิ.ย.', value: 92 },
]

const chartItems = computed(() => {
  if (props.type === 'trips') {
    return tripsData.map((item) => ({
      label: item.label,
      height: Math.max(item.value, 10),
      color: 'linear-gradient(180deg, #eff6ff 0%, #2563eb 100%)',
    }))
  }

  if (props.type === 'area-chart') {
    return areaData.map((item) => ({
      label: item.label,
      height: Math.max(item.value, 10),
      color: 'linear-gradient(180deg, #60a5fa 0%, #38bdf8 100%)',
    }))
  }

  return revenueData.map((item) => ({
    label: item.label,
    height: Math.max(item.value, 10),
    color: 'linear-gradient(180deg, #2563eb 0%, #60a5fa 100%)',
  }))
})
</script>
