<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">สกุลเงิน</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-3 max-w-md">
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">สกุลเงินหลัก</label>
        <select v-model="documentSettingsStore.settings.currency.code" @change="applyPreset" class="input-field w-full">
          <option v-for="c in currencyOptions" :key="c.code" :value="c.code">{{ c.code }} — {{ c.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">สัญลักษณ์สกุลเงิน</label>
        <input v-model="documentSettingsStore.settings.currency.symbol" class="input-field w-full" />
      </div>
      <div class="text-xs text-muted bg-surface-2 rounded-lg p-3">
        ตัวอย่าง: {{ documentSettingsStore.settings.currency.symbol }}12,345.00
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

const currencyOptions = [
  { code: 'THB', symbol: '฿', label: 'บาทไทย' },
  { code: 'USD', symbol: '$', label: 'ดอลลาร์สหรัฐ' },
  { code: 'EUR', symbol: '€', label: 'ยูโร' },
]

const applyPreset = () => {
  const preset = currencyOptions.find((c) => c.code === documentSettingsStore.settings.currency.code)
  if (preset) documentSettingsStore.settings.currency.symbol = preset.symbol
}

const saved = ref(false)
const save = () => {
  onboardingStore.markDone('configuredDocumentSettings')
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>
