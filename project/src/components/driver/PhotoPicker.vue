<template>
  <div class="space-y-2">
    <div class="text-xs font-semibold text-muted">{{ label }}</div>
    <img v-if="preview" :src="preview" class="w-full max-h-40 object-contain rounded-lg border border-border bg-white" />
    <label
      :class="[
        'w-full h-12 rounded-lg border border-border bg-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:bg-surface-2',
        busy && 'opacity-50 pointer-events-none',
      ]"
    >
      <span class="material-symbols-rounded text-xl">{{ busy ? 'progress_activity' : 'photo_camera' }}</span>
      {{ busy ? 'กำลังอัปโหลด...' : preview ? 'ถ่าย/เลือกรูปใหม่' : 'ถ่ายรูป / เลือกรูป' }}
      <input type="file" accept="image/*" capture="environment" class="hidden" :disabled="busy" @change="onChange" />
    </label>
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
