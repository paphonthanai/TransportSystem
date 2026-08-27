<template>
  <div class="flex items-center justify-end gap-1.5">
    <input type="checkbox" :checked="enabled" @change="onToggle" class="w-4 h-4 flex-shrink-0" />
    <input
      v-if="enabled"
      type="number"
      min="0"
      max="100"
      :value="modelValue"
      @input="onRateInput"
      class="input-field w-16 text-right"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentSettingsStore } from '@/stores/documentSettings'

/**
 * ช่องภาษี (%) รูปแบบ Checkbox + ช่องกรอก % แทนช่องกรอกตัวเลขเปล่าแบบเดิม — ใช้ร่วมกันทุกหน้า Create/Edit ที่มีตาราง
 * รายการ (BillingFormView/TaxInvoiceFormView/ReceiptFormView/QuotationFormView/DocumentConvertView) ไม่ติ๊ก = ไม่คิด
 * ภาษีรายการนั้น (vatRate ส่งเป็น undefined) ติ๊ก = คิดภาษีตาม % ที่กรอก ไม่มี Data Model ใหม่เลย — ยังคงเป็น field
 * vatRate เดิมของ SalesDocumentItem ทุกประการ (ดู utils/documentTotals.ts computeRowVat) แค่เปลี่ยนวิธีกรอก/แสดงผล
 */
const props = defineProps<{ modelValue?: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: number | undefined): void }>()
const documentSettingsStore = useDocumentSettingsStore()

const enabled = computed(() => !!props.modelValue)

const onToggle = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked ? props.modelValue || documentSettingsStore.settings.vatRate || 7 : undefined)
}

const onRateInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:modelValue', Number.isFinite(value) ? value : undefined)
}
</script>
