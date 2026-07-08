<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">สมุดรายชื่อ · ผู้จำหน่าย</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">store</span>
        เพิ่มผู้จำหน่าย
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[640px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ผู้จำหน่าย</th>
            <th class="px-4 py-3 font-semibold">ประเภท</th>
            <th class="px-4 py-3 font-semibold">ผู้ติดต่อ</th>
            <th class="px-4 py-3 font-semibold">เบอร์โทร</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="vendor in vendors" :key="vendor.name" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ vendor.name }}</td>
            <td class="px-4 py-3 text-muted">{{ vendor.category }}</td>
            <td class="px-4 py-3 text-text">{{ vendor.contact }}</td>
            <td class="px-4 py-3 text-muted">{{ vendor.phone }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">ใช้งาน</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">เพิ่มผู้จำหน่าย</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้จำหน่าย</label>
              <input v-model="form.name" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ประเภท</label>
              <input v-model="form.category" placeholder="เช่น น้ำมัน, อะไหล่, ยาง" class="input-field w-full" />
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

const vendors = ref([
  { name: 'หจก. น้ำมันไทยรุ่งเรือง', category: 'น้ำมันเชื้อเพลิง', contact: 'คุณประยูร', phone: '035-611-220' },
  { name: 'บจก. ยางไทยเซอร์วิส', category: 'ยางรถบรรทุก', contact: 'คุณสมบัติ', phone: '02-444-8899' },
  { name: 'ร้านอะไหล่รุ่งโรจน์', category: 'อะไหล่รถบรรทุก', contact: 'คุณโรจน์', phone: '086-234-5566' },
])

const showDialog = ref(false)
const form = ref({ name: '', category: '', contact: '', phone: '' })

const openDialog = () => {
  form.value = { name: '', category: '', contact: '', phone: '' }
  showDialog.value = true
}

const save = () => {
  if (!form.value.name) return
  vendors.value.unshift({ ...form.value })
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
