<template>
  <div>
    <label class="field-label">ผู้ติดต่อ</label>
    <select :value="modelValue || ''" @change="onChange" class="input-field w-full" :disabled="!customerId">
      <option value="">- ไม่ระบุผู้ติดต่อ -</option>
      <option v-for="c in options" :key="c.id" :value="c.id">{{ optionLabel(c) }}</option>
    </select>
    <p v-if="customerId && hasNoContacts" class="text-xs text-amber-600 mt-1">ลูกค้ารายนี้ยังไม่มีรายชื่อผู้ติดต่อ</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useContactStore, type ContactRecord } from '@/stores/contacts'

/**
 * เลือกผู้ติดต่อของลูกค้า (ContactRecord) มาใช้บนเอกสาร — แสดงเฉพาะผู้ติดต่อที่ active = true ให้เลือกใหม่ได้
 * ยกเว้นตัวที่ modelValue อ้างอิงอยู่แล้ว (เช่นตอนแก้ไขเอกสารเก่าที่เคยเลือกไว้ แล้ว contact นั้นถูกปิดใช้งานภายหลัง)
 * จะยังโชว์เป็นตัวเลือกอยู่ (มีป้าย "ปิดใช้งาน" กำกับ) เพื่อไม่ให้ค่าที่เลือกไว้หายไปเงียบๆ — ไม่ได้ควบคุม Snapshot
 * ตรงนี้ (ทำที่ resolveContactSnapshot ใน stores/salesDocuments.ts) แค่ควบคุมว่าเลือกใหม่ได้ไหมเท่านั้น
 */
const props = defineProps<{ customerId?: string; modelValue?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string | undefined): void }>()
const contactStore = useContactStore()

const allForCustomer = computed(() => (props.customerId ? contactStore.contactsForCustomer(props.customerId) : []))
const hasNoContacts = computed(() => allForCustomer.value.length === 0)

const options = computed(() => {
  const active = allForCustomer.value.filter((c) => c.active)
  if (props.modelValue && !active.some((c) => c.id === props.modelValue)) {
    const current = allForCustomer.value.find((c) => c.id === props.modelValue)
    if (current) return [...active, current]
  }
  return active
})

const optionLabel = (c: ContactRecord) => {
  const parts = [c.name]
  if (c.position) parts.push(`(${c.position})`)
  if (c.isPrimary) parts.push('— หลัก')
  if (!c.active) parts.push('— ปิดใช้งาน')
  return parts.join(' ')
}

const onChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value || undefined)
}
</script>
