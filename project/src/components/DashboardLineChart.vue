<template>
  <div class="w-full relative" @mouseleave="hover = null">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-44 select-none">
      <g v-for="i in 5" :key="i">
        <line
          :x1="padLeft"
          :x2="width - padRight"
          :y1="gridY(i - 1)"
          :y2="gridY(i - 1)"
          stroke="var(--color-border, #e5e7eb)"
          :stroke-dasharray="i === 1 ? undefined : '3 3'"
          stroke-width="1"
        />
        <text :x="padLeft - 6" :y="gridY(i - 1) + 3" text-anchor="end" class="axis-text">{{ compact(maxValue * (1 - (i - 1) / 4)) }}</text>
      </g>
      <line v-if="hover !== null" :x1="x(hover)" :x2="x(hover)" :y1="padTop" :y2="height - padBottom" stroke="currentColor" opacity="0.15" />
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
          :r="hover === i ? 5 : 3"
          :fill="s.color"
        />
      </template>
      <!-- พื้นที่ hover ต่อจุด (ครอบเต็มความสูง) -->
      <rect
        v-for="(label, i) in labels"
        :key="'hit-' + label"
        :x="x(i) - hitWidth / 2"
        :y="padTop"
        :width="hitWidth"
        :height="height - padTop - padBottom"
        fill="transparent"
        class="cursor-pointer"
        @mouseenter="hover = i"
        @click="hover = hover === i ? null : i"
      />
    </svg>

    <div
      v-if="hover !== null"
      class="absolute z-10 pointer-events-none rounded-lg border border-border bg-surface shadow-lg px-3 py-2 text-xs min-w-[170px]"
      :style="tooltipStyle"
    >
      <div class="font-semibold text-text mb-1">{{ labels[hover] }}</div>
      <div v-for="s in visibleSeries" :key="s.key" class="flex items-center justify-between gap-4 py-0.5">
        <span class="flex items-center gap-1.5 text-muted">
          <span class="w-2.5 h-2.5 rounded-full" :style="{ background: s.color }"></span>
          {{ s.label || s.key }}
        </span>
        <span class="font-bold text-text tabular-nums">{{ format(s.data[hover] || 0) }}</span>
      </div>
    </div>

    <div class="flex justify-between mt-1 px-1">
      <span
        v-for="(label, i) in labels"
        :key="label"
        class="text-[10px] transition-colors"
        :class="hover === i ? 'text-text font-bold' : 'text-muted'"
      >
        {{ label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  labels: string[]
  series: { key: string; label?: string; color: string; data: number[]; visible?: boolean }[]
}>()

const width = 600
const height = 190
const padLeft = 44
const padRight = 12
const padTop = 10
const padBottom = 10

const hover = ref<number | null>(null)

const visibleSeries = computed(() => props.series.filter((s) => s.visible !== false))

const maxValue = computed(() => {
  const all = props.series.flatMap((s) => s.data)
  return Math.max(1, ...all)
})

const plotHeight = height - padTop - padBottom
const x = (index: number) => {
  const count = props.labels.length - 1 || 1
  return padLeft + ((width - padLeft - padRight) / count) * index
}
const hitWidth = computed(() => (width - padLeft - padRight) / Math.max(1, props.labels.length - 1))

const y = (value: number) => padTop + plotHeight - (value / maxValue.value) * plotHeight
const gridY = (i: number) => padTop + (plotHeight / 4) * i

const points = (s: { data: number[] }) => s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ')

const compact = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`
  if (a >= 1_000) return `${(v / 1_000).toFixed(a >= 10_000 ? 0 : 1)}K`
  return String(Math.round(v))
}
const format = (v: number) => `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const tooltipStyle = computed(() => {
  const i = hover.value ?? 0
  const centerPct = (x(i) / width) * 100
  return centerPct > 62 ? { right: `${100 - centerPct + 2}%`, top: '4px' } : { left: `${centerPct + 2}%`, top: '4px' }
})
</script>

<style scoped>
.axis-text {
  font-size: 10px;
  fill: var(--color-muted, #6b7280);
}
</style>
