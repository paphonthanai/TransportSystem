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
          <!-- ID / Email — ช่องเดียวรองรับทั้ง Corporate Email และ Driver ID ไม่มี Toggle แยก ระบบตรวจรูปแบบให้อัตโนมัติ (ดู handleLogin) -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">ID / Email</label>
            <input
              v-model="email"
              type="text"
              placeholder="you@company.com หรือรหัสคนขับ เช่น 1025"
              class="input-field w-full"
              required
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Password</label>
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
import { useDriversStore } from '@/stores/drivers'
import { isCorporateEmail, filterDigits } from '@/utils/driverAuth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const driversStore = useDriversStore()

const email = ref('')
const password = ref('')
const error = ref('')

/**
 * ช่องเดียวกันรองรับทั้ง Corporate Email (ADMIN/STAFF/DISPATCHER/ACCOUNTING) และ Driver ID (คนขับ) — ไม่มี Toggle
 * แยก ระบบเลือกเส้นทางจากรูปแบบ Identifier ที่กรอกเองอัตโนมัติ:
 * - ตรงรูปแบบอีเมล Corporate (.com/.go.th/.co.th ตาม isCorporateEmail) → ส่งตรงเข้า Firebase Auth เหมือนเดิมทุก
 *   ประการ ไม่มีการเปลี่ยนแปลง logic ส่วนนี้เลย
 * - ไม่ตรง → ถือเป็น Driver ID เสมอ กรอง Identifier และ Password เหลือเฉพาะตัวเลข แล้วลองตรวจกับ
 *   driverLoginCredentials ก่อน (ระบบใหม่) — ถ้าคนขับคนนี้ยัง "ไม่ Migrate" (ยังไม่มี driverLoginCredentials เลย)
 *   verifyDriverLogin จะคืน null เสมอ ต้อง fallback กลับไปเส้นทางเดิม (resolve email จาก code แล้วส่ง password ที่
 *   พิมพ์ "ตรงๆ ไม่กรองตัวเลข" เข้า Firebase Auth) เพื่อให้คนขับที่ยังไม่ Migrate ยังใช้ Email/Password (หรือ PIN เดิม
 *   ที่อาจไม่ใช่ตัวเลขล้วน) ได้ตามปกติทุกประการ ไม่ถูกบล็อกเพราะระบบใหม่ (ข้อกำหนด: ต้อง Login เดิมได้ต่อจนกว่าจะ Migrate)
 */
const handleLogin = async () => {
  error.value = ''
  try {
    const identifier = email.value.trim()
    if (isCorporateEmail(identifier)) {
      await authStore.login(identifier, password.value)
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
      return
    }

    const driverCode = filterDigits(identifier)
    const driverPassword = filterDigits(password.value)
    const verified = await driversStore.verifyDriverLogin(driverCode, driverPassword)
    const authEmail = await driversStore.resolveLoginEmail(driverCode)
    if (verified) {
      await authStore.login(authEmail, verified.authPassword)
    } else {
      // ยังไม่เคย Migrate เป็น Driver Login ใหม่ — ใช้เส้นทางเดิมเป๊ะ: password ที่พิมพ์จริง (ไม่กรองตัวเลข) ตรงเข้า
      // Firebase Auth เลย เผื่อรหัสผ่าน/PIN เดิมมีตัวอักษรปนอยู่ (ระบบเดิมไม่เคยบังคับตัวเลขล้วน)
      await authStore.login(authEmail, password.value)
    }
    const redirect = (route.query.redirect as string) || '/driver-app'
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
