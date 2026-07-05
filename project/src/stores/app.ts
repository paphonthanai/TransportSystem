import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type MenuItem = {
  id: string
  icon: string
  label: string
  route?: string
  badge?: number
  children?: MenuItem[]
}

export const useAppStore = defineStore('app', () => {
  const isDarkMode = ref(localStorage.getItem('theme') === 'dark' || false)
  const currentRole = ref(localStorage.getItem('role') || 'admin')
  const currentScreen = ref('dashboard')
  const sidebarOpen = ref(window.innerWidth > 768)

  const menu = computed<MenuItem[]>(() => [
    { id: '1', icon: 'dashboard', label: 'Dashboard', route: '/' },
    { id: '2', icon: 'sell', label: 'เอกสารขาย', route: '/documents' },
    {
      id: '3',
      icon: 'tour',
      label: 'ตารางขนส่ง',
      children: [
        { id: '3-1', icon: 'assignment', label: 'ตารางจองงาน', route: '/booking' },
        { id: '3-2', icon: 'search', label: 'ค้นหางาน', route: '/job-search' },
        { id: '3-3', icon: 'pending_actions', label: 'สถานะงาน', route: '/job-status' },
      ],
    },
    { id: '4', icon: 'local_shipping', label: 'จัดรถ', route: '/dispatch' },
    { id: '5', icon: 'list_alt', label: 'งานขนส่ง', route: '/jobs' },
    { id: '6', icon: 'account_tree', label: 'ผังการไหลงาน', route: '/workflow' },
    { id: '7', icon: 'account_balance', label: 'บัญชี', route: '/accounting' },
    { id: '8', icon: 'receipt', label: 'บิล/ใบเสร็จ', route: '/billing' },
    { id: '9', icon: 'trending_up', label: 'รายได้คนขับ', route: '/income' },
    { id: '10', icon: 'payments', label: 'เงินเดือน', route: '/payroll' },
    { id: '11', icon: 'bar_chart', label: 'รายงาน', route: '/reports' },
    {
      id: '12',
      icon: 'settings',
      label: 'ตั้งค่า',
      children: [
        { id: '12-1', icon: 'badge', label: 'เสมียน (พนักงานออฟฟิศ)', route: '/staff' },
        { id: '12-2', icon: 'person', label: 'พนักงานขับรถ', route: '/drivers' },
        { id: '12-3', icon: 'directions_bus', label: 'รถ (รถร่วม/รถบรรทุก)', route: '/vehicles' },
        { id: '12-4', icon: 'apartment', label: 'ลูกค้า/คู่ค้า', route: '/customers' },
        { id: '12-5', icon: 'storefront', label: 'ผู้จำหน่าย', route: '/vendors' },
        { id: '12-6', icon: 'tune', label: 'ตั้งค่าทั่วไป', route: '/settings' },
      ],
    },
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
