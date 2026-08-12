<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-xs font-bold text-muted uppercase tracking-wide">ผู้ติดต่อ (Contacts)</div>
      <div class="text-[11px] text-muted">{{ rows.length }} รายชื่อ</div>
    </div>

    <div v-for="row in rows" :key="row.id" class="border border-border rounded-lg p-3 space-y-1">
      <div class="flex items-center justify-between gap-2">
        <div class="font-semibold text-sm text-text flex items-center gap-1.5">
          {{ row.name || '-' }}
          <span v-if="row.isPrimary" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">Primary</span>
          <span v-if="!row.active" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">ปิดใช้งาน</span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <button @click="startEdit(row)" class="text-muted hover:text-text">แก้ไข</button>
          <button v-if="!row.isPrimary && row.active" @click="setPrimary(row)" class="text-primary hover:underline">ตั้งเป็น Primary</button>
          <button @click="toggleActive(row)" class="text-muted hover:text-text">{{ row.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน' }}</button>
          <button @click="remove(row)" class="text-red-500 hover:text-red-600">ลบ</button>
        </div>
      </div>
      <div class="text-xs text-muted">{{ row.position || '-' }}</div>
      <div class="text-xs text-muted">โทร: {{ row.phone || '-' }} · อีเมล: {{ row.email || '-' }}</div>
    </div>

    <div class="border border-dashed border-border rounded-lg p-3 space-y-2">
      <div class="text-xs font-semibold text-muted">{{ editingId ? 'แก้ไขผู้ติดต่อ' : 'เพิ่มผู้ติดต่อใหม่' }}</div>
      <div class="grid grid-cols-2 gap-2">
        <input v-model="draft.name" placeholder="ชื่อผู้ติดต่อ" class="input-field h-8 text-xs" />
        <input v-model="draft.position" placeholder="ตำแหน่ง" class="input-field h-8 text-xs" />
        <input v-model="draft.phone" placeholder="เบอร์โทร" class="input-field h-8 text-xs" />
        <input v-model="draft.email" type="email" placeholder="อีเมล" class="input-field h-8 text-xs" />
      </div>
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-1.5 text-xs text-text cursor-pointer">
          <input type="checkbox" v-model="draft.isPrimary" />
          ตั้งเป็น Primary Contact
        </label>
        <div class="flex items-center gap-2">
          <button v-if="editingId" @click="cancelEdit" class="btn-sm">ยกเลิก</button>
          <button @click="save" :disabled="!draft.name" class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed">{{ editingId ? 'บันทึก' : 'เพิ่ม' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { useContactStore, type ContactRecord } from '@/stores/contacts'

const props = defineProps<{ customerId: string }>()

const contactStore = useContactStore()
const rows = computed(() => contactStore.contactsForCustomer(props.customerId))

type Draft = { name: string; position: string; phone: string; email: string; isPrimary: boolean }
const emptyDraft = (): Draft => ({ name: '', position: '', phone: '', email: '', isPrimary: false })
const draft = reactive<Draft>(emptyDraft())

const editingId = ref<string | null>(null)

const startEdit = (row: ContactRecord) => {
  editingId.value = row.id ?? null
  Object.assign(draft, { name: row.name, position: row.position, phone: row.phone, email: row.email, isPrimary: row.isPrimary })
}

const cancelEdit = () => {
  editingId.value = null
  Object.assign(draft, emptyDraft())
}

const save = async () => {
  if (!draft.name) return
  const payload = { customerId: props.customerId, name: draft.name, position: draft.position, phone: draft.phone, email: draft.email, isPrimary: draft.isPrimary }
  if (editingId.value) {
    await contactStore.updateContact(editingId.value, payload)
  } else {
    await contactStore.createContact(payload)
  }
  cancelEdit()
}

const setPrimary = async (row: ContactRecord) => {
  if (!row.id) return
  await contactStore.updateContact(row.id, { customerId: row.customerId, name: row.name, position: row.position, phone: row.phone, email: row.email, isPrimary: true, active: row.active })
}

const toggleActive = async (row: ContactRecord) => {
  if (!row.id) return
  await contactStore.updateContact(row.id, { customerId: row.customerId, name: row.name, position: row.position, phone: row.phone, email: row.email, isPrimary: row.isPrimary, active: !row.active })
}

const remove = async (row: ContactRecord) => {
  if (!row.id) return
  if (!confirm(`ยืนยันลบผู้ติดต่อ ${row.name}?`)) return
  await contactStore.deleteContact(row.id)
}
</script>

<style scoped>
.input-field {
  @apply px-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-sm {
  @apply h-8 px-3 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}
</style>
