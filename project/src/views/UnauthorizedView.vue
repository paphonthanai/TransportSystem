<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-bg">
    <div class="card-lg flex flex-col items-center justify-center text-center py-16 gap-3 max-w-md">
      <span class="material-symbols-rounded text-4xl text-red-500">block</span>
      <div class="text-lg font-bold text-text">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
      <div class="text-sm text-muted">
        บัญชี {{ authStore.userName }} ({{ roleLabel }}) ไม่มีสิทธิ์เข้าถึงหน้านี้ ติดต่อผู้ดูแลระบบหากคิดว่านี่เป็นความผิดพลาด
      </div>
      <button @click="goBack" class="btn-primary mt-2">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับหน้าหลัก
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const roleLabels: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'เสมียน',
  DISPATCHER: 'ผู้จัดรถ',
  DRIVER: 'คนขับ',
  ACCOUNTING: 'บัญชี',
}
const roleLabel = computed(() => (authStore.role ? roleLabels[authStore.role] || authStore.role : '-'))

const goBack = () => router.push('/')
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}
</style>
