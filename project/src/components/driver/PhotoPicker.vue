<template>
  <div class="space-y-2">
    <div class="text-xs font-semibold text-muted">{{ label }}</div>
    <img v-if="preview" :src="preview" class="w-full max-h-40 object-contain rounded-lg border border-border bg-white" />
    <div v-if="busy" class="w-full h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 opacity-50">
      <span class="material-symbols-rounded text-xl">progress_activity</span>
      กำลังอัปโหลด...
    </div>
    <!-- กล้องในแอป: หน้าเว็บไม่ไปอยู่เบื้องหลังจึงไม่ถูกมือถือปิดทิ้งระหว่างถ่าย (ดู InAppCamera.vue) เครื่องที่ไม่รองรับใช้แอปกล้องของเครื่อง
         "เลือกจากคลังรูป" เป็นทางสำรองเสมอ ถ่ายด้วยแอปกล้องก่อนแล้วเลือกมาแนบได้ ไม่ติดอยู่ขั้นตอนนี้ -->
    <div v-else class="grid grid-cols-2 gap-2">
      <button
        v-if="inAppCameraSupported"
        type="button"
        @click="cameraOpen = true"
        class="h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:bg-surface-2"
      >
        <span class="material-symbols-rounded text-xl">photo_camera</span>
        {{ preview ? 'ถ่ายใหม่' : 'ถ่ายรูป' }}
      </button>
      <label v-else class="h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:bg-surface-2">
        <span class="material-symbols-rounded text-xl">photo_camera</span>
        {{ preview ? 'ถ่ายใหม่' : 'ถ่ายรูป' }}
        <input type="file" accept="image/*" capture="environment" class="hidden" @change="onChange" />
      </label>
      <label class="h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:bg-surface-2">
        <span class="material-symbols-rounded text-xl">photo_library</span>
        เลือกจากคลังรูป
        <input type="file" accept="image/*" class="hidden" @change="onChange" />
      </label>
    </div>
    <div v-if="error" class="text-xs text-red-600">{{ error }}</div>
    <InAppCamera v-if="cameraOpen" :label="label" @close="cameraOpen = false" @file="(f) => emit('file', f)" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import InAppCamera from '@/components/driver/InAppCamera.vue'

defineProps<{ label: string; preview?: string; busy?: boolean; error?: string }>()
const emit = defineEmits<{ file: [file: File] }>()

const inAppCameraSupported = !!navigator.mediaDevices?.getUserMedia
const cameraOpen = ref(false)

const onChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('file', file)
}
</script>
