<template>
  <div class="text-xs leading-relaxed text-gray-600">
    <div v-if="addressLine" class="max-w-xs">ที่อยู่ {{ addressLine }}</div>
    <div v-if="company.phone">Tel : {{ company.phone }}</div>
    <div v-if="company.taxId">เลขประจำตัวผู้เสียภาษีอากร {{ company.taxId }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentSettingsStore } from '@/stores/documentSettings'

/** ที่อยู่ / เบอร์โทร / เลขผู้เสียภาษีของบริษัท ใต้ชื่อบริษัทในหัวเอกสารทุกใบ (แก้ได้ที่หน้า "ข้อมูลบริษัท") บรรทัดไหนว่างไม่แสดง */
const documentSettingsStore = useDocumentSettingsStore()
const company = computed(() => documentSettingsStore.settings.company)
const addressLine = computed(() => {
  const address = company.value.address?.trim() || ''
  const zip = company.value.zipCode?.trim() || ''
  // ที่อยู่ที่พิมพ์รหัสไปรษณีย์ไว้ในช่องที่อยู่แล้วไม่ต่อซ้ำ
  return zip && !address.includes(zip) ? [address, zip].filter(Boolean).join(' ') : address
})
</script>
