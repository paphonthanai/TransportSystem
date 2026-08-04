<template>
  <div class="card-lg flex flex-col items-center justify-center text-center py-16 gap-3">
    <span class="material-symbols-rounded text-4xl text-muted">hourglass_top</span>
    <div class="text-lg font-bold text-text">{{ title }}</div>
    <div class="text-sm text-muted max-w-sm">ฟีเจอร์นี้ยังไม่เปิดให้ใช้งานในตอนนี้ อยู่ระหว่างการพัฒนา</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || 'เร็วๆ นี้')
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
