<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold">ลูกค้า</h2>
      <button class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มลูกค้า
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[760px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ลูกค้า</th>
            <th class="px-4 py-3 font-semibold">ผู้ติดต่อ</th>
            <th class="px-4 py-3 font-semibold">เบอร์</th>
            <th class="px-4 py-3 font-semibold text-right">งานสะสม</th>
            <th class="px-4 py-3 font-semibold text-right">ยอดรวม</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.name" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div :style="{ background: customer.avatarBg }" class="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold">{{ customer.initial }}</div>
                <div class="font-semibold text-text">{{ customer.name }}</div>
              </div>
            </td>
            <td class="px-4 py-3 text-text">{{ customer.contact }}</td>
            <td class="px-4 py-3 text-muted">{{ customer.phone }}</td>
            <td class="px-4 py-3 text-right font-semibold text-text">{{ customer.jobs }}</td>
            <td class="px-4 py-3 text-right font-semibold text-text">{{ customer.total }}</td>
            <td class="px-4 py-3"><span class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">ใช้งาน</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const customers = [
  { name: 'บจก. ศรีไทยคอนกรีต', contact: 'คุณวิชัย', phone: '02-555-0100', jobs: 84, total: '฿1.42M', initial: 'ศ', avatarBg: '#3b82f6' },
  { name: 'บมจ. พฤกษา', contact: 'คุณนภา', phone: '02-555-0200', jobs: 67, total: '฿1.18M', initial: 'พ', avatarBg: '#10b981' },
  { name: 'หจก. รุ่งเรืองวัสดุ', contact: 'คุณสมพร', phone: '035-221-330', jobs: 52, total: '฿890K', initial: 'ร', avatarBg: '#2563eb' },
  { name: 'บจก. แลนด์ดีเวลลอป', contact: 'คุณกานต์', phone: '02-555-0400', jobs: 48, total: '฿760K', initial: 'ล', avatarBg: '#8b5cf6' },
  { name: 'บจก. เมกาโฮม', contact: 'คุณปิติ', phone: '02-555-0500', jobs: 39, total: '฿620K', initial: 'ม', avatarBg: '#f97316' },
  { name: 'หจก. ทวีทรัพย์', contact: 'คุณมานะ', phone: '035-441-220', jobs: 31, total: '฿498K', initial: 'ท', avatarBg: '#ec4899' },
]
</script>
