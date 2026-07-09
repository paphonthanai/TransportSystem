import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'DashboardHome',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'booking/:fleet',
        name: 'Booking',
        component: () => import('@/views/BookingView.vue'),
        props: true,
      },
      {
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/DocumentsView.vue'),
      },
      {
        path: 'billing',
        name: 'Billing',
        component: () => import('@/views/BillingView.vue'),
      },
      {
        path: 'documents/:docId',
        name: 'InvoiceDocument',
        component: () => import('@/views/InvoiceDocumentView.vue'),
        props: true,
      },
      {
        path: 'job/:bookingId',
        name: 'JobDocument',
        component: () => import('@/views/JobDocumentView.vue'),
        props: true,
      },
      {
        path: 'wht-certificates',
        name: 'WHTCertificates',
        component: () => import('@/views/WHTCertificateView.vue'),
      },
      {
        path: 'payroll/staff',
        name: 'PayrollStaff',
        component: () => import('@/views/PayrollView.vue'),
      },
      {
        path: 'payroll/drivers',
        name: 'PayrollDrivers',
        component: () => import('@/views/IncomeView.vue'),
      },
      {
        path: 'payroll/vendor-fleet',
        name: 'PayrollVendorFleet',
        component: () => import('@/views/PayrollVendorFleetView.vue'),
      },
      {
        path: 'settings/vehicles',
        name: 'SettingsVehicles',
        component: () => import('@/views/VehiclesView.vue'),
      },
      {
        path: 'settings/staff',
        name: 'SettingsStaff',
        component: () => import('@/views/StaffView.vue'),
      },
      {
        path: 'settings/drivers',
        name: 'SettingsDrivers',
        component: () => import('@/views/DriversView.vue'),
      },
      {
        path: 'settings/customers',
        name: 'SettingsCustomers',
        component: () => import('@/views/CustomersView.vue'),
      },
      {
        path: 'settings/vendors',
        name: 'SettingsVendors',
        component: () => import('@/views/VendorsView.vue'),
      },
      {
        path: 'settings/logs',
        name: 'SettingsLogs',
        component: () => import('@/views/LogView.vue'),
      },
    ],
  },
  {
    path: '/driver-app',
    name: 'DriverApp',
    component: () => import('@/views/DriverAppView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next(authStore.role === 'driver' ? { name: 'DriverApp' } : { name: 'DashboardHome' })
  } else if (authStore.isAuthenticated && authStore.role === 'driver' && to.name !== 'DriverApp') {
    // แยกมุมมองคนขับออกจากส่วนแอดมิน: คนขับเข้าได้เฉพาะหน้า Driver App
    next({ name: 'DriverApp' })
  } else {
    next()
  }
})

export default router
