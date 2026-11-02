<template>
  <div class="space-y-2">
    <div class="text-xs font-semibold text-muted">{{ label }}</div>
    <img v-if="preview" :src="preview" class="w-full max-h-40 object-contain rounded-lg border border-border bg-white" />
    <div v-if="busy" class="w-full h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 opacity-50">
      <span class="material-symbols-rounded text-xl">progress_activity</span>
      กำลังอัปโหลด...
    </div>
    <!-- 2 ทาง: เปิดกล้องจากแอป กับเลือกรูปที่มีในเครื่อง — มือถือบางรุ่นปิดหน้าเว็บทิ้งระหว่างเปิดกล้องจนรูปไม่กลับมา
         ถ่ายด้วยแอปกล้องของเครื่องก่อน แล้วกด "เลือกจากคลังรูป" แทนได้ ไม่ติดอยู่ขั้นตอนนี้ -->
    <div v-else class="grid grid-cols-2 gap-2">
      <label class="h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:bg-surface-2">
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
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; preview?: string; busy?: boolean; error?: string }>()
const emit = defineEmits<{ file: [file: File] }>()

const onChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('file', file)
}
</script>
