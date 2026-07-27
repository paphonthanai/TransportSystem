<template>
  <div ref="rootEl" class="relative inline-block text-left">
    <button @click="open = !open" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
      <span class="material-symbols-rounded text-base">more_vert</span>
    </button>
    <div
      v-if="open"
      class="absolute right-0 mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg z-20 py-1 text-sm"
    >
      <button @click="fire('view')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text">
        <span class="material-symbols-rounded text-base">visibility</span>
        ดูรายละเอียด
      </button>
      <button v-if="booking.status !== 'DELIVERED'" @click="fire('edit')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text">
        <span class="material-symbols-rounded text-base">edit</span>
        แก้ไขงาน
      </button>
      <button v-if="booking.status === 'WAITING_DISPATCH'" @click="fire('dispatch')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-primary">
        <span class="material-symbols-rounded text-base">local_shipping</span>
        จัดรถ / ส่งงาน
      </button>
      <button v-if="booking.status === 'ASSIGNED'" @click="fire('dispatch')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-amber-700">
        <span class="material-symbols-rounded text-base">sync_alt</span>
        เปลี่ยนรถ / คนขับ
      </button>
      <button v-if="booking.status === 'LOADED'" @click="fire('start-transit')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-indigo-700">
        <span class="material-symbols-rounded text-base">directions</span>
        เริ่มขนส่ง
      </button>
      <button
        v-if="booking.status === 'IN_TRANSIT' || booking.status === 'DELIVERING'"
        @click="fire('complete')"
        class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-green-700"
      >
        <span class="material-symbols-rounded text-base">task_alt</span>
        จบงาน
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Booking } from '@/types'

defineProps<{ booking: Booking }>()

const emit = defineEmits<{
  view: []
  edit: []
  dispatch: []
  'start-transit': []
  complete: []
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const fire = (action: 'view' | 'edit' | 'dispatch' | 'start-transit' | 'complete') => {
  open.value = false
  emit(action)
}

const handleClickOutside = (e: MouseEvent) => {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
