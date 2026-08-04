<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/40" @click.self="$emit('close')">
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-surface shadow-xl flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 class="text-base font-bold text-text">ตั้งค่าเอกสาร สำหรับเอกสาร {{ number }}</h3>
          <button @click="$emit('close')" class="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2">
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        <div class="px-5 py-4 space-y-3 overflow-y-auto">
          <div class="text-sm font-semibold text-text">ฟังก์ชั่นเอกสารแยกรายการ</div>
          <p class="text-xs text-muted">เลือกรายการที่ต้องการแสดงแยกในเอกสารนี้ (มีผลเฉพาะเอกสารฉบับนี้)</p>
          <label class="settings-row">
            <input type="checkbox" :checked="modelValue.vat" @change="update('vat', ($event.target as HTMLInputElement).checked)" class="w-4 h-4" />
            ภาษีมูลค่าเพิ่ม
          </label>
          <label class="settings-row">
            <input type="checkbox" :checked="modelValue.wht" @change="update('wht', ($event.target as HTMLInputElement).checked)" class="w-4 h-4" />
            หัก ณ ที่จ่าย
          </label>
          <label class="settings-row">
            <input type="checkbox" :checked="modelValue.discount" @change="update('discount', ($event.target as HTMLInputElement).checked)" class="w-4 h-4" />
            ส่วนลด
          </label>
        </div>
        <div class="mt-auto px-5 py-3 border-t border-border flex justify-end">
          <button @click="$emit('close')" class="btn-primary">เสร็จสิ้น</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export interface DocumentSettingsToggles {
  vat: boolean
  wht: boolean
  discount: boolean
}

const props = defineProps<{ open: boolean; number: string; modelValue: DocumentSettingsToggles }>()
const emit = defineEmits<{ close: []; 'update:modelValue': [value: DocumentSettingsToggles] }>()

const update = (key: keyof DocumentSettingsToggles, value: boolean) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.settings-row {
  @apply flex items-center gap-2 text-sm text-text cursor-pointer border border-border rounded-lg px-3 py-2.5 hover:bg-surface-2;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}
</style>
