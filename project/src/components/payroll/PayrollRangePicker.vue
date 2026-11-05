<template>
  <div class="flex items-center gap-2 flex-wrap">
    <input :value="payrollRangeMonth(modelValue)" type="month" class="input-field" title="เลือกทั้งเดือน" @change="onMonth" />
    <span class="text-xs text-muted">ตั้งแต่</span>
    <input :value="modelValue.from" type="date" class="input-field" @change="onFrom" />
    <span class="text-xs text-muted">ถึง</span>
    <input :value="modelValue.to" type="date" class="input-field" @change="onTo" />
  </div>
</template>

<script setup lang="ts">
import { monthRange, payrollRangeMonth, type PayrollRange } from '@/utils/payrollRange'

const props = defineProps<{ modelValue: PayrollRange }>()
const emit = defineEmits<{ 'update:modelValue': [value: PayrollRange] }>()

const valueOf = (event: Event) => (event.target as HTMLInputElement).value

const onMonth = (event: Event) => {
  const month = valueOf(event)
  if (month) emit('update:modelValue', monthRange(month))
}
/** ล้างช่องวันที่ = คงค่าเดิม, วันเริ่มเลยวันสุดท้าย (หรือกลับกัน) = เลื่อนอีกฝั่งตาม ไม่ให้ช่วงกลับด้าน */
const onFrom = (event: Event) => {
  const from = valueOf(event)
  if (from) emit('update:modelValue', { from, to: props.modelValue.to < from ? from : props.modelValue.to })
}
const onTo = (event: Event) => {
  const to = valueOf(event)
  if (to) emit('update:modelValue', { from: props.modelValue.from > to ? to : props.modelValue.from, to })
}
</script>

<style scoped>
.input-field {
  @apply h-9 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}
</style>
