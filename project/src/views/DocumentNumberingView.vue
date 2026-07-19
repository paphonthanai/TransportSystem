<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">เลขรันเอกสาร</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-5">
      <div v-for="doc in docTypes" :key="doc.key" class="border-b border-border last:border-0 pb-5 last:pb-0">
        <div class="font-semibold text-text mb-2">{{ doc.label }}</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">คำนำหน้าเลขที่</label>
            <input v-model="documentSettingsStore.settings.numbering[doc.key].prefix" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">จำนวนหลัก</label>
            <input v-model.number="documentSettingsStore.settings.numbering[doc.key].padding" type="number" min="1" max="8" class="input-field w-full" />
          </div>
          <div>
            <div class="text-xs font-semibold text-muted mb-1">ตัวอย่างเลขที่เอกสาร</div>
            <div class="input-field w-full flex items-center bg-surface-2 text-text font-semibold">{{ preview(doc.key) }}</div>
          </div>
        </div>
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

const docTypes: { key: 'invoice' | 'receipt' | 'wht'; label: string }[] = [
  { key: 'invoice', label: 'ใบแจ้งหนี้' },
  { key: 'receipt', label: 'ใบเสร็จรับเงิน' },
  { key: 'wht', label: 'หนังสือรับรองหัก ณ ที่จ่าย' },
]

const preview = (key: 'invoice' | 'receipt' | 'wht') => {
  const cfg = documentSettingsStore.settings.numbering[key]
  const year = new Date().getFullYear() + 543
  return `${cfg.prefix}${year}-${String(1).padStart(cfg.padding || 1, '0')}`
}

const saved = ref(false)
const save = () => {
  onboardingStore.markDone('configuredDocumentSettings')
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>
