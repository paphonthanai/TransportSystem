<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">รายได้พนักงานขับรถ</h2>
      <div class="text-xs text-muted">คำนวณจากเบี้ยเลี้ยงของงานที่ส่งของสำเร็จแล้ว (ไม่ขึ้นกับสถานะวางบิล)</div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[720px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold text-right">จำนวนเที่ยว</th>
            <th class="px-4 py-3 font-semibold text-right">เบี้ยเลี้ยงรวม</th>
            <th class="px-4 py-3 font-semibold text-right">เพิ่ม/ลดหนี้สะสม</th>
            <th class="px-4 py-3 font-semibold text-right">รายได้สุทธิ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in driverIncome" :key="row.driver" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ row.driver }}</td>
            <td class="px-4 py-3 text-right text-text">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right text-text">{{ formatBaht(row.baseAllowance) }}</td>
            <td class="px-4 py-3 text-right" :class="row.debtNet >= 0 ? 'text-red-500' : 'text-green-600'">
              {{ row.debtNet >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(row.debtNet)) }}
            </td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(row.netIncome) }}</td>
          </tr>
          <tr v-if="driverIncome.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีงานที่จบแล้วในระบบ</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBookingStore } from '@/stores/booking'

const bookingStore = useBookingStore()

const driverIncome = computed(() => {
  const finished = bookingStore.bookings.filter((b) => b.status === 'DELIVERED' && b.driverName)
  const byDriver = new Map<string, { trips: number; baseAllowance: number; debtNet: number; netIncome: number }>()
  finished.forEach((b) => {
    const driver = b.driverName as string
    const entry = byDriver.get(driver) || { trips: 0, baseAllowance: 0, debtNet: 0, netIncome: 0 }
    const net = b.debtAdjustments?.reduce((sum, d) => sum + d.amount, 0) || 0
    entry.trips += b.items.length
    entry.baseAllowance += b.allowance || 0
    entry.debtNet += net
    entry.netIncome += b.finalAllowance ?? b.allowance ?? 0
    byDriver.set(driver, entry)
  })
  return Array.from(byDriver.entries()).map(([driver, data]) => ({ driver, ...data }))
})

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
