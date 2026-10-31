<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <div v-for="section in sections" :key="section.key" class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-semibold" :class="section.key === 'additions' ? 'text-green-700' : 'text-red-600'">{{ section.title }}</span>
        <button type="button" @click="addLine(section.key)" class="inline-flex items-center gap-0.5 text-xs text-primary hover:underline" :title="`เพิ่ม${section.title}`">
          <span class="material-symbols-rounded text-base">add_circle</span>เพิ่มรายการ
        </button>
      </div>
      <div v-if="!modelValue[section.key].length" class="text-xs text-muted">ไม่มี — กด + เพื่อเพิ่ม</div>
      <div v-for="(line, i) in modelValue[section.key]" :key="i" class="flex items-center gap-1.5">
        <input
          :value="line.label"
          @input="setField(section.key, i, 'label', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="section.placeholder"
          class="adj-input flex-1 min-w-0"
        />
        <input
          :value="line.amount || ''"
          @input="setField(section.key, i, 'amount', Number(($event.target as HTMLInputElement).value))"
          type="number"
          min="0"
          step="0.01"
          placeholder="บาท"
          class="adj-input w-28 text-right"
        />
        <button type="button" @click="removeLine(section.key, i)" class="text-red-500 hover:text-red-700" title="ลบรายการนี้">
          <span class="material-symbols-rounded text-base">delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IncomeAdjustmentLine, IncomeAdjustments } from '@/utils/incomeAdjustments'

/** แก้ "รายได้ส่วนเพิ่ม" และ "หักค่าใช้จ่าย" (ระบุรายละเอียด/ราคาเอง เพิ่มได้หลายรายการ) ก่อนออกเอกสารรายได้ */
const props = defineProps<{ modelValue: IncomeAdjustments }>()
const emit = defineEmits<{ 'update:modelValue': [value: IncomeAdjustments] }>()

type SectionKey = keyof IncomeAdjustments
const sections: { key: SectionKey; title: string; placeholder: string }[] = [
  { key: 'additions', title: 'รายได้ส่วนเพิ่ม', placeholder: 'รายละเอียดรายได้' },
  { key: 'deductions', title: 'หักค่าใช้จ่าย', placeholder: 'รายละเอียดการหัก' },
]

const update = (key: SectionKey, lines: IncomeAdjustmentLine[]) => emit('update:modelValue', { ...props.modelValue, [key]: lines })
const addLine = (key: SectionKey) => update(key, [...props.modelValue[key], { label: '', amount: 0 }])
const removeLine = (key: SectionKey, index: number) => update(key, props.modelValue[key].filter((_, i) => i !== index))
const setField = (key: SectionKey, index: number, field: keyof IncomeAdjustmentLine, value: string | number) =>
  update(key, props.modelValue[key].map((l, i) => (i === index ? { ...l, [field]: value } : l)))
</script>

<style scoped>
.adj-input {
  @apply h-8 px-2 border border-border rounded-lg bg-surface text-text text-sm focus:outline-none focus:border-primary;
}
</style>
