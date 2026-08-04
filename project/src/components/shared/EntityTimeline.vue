<template>
  <div v-if="entries.length" class="space-y-3">
    <div v-for="(entry, idx) in entries" :key="entry.id" class="flex gap-3">
      <div class="flex flex-col items-center flex-shrink-0">
        <span class="w-2.5 h-2.5 rounded-full bg-primary mt-1.5"></span>
        <span v-if="idx !== entries.length - 1" class="w-px flex-1 bg-border"></span>
      </div>
      <div class="pb-3 min-w-0">
        <div class="text-sm text-text">{{ entry.action }}</div>
        <div class="text-xs text-muted mt-0.5">{{ formatDateTime(entry.timestamp) }} · {{ entry.actor }}</div>
      </div>
    </div>
  </div>
  <div v-else class="text-sm text-muted">ยังไม่มีประวัติ</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBookingStore } from '@/stores/booking'

/** แสดงประวัติ (Timeline) เฉพาะของงาน/รายการวางบิล/เอกสารรายการเดียว เรียงเก่า→ใหม่ (อ่านเป็นลำดับเหตุการณ์) ต่างจากหน้า Log กลางที่เรียงใหม่→เก่าเพื่อเฝ้าดูภาพรวม */
const props = defineProps<{
  bookingId?: string
  batchId?: string
  docId?: string
}>()

const bookingStore = useBookingStore()

const entries = computed(() =>
  bookingStore.logs
    .filter(
      (log) =>
        (props.bookingId && log.bookingId === props.bookingId) ||
        (props.batchId && log.batchId === props.batchId) ||
        (props.docId && log.docId === props.docId)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
)

const formatDateTime = (date: Date) => new Date(date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
</script>
