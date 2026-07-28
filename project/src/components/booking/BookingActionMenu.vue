<template>
  <div class="inline-block">
    <button ref="btnEl" @click="toggle" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
      <span class="material-symbols-rounded text-base">more_vert</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="open = false" @wheel="open = false"></div>
      <div
        v-if="open"
        class="fixed w-48 rounded-lg border border-border bg-surface shadow-lg z-50 py-1 text-sm"
        :style="{ top: menuPos.top + 'px', left: menuPos.left + 'px' }"
      >
        <button @click="fire('view')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text">
          <span class="material-symbols-rounded text-base">visibility</span>
          ดูรายละเอียด
        </button>
        <button v-if="booking.status !== 'DELIVERED'" @click="fire('edit')" class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text">
          <span class="material-symbols-rounded text-base">edit</span>
          แก้ไขงาน
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Booking } from '@/types'

defineProps<{ booking: Booking }>()

const emit = defineEmits<{
  view: []
  edit: []
  'start-transit': []
  complete: []
}>()

const open = ref(false)
const btnEl = ref<HTMLButtonElement | null>(null)
const menuPos = ref({ top: 0, left: 0 })

/** เปิดเมนูแบบ Teleport ไป body พร้อมคำนวณตำแหน่งจากปุ่มจริง กันไม่ให้โดน overflow-hidden ของตารางบัง */
const toggle = () => {
  if (!open.value && btnEl.value) {
    const rect = btnEl.value.getBoundingClientRect()
    const menuWidth = 192
    menuPos.value = {
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - menuWidth),
    }
  }
  open.value = !open.value
}

const fire = (action: 'view' | 'edit' | 'start-transit' | 'complete') => {
  open.value = false
  emit(action)
}
</script>
