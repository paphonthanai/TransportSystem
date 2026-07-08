<template>
  <div class="space-y-6">
    <div class="flex gap-3 flex-wrap">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหารายการ, ผู้ทำรายการ..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
    </div>

    <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted whitespace-nowrap">เวลา</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ผู้ทำรายการ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">รายการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in filteredLogs" :key="log.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatDateTime(log.timestamp) }}</td>
              <td class="px-4 py-3 font-semibold text-text whitespace-nowrap">{{ log.actor }}</td>
              <td class="px-4 py-3 text-text">{{ log.action }}</td>
            </tr>
            <tr v-if="filteredLogs.length === 0">
              <td colspan="3" class="px-4 py-8 text-center text-muted">ไม่พบรายการ log</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBookingStore } from '@/stores/booking'

const bookingStore = useBookingStore()
const searchQuery = ref('')

const sortedLogs = computed(() =>
  [...bookingStore.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
)

const filteredLogs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sortedLogs.value
  return sortedLogs.value.filter((log) => log.action.toLowerCase().includes(q) || log.actor.toLowerCase().includes(q))
})

const formatDateTime = (date: Date) =>
  new Date(date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
