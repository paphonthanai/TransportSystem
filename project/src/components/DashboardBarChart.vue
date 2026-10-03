<template>
  <div class="w-full">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-48">
      <line
        v-for="i in 4"
        :key="i"
        :x1="padding"
        :x2="width - padding"
        :y1="padding + ((height - padding * 2) / 4) * i"
        :y2="padding + ((height - padding * 2) / 4) * i"
        stroke="var(--color-border, #e5e7eb)"
        stroke-width="1"
      />
      <!-- กราฟแท่งแบบจัดกลุ่ม: 1 เดือน (label) = 1 กลุ่ม ในกลุ่มมีแท่งของแต่ละซีรีส์ที่เปิดแสดงอยู่เรียงติดกัน -->
      <g v-for="(label, gi) in labels" :key="label">
        <rect
          v-for="(s, si) in visibleSeries"
          :key="s.key"
          :x="barX(gi, si)"
          :y="barY(s.data[gi] || 0)"
          :width="barWidth"
          :height="barHeight(s.data[gi] || 0)"
          :fill="s.color"
          rx="2"
        >
          <title>{{ label }} · {{ s.label }}: {{ format(s.data[gi] || 0) }}</title>
        </rect>
      </g>
    </svg>
    <div class="grid mt-1" :style="{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }">
      <span v-for="label in labels" :key="label" class="text-[10px] text-muted text-center">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  labels: string[]
  series: { key: string; label?: string; color: string; data: number[]; visible?: boolean }[]
}>()

const width = 600
const height = 190
const padding = 12

const visibleSeries = computed(() => props.series.filter((s) => s.visible !== false))

/** สเกลตามค่าสูงสุดของซีรีส์ที่แสดงอยู่ (ซ่อนซีรีส์แล้วสเกลปรับตาม) */
const maxValue = computed(() => Math.max(1, ...visibleSeries.value.flatMap((s) => s.data)))

const groupWidth = computed(() => (width - padding * 2) / Math.max(1, props.labels.length))
const barWidth = computed(() => Math.max(2, (groupWidth.value * 0.8) / Math.max(1, visibleSeries.value.length)))
const barX = (groupIndex: number, seriesIndex: number) =>
  padding + groupWidth.value * groupIndex + groupWidth.value * 0.1 + barWidth.value * seriesIndex
const barHeight = (v: number) => (Math.max(0, v) / maxValue.value) * (height - padding * 2)
const barY = (v: number) => height - padding - barHeight(v)
const format = (v: number) => `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
</script>
