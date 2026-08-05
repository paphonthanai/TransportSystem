<template>
  <div class="flex w-full h-screen overflow-hidden bg-bg">
    <!-- Sidebar -->
    <aside
      :class="[
        'w-64 h-full bg-surface border-r border-border flex-col overflow-hidden transition-all duration-300',
        sidebarOpen ? 'flex fixed inset-y-0 left-0 z-40 md:static md:z-auto' : 'hidden md:flex md:static',
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
            <div class="text-muted">{{ roleLabel }}</div>
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

    <OnboardingChecklist />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import SidebarMenuItem from '@/components/SidebarMenuItem.vue'
import OnboardingChecklist from '@/components/OnboardingChecklist.vue'

const router = useRouter()
const currentRoute = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const isSmallScreen = ref(false)

const sidebarOpen = computed(() => appStore.sidebarOpen)

const roleLabels: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'เสมียน',
  DISPATCHER: 'ผู้จัดรถ',
  DRIVER: 'คนขับ',
  ACCOUNTING: 'บัญชี',
}
const roleLabel = computed(() => (authStore.role ? roleLabels[authStore.role] || authStore.role : ''))

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
    '/booking/cements/completed': 'งานเสร็จสิ้น · Fleet Cements',
    '/booking/ceramics/completed': 'งานเสร็จสิ้น · Fleet Ceramics',
    '/completed-jobs': 'งานเสร็จสิ้นทั้งหมด',
    '/documents': 'เอกสารขาย',
    '/billing': 'ใบวางบิล',
    '/quotation': 'ใบเสนอราคา',
    '/sales-order': 'ใบสั่งสินค้า',
    '/billing-notes': 'ใบวางบิล',
    '/billing-notes/new': 'สร้างใบวางบิลรวม',
    '/billing-notes/manual': 'สร้างใบวางบิล',
    '/tax-invoices': 'ใบแจ้งหนี้/ใบกำกับภาษี',
    '/tax-invoices/new': 'สร้างใบแจ้งหนี้/ใบกำกับภาษี',
    '/receipts': 'ใบเสร็จรับเงิน',
    '/receipts/new': 'ประเภทใบเสร็จรับเงิน',
    '/receipts/new-manual': 'รับเงินอื่นๆ',
    '/receipts/select': 'เลือกใบแจ้งหนี้',
    '/receipts/create': 'สร้างใบเสร็จรับเงิน',
    // '/cash-sale': 'ขายเงินสด',
    '/wht-certificates': 'หนังสือรับรองการหักภาษี ณ ที่จ่าย',
    '/payroll/staff': 'เงินเดือน · เสมียน',
    '/payroll/drivers': 'เงินเดือน · พนักงานขับรถ',
    '/payroll/vendor-fleet': 'เงินเดือน · รถร่วม',
    '/settings/vehicles': 'ตั้งค่า · รถบรรทุก',
    '/settings/staff': 'สมุดรายชื่อ · เสมียน (พนักงานออฟฟิศ)',
    '/settings/drivers': 'สมุดรายชื่อ · พนักงานขับรถ',
    '/settings/customers': 'สมุดรายชื่อ · ลูกค้า/คู่ค้า',
    /* '/settings/vendors': 'สมุดรายชื่อ · ผู้จำหน่าย', */
    '/settings/users': 'ตั้งค่า · จัดการผู้ใช้งาน',
    '/settings/logs': 'ตั้งค่า · Log',
    '/settings/documents/function': 'ตั้งค่าเอกสาร · ฟังก์ชั่นเอกสาร',
    '/settings/documents/numbering': 'ตั้งค่าเอกสาร · เลขรันเอกสาร',
    '/settings/documents/logo': 'ตั้งค่าเอกสาร · โลโก้และตรายาง',
    '/settings/documents/payment': 'ตั้งค่าเอกสาร · ข้อมูลการรับชำระ',
    '/settings/documents/currency': 'ตั้งค่าเอกสาร · สกุลเงิน',
    '/settings/documents/notes': 'ตั้งค่าเอกสาร · หมายเหตุเอกสาร',
    '/settings/products': 'ตั้งค่า · ตั้งค่าสินค้า',
    '/settings/fuel': 'ตั้งค่า · ตั้งค่าน้ำมัน',
    '/inventory': 'คลังสินค้า',
  }
  if (currentRoute.path.startsWith('/documents/')) return 'เอกสารขาย · พิมพ์เอกสาร'
  if (currentRoute.path.startsWith('/job/')) return 'รายละเอียดงาน'
  if (currentRoute.path === '/quotation/new') return 'สร้างใบเสนอราคา'
  if (currentRoute.path.startsWith('/quotation/') && currentRoute.path.endsWith('/edit')) return 'แก้ไขใบเสนอราคา'
  if (currentRoute.path.startsWith('/billing-notes/manual/') && currentRoute.path.endsWith('/edit')) return 'แก้ไขใบวางบิล'
  if (currentRoute.path.startsWith('/tax-invoices/') && currentRoute.path.endsWith('/edit')) return 'แก้ไขใบแจ้งหนี้/ใบกำกับภาษี'
  if (currentRoute.path.startsWith('/receipts/new-manual/') && currentRoute.path.endsWith('/edit')) return 'แก้ไขใบเสร็จรับเงิน'
  if (currentRoute.path.includes('/convert/')) return 'สร้างเอกสารจากใบเสนอราคา'
  if (currentRoute.path.endsWith('/new')) return 'สร้างงานขนส่งใหม่'
  if (currentRoute.path.endsWith('/edit')) return 'แก้ไขงานขนส่ง'
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
