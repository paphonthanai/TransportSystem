<template>
  <div class="space-y-4 max-w-2xl">
    <h2 class="text-lg font-bold text-text">ประเภทใบวางบิล</h2>

    <div class="space-y-3">
      <button @click="router.push('/billing-notes/manual')" class="option-card">
        <span class="material-symbols-rounded text-2xl text-primary">description</span>
        <span class="flex-1 text-left">
          <span class="block font-semibold text-text">ใบวางบิล</span>
          <span class="block text-xs text-muted mt-0.5">สร้างใบวางบิลทีละใบ กรอกรายการเอง</span>
        </span>
      </button>
      <button @click="router.push('/billing-notes/select-bookings')" class="option-card">
        <span class="material-symbols-rounded text-2xl text-primary">library_add</span>
        <span class="flex-1 text-left">
          <span class="block font-semibold text-text">ใบวางบิลรวม</span>
          <span class="block text-xs text-muted mt-0.5">เลือกงานขนส่งของลูกค้ารายเดียวมารวมออกใบวางบิลเดียว</span>
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
