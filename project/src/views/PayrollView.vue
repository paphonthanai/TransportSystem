<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">เงินเดือนเสมียน (พนักงานออฟฟิศ)</h2>
      <div class="flex-1"></div>
      <select v-model="period" class="input-field">
        <option value="2569-07">กรกฎาคม 2569</option>
        <option value="2569-06">มิถุนายน 2569</option>
        <option value="2569-05">พฤษภาคม 2569</option>
      </select>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[720px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">พนักงาน</th>
            <th class="px-4 py-3 font-semibold">ตำแหน่ง</th>
            <th class="px-4 py-3 font-semibold text-right">เงินเดือนฐาน</th>
            <th class="px-4 py-3 font-semibold text-right">โบนัส/OT</th>
            <th class="px-4 py-3 font-semibold text-right">หัก</th>
            <th class="px-4 py-3 font-semibold text-right">สุทธิ</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="staff in staffPayroll" :key="staff.name" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ staff.name }}</td>
            <td class="px-4 py-3 text-muted">{{ staff.position }}</td>
            <td class="px-4 py-3 text-right text-text">{{ formatBaht(staff.base) }}</td>
            <td class="px-4 py-3 text-right text-green-600">{{ formatBaht(staff.bonus) }}</td>
            <td class="px-4 py-3 text-right text-red-500">-{{ formatBaht(staff.deduction) }}</td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ formatBaht(staff.base + staff.bonus - staff.deduction) }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', staff.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
                {{ staff.paid ? 'จ่ายแล้ว' : 'รอจ่าย' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const period = ref('2569-07')

const staffPayroll = [
  { name: 'สุนิสา แจ้งใจ', position: 'เสมียนบัญชี', base: 18000, bonus: 1500, deduction: 750, paid: true },
  { name: 'อรุณี ทองพูล', position: 'เสมียนเอกสาร', base: 16000, bonus: 800, deduction: 640, paid: true },
  { name: 'กิตติ วงศ์ษา', position: 'ธุรการ', base: 15500, bonus: 0, deduction: 620, paid: false },
]

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
