<template>
  <div class="w-full">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-40">
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
      <polyline
        v-for="s in visibleSeries"
        :key="s.key"
        :points="points(s)"
        fill="none"
        :stroke="s.color"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <template v-for="s in visibleSeries" :key="s.key + '-dots'">
        <circle
          v-for="(v, i) in s.data"
          :key="i"
          :cx="x(i)"
          :cy="y(v)"
          r="3"
          :fill="s.color"
        />
      </template>
    </svg>
    <div class="flex justify-between mt-1 px-1">
      <span v-for="label in labels" :key="label" class="text-[10px] text-muted">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  labels: string[]
  series: { key: string; color: string; data: number[]; visible?: boolean }[]
}>()

const width = 600
const height = 180
const padding = 12

const visibleSeries = computed(() => props.series.filter((s) => s.visible !== false))

const maxValue = computed(() => {
  const all = props.series.flatMap((s) => s.data)
  return Math.max(1, ...all)
})

const x = (index: number) => {
  const count = props.labels.length - 1 || 1
  return padding + ((width - padding * 2) / count) * index
}

const y = (value: number) => {
  return height - padding - (value / maxValue.value) * (height - padding * 2)
}

const points = (s: { data: number[] }) => s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ')
</script>
