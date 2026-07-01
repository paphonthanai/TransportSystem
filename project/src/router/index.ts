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
        path: 'booking',
        name: 'Booking',
        component: () => import('@/views/BookingView.vue'),
      },
      {
        path: 'dispatch',
        name: 'Dispatch',
        component: () => import('@/views/DispatchView.vue'),
      },
      {
        path: 'jobs',
        name: 'Jobs',
        component: () => import('@/views/JobsView.vue'),
      },
      {
        path: 'workflow',
        name: 'Workflow',
        component: () => import('@/views/WorkflowView.vue'),
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/CustomersView.vue'),
      },
      {
        path: 'drivers',
        name: 'Drivers',
        component: () => import('@/views/DriversView.vue'),
      },
      {
        path: 'vehicles',
        name: 'Vehicles',
        component: () => import('@/views/VehiclesView.vue'),
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
        path: 'income',
        name: 'Income',
        component: () => import('@/views/IncomeView.vue'),
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/ReportsView.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SettingsView.vue'),
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
    next({ name: 'DashboardHome' })
  } else {
    next()
  }
})

export default router
