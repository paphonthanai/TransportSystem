<template>
  <div class="space-y-6">
    <h2 class="text-lg font-bold text-text">เงื่อนไขวางบิล</h2>
    <div class="text-xs text-muted">
      กำหนดว่างานลักษณะใดถึงจะนำเข้ารายการวางบิลได้ ระบบจะตรวจสอบเงื่อนไขนี้ก่อนอนุญาตให้เพิ่มงานเข้ารายการวางบิลเสมอ
    </div>

    <div class="card-lg">
      <div class="font-bold text-text mb-3">สถานะงานที่วางบิลได้</div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <label v-for="status in allStatuses" :key="status" class="flex items-center gap-2 text-sm text-text cursor-pointer">
          <input type="checkbox" :checked="isStatusAllowed(status)" @change="toggleStatus(status)" class="w-4 h-4" />
          {{ bookingStatusLabel[status] }}
        </label>
      </div>
      <div v-if="billingRuleStore.rule.allowedJobStatus.length === 0" class="text-xs text-red-600 mt-2">
        ต้องเลือกอย่างน้อย 1 สถานะ ไม่เช่นนั้นจะไม่มีงานใดวางบิลได้เลย
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="font-bold text-text">เงื่อนไขเพิ่มเติม</div>

      <label class="flex items-start gap-3 cursor-pointer">
        <input v-model="billingRuleStore.rule.requirePOD" type="checkbox" class="w-4 h-4 mt-0.5" />
        <span class="text-sm text-text">
          ต้องมี POD ครบทุกรายการ
          <span class="block text-xs text-muted">ทุกสินค้าในงานต้องส่งสำเร็จและมีรูปหลักฐานการส่ง (POD) ครบก่อนจึงจะวางบิลได้</span>
        </span>
      </label>

      <label class="flex items-start gap-3 cursor-pointer">
        <input v-model="billingRuleStore.rule.requirePrice" type="checkbox" class="w-4 h-4 mt-0.5" />
        <span class="text-sm text-text">
          ราคาต้องตรงกับที่ตกลงไว้
          <span class="block text-xs text-muted">ค่าเที่ยว + ค่าใช้จ่ายเพิ่มเติม ต้องรวมแล้วเท่ากับราคาที่ตกลงกับลูกค้า (ปกติไม่จำเป็นต้องเปิด เพราะตรวจสอบได้อีกครั้งตอนอยู่ในรายการวางบิล)</span>
        </span>
      </label>

      <label class="flex items-start gap-3 cursor-pointer">
        <input v-model="billingRuleStore.rule.requireApproval" type="checkbox" class="w-4 h-4 mt-0.5" />
        <span class="text-sm text-text">
          ต้องผ่านการอนุมัติก่อน
          <span class="block text-xs text-amber-600">แอปนี้ยังไม่มีระบบอนุมัติงาน หากเปิดใช้เงื่อนไขนี้ จะไม่มีงานใดวางบิลได้เลยจนกว่าจะมีฟีเจอร์อนุมัติจริง</span>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBillingRuleStore } from '@/stores/billingRule'
import { bookingStatusLabel } from '@/utils/bookingStatus'
import type { BookingStatus } from '@/types'

const billingRuleStore = useBillingRuleStore()

const allStatuses = Object.keys(bookingStatusLabel) as BookingStatus[]

const isStatusAllowed = (status: BookingStatus) => billingRuleStore.rule.allowedJobStatus.includes(status)

const toggleStatus = (status: BookingStatus) => {
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
