<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold">สมุดรายชื่อ · ลูกค้า/คู่ค้า</h2>
      <button @click="openDialog()" class="btn-primary">
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

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">เพิ่มลูกค้า</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อลูกค้า</label>
              <input v-model="form.name" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ผู้ติดต่อ</label>
              <input v-model="form.contact" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทร</label>
              <input v-model="form.phone" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" class="btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customers = ref([
  { name: 'บจก. ศรีไทยคอนกรีต', contact: 'คุณวิชัย', phone: '02-555-0100', jobs: 84, total: '฿1.42M', initial: 'ศ', avatarBg: '#3b82f6' },
  { name: 'บมจ. พฤกษา', contact: 'คุณนภา', phone: '02-555-0200', jobs: 67, total: '฿1.18M', initial: 'พ', avatarBg: '#10b981' },
  { name: 'หจก. รุ่งเรืองวัสดุ', contact: 'คุณสมพร', phone: '035-221-330', jobs: 52, total: '฿890K', initial: 'ร', avatarBg: '#2563eb' },
  { name: 'บจก. แลนด์ดีเวลลอป', contact: 'คุณกานต์', phone: '02-555-0400', jobs: 48, total: '฿760K', initial: 'ล', avatarBg: '#8b5cf6' },
  { name: 'บจก. เมกาโฮม', contact: 'คุณปิติ', phone: '02-555-0500', jobs: 39, total: '฿620K', initial: 'ม', avatarBg: '#f97316' },
  { name: 'หจก. ทวีทรัพย์', contact: 'คุณมานะ', phone: '035-441-220', jobs: 31, total: '฿498K', initial: 'ท', avatarBg: '#ec4899' },
])

const showDialog = ref(false)
const form = ref({ name: '', contact: '', phone: '' })

const openDialog = () => {
  form.value = { name: '', contact: '', phone: '' }
  showDialog.value = true
}

const save = () => {
  if (!form.value.name) return
  customers.value.unshift({
    name: form.value.name,
    contact: form.value.contact,
    phone: form.value.phone,
    jobs: 0,
    total: '฿0',
    initial: form.value.name.charAt(0),
    avatarBg: '#64748b',
  })
  showDialog.value = false
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
