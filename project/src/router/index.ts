import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canAccess } from '@/services/permission'
import type { UserRole } from '@/stores/users'

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
        meta: { roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
      },
      {
        path: 'booking/:fleet/new',
        name: 'BookingCreate',
        component: () => import('@/views/BookingCreateView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
      },
      {
        path: 'booking/:fleet/:id/edit',
        name: 'BookingEdit',
        component: () => import('@/views/BookingEditView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
      },
      {
        path: 'booking/:fleet/completed',
        name: 'BookingCompleted',
        component: () => import('@/views/BookingCompletedView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'DISPATCHER', 'STAFF'] },
      },
      {
        path: 'completed-jobs',
        name: 'CompletedJobs',
        component: () => import('@/views/CompletedJobsView.vue'),
        meta: { roles: ['ADMIN', 'DISPATCHER', 'STAFF', 'ACCOUNTING'] },
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
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'quotation',
        name: 'Quotation',
        component: () => import('@/views/QuotationListView.vue'),
        meta: { roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
      },
      {
        path: 'quotation/new',
        name: 'QuotationCreate',
        component: () => import('@/views/QuotationFormView.vue'),
        meta: { roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
      },
      {
        path: 'quotation/:id/edit',
        name: 'QuotationEdit',
        component: () => import('@/views/QuotationFormView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
      },
      {
        path: 'documents/:sourceType/:id/convert/:targetType',
        name: 'DocumentConvert',
        component: () => import('@/views/DocumentConvertView.vue'),
        props: true,
      },
      {
        path: 'sales-order',
        name: 'SalesOrder',
        component: () => import('@/views/SalesOrderListView.vue'),
        meta: { roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
      },
      {
        path: 'billing-notes',
        name: 'BillingNotes',
        component: () => import('@/views/BillingListView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'billing-notes/manual',
        name: 'BillingNoteManualCreate',
        component: () => import('@/views/BillingFormView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'billing-notes/manual/:id/edit',
        name: 'BillingNoteEdit',
        component: () => import('@/views/BillingFormView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'billing-notes/new',
        name: 'BillingNoteCreate',
        component: () => import('@/views/BillingCreateFromBookingsView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'tax-invoices',
        name: 'TaxInvoices',
        component: () => import('@/views/TaxInvoiceListView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'tax-invoices/new',
        name: 'TaxInvoiceCreate',
        component: () => import('@/views/TaxInvoiceFormView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'tax-invoices/:id/edit',
        name: 'TaxInvoiceEdit',
        component: () => import('@/views/TaxInvoiceFormView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts',
        name: 'Receipts',
        component: () => import('@/views/ReceiptListView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts/new',
        name: 'ReceiptTypeSelect',
        component: () => import('@/views/ReceiptTypeSelectView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts/new-manual',
        name: 'ReceiptManualCreate',
        component: () => import('@/views/ReceiptFormView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts/new-manual/:id/edit',
        name: 'ReceiptEdit',
        component: () => import('@/views/ReceiptFormView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts/select',
        name: 'ReceiptSelectInvoices',
        component: () => import('@/views/ReceiptSelectInvoicesView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts/create',
        name: 'ReceiptCreate',
        component: () => import('@/views/ReceiptCreateView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'receipts/create/:id/edit',
        name: 'ReceiptFromInvoicesEdit',
        component: () => import('@/views/ReceiptCreateView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'cash-sale',
        name: 'CashSale',
        component: () => import('@/views/CashSaleListView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'credit-note',
        name: 'CreditNote',
        component: () => import('@/views/ComingSoonView.vue'),
        meta: { title: 'ใบลดหนี้', roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'debit-note',
        name: 'DebitNote',
        component: () => import('@/views/ComingSoonView.vue'),
        meta: { title: 'ใบเพิ่มหนี้', roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'documents/:docId',
        name: 'InvoiceDocument',
        component: () => import('@/views/InvoiceDocumentView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING', 'STAFF', 'DISPATCHER'] },
      },
      {
        path: 'documents/:docId/envelope',
        name: 'EnvelopePrint',
        component: () => import('@/views/EnvelopePrintView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'job/:bookingId',
        name: 'JobDocument',
        component: () => import('@/views/JobDocumentView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'DISPATCHER', 'STAFF', 'ACCOUNTING'] },
      },
      {
        path: 'billing-note/:batchId',
        name: 'BillingNote',
        component: () => import('@/views/BillingNoteView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'wht-certificates',
        name: 'WHTCertificates',
        component: () => import('@/views/WHTCertificateView.vue'),
        meta: { roles: ['ADMIN', 'ACCOUNTING'] },
      },
      {
        path: 'payroll/staff',
        name: 'PayrollStaff',
        component: () => import('@/views/PayrollView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'payroll/staff/new',
        name: 'StaffSalaryCreate',
        component: () => import('@/views/StaffSalaryFormView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'payroll/staff/:id',
        name: 'StaffSalaryDetail',
        component: () => import('@/views/StaffSalaryDetailView.vue'),
        props: true,
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'payroll/staff/:id/edit',
        name: 'StaffSalaryEdit',
        component: () => import('@/views/StaffSalaryFormView.vue'),
        props: true,
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'payroll/staff/:id/print',
        name: 'StaffSalaryDocument',
        component: () => import('@/views/StaffSalaryDocumentView.vue'),
        props: true,
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'payroll/drivers',
        name: 'PayrollDrivers',
        component: () => import('@/views/IncomeView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/drivers/:id',
        name: 'DriverDetail',
        component: () => import('@/views/DriverDetailView.vue'),
        props: true,
        meta: { roles: ['ADMIN', 'DISPATCHER'] },
      },
      {
        path: 'payroll/vendor-fleet',
        name: 'PayrollVendorFleet',
        component: () => import('@/views/PayrollVendorFleetView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'payroll/vendor-fleet/:vehicleId',
        name: 'VendorFleetVehicleDetail',
        component: () => import('@/views/VendorFleetVehicleDetailView.vue'),
        props: true,
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/vehicles',
        name: 'SettingsVehicles',
        component: () => import('@/views/VehiclesView.vue'),
        meta: { roles: ['ADMIN', 'DISPATCHER'] },
      },
      {
        path: 'settings/staff',
        name: 'SettingsStaff',
        component: () => import('@/views/StaffView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/drivers',
        name: 'SettingsDrivers',
        component: () => import('@/views/DriversView.vue'),
        meta: { roles: ['ADMIN', 'DISPATCHER'] },
      },
      {
        path: 'settings/customers',
        name: 'SettingsCustomers',
        component: () => import('@/views/CustomersView.vue'),
        meta: { roles: ['ADMIN', 'STAFF', 'ACCOUNTING'] },
      },
      // {
      //   path: 'settings/vendors',
      //   name: 'SettingsVendors',
      //   component: () => import('@/views/VendorsView.vue'),
      // },
      {
        path: 'settings/users',
        name: 'SettingsUsers',
        component: () => import('@/views/UserManagementView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/logs',
        name: 'SettingsLogs',
        component: () => import('@/views/LogView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/documents/function',
        name: 'DocumentFunctionSettings',
        component: () => import('@/views/DocumentFunctionSettingsView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/documents/numbering',
        name: 'DocumentNumbering',
        component: () => import('@/views/DocumentNumberingView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/documents/logo',
        name: 'DocumentLogo',
        component: () => import('@/views/DocumentLogoView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/documents/payment',
        name: 'DocumentPaymentInfo',
        component: () => import('@/views/DocumentPaymentInfoView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/documents/currency',
        name: 'DocumentCurrency',
        component: () => import('@/views/DocumentCurrencyView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/documents/notes',
        name: 'DocumentNotes',
        component: () => import('@/views/DocumentNotesView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/products',
        name: 'SettingsProducts',
        component: () => import('@/views/ProductsView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/fuel',
        name: 'SettingsFuel',
        component: () => import('@/views/FuelSettingsView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/origins',
        name: 'SettingsOrigins',
        component: () => import('@/views/OriginsView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'settings/billing-rule',
        name: 'SettingsBillingRule',
        component: () => import('@/views/BillingRuleSettingsView.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/StockView.vue'),
        meta: { roles: ['ADMIN', 'DISPATCHER'] },
      },
    ],
  },
  {
    path: '/driver-app',
    name: 'DriverApp',
    component: () => import('@/views/DriverJobsView.vue'),
    meta: { requiresAuth: true, roles: ['DRIVER'] },
  },
  {
    path: '/driver-app/job/:id',
    name: 'DriverJobDetail',
    component: () => import('@/views/DriverJobDetailView.vue'),
    props: true,
    meta: { requiresAuth: true, roles: ['DRIVER'] },
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('@/views/UnauthorizedView.vue'),
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

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Firebase Auth คืนสถานะ login แบบ async (onAuthStateChanged) — รอให้ resolve ก่อนตัดสินใจ กันไม่ให้คนที่
  // ล็อกอินค้างอยู่จริงถูกเด้งไปหน้า Login เพราะเช็คเร็วเกินไปตอนโหลดหน้าครั้งแรก/กด reload
  for (let i = 0; i < 150 && !authStore.authReady; i++) {
    await new Promise((r) => setTimeout(r, 20))
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next(authStore.role === 'DRIVER' ? { name: 'DriverApp' } : { name: 'DashboardHome' })
  } else if (authStore.isAuthenticated && authStore.role === 'DRIVER' && to.name !== 'DriverApp' && to.name !== 'DriverJobDetail') {
    // แยกมุมมองคนขับออกจากส่วนแอดมิน: คนขับเข้าได้เฉพาะหน้า Driver App (My Jobs + Job Detail)
    next({ name: 'DriverApp' })
  } else if (authStore.isAuthenticated && !canAccess(authStore.role, to.meta.roles as UserRole[] | undefined) && to.name !== 'Unauthorized') {
    next({ name: 'Unauthorized' })
  } else {
    next()
  }
})

export default router
