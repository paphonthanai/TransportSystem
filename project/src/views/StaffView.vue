<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">สมุดรายชื่อ · เสมียน (พนักงานออฟฟิศ)</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มพนักงาน
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[640px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
            <th class="px-4 py-3 font-semibold">ตำแหน่ง</th>
            <th class="px-4 py-3 font-semibold">เบอร์โทร</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="staff in staffList" :key="staff.name" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ staff.name }}</td>
            <td class="px-4 py-3 text-muted">{{ staff.position }}</td>
            <td class="px-4 py-3 text-muted">{{ staff.phone }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">ใช้งาน</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="openDialog(staff)" class="btn-sm">แก้ไข</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingIndex === null ? 'เพิ่มพนักงาน' : 'แก้ไขพนักงาน' }}</div>
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
              <label class="block text-xs font-semibold text-muted mb-1">ตำแหน่ง</label>
              <input v-model="form.position" class="input-field w-full" />
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

const staffList = ref([
  { name: 'สุนิสา แจ้งใจ', position: 'เสมียนบัญชี', phone: '02-555-0111' },
  { name: 'อรุณี ทองพูล', position: 'เสมียนเอกสาร', phone: '02-555-0122' },
  { name: 'กิตติ วงศ์ษา', position: 'ธุรการ', phone: '02-555-0133' },
])

const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
const form = ref({ name: '', position: '', phone: '' })

const openDialog = (staff?: (typeof staffList.value)[number]) => {
  if (staff) {
    editingIndex.value = staffList.value.indexOf(staff)
    form.value = { ...staff }
  } else {
    editingIndex.value = null
    form.value = { name: '', position: '', phone: '' }
  }
  showDialog.value = true
}

const save = () => {
  if (!form.value.name) return
  if (editingIndex.value === null) {
    staffList.value.unshift({ ...form.value })
  } else {
    staffList.value[editingIndex.value] = { ...form.value }
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
