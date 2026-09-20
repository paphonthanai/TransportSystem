<template>
  <div class="space-y-6">
    <h2 class="text-lg font-bold text-text">เงื่อนไขวางบิล</h2>
    <div class="text-xs text-muted">
      กำหนดว่างานลักษณะใดถึงจะนำเข้ารายการวางบิลได้ ระบบจะตรวจสอบเงื่อนไขนี้ก่อนอนุญาตให้เพิ่มงานเข้ารายการวางบิลเสมอ
    </div>

    <div class="card-lg">
      <div class="font-bold text-text mb-3">สถานะงานที่วางบิลได้</div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <label v-for="status in allStatuses" :key="status" class="flex items-center gap-2 text-sm text-text" :class="isMandatory(status) ? 'opacity-70' : 'cursor-pointer'">
          <input
            type="checkbox"
            :checked="isStatusAllowed(status)"
            :disabled="isMandatory(status)"
            @change="toggleStatus(status)"
            class="w-4 h-4"
          />
          {{ bookingStatusLabel[status] }}
          <span v-if="isMandatory(status)" class="text-xs text-muted">(บังคับของระบบ แก้ไม่ได้)</span>
        </label>
      </div>
      <div class="text-xs text-muted mt-2">
        "ส่งของสำเร็จ" และ "อยู่ระหว่างขนส่ง" เป็นเงื่อนไขบังคับของระบบวางบิลจริง ปิดไม่ได้ — เลือกเพิ่มสถานะอื่นได้ตามต้องการ
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="font-bold text-text">เงื่อนไขเพิ่มเติม</div>

      <label class="flex items-start gap-3 cursor-pointer">
        <input v-model="billingRuleStore.rule.requirePOD" type="checkbox" class="w-4 h-4 mt-0.5" />
        <span class="text-sm text-text">
          ต้องมี POD ครบทุกรายการ
          <span class="block text-xs text-muted">
            แจ้งเตือนก่อนวางบิลว่าบางรายการยังไม่มีรูปหลักฐานการส่ง (POD) ครบ — เป็นคำเตือนเท่านั้น ไม่บล็อกการวางบิล
            (เงื่อนไข POD ต้องผ่านการอนุมัติจากออฟฟิศเป็นเงื่อนไขบังคับตอนออกใบเสร็จ/รับชำระเงินแทน)
          </span>
        </span>
      </label>

      <label class="flex items-start gap-3 cursor-pointer">
        <input v-model="billingRuleStore.rule.requirePrice" type="checkbox" class="w-4 h-4 mt-0.5" />
        <span class="text-sm text-text">
          ราคาต้องตรงกับที่ตกลงไว้
          <span class="block text-xs text-muted">ค่าเที่ยว + ค่าใช้จ่ายเพิ่มเติม ต้องรวมแล้วเท่ากับราคาที่ตกลงกับลูกค้า (ปกติไม่จำเป็นต้องเปิด เพราะตรวจสอบได้อีกครั้งตอนอยู่ในรายการวางบิล)</span>
        </span>
      </label>

      <label class="flex items-start gap-3 opacity-60">
        <input :checked="billingRuleStore.rule.requireApproval" type="checkbox" disabled class="w-4 h-4 mt-0.5" />
        <span class="text-sm text-text">
          ต้องผ่านการอนุมัติก่อน
          <span class="block text-xs text-amber-600">ฟีเจอร์ในอนาคต (Future Feature) — แอปนี้ยังไม่มีระบบอนุมัติงาน จึงยังไม่มีผลใดๆ กับการวางบิลจริงในตอนนี้</span>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBillingRuleStore, MANDATORY_BILLING_STATUSES } from '@/stores/billingRule'
import { bookingStatusLabel } from '@/utils/bookingStatus'
import type { BookingStatus } from '@/types'

const billingRuleStore = useBillingRuleStore()

const allStatuses = Object.keys(bookingStatusLabel) as BookingStatus[]

const isMandatory = (status: BookingStatus) => MANDATORY_BILLING_STATUSES.includes(status)

const isStatusAllowed = (status: BookingStatus) => isMandatory(status) || billingRuleStore.rule.allowedJobStatus.includes(status)

const toggleStatus = (status: BookingStatus) => {
  if (isMandatory(status)) return
  const list = billingRuleStore.rule.allowedJobStatus
  const idx = list.indexOf(status)
  if (idx === -1) list.push(status)
  else list.splice(idx, 1)
}
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
