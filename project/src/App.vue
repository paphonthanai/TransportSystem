<template>
  <div :data-theme="appStore.isDarkMode ? 'dark' : 'light'" class="min-h-screen transition-colors duration-200">
    <RouteProgressBar :active="loadingStore.busy" />
    <AppSplash v-if="!routerReady" />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useLoadingStore } from '@/stores/loading'
import RouteProgressBar from '@/components/shared/RouteProgressBar.vue'
import AppSplash from '@/components/shared/AppSplash.vue'
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const loadingStore = useLoadingStore()

// หน้าแรกพร้อมหรือยัง (ตรวจสิทธิ์ + โหลดไฟล์ของหน้านั้นแบบ lazy เสร็จ) — ระหว่างรอแสดงหน้าจอ "กำลังโหลด..." แทนหน้าว่าง
const router = useRouter()
const routerReady = ref(false)
router.isReady().then(() => (routerReady.value = true))

onMounted(() => {
  // Apply theme from localStorage
  const theme = localStorage.getItem('theme') || 'light'
  document.documentElement.setAttribute('data-theme', theme)
  appStore.isDarkMode = theme === 'dark'
})
</script>

<style scoped>
/* Global app styles */
</style>
