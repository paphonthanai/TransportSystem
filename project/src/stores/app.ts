import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permission'
import type { UserRole } from '@/stores/localUsers'

export type MenuItem = {
  id: string
  icon: string
  label: string
  route?: string
  badge?: number
  /** roles ที่เห็นเมนูนี้ได้ — ไม่ระบุ = ทุก role ที่ login แล้วเห็นได้ ต้องตรงกับ meta.roles ของ route นั้นใน router/index.ts เสมอ
   *  (ซ่อนเมนูอย่างเดียวไม่พอ ต้องมี Route Guard ทำงานคู่กันเพื่อกันการเข้าถึงตรงๆ ผ่าน URL) */
  roles?: UserRole[]
  children?: MenuItem[]
}

function filterMenuByRole(items: MenuItem[], role: UserRole | null): MenuItem[] {
  return items.reduce<MenuItem[]>((acc, item) => {
    if (!canAccess(role, item.roles)) return acc
    if (item.children) {
      const children = filterMenuByRole(item.children, role)
      if (children.length === 0) return acc
      acc.push({ ...item, children })
    } else {
      acc.push(item)
    }
    return acc
  }, [])
}

export const useAppStore = defineStore('app', () => {
  const authStore = useAuthStore()
  const isDarkMode = ref(localStorage.getItem('theme') === 'dark' || false)
  const currentScreen = ref('dashboard')
  const sidebarOpen = ref(window.innerWidth > 768)

  const fullMenu: MenuItem[] = [
    { id: '1', icon: 'dashboard', label: 'Dashboard', route: '/' },
    {
      id: '2',
      icon: 'tour',
      label: 'ตารางขนส่ง',
      roles: ['ADMIN', 'DISPATCHER', 'STAFF', 'ACCOUNTING'],
      children: [
        { id: '2-1', icon: 'category', label: 'Fleet Cements', route: '/booking/cements', roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
        { id: '2-2', icon: 'category', label: 'Fleet Ceramics', route: '/booking/ceramics', roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
        { id: '2-3', icon: 'task_alt', label: 'งานเสร็จสิ้น (Cements)', route: '/booking/cements/completed', roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
        { id: '2-4', icon: 'task_alt', label: 'งานเสร็จสิ้น (Ceramics)', route: '/booking/ceramics/completed', roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
        { id: '2-5', icon: 'fact_check', label: 'งานเสร็จสิ้นทั้งหมด', route: '/completed-jobs', roles: ['ADMIN', 'DISPATCHER', 'STAFF', 'ACCOUNTING'] },
      ],
    },
    {
      id: '2b',
      icon: 'sell',
      label: 'เอกสารขาย',
      roles: ['ADMIN', 'STAFF', 'ACCOUNTING'],
      children: [
        { id: '2b-1', icon: 'request_page', label: 'ใบเสนอราคา', route: '/quotation', roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
        { id: '2b-1b', icon: 'assignment', label: 'ใบสั่งสินค้า', route: '/sales-order', roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
        { id: '2b-2', icon: 'receipt_long', label: 'ใบวางบิล', route: '/billing-notes', roles: ['ADMIN', 'ACCOUNTING'] },
        { id: '2b-3', icon: 'description', label: 'ใบกำกับภาษี', route: '/tax-invoices', roles: ['ADMIN', 'ACCOUNTING'] },
        { id: '2b-4', icon: 'receipt', label: 'ใบเสร็จรับเงิน', route: '/receipts', roles: ['ADMIN', 'ACCOUNTING'] },
        { id: '2b-5', icon: 'point_of_sale', label: 'ขายเงินสด', route: '/cash-sale', roles: ['ADMIN', 'ACCOUNTING'] },
        { id: '2b-6', icon: 'receipt_long', label: 'ใบลดหนี้', route: '/credit-note', roles: ['ADMIN', 'ACCOUNTING'] },
        { id: '2b-7', icon: 'post_add', label: 'ใบเพิ่มหนี้', route: '/debit-note', roles: ['ADMIN', 'ACCOUNTING'] },
      ],
    },
    { id: '3', icon: 'request_quote', label: 'หนังสือรับรองหัก ณ ที่จ่าย', route: '/wht-certificates', roles: ['ADMIN', 'ACCOUNTING'] },
    {
      id: '4',
      icon: 'payments',
      label: 'เงินเดือน',
      roles: ['ADMIN'],
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
      roles: ['ADMIN', 'DISPATCHER', 'STAFF', 'ACCOUNTING'],
      children: [
        { id: '5-1', icon: 'directions_bus', label: 'รถบรรทุก', route: '/settings/vehicles', roles: ['ADMIN', 'DISPATCHER'] },
        {
          id: '5-2',
          icon: 'contacts',
          label: 'สมุดรายชื่อ',
          roles: ['ADMIN', 'DISPATCHER', 'STAFF', 'ACCOUNTING'],
          children: [
            { id: '5-2-1', icon: 'badge', label: 'เสมียน (พนักงานออฟฟิศ)', route: '/settings/staff', roles: ['ADMIN'] },
            { id: '5-2-2', icon: 'person', label: 'พนักงานขับรถ', route: '/settings/drivers', roles: ['ADMIN', 'DISPATCHER'] },
            { id: '5-2-3', icon: 'apartment', label: 'ลูกค้า/คู่ค้า', route: '/settings/customers', roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
            // { id: '5-2-4', icon: 'storefront', label: 'ผู้จำหน่าย', route: '/settings/vendors' },
          ],
        },
        {
          id: '5-3',
          icon: 'description',
          label: 'ตั้งค่าเอกสาร',
          roles: ['ADMIN'],
          children: [
            { id: '5-3-1', icon: 'tune', label: 'ฟังก์ชั่นเอกสาร', route: '/settings/documents/function' },
            { id: '5-3-2', icon: 'tag', label: 'เลขรันเอกสาร', route: '/settings/documents/numbering' },
            { id: '5-3-3', icon: 'workspace_premium', label: 'ข้อมูลบริษัท / โลโก้และตรายาง', route: '/settings/documents/logo' },
            { id: '5-3-4', icon: 'account_balance_wallet', label: 'ข้อมูลการรับชำระ', route: '/settings/documents/payment' },
            { id: '5-3-5', icon: 'currency_exchange', label: 'สกุลเงิน', route: '/settings/documents/currency' },
            { id: '5-3-6', icon: 'sticky_note_2', label: 'หมายเหตุเอกสาร', route: '/settings/documents/notes' },
          ],
        },
        { id: '5-4', icon: 'inventory_2', label: 'ตั้งค่าสินค้า', route: '/settings/products', roles: ['ADMIN'] },
        { id: '5-4b', icon: 'local_gas_station', label: 'ตั้งค่าน้ำมัน', route: '/settings/fuel', roles: ['ADMIN'] },
        { id: '5-4c', icon: 'factory', label: 'ต้นทาง/จุดรับสินค้า', route: '/settings/origins', roles: ['ADMIN'] },
        { id: '5-4d', icon: 'rule', label: 'เงื่อนไขวางบิล', route: '/settings/billing-rule', roles: ['ADMIN'] },
        { id: '5-6', icon: 'manage_accounts', label: 'จัดการผู้ใช้งาน', route: '/settings/users', roles: ['ADMIN'] },
        { id: '5-5', icon: 'history', label: 'Log', route: '/settings/logs', roles: ['ADMIN'] },
      ],
    },
    {
      id: '6',
      icon: 'warehouse',
      label: 'คลังสินค้า',
      route: '/inventory',
      roles: ['ADMIN', 'DISPATCHER'],
    },
  ]

  const menu = computed<MenuItem[]>(() => filterMenuByRole(fullMenu, authStore.role))

  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  }

  const darkIcon = computed(() => {
    return isDarkMode.value ? 'light_mode' : 'dark_mode'
  })

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
    currentScreen,
    sidebarOpen,
    menu,
    darkIcon,
    toggleDarkMode,
    toggleSidebar,
    setCurrentScreen,
  }
})
