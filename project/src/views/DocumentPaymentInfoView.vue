<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">ข้อมูลการรับชำระ</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-3">
      <div class="text-xs text-muted mb-1">ข้อมูลนี้จะแสดงในเอกสารใบแจ้งหนี้/ใบเสร็จรับเงิน เพื่อให้ลูกค้าโอนเงินได้สะดวก</div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ธนาคาร</label>
          <input v-model="documentSettingsStore.settings.payment.bankName" placeholder="เช่น ธนาคารกสิกรไทย" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ชื่อบัญชี</label>
          <input v-model="documentSettingsStore.settings.payment.accountName" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เลขที่บัญชี</label>
          <input v-model="documentSettingsStore.settings.payment.accountNumber" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">พร้อมเพย์</label>
          <input v-model="documentSettingsStore.settings.payment.promptPay" class="input-field w-full" />
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">หมายเหตุการชำระเงิน</label>
        <textarea v-model="documentSettingsStore.settings.payment.note" rows="3" class="input-field w-full !h-auto py-2" />
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
