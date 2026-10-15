<template>
  <div class="w-full relative" @mouseleave="hover = null">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-56 select-none">
      <!-- เส้นกริด + ตัวเลขแกน Y (ย่อ K/M) เพื่อให้รู้สเกลของแท่ง -->
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
        <text :x="padLeft - 6" :y="gridY(i - 1) + 3" text-anchor="end" class="axis-text">{{ compact(tickValue(i - 1)) }}</text>
      </g>

      <!-- กราฟแท่งแบบจัดกลุ่ม: 1 เดือน (label) = 1 กลุ่ม ในกลุ่มมีแท่งของแต่ละซีรีส์ที่เปิดแสดงอยู่เรียงติดกัน -->
      <g v-for="(label, gi) in labels" :key="label">
        <rect
          v-if="hover === gi"
          :x="padLeft + groupWidth * gi"
          :y="padTop"
          :width="groupWidth"
          :height="height - padTop - padBottom"
          fill="currentColor"
          opacity="0.06"
        />
        <rect
          v-for="(s, si) in visibleSeries"
          :key="s.key"
          :x="barX(gi, si)"
          :y="barY(s.data[gi] || 0)"
          :width="barWidth"
          :height="barHeight(s.data[gi] || 0)"
          :fill="s.color"
          :opacity="hover === null || hover === gi ? 1 : 0.45"
          rx="2"
        />
      </g>

      <!-- พื้นที่ hover ครอบเต็มความสูงของแต่ละเดือน (แท่งเล็กก็ชี้ติด) -->
      <rect
        v-for="(label, gi) in labels"
        :key="'hit-' + label"
        :x="padLeft + groupWidth * gi"
        :y="padTop"
        :width="groupWidth"
        :height="height - padTop - padBottom"
        fill="transparent"
        class="cursor-pointer"
        @mouseenter="hover = gi"
        @click="hover = hover === gi ? null : gi"
      />
    </svg>

    <!-- tooltip: เดือน + ค่าของทุกซีรีส์ที่แสดงอยู่ -->
    <div
      v-if="hover !== null"
      class="absolute z-10 pointer-events-none rounded-lg border border-border bg-surface shadow-lg px-3 py-2 text-xs min-w-[190px]"
      :style="tooltipStyle"
    >
      <div class="font-semibold text-text mb-1">{{ labels[hover] }}</div>
      <div v-for="s in visibleSeries" :key="s.key" class="flex items-center justify-between gap-4 py-0.5">
        <span class="flex items-center gap-1.5 text-muted">
          <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: s.color }"></span>
          {{ s.label || s.key }}
        </span>
        <span class="font-bold text-text tabular-nums">{{ format(s.data[hover] || 0) }}</span>
      </div>
    </div>

    <div class="grid mt-1" :style="{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`, marginLeft: `${(padLeft / width) * 100}%`, marginRight: `${(padRight / width) * 100}%` }">
      <span
        v-for="(label, i) in labels"
        :key="label"
        class="text-[10px] text-center transition-colors"
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

const width = 640
const height = 220
const padLeft = 44
const padRight = 8
const padTop = 10
const padBottom = 8

const hover = ref<number | null>(null)

const visibleSeries = computed(() => props.series.filter((s) => s.visible !== false))

/** สเกลตามค่าสูงสุดของซีรีส์ที่แสดงอยู่ (ซ่อนซีรีส์แล้วสเกลปรับตาม) */
const maxValue = computed(() => Math.max(1, ...visibleSeries.value.flatMap((s) => s.data)))

const plotHeight = height - padTop - padBottom
const groupWidth = computed(() => (width - padLeft - padRight) / Math.max(1, props.labels.length))
const barWidth = computed(() => Math.max(2, (groupWidth.value * 0.8) / Math.max(1, visibleSeries.value.length)))
const barX = (groupIndex: number, seriesIndex: number) =>
  padLeft + groupWidth.value * groupIndex + groupWidth.value * 0.1 + barWidth.value * seriesIndex
const barHeight = (v: number) => (Math.max(0, v) / maxValue.value) * plotHeight
const barY = (v: number) => padTop + plotHeight - barHeight(v)

/** เส้นกริดแนวนอน 5 เส้น: index 0 = บนสุด (ค่าสูงสุด) ... index 4 = เส้นฐาน (0) */
const gridY = (i: number) => padTop + (plotHeight / 4) * i
const tickValue = (i: number) => maxValue.value * (1 - i / 4)

const compact = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`
  if (a >= 1_000) return `${(v / 1_000).toFixed(a >= 10_000 ? 0 : 1)}K`
  return String(Math.round(v))
}
const format = (v: number) => `฿${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** วาง tooltip เหนือกลุ่มที่ชี้อยู่ และพลิกไปอีกฝั่งเมื่อชิดขอบขวา กันล้นกรอบ */
const tooltipStyle = computed(() => {
  const i = hover.value ?? 0
  const centerPct = ((padLeft + groupWidth.value * (i + 0.5)) / width) * 100
  return centerPct > 62
    ? { right: `${100 - centerPct + 2}%`, top: '4px' }
    : { left: `${centerPct + 2}%`, top: '4px' }
})
</script>

<style scoped>
.axis-text {
  font-size: 10px;
  fill: var(--color-muted, #6b7280);
}
</style>
