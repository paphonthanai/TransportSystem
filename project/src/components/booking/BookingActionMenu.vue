<template>
  <div class="inline-block">
    <button ref="btnEl" @click="toggle" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
      <span class="material-symbols-rounded text-base">more_vert</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="open = false" @wheel="open = false"></div>
      <div
        v-if="open"
        ref="menuEl"
        class="fixed w-48 rounded-lg border border-border bg-surface shadow-lg z-50 py-1 text-sm max-h-[calc(100vh-16px)] overflow-y-auto"
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
          v-if="booking.status !== 'DELIVERED' && booking.items.length > 0"
          @click="fire('complete')"
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-green-700"
        >
          <span class="material-symbols-rounded text-base">task_alt</span>
          จบงาน{{ booking.status === 'IN_TRANSIT' || booking.status === 'DELIVERING' ? '' : ' (ข้ามขั้นตอน)' }}
        </button>
        <button
          v-if="canHardDelete"
          @click="fire('delete')"
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-red-700"
        >
          <span class="material-symbols-rounded text-base">delete_forever</span>
          ลบถาวร
        </button>
        <button
          v-if="booking.status === 'ASSIGNED' || booking.status === 'ACCEPTED'"
          @click="fire('cancel')"
          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-red-600"
        >
          <span class="material-symbols-rounded text-base">undo</span>
          ยกเลิกจ่ายงาน
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { Booking } from '@/types'

defineProps<{ booking: Booking; canHardDelete?: boolean }>()

const emit = defineEmits<{
  view: []
  edit: []
  'start-transit': []
  complete: []
  delete: []
  cancel: []
}>()

const open = ref(false)
const btnEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLDivElement | null>(null)
const menuPos = ref({ top: 0, left: 0 })

/** เปิดเมนูแบบ Teleport ไป body พร้อมคำนวณตำแหน่งจากปุ่มจริง กันไม่ให้โดน overflow-hidden ของตารางบัง — วางใต้ปุ่มก่อน
 *  เสมอ แล้ว "พลิก" ขึ้นข้างบนแทนถ้าไม่พอที่ (เช่น แถวสุดท้ายของตารางอยู่ใกล้ขอบล่างจอ/ใกล้ taskbar) กันเมนูโดนตัด
 *  จนกดปุ่มที่อยู่ท้ายเมนู (เช่น "ลบถาวร") ไม่ได้เลยเหมือนที่เจอตอนเหลืองานแค่ 1 แถว — ต้องรอ nextTick ให้เมนู render
 *  ก่อนถึงจะวัดความสูงจริงได้ (จำนวนปุ่มในเมนูไม่คงที่ ขึ้นกับ v-if ของแต่ละสถานะงาน เดาความสูงล่วงหน้าไม่ได้) */
const toggle = async () => {
  if (open.value) {
    open.value = false
    return
  }
  if (!btnEl.value) return
  const rect = btnEl.value.getBoundingClientRect()
  const menuWidth = 192
  menuPos.value = {
    top: rect.bottom + 4,
    left: Math.max(8, rect.right - menuWidth),
  }
  open.value = true
  await nextTick()
  const menuHeight = menuEl.value?.offsetHeight || 0
  if (menuHeight && rect.bottom + 4 + menuHeight > window.innerHeight) {
    menuPos.value = { ...menuPos.value, top: Math.max(8, rect.top - menuHeight - 4) }
  }
}

const fire = (action: 'view' | 'edit' | 'start-transit' | 'complete' | 'delete' | 'cancel') => {
  open.value = false
  /** defineEmits ทำให้ emit มีชนิดเป็น overload แยกต่อชื่อ event — เรียกด้วยตัวแปร union ไม่ผ่าน TS ทั้งที่ทุกแขนง
   *  ถูกต้องจริง (ข้อจำกัดที่รู้จักของ TS กับ overloaded function + union argument) ฟังก์ชัน fire() เองยังคง
   *  บังคับ action ให้ตรง union เป๊ะสำหรับผู้เรียกทุกจุด จึง cast เฉพาะจุดเรียก emit ภายในนี้จุดเดียว */
  ;(emit as (event: string) => void)(action)
}
</script>
