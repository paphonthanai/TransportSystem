<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-lg font-bold text-text">ตั้งค่า · ผู้ใช้งานและบุคลากร</h2>
      <div class="text-xs text-muted mt-0.5">จัดการผู้ใช้งานระบบ เสมียน (พนักงานออฟฟิศ) และพนักงานขับรถได้จากหน้านี้หน้าเดียว</div>
    </div>

    <div class="flex items-center gap-1 border-b border-border overflow-x-auto" role="tablist">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="selectTab(tab.key)"
        :class="[
          'px-4 h-11 flex items-center gap-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
          activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-text',
        ]"
      >
        <span class="material-symbols-rounded text-lg">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- แต่ละแท็บคือหน้าจัดการเดิมทั้งหน้า (เพิ่ม/แก้ไข/ลบ/รายละเอียดครบเหมือนเดิม) ย้ายมารวมไว้ที่เดียว -->
    <UserManagementView v-if="activeTab === 'users'" :key="'users'" />
    <StaffView v-else-if="activeTab === 'staff'" :key="'staff'" />
    <DriversView v-else-if="activeTab === 'drivers'" :key="'drivers'" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import UserManagementView from '@/views/UserManagementView.vue'
import StaffView from '@/views/StaffView.vue'
import DriversView from '@/views/DriversView.vue'

type TabKey = 'users' | 'staff' | 'drivers'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

/** แท็บที่เห็นตามสิทธิ์ — สิทธิ์เท่ากับหน้าเดิมแต่ละหน้า (ผู้ใช้/เสมียน = ADMIN, พนักงานขับรถ = ADMIN + ผู้จัดรถ) */
const allTabs: { key: TabKey; label: string; icon: string; roles: string[] }[] = [
  { key: 'users', label: 'ผู้ใช้งานระบบ', icon: 'manage_accounts', roles: ['ADMIN'] },
  { key: 'staff', label: 'เสมียน (พนักงานออฟฟิศ)', icon: 'badge', roles: ['ADMIN'] },
  { key: 'drivers', label: 'พนักงานขับรถ', icon: 'person', roles: ['ADMIN', 'DISPATCHER'] },
]

const visibleTabs = computed(() => allTabs.filter((t) => t.roles.includes(authStore.role || '')))

const activeTab = computed<TabKey | null>(() => {
  const wanted = String(route.query.tab || '')
  const match = visibleTabs.value.find((t) => t.key === wanted)
  return (match || visibleTabs.value[0])?.key ?? null
})

const selectTab = (key: TabKey) => {
  router.replace({ query: { ...route.query, tab: key } })
}
</script>
