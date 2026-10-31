<template>
  <div class="space-y-3">
    <div class="flex items-baseline justify-between gap-2">
      <div class="text-sm font-semibold text-text">{{ title }}</div>
      <div class="text-sm font-bold tabular-nums" :style="{ color: accent }">{{ format(total) }}</div>
    </div>
    <div class="flex items-center gap-4 flex-wrap">
      <svg viewBox="0 0 120 120" class="w-36 h-36 flex-shrink-0 -rotate-90" role="img" :aria-label="title">
        <circle cx="60" cy="60" :r="radius" fill="none" stroke="var(--color-border, #e5e7eb)" :stroke-width="thickness" />
        <circle
          v-for="(arc, i) in arcs"
          :key="arc.label"
          cx="60"
          cy="60"
          :r="radius"
          fill="none"
          :stroke="arc.color"
          :stroke-width="hover === i ? thickness + 4 : thickness"
          :stroke-dasharray="`${arc.length} ${circumference - arc.length}`"
          :stroke-dashoffset="-arc.offset"
          class="cursor-pointer transition-all"
          @mouseenter="hover = i"
          @mouseleave="hover = null"
        >
          <title>{{ arc.label }}: {{ format(arc.value) }} ({{ arc.percent }}%)</title>
        </circle>
      </svg>
      <div class="flex-1 min-w-[160px] space-y-1.5 text-xs">
        <div v-if="!segments.length" class="text-muted">ไม่มีข้อมูลในช่วงนี้</div>
        <div
          v-for="seg in segments"
          :key="seg.label"
          class="flex items-center gap-2 rounded px-1 -mx-1"
          :class="hover !== null && arcIndex(seg.label) === hover ? 'bg-surface-2' : ''"
        >
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: seg.color }"></span>
          <span class="flex-1 text-text">{{ seg.label }}</span>
          <span class="tabular-nums font-semibold" :class="seg.value < 0 ? 'text-red-600' : 'text-text'">{{ format(seg.value) }}</span>
          <span class="tabular-nums text-muted w-10 text-right">{{ seg.value > 0 ? `${percentOf(seg.value)}%` : '-' }}</span>
        </div>
        <div v-if="segments.some((s) => s.value < 0)" class="text-[11px] text-amber-700">ยอดติดลบไม่แสดงในวงกลม</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/** แผนภูมิวงกลม (โดนัท) แบบ SVG ล้วน — แบบเดียวกับกราฟอื่นใน Dashboard ไม่ใช้ไลบรารีเพิ่ม */
const props = defineProps<{
  title: string
  segments: { label: string; value: number; color: string }[]
  accent?: string
  format: (value: number) => string
}>()

const radius = 44
const thickness = 18
const circumference = 2 * Math.PI * radius
const hover = ref<number | null>(null)

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0))
const positiveTotal = computed(() => props.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0))
const percentOf = (value: number) => (positiveTotal.value > 0 ? Math.round((value / positiveTotal.value) * 1000) / 10 : 0)

const arcs = computed(() => {
  let offset = 0
  return props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const length = positiveTotal.value > 0 ? (s.value / positiveTotal.value) * circumference : 0
      const arc = { ...s, length, offset, percent: percentOf(s.value) }
      offset += length
      return arc
    })
})
const arcIndex = (label: string) => arcs.value.findIndex((a) => a.label === label)
</script>
