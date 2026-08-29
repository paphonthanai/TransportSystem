<template>
  <div class="space-y-4 max-w-2xl">
    <h2 class="text-lg font-bold text-text">ประเภทใบเสร็จรับเงิน</h2>

    <div class="space-y-3">
      <button @click="router.push('/receipts/select-bookings')" class="option-card">
        <span class="material-symbols-rounded text-2xl text-primary">local_shipping</span>
        <span class="flex-1 text-left">
          <span class="block font-semibold text-text">จากงานขนส่ง</span>
          <span class="block text-xs text-muted mt-0.5">เลือกงานขนส่งที่ส่งมอบแล้วของลูกค้ารายเดียว ออกใบเสร็จตรงจากงานขนส่งได้เลย ไม่ต้องผ่านใบวางบิล/ใบแจ้งหนี้ก่อน</span>
        </span>
      </button>
      <button @click="router.push('/receipts/new-manual')" class="option-card">
        <span class="material-symbols-rounded text-2xl text-primary">payments</span>
        <span class="flex-1 text-left">
          <span class="block font-semibold text-text">รับเงินอื่นๆ</span>
          <span class="block text-xs text-muted mt-0.5">เช่น เงินประกัน เงินมัดจำ รับเงินล่วงหน้า หรืออื่นๆ — กรอกเอง ไม่ผูกกับใบแจ้งหนี้</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.option-card {
  @apply w-full flex items-center gap-4 p-4 border border-border rounded-xl bg-surface hover:border-primary hover:bg-primary-soft transition-all cursor-pointer text-left;
}
</style>
