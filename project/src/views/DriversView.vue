<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">สมุดรายชื่อ · พนักงานขับรถ</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มคนขับ
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[860px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
            <th class="px-4 py-3 font-semibold">เบอร์โทร</th>
            <th class="px-4 py-3 font-semibold">เลขบัตรประชาชน</th>
            <th class="px-4 py-3 font-semibold">ไอดี Line</th>
            <th class="px-4 py-3 font-semibold">เลขที่บัญชี</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="driver in drivers" :key="driver.name" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div :style="{ background: driver.avatarBg }" class="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold">{{ driver.name.charAt(0) }}</div>
                <div class="font-semibold text-text">{{ driver.name }}</div>
              </div>
            </td>
            <td class="px-4 py-3 text-muted">{{ driver.phone }}</td>
            <td class="px-4 py-3 text-muted">{{ driver.idCard || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ driver.lineId || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ driver.bankAccount || '-' }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="openDialog(driver)" class="btn-sm">แก้ไข</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingIndex === null ? 'เพิ่มคนขับ' : 'แก้ไขข้อมูลคนขับ' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อ-นามสกุล</label>
              <input v-model="form.name" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขบัตรประชาชน</label>
              <input v-model="form.idCard" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ที่อยู่</label>
              <input v-model="form.address" class="input-field w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ไอดี Line</label>
                <input v-model="form.lineId" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทร</label>
                <input v-model="form.phone" class="input-field w-full" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขที่บัญชี</label>
              <input v-model="form.bankAccount" class="input-field w-full" />
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

const drivers = ref([
  { name: 'สมชาย ทองดี', phone: '081-234-5678', idCard: '1-2345-67890-12-3', address: '12/4 ต.ปากน้ำ อ.เมือง จ.สระบุรี', lineId: 'somchai_td', bankAccount: '123-4-56789-0', avatarBg: '#3b82f6' },
  { name: 'ประเสริฐ มั่นคง', phone: '089-555-1212', idCard: '1-2345-67891-23-4', address: '45 ต.บางพลี อ.บางพลี จ.สมุทรปราการ', lineId: 'prasert_mk', bankAccount: '234-5-67890-1', avatarBg: '#10b981' },
  { name: 'วิรัตน์ ใจกล้า', phone: '086-777-9090', idCard: '1-2345-67892-34-5', address: '78 ต.หน้าเมือง อ.เมือง จ.ราชบุรี', lineId: 'wirat_jk', bankAccount: '345-6-78901-2', avatarBg: '#2563eb' },
  { name: 'สมหมาย เพียรงาน', phone: '087-345-6767', idCard: '1-2345-67893-45-6', address: '90 ต.หัวรอ อ.พระนครศรีอยุธยา จ.พระนครศรีอยุธยา', lineId: 'sommai_pn', bankAccount: '456-7-89012-3', avatarBg: '#ec4899' },
])

const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
const form = ref({ name: '', phone: '', idCard: '', address: '', lineId: '', bankAccount: '', avatarBg: '#3b82f6' })

const openDialog = (driver?: (typeof drivers.value)[number]) => {
  if (driver) {
    editingIndex.value = drivers.value.indexOf(driver)
    form.value = { ...driver }
  } else {
    editingIndex.value = null
    form.value = { name: '', phone: '', idCard: '', address: '', lineId: '', bankAccount: '', avatarBg: '#64748b' }
  }
  showDialog.value = true
}

const save = () => {
  if (!form.value.name) return
  if (editingIndex.value === null) {
    drivers.value.unshift({ ...form.value })
  } else {
    drivers.value[editingIndex.value] = { ...form.value }
  }
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

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
