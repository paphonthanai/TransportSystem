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
        path: 'booking/:fleet/new',
        name: 'BookingCreate',
        component: () => import('@/views/BookingCreateView.vue'),
        props: true,
      },
      {
        path: 'booking/:fleet/:id/edit',
        name: 'BookingEdit',
        component: () => import('@/views/BookingEditView.vue'),
        props: true,
      },
      {
        path: 'booking/:fleet/completed',
        name: 'BookingCompleted',
        component: () => import('@/views/BookingCompletedView.vue'),
        props: true,
      },
      {
        path: 'completed-jobs',
        name: 'CompletedJobs',
        component: () => import('@/views/CompletedJobsView.vue'),
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
        path: 'quotation',
        name: 'Quotation',
        component: () => import('@/views/QuotationListView.vue'),
      },
      {
        path: 'quotation/new',
        name: 'QuotationCreate',
        component: () => import('@/views/QuotationFormView.vue'),
      },
      {
        path: 'quotation/:id/edit',
        name: 'QuotationEdit',
        component: () => import('@/views/QuotationFormView.vue'),
        props: true,
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
      },
      {
        path: 'billing-notes',
        name: 'BillingNotes',
        component: () => import('@/views/BillingListView.vue'),
      },
      {
        path: 'billing-notes/manual',
        name: 'BillingNoteManualCreate',
        component: () => import('@/views/BillingFormView.vue'),
      },
      {
        path: 'billing-notes/manual/:id/edit',
        name: 'BillingNoteEdit',
        component: () => import('@/views/BillingFormView.vue'),
        props: true,
      },
      {
        path: 'billing-notes/new',
        name: 'BillingNoteCreate',
        component: () => import('@/views/BillingCreateFromBookingsView.vue'),
      },
      {
        path: 'tax-invoices',
        name: 'TaxInvoices',
        component: () => import('@/views/TaxInvoiceListView.vue'),
      },
      {
        path: 'tax-invoices/new',
        name: 'TaxInvoiceCreate',
        component: () => import('@/views/TaxInvoiceFormView.vue'),
      },
      {
        path: 'tax-invoices/:id/edit',
        name: 'TaxInvoiceEdit',
        component: () => import('@/views/TaxInvoiceFormView.vue'),
        props: true,
      },
      {
        path: 'receipts',
        name: 'Receipts',
        component: () => import('@/views/ReceiptListView.vue'),
      },
      {
        path: 'receipts/new',
        name: 'ReceiptTypeSelect',
        component: () => import('@/views/ReceiptTypeSelectView.vue'),
      },
      {
        path: 'receipts/new-manual',
        name: 'ReceiptManualCreate',
        component: () => import('@/views/ReceiptFormView.vue'),
      },
      {
        path: 'receipts/new-manual/:id/edit',
        name: 'ReceiptEdit',
        component: () => import('@/views/ReceiptFormView.vue'),
        props: true,
      },
      {
        path: 'receipts/select',
        name: 'ReceiptSelectInvoices',
        component: () => import('@/views/ReceiptSelectInvoicesView.vue'),
      },
      {
        path: 'receipts/create',
        name: 'ReceiptCreate',
        component: () => import('@/views/ReceiptCreateView.vue'),
      },
      {
        path: 'cash-sale',
        name: 'CashSale',
        component: () => import('@/views/CashSaleListView.vue'),
      },
      {
        path: 'credit-note',
        name: 'CreditNote',
        component: () => import('@/views/ComingSoonView.vue'),
        meta: { title: 'ใบลดหนี้' },
      },
      {
        path: 'debit-note',
        name: 'DebitNote',
        component: () => import('@/views/ComingSoonView.vue'),
        meta: { title: 'ใบเพิ่มหนี้' },
      },
      {
        path: 'documents/:docId',
        name: 'InvoiceDocument',
        component: () => import('@/views/InvoiceDocumentView.vue'),
        props: true,
      },
      {
        path: 'documents/:docId/envelope',
        name: 'EnvelopePrint',
        component: () => import('@/views/EnvelopePrintView.vue'),
        props: true,
      },
      {
        path: 'job/:bookingId',
        name: 'JobDocument',
        component: () => import('@/views/JobDocumentView.vue'),
        props: true,
      },
      {
        path: 'billing-note/:batchId',
        name: 'BillingNote',
        component: () => import('@/views/BillingNoteView.vue'),
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
      // {
      //   path: 'settings/vendors',
      //   name: 'SettingsVendors',
      //   component: () => import('@/views/VendorsView.vue'),
      // },
      {
        path: 'settings/logs',
        name: 'SettingsLogs',
        component: () => import('@/views/LogView.vue'),
      },
      {
        path: 'settings/documents/function',
        name: 'DocumentFunctionSettings',
        component: () => import('@/views/DocumentFunctionSettingsView.vue'),
      },
      {
        path: 'settings/documents/numbering',
        name: 'DocumentNumbering',
        component: () => import('@/views/DocumentNumberingView.vue'),
      },
      {
        path: 'settings/documents/logo',
        name: 'DocumentLogo',
        component: () => import('@/views/DocumentLogoView.vue'),
      },
      {
        path: 'settings/documents/payment',
        name: 'DocumentPaymentInfo',
        component: () => import('@/views/DocumentPaymentInfoView.vue'),
      },
      {
        path: 'settings/documents/currency',
        name: 'DocumentCurrency',
        component: () => import('@/views/DocumentCurrencyView.vue'),
      },
      {
        path: 'settings/documents/notes',
        name: 'DocumentNotes',
        component: () => import('@/views/DocumentNotesView.vue'),
      },
      {
        path: 'settings/products',
        name: 'SettingsProducts',
        component: () => import('@/views/ProductsView.vue'),
      },
      {
        path: 'settings/fuel',
        name: 'SettingsFuel',
        component: () => import('@/views/FuelSettingsView.vue'),
      },
      {
        path: 'settings/origins',
        name: 'SettingsOrigins',
        component: () => import('@/views/OriginsView.vue'),
      },
      {
        path: 'settings/billing-rule',
        name: 'SettingsBillingRule',
        component: () => import('@/views/BillingRuleSettingsView.vue'),
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/StockView.vue'),
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
