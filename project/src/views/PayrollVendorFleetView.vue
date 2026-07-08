<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">จ่ายรถร่วม (เจ้าของรถภายนอก)</h2>
      <div class="text-xs text-muted">สรุปยอดจ่ายให้เจ้าของรถร่วมตามจำนวนเที่ยวที่วิ่งงาน</div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[720px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ทะเบียนรถ</th>
            <th class="px-4 py-3 font-semibold">เจ้าของรถ</th>
            <th class="px-4 py-3 font-semibold text-right">จำนวนเที่ยว</th>
            <th class="px-4 py-3 font-semibold text-right">ยอดจ่าย</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in vendorFleetPayouts" :key="row.plate" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ row.plate }}</td>
            <td class="px-4 py-3 text-muted">{{ row.owner }}</td>
            <td class="px-4 py-3 text-right text-text">{{ row.trips }}</td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(row.amount) }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', row.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
                {{ row.paid ? 'จ่ายแล้ว' : 'รอจ่าย' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const vendorFleetPayouts = [
  { plate: '72-6628 อยุธยา', owner: 'สมหมาย เพียรงาน', trips: 14, amount: 24500, paid: true },
  { plate: '70-9954 สระบุรี', owner: 'ธีรพงษ์ ขยันยิ่ง', trips: 11, amount: 19200, paid: false },
  { plate: '83-1102 นครปฐม', owner: 'อภิชาติ แสนดี', trips: 9, amount: 15800, paid: false },
]

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
