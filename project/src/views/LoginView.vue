<template>
  <div class="min-h-screen bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white bg-opacity-20 backdrop-blur-md mb-4">
          <span class="material-symbols-rounded text-white text-6xl">local_shipping</span>
        </div>
        <h1 class="text-4xl font-bold text-white mb-2">มิตรกาญจน์</h1>
        <p class="text-white text-opacity-90 text-sm">ระบบบริหารงานขนส่ง</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-md bg-opacity-95">
        <h2 class="text-2xl font-bold text-text mb-6">เข้าสู่ระบบ</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Input -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              placeholder="you@company.com"
              class="input-field w-full"
              required
            />
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">รหัสผ่าน</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="input-field w-full"
              required
            />
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {{ error }}
          </div>

          <!-- Loading State -->
          <div v-if="authStore.loading" class="flex items-center justify-center gap-2 py-2">
            <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span class="text-sm text-muted">กำลังประมวลผล...</span>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full h-11 rounded-lg bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <span v-if="!authStore.loading" class="material-symbols-rounded">login</span>
            {{ authStore.loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </form>

      </div>

      <!-- Footer -->
      <div class="text-center mt-6">
        <p class="text-white text-opacity-80 text-xs">
          © 2569 บริษัท มิตรกาญจน์ จำกัด สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || (authStore.role === 'DRIVER' ? '/driver-app' : '/')
    router.push(redirect)
  } catch (err: any) {
    error.value = err.message || 'เข้าสู่ระบบไม่สำเร็จ'
  }
}
</script>

<style scoped>
.input-field {
  @apply h-11 px-4 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}
</style>
