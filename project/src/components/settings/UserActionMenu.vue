<template>
  <div class="inline-block">
    <button ref="btnEl" @click="toggle" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
      <span class="material-symbols-rounded text-base">more_vert</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="open = false" @wheel="open = false"></div>
      <div
        v-if="open"
        class="fixed w-56 rounded-lg border border-border bg-surface shadow-lg z-50 py-1 text-sm"
        :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }"
      >
        <button @click="fire('reset-password')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text">
          <span class="material-symbols-rounded text-base">password</span>
          ส่งลิงก์ตั้งรหัสผ่านใหม่
        </button>
        <button :disabled="isSelf" @click="fire('toggle-active')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">{{ user.active ? 'block' : 'check_circle' }}</span>
          {{ user.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน' }}
        </button>
        <button
          v-if="canHardDelete"
          :disabled="isSelf"
          @click="fire('delete')"
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span class="material-symbols-rounded text-base">delete_forever</span>
          ลบถาวร
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { UserProfile } from '@/stores/users'

defineProps<{ user: UserProfile; canHardDelete?: boolean; isSelf?: boolean }>()

const emit = defineEmits<{
  'reset-password': []
  'toggle-active': []
  delete: []
}>()

const open = ref(false)
const btnEl = ref<HTMLButtonElement | null>(null)
const menuPos = ref({ top: 0, left: 0 })

/** เปิดเมนูแบบ Teleport ไป body พร้อมคำนวณตำแหน่งจากปุ่มจริง กันไม่ให้โดน overflow-x-auto ของตารางบัง
 *  (รูปแบบเดียวกับ BookingActionMenu.vue) */
const toggle = () => {
  if (!open.value && btnEl.value) {
    const rect = btnEl.value.getBoundingClientRect()
    const menuWidth = 224
    menuPos.value = {
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - menuWidth),
    }
  }
  open.value = !open.value
}

const fire = (action: 'reset-password' | 'toggle-active' | 'delete') => {
  open.value = false
  ;(emit as (event: string) => void)(action)
}
</script>
