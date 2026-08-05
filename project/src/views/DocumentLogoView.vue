<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">ข้อมูลบริษัท / โลโก้และตรายาง</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-3">
      <div class="font-bold text-text mb-1">ข้อมูลบริษัท</div>
      <div class="text-xs text-muted -mt-2 mb-2">ข้อมูลนี้จะถูกดึงไปแสดงในเอกสารพิมพ์/PDF ทุกประเภทโดยอัตโนมัติ (ใบเสนอราคา, ใบวางบิล, ใบแจ้งหนี้, ใบเสร็จ ฯลฯ) กรอกให้ครบก่อนเริ่มออกเอกสารจริง</div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">ชื่อบริษัท</label>
        <input v-model="documentSettingsStore.settings.company.name" class="input-field w-full" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">ที่อยู่</label>
        <input v-model="documentSettingsStore.settings.company.address" class="input-field w-full" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">รหัสไปรษณีย์</label>
        <input v-model="documentSettingsStore.settings.company.zipCode" class="input-field w-full max-w-xs" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">เลขประจำตัวผู้เสียภาษี</label>
        <input v-model="documentSettingsStore.settings.company.taxId" class="input-field w-full max-w-xs" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทร</label>
        <input v-model="documentSettingsStore.settings.company.phone" class="input-field w-full max-w-xs" />
      </div>
    </div>

    <div class="card-lg">
      <div class="font-bold text-text mb-3">โลโก้และตรายาง</div>
      <div class="grid grid-cols-2 gap-6 max-w-md">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">โลโก้บริษัท</label>
          <label class="relative block border-2 border-dashed border-border rounded-xl aspect-square cursor-pointer hover:border-primary transition-all overflow-hidden flex items-center justify-center">
            <input type="file" accept="image/*" class="hidden" @change="onFileSelected($event, 'logo')" />
            <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-full h-full object-contain p-2" />
            <span v-else class="material-symbols-rounded text-2xl text-muted">add_photo_alternate</span>
          </label>
          <button v-if="documentSettingsStore.settings.company.logo" type="button" @click="documentSettingsStore.settings.company.logo = null" class="text-[11px] text-red-600 font-semibold mt-1">ลบโลโก้</button>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ตรายาง</label>
          <label class="relative block border-2 border-dashed border-border rounded-xl aspect-square cursor-pointer hover:border-primary transition-all overflow-hidden flex items-center justify-center">
            <input type="file" accept="image/*" class="hidden" @change="onFileSelected($event, 'stamp')" />
            <img v-if="documentSettingsStore.settings.company.stamp" :src="documentSettingsStore.settings.company.stamp" class="w-full h-full object-contain p-2" />
            <span v-else class="material-symbols-rounded text-2xl text-muted">add_photo_alternate</span>
          </label>
          <button v-if="documentSettingsStore.settings.company.stamp" type="button" @click="documentSettingsStore.settings.company.stamp = null" class="text-[11px] text-red-600 font-semibold mt-1">ลบตรายาง</button>
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

const onFileSelected = (event: Event, target: 'logo' | 'stamp') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    documentSettingsStore.settings.company[target] = reader.result as string
  }
  reader.readAsDataURL(file)
}

const saved = ref(false)
const save = () => {
  onboardingStore.markDone('configuredDocumentSettings')
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>
