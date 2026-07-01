<template>
  <div :data-theme="appStore.isDarkMode ? 'dark' : 'light'" class="min-h-screen transition-colors duration-200">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'

const appStore = useAppStore()
const authStore = useAuthStore()

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
