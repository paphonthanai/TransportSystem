<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">หมายเหตุเอกสาร</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-4">
      <div class="text-xs text-muted">ข้อความเหล่านี้จะแสดงเป็นหมายเหตุท้ายเอกสารแต่ละประเภทโดยอัตโนมัติ</div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">หมายเหตุท้ายใบแจ้งหนี้</label>
        <textarea v-model="documentSettingsStore.settings.notes.invoice" rows="3" class="input-field w-full !h-auto py-2" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">หมายเหตุท้ายใบเสร็จรับเงิน</label>
        <textarea v-model="documentSettingsStore.settings.notes.receipt" rows="3" class="input-field w-full !h-auto py-2" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">หมายเหตุท้ายหนังสือรับรองหัก ณ ที่จ่าย</label>
        <textarea v-model="documentSettingsStore.settings.notes.wht" rows="3" class="input-field w-full !h-auto py-2" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useOnboardingStore } from '@/stores/onboarding'

const documentSettingsStore = useDocumentSettingsStore()
const onboardingStore = useOnboardingStore()

const saved = ref(false)
const save = () => {
  onboardingStore.markDone('configuredDocumentSettings')
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>
