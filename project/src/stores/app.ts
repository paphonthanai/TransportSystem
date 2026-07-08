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
    {
      id: '2',
      icon: 'tour',
      label: 'ตารางขนส่ง',
      children: [
        { id: '2-1', icon: 'assignment', label: 'ตารางจองงาน · Fleet Cements', route: '/booking/cements' },
        { id: '2-2', icon: 'pending_actions', label: 'สถานะงาน · Fleet Cements', route: '/job-status/cements' },
        { id: '2-3', icon: 'assignment', label: 'ตารางจองงาน · Fleet Ceramics', route: '/booking/ceramics' },
        { id: '2-4', icon: 'pending_actions', label: 'สถานะงาน · Fleet Ceramics', route: '/job-status/ceramics' },
      ],
    },
    {
      id: '3',
      icon: 'account_balance',
      label: 'บัญชี',
      children: [
        {
          id: '3-1',
          icon: 'sell',
          label: 'เอกสารขาย',
          route: '/documents',
          children: [{ id: '3-1-1', icon: 'receipt_long', label: 'ใบวางบิล', route: '/billing' }],
        },
        { id: '3-2', icon: 'request_quote', label: 'หนังสือรับรองหัก ณ ที่จ่าย', route: '/wht-certificates' },
      ],
    },
    {
      id: '4',
      icon: 'payments',
      label: 'เงินเดือน',
      children: [
        { id: '4-1', icon: 'badge', label: 'เสมียน', route: '/payroll/staff' },
        { id: '4-2', icon: 'local_shipping', label: 'พนักงานขับรถ', route: '/payroll/drivers' },
        { id: '4-3', icon: 'handshake', label: 'รถร่วม', route: '/payroll/vendor-fleet' },
      ],
    },
    {
      id: '5',
      icon: 'settings',
      label: 'ตั้งค่า',
      children: [
        { id: '5-1', icon: 'directions_bus', label: 'รถบรรทุก', route: '/settings/vehicles' },
        {
          id: '5-2',
          icon: 'contacts',
          label: 'สมุดรายชื่อ',
          children: [
            { id: '5-2-1', icon: 'badge', label: 'เสมียน (พนักงานออฟฟิศ)', route: '/settings/staff' },
            { id: '5-2-2', icon: 'person', label: 'พนักงานขับรถ', route: '/settings/drivers' },
            { id: '5-2-3', icon: 'apartment', label: 'ลูกค้า/คู่ค้า', route: '/settings/customers' },
            { id: '5-2-4', icon: 'storefront', label: 'ผู้จำหน่าย', route: '/settings/vendors' },
          ],
        },
        { id: '5-3', icon: 'history', label: 'Log', route: '/settings/logs' },
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
