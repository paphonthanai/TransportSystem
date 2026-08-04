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
        { id: '2-1', icon: 'category', label: 'Fleet Cements', route: '/booking/cements' },
        { id: '2-2', icon: 'category', label: 'Fleet Ceramics', route: '/booking/ceramics' },
        { id: '2-3', icon: 'task_alt', label: 'งานเสร็จสิ้น (Cements)', route: '/booking/cements/completed' },
        { id: '2-4', icon: 'task_alt', label: 'งานเสร็จสิ้น (Ceramics)', route: '/booking/ceramics/completed' },
      ],
    },
    {
      id: '2b',
      icon: 'sell',
      label: 'เอกสารขาย',
      children: [
        { id: '2b-1', icon: 'request_page', label: 'ใบเสนอราคา', route: '/quotation' },
        { id: '2b-1b', icon: 'assignment', label: 'ใบสั่งสินค้า', route: '/sales-order' },
        { id: '2b-2', icon: 'receipt_long', label: 'ใบวางบิล', route: '/billing-notes' },
        { id: '2b-3', icon: 'description', label: 'ใบกำกับภาษี', route: '/tax-invoices' },
        { id: '2b-4', icon: 'receipt', label: 'ใบเสร็จรับเงิน', route: '/receipts' },
        { id: '2b-5', icon: 'point_of_sale', label: 'ขายเงินสด', route: '/cash-sale' },
        { id: '2b-6', icon: 'receipt_long', label: 'ใบลดหนี้', route: '/credit-note' },
        { id: '2b-7', icon: 'post_add', label: 'ใบเพิ่มหนี้', route: '/debit-note' },
      ],
    },
    { id: '3', icon: 'request_quote', label: 'หนังสือรับรองหัก ณ ที่จ่าย', route: '/wht-certificates' },
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
            // { id: '5-2-4', icon: 'storefront', label: 'ผู้จำหน่าย', route: '/settings/vendors' },
          ],
        },
        {
          id: '5-3',
          icon: 'description',
          label: 'ตั้งค่าเอกสาร',
          children: [
            { id: '5-3-1', icon: 'tune', label: 'ฟังก์ชั่นเอกสาร', route: '/settings/documents/function' },
            { id: '5-3-2', icon: 'tag', label: 'เลขรันเอกสาร', route: '/settings/documents/numbering' },
            { id: '5-3-3', icon: 'workspace_premium', label: 'โลโก้และตรายาง', route: '/settings/documents/logo' },
            { id: '5-3-4', icon: 'account_balance_wallet', label: 'ข้อมูลการรับชำระ', route: '/settings/documents/payment' },
            { id: '5-3-5', icon: 'currency_exchange', label: 'สกุลเงิน', route: '/settings/documents/currency' },
            { id: '5-3-6', icon: 'sticky_note_2', label: 'หมายเหตุเอกสาร', route: '/settings/documents/notes' },
          ],
        },
        { id: '5-4', icon: 'inventory_2', label: 'ตั้งค่าสินค้า', route: '/settings/products' },
        { id: '5-4b', icon: 'local_gas_station', label: 'ตั้งค่าน้ำมัน', route: '/settings/fuel' },
        { id: '5-4c', icon: 'factory', label: 'ต้นทาง/จุดรับสินค้า', route: '/settings/origins' },
        { id: '5-4d', icon: 'rule', label: 'เงื่อนไขวางบิล', route: '/settings/billing-rule' },
        { id: '5-5', icon: 'history', label: 'Log', route: '/settings/logs' },
      ],
    },
    {
      id: '6',
      icon: 'warehouse',
      label: 'คลังสินค้า',
      route: '/inventory',
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
