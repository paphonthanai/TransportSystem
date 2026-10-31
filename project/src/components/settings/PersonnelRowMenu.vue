<template>
  <div class="inline-block">
    <button ref="btnEl" @click="toggle" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2" title="เมนูเพิ่มเติม">
      <span class="material-symbols-rounded text-base">more_vert</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="open = false" @wheel="open = false"></div>
      <div
        v-if="open"
        ref="menuEl"
        class="fixed w-60 rounded-lg border border-border bg-surface shadow-lg z-50 py-1 text-sm"
        :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }"
      >
        <button v-for="item in visibleItems" :key="item.action" :disabled="item.disabled" @click="fire(item.action)" :class="['menu-item', item.danger ? 'text-red-700' : 'text-text']">
          <span class="material-symbols-rounded text-base">{{ item.icon }}</span>
          {{ item.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { PersonnelRow, PersonnelRowAction } from '@/utils/personnelDirectory'

/**
 * เมนู ⋮ ของทุกแถวในหน้า "ผู้ใช้งานและบุคลากร" — ทุกแถวมีเมนูเหมือนกัน แสดงเฉพาะคำสั่งที่ใช้ได้กับแถวนั้น
 * (มี/ไม่มีบัญชี login, เป็นคนขับ/เสมียน, สิทธิ์ผู้ดูแลระบบ) แทนที่จะมีเมนูเฉพาะแถวที่มีบัญชี
 */
const props = defineProps<{ row: PersonnelRow; isAdmin: boolean; isSelf: boolean }>()

const emit = defineEmits<{ action: [action: PersonnelRowAction] }>()

const visibleItems = computed(() => {
  const { row, isAdmin, isSelf } = props
  const hasRegistry = !!(row.driver || row.staff)
  const items: { action: PersonnelRowAction; label: string; icon: string; show: boolean; disabled?: boolean; danger?: boolean }[] = [
    { action: 'detail', label: 'รายละเอียดคนขับ', icon: 'visibility', show: !!row.driver?.id },
    { action: 'edit-account', label: 'แก้ไขบัญชี login', icon: 'manage_accounts', show: !!row.user && hasRegistry && isAdmin },
    { action: 'setup-login', label: 'ตั้งค่าบัญชีเข้าแอป', icon: 'key', show: !row.user && !!row.driver && isAdmin },
    { action: 'reset-password', label: 'ส่งลิงก์ตั้งรหัสผ่านใหม่', icon: 'password', show: !!row.user && isAdmin },
    {
      action: 'toggle-active',
      label: row.user?.active ? 'ปิดใช้งานบัญชี' : 'เปิดใช้งานบัญชี',
      icon: row.user?.active ? 'block' : 'check_circle',
      show: !!row.user && isAdmin,
      disabled: isSelf,
    },
    { action: 'remove', label: row.driver ? 'ลบจากทะเบียนคนขับ' : row.staff ? 'ลบจากทะเบียนเสมียน' : 'ลบบัญชีถาวร', icon: 'delete', show: true, disabled: !hasRegistry && isSelf, danger: true },
    { action: 'delete-account', label: 'ลบบัญชี login ถาวร', icon: 'delete_forever', show: !!row.user && hasRegistry && isAdmin, disabled: isSelf, danger: true },
  ]
  return items.filter((i) => i.show)
})

const open = ref(false)
const btnEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLDivElement | null>(null)
const menuPos = ref({ top: 0, left: 0 })

/** Teleport ไป body + คำนวณตำแหน่งจากปุ่มจริง (แบบเดียวกับ UserActionMenu) ไม่พอที่ด้านล่างพลิกขึ้นบน */
const toggle = async () => {
  if (open.value || !btnEl.value) {
    open.value = false
    return
  }
  const rect = btnEl.value.getBoundingClientRect()
  menuPos.value = { top: rect.bottom + 4, left: Math.max(8, rect.right - 240) }
  open.value = true
  await nextTick()
  const h = menuEl.value?.offsetHeight || 0
  if (h && rect.bottom + 4 + h > window.innerHeight) menuPos.value = { ...menuPos.value, top: Math.max(8, rect.top - h - 4) }
}

const fire = (action: PersonnelRowAction) => {
  open.value = false
  emit('action', action)
}
</script>

<style scoped>
.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}
</style>
