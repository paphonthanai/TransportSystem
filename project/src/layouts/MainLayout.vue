<template>
  <div class="flex w-full h-screen overflow-hidden bg-bg">
    <!-- Sidebar -->
    <aside
      :class="[
        'w-64 h-full bg-surface border-r border-border flex flex-col overflow-hidden transition-all duration-300',
        !sidebarOpen && 'hidden md:flex',
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md">
          <span class="material-symbols-rounded text-white text-5xl">local_shipping</span>
        </div>
        <div class="leading-tight">
          <div class="text-sm font-bold text-text">THANTHARA</div>
          <div class="text-xs text-muted tracking-wide">ระบบบริหารงานขนส่ง</div>
        </div>
      </div>

      <!-- Menu -->
      <nav class="flex-1 overflow-y-auto py-2 px-3">
        <SidebarMenuItem
          v-for="item in appStore.menu"
          :key="item.id"
          :item="item"
          :depth="0"
          @navigate="navigateTo"
        />
      </nav>

      <!-- User Profile -->
      <div class="p-3 border-t border-border">
        <div class="flex items-center gap-2 px-2 py-2 rounded-lg bg-surface-2">
          <div class="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold text-sm">
            {{ authStore.userInitial }}
          </div>
          <div class="flex-1 min-w-0 text-xs leading-tight">
            <div class="font-semibold text-text truncate">{{ authStore.userName }}</div>
            <div class="text-muted">{{ appStore.roleLabel }}</div>
          </div>
          <button @click="logout" class="p-1 hover:bg-border rounded-lg transition-all" title="Logout">
            <span class="material-symbols-rounded text-lg text-muted">logout</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 min-w-0 h-screen flex flex-col overflow-hidden bg-bg">
      <!-- Topbar -->
      <header class="flex-0 h-16 flex items-center gap-4 px-6 bg-surface border-b border-border">
        <!-- Menu Toggle (Mobile) -->
        <button
          @click="appStore.toggleSidebar"
          class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-surface-2 hover:bg-border transition-all"
        >
          <span class="material-symbols-rounded">menu</span>
        </button>

        <!-- Screen Title -->
        <div class="min-w-0">
          <div class="text-lg font-bold text-text leading-tight">
            {{ getScreenTitle() }}
          </div>
          <div class="text-xs text-muted">
            {{ getScreenSubtitle() }}
          </div>
        </div>

        <div class="flex-1"></div>

        <!-- Search -->
        <div class="hidden lg:flex items-center gap-2 h-10 px-3 rounded-lg bg-surface-2 border border-border w-60">
          <span class="material-symbols-rounded text-lg text-muted">search</span>
          <input
            type="text"
            placeholder="ค้นหา..."
            class="border-0 outline-0 bg-transparent font-medium text-sm text-text w-full placeholder:text-muted"
          />
        </div>

        <!-- Role Selector -->
        <select
          v-model="appStore.currentRole"
          @change="appStore.setRole(appStore.currentRole)"
          class="h-10 px-3 rounded-lg border border-border bg-surface-2 text-text text-sm font-semibold cursor-pointer"
        >
          <option v-for="role in appStore.roles" :key="role.id" :value="role.id">
            {{ role.label }}
          </option>
        </select>

        <!-- Theme Toggle -->
        <button
          @click="appStore.toggleDarkMode"
          class="w-10 h-10 rounded-lg border border-border bg-surface-2 text-text flex items-center justify-center hover:bg-border transition-all"
          title="Toggle theme"
        >
          <span class="material-symbols-rounded">{{ appStore.darkIcon }}</span>
        </button>

        <!-- Notifications -->
        <button class="relative w-10 h-10 rounded-lg border border-border bg-surface-2 text-text flex items-center justify-center hover:bg-border transition-all">
          <span class="material-symbols-rounded">notifications</span>
          <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600"></span>
        </button>
      </header>

      <!-- Content Area -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
        <RouterView />
      </main>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="sidebarOpen && isSmallScreen"
      @click="appStore.toggleSidebar"
      class="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import SidebarMenuItem from '@/components/SidebarMenuItem.vue'

const router = useRouter()
const currentRoute = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const isSmallScreen = ref(false)

const sidebarOpen = computed(() => appStore.sidebarOpen)

onMounted(() => {
  const handleResize = () => {
    isSmallScreen.value = window.innerWidth < 768
    if (window.innerWidth >= 768) {
      appStore.sidebarOpen = true
    }
  }

  window.addEventListener('resize', handleResize)
  handleResize()

  return () => window.removeEventListener('resize', handleResize)
})

const getScreenTitle = () => {
  const routes: Record<string, string> = {
    '/': 'Dashboard',
    '/booking/cements': 'รายการงาน · Fleet Cements',
    '/booking/ceramics': 'รายการงาน · Fleet Ceramics',
    '/documents': 'เอกสารขาย',
    '/billing': 'ใบวางบิล',
    '/wht-certificates': 'หนังสือรับรองการหักภาษี ณ ที่จ่าย',
    '/payroll/staff': 'เงินเดือน · เสมียน',
    '/payroll/drivers': 'เงินเดือน · พนักงานขับรถ',
    '/payroll/vendor-fleet': 'เงินเดือน · รถร่วม',
    '/settings/vehicles': 'ตั้งค่า · รถบรรทุก',
    '/settings/staff': 'สมุดรายชื่อ · เสมียน (พนักงานออฟฟิศ)',
    '/settings/drivers': 'สมุดรายชื่อ · พนักงานขับรถ',
    '/settings/customers': 'สมุดรายชื่อ · ลูกค้า/คู่ค้า',
    '/settings/vendors': 'สมุดรายชื่อ · ผู้จำหน่าย',
    '/settings/logs': 'ตั้งค่า · Log',
  }
  if (currentRoute.path.startsWith('/documents/')) return 'เอกสารขาย · พิมพ์เอกสาร'
  if (currentRoute.path.startsWith('/job/')) return 'รายละเอียดงาน · ใบเสนอราคา/PO'
  return routes[currentRoute.path] || 'Dashboard'
}

const getScreenSubtitle = () => {
  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return today
}

const navigateTo = (route?: string) => {
  if (route) {
    router.push(route)
    if (isSmallScreen.value) {
      appStore.toggleSidebar()
    }
  }
}

const logout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<style scoped>
/* Layout specific styles */
</style>
