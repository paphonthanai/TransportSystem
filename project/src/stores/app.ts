import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type MenuItem = {
  id: string
  icon: string
  label: string
  route?: string
  badge?: number
}

export const useAppStore = defineStore('app', () => {
  const isDarkMode = ref(localStorage.getItem('theme') === 'dark' || false)
  const currentRole = ref(localStorage.getItem('role') || 'admin')
  const currentScreen = ref('dashboard')
  const sidebarOpen = ref(window.innerWidth > 768)

  const menu = computed<MenuItem[]>(() => [
    { id: '1', icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { id: '2', icon: 'assignment', label: 'สร้างงาน', route: '/booking' },
    { id: '3', icon: 'local_shipping', label: 'จัดรถ', route: '/dispatch' },
    { id: '4', icon: 'tour', label: 'งานขนส่ง', route: '/jobs' },
    { id: '5', icon: 'account_tree', label: 'ผังการไหลงาน', route: '/workflow' },
    { id: '6', icon: 'apartment', label: 'ลูกค้า', route: '/customers' },
    { id: '7', icon: 'person', label: 'คนขับ', route: '/drivers' },
    { id: '8', icon: 'directions_bus', label: 'รถ', route: '/vehicles' },
    { id: '9', icon: 'article', label: 'เอกสาร', route: '/documents' },
    { id: '10', icon: 'receipt', label: 'บิล/ใบเสร็จ', route: '/billing' },
    { id: '11', icon: 'trending_up', label: 'รายได้คนขับ', route: '/income' },
    { id: '12', icon: 'bar_chart', label: 'รายงาน', route: '/reports' },
    { id: '13', icon: 'settings', label: 'ตั้งค่า', route: '/settings' },
  ])

  const roles = computed(() => [
    { id: 'admin', label: 'Admin' },
    { id: 'manager', label: 'Manager' },
    { id: 'dispatcher', label: 'Dispatcher' },
    { id: 'driver', label: 'Driver' },
  ])

  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  }

  const roleLabel = computed(() => {
    return roles.value.find((r) => r.id === currentRole.value)?.label || ''
  })

  const darkIcon = computed(() => {
    return isDarkMode.value ? 'light_mode' : 'dark_mode'
  })

  const notDriver = computed(() => currentRole.value !== 'driver')

  const setRole = (roleId: string) => {
    currentRole.value = roleId
    localStorage.setItem('role', roleId)
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const setCurrentScreen = (screen: string) => {
    currentScreen.value = screen
  }

  // initialize theme attribute on load
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')

  return {
    isDarkMode,
    currentRole,
    currentScreen,
    sidebarOpen,
    menu,
    roles,
    roleLabel,
    darkIcon,
    notDriver,
    toggleDarkMode,
    setRole,
    toggleSidebar,
    setCurrentScreen,
  }
})
