<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-2 text-muted">
        <!-- <div class="text-lg font-bold text-text">ใบเสนอราคา</div> -->
        <RouterLink to="/quotation" class="text-xs text-muted hover:text-primary transition-colors">
          ใบเสนอราคา
        </RouterLink>
        <div class="text-xs text-muted">&gt; {{ statusFilterLabel }}</div>
      </div>
      <button @click="router.push('/quotation/new')" class="btn-primary">
        <span class="material-symbols-rounded text-base">add</span>
        สร้างใหม่
      </button>
    </div>

    <div class="card-lg space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <select v-model="statusFilter" class="input-field w-44">
          <option value="all">แสดงทั้งหมด</option>
          <option value="DRAFT">ร่าง</option>
          <option value="WAITING_APPROVAL">รออนุมัติ</option>
          <option value="APPROVED">อนุมัติแล้ว</option>
          <option value="REJECTED">ไม่อนุมัติ</option>
          <option value="CONVERTED">แปลงเป็นเอกสารแล้ว</option>
          <option value="PROCESSED">ดำเนินการแล้ว</option>
        </select>
        <div class="relative w-full max-w-xs">
          <span class="material-symbols-rounded text-base text-muted absolute left-3 top-1/2 -translate-y-1/2">search</span>
          <input v-model="search" placeholder="ค้นหาลูกค้า/เลขที่เอกสาร" class="input-field w-full pl-9" />
        </div>
      </div>

      <div class="overflow-auto max-h-[480px] border border-border rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border sticky top-0 z-[1]">
            <tr>
              <th class="px-3 py-3 w-8">
                <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" class="w-4 h-4" />
              </th>
              <th class="text-left px-3 py-3 font-semibold text-muted">วันที่</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">ชื่อลูกค้า/ชื่อโปรเจ็ค</th>
              <th class="text-right px-3 py-3 font-semibold text-muted">ยอดรวมสุทธิ</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานะ</th>
              <th class="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in pagedDocs" :key="doc.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-3">
                <input type="checkbox" :checked="selectedIds.has(doc.id)" @change="toggleSelect(doc.id)" class="w-4 h-4" />
              </td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ formatDate(doc.date) }}</td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-2 font-bold text-primary">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDotClass(doc.status)"></span>
                  {{ doc.number }}
                </div>
              </td>
              <td class="px-3 py-3">
                <div class="font-semibold text-text">{{ doc.customer }}</div>
                <div v-if="doc.project" class="text-xs text-muted">{{ doc.project }}</div>
              </td>
              <td class="px-3 py-3 text-right font-semibold text-text">{{ formatBaht(doc.amount) }}</td>
              <td class="px-3 py-3">
                <select
                  :value="doc.status"
                  @change="onStatusSelect(doc, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = doc.status"
                  class="status-select"
                  :class="salesDocumentStatusClass(doc.type, doc.status)"
                >
                  <option v-for="opt in statusOptionsFor(doc)" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
                    {{ opt.label }}{{ opt.disabled ? ' (เร็วๆ นี้)' : '' }}
                  </option>
                </select>
              </td>
              <td class="px-3 py-3 text-right relative">
                <button @click="toggleMenu(doc.id, $event)" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2 ml-auto">
                  <span class="material-symbols-rounded text-base">more_horiz</span>
                </button>
              </td>
            </tr>
            <tr v-if="pagedDocs.length === 0">
              <td colspan="7" class="px-3 py-8 text-center text-muted">ยังไม่มีเอกสาร</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 text-sm">
        <div class="flex items-center gap-2 text-muted">
          รายการต่อหน้า
          <select v-model.number="perPage" class="input-field w-20">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-muted">ยอดรวมทั้งหมด: <span class="font-semibold text-text">{{ formatBaht(totalAmount) }}</span></div>
          <div class="flex items-center gap-1">
            <button @click="page = Math.max(1, page - 1)" :disabled="page === 1" class="page-btn">
              <span class="material-symbols-rounded text-base">chevron_left</span>
            </button>
            <span class="text-muted px-1">{{ page }}/{{ totalPages }}</span>
            <button @click="page = Math.min(totalPages, page + 1)" :disabled="page === totalPages" class="page-btn">
              <span class="material-symbols-rounded text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="activeMenuDoc"
        v-click-outside="closeMenu"
        class="fixed z-50 w-52 bg-surface border border-border rounded-lg shadow-lg py-1 text-left"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
      >
        <button v-if="activeMenuDoc.status !== 'CONVERTED'" @click="router.push(`/quotation/${activeMenuDoc.id}/edit`); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">edit</span>
          แก้ไข
        </button>
        <button @click="printQuotation(activeMenuDoc.id); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">print</span>
          พิมพ์
        </button>
        <button @click="shareQuotation(activeMenuDoc); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">share</span>
          แชร์
        </button>
        <button @click="downloadQuotation(activeMenuDoc.id); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">download</span>
          ดาวน์โหลด
        </button>
        <button disabled class="menu-item opacity-40 cursor-not-allowed" title="ยังไม่เปิดให้ใช้งาน">
          <span class="material-symbols-rounded text-base">mail</span>
          พิมพ์จ่าหน้าซอง
        </button>
        <button @click="salesDocumentsStore.duplicateQuotation(activeMenuDoc.id); closeMenu()" class="menu-item">
          <span class="material-symbols-rounded text-base">content_copy</span>
          สร้างซ้ำ
        </button>
        <div class="border-t border-border my-1"></div>
        <button @click="removeQuotation(activeMenuDoc); closeMenu()" class="menu-item text-red-600 hover:bg-red-50">
          <span class="material-symbols-rounded text-base">delete</span>
          ลบ
        </button>
      </div>
    </Teleport>

    <!-- ใบเสนอราคาไม่มีข้อมูลว่าเป็นงานของกองรถไหน ต้องให้เลือกก่อนเด้งไปหน้าสร้างงาน -->
    <Teleport to="body">
      <div v-if="pendingFleetAction" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="pendingFleetAction = null">
        <div class="bg-surface rounded-xl shadow-xl w-full max-w-sm p-5 space-y-3">
          <h3 class="text-base font-bold text-text">เลือกกองรถสำหรับงานนี้</h3>
          <p class="text-xs text-muted">ใบเสนอราคาไม่มีข้อมูลกองรถ กรุณาเลือกก่อนไปกรอกรายละเอียดงานขนส่ง</p>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button @click="chooseFleet('cements')" class="fleet-btn">Fleet Cements</button>
            <button @click="chooseFleet('ceramics')" class="fleet-btn">Fleet Ceramics</button>
          </div>
          <button @click="pendingFleetAction = null" class="btn-secondary w-full justify-center">ยกเลิก</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesDocumentsStore, type SalesDocument, type SalesDocumentStatus } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useDocumentPrefillStore, type DocumentPrefillPayload } from '@/stores/documentPrefill'
import { salesDocumentStatusClass } from '@/utils/salesDocumentStatus'
import type { BookingCategory } from '@/types'

const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const documentPrefillStore = useDocumentPrefillStore()

const statusFilter = ref<'all' | SalesDocumentStatus>('all')
const search = ref('')

const statusFilterLabel = computed(() =>
  statusFilter.value === 'all' ? 'แสดงทั้งหมด' : statusLabel[statusFilter.value] || 'แสดงทั้งหมด'
)

const allQuotations = computed(() => salesDocumentsStore.documents.filter((d) => d.type === 'QUOTATION'))

const filteredDocs = computed(() =>
  allQuotations.value.filter((d) => {
    if (statusFilter.value !== 'all' && d.status !== statusFilter.value) return false
    const q = search.value.trim().toLowerCase()
    if (!q) return true
    return d.customer.toLowerCase().includes(q) || d.number.toLowerCase().includes(q)
  })
)

const page = ref(1)
const perPage = ref(20)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredDocs.value.length / perPage.value)))
const pagedDocs = computed(() => filteredDocs.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
const totalAmount = computed(() => filteredDocs.value.reduce((sum, d) => sum + d.amount, 0))

const selectedIds = ref<Set<string>>(new Set())
const allSelected = computed(() => pagedDocs.value.length > 0 && pagedDocs.value.every((d) => selectedIds.value.has(d.id)))
const toggleSelectAll = () => {
  if (allSelected.value) {
    pagedDocs.value.forEach((d) => selectedIds.value.delete(d.id))
  } else {
    pagedDocs.value.forEach((d) => selectedIds.value.add(d.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}
const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: 0, left: 0 })
const activeMenuDoc = computed(() => filteredDocs.value.find((d) => d.id === openMenuId.value) || null)

const MENU_WIDTH = 208
const MENU_ESTIMATED_HEIGHT = 300

/** เมนูถูก Teleport ไปที่ body แล้ววางตำแหน่งแบบ fixed ตามตำแหน่งจริงของปุ่ม "..." บนหน้าจอ
 *  จึงไม่มีปัญหาโดน overflow ของตาราง (ที่ตอนนี้ scroll ในตัวเองแบบ fixed height) บังหรือครอบตัด */
const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    closeMenu()
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const openUpward = rect.bottom + MENU_ESTIMATED_HEIGHT > window.innerHeight
  menuPosition.value = {
    top: openUpward ? rect.top - MENU_ESTIMATED_HEIGHT : rect.bottom + 4,
    left: Math.max(8, rect.right - MENU_WIDTH),
  }
  openMenuId.value = id
}
const closeMenu = () => {
  openMenuId.value = null
}

window.addEventListener('scroll', closeMenu, true)
onUnmounted(() => window.removeEventListener('scroll', closeMenu, true))

const vClickOutside = {
  mounted(el: HTMLElement & { _clickOutside?: (e: MouseEvent) => void }, binding: { value: () => void }) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el: HTMLElement & { _clickOutside?: (e: MouseEvent) => void }) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside, true)
  },
}

const statusLabel: Record<SalesDocumentStatus, string> = {
  DRAFT: 'ร่าง',
  WAITING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  CONVERTED: 'แปลงเป็นเอกสารแล้ว',
  PROCESSED: 'ดำเนินการแล้ว',
  SENT: 'ส่งแล้ว',
  BILLING_PENDING: 'รอวางบิล',
  BILLED: 'วางบิลแล้ว',
  WAITING_PAYMENT: 'รอชำระเงิน',
  PAID: 'ชำระแล้ว',
  CLOSED: 'ปิดรายการแล้ว',
  ISSUED: 'ออกแล้ว',
}

type ActionOption = { value: string; label: string; disabled?: boolean }

/**
 * ตัวเลือกในดรอปดาวน์สถานะ = สถานะปัจจุบัน (แสดงตำแหน่งแรก) + การกระทำที่ทำได้จากสถานะนั้น
 * รออนุมัติ/อนุมัติแล้ว ใช้ชุดการกระทำเดียวกัน (สร้างใบวางบิล/ใบแจ้งหนี้/ขายเงินสด/ใบสั่งซื้อ ทำได้ตั้งแต่รออนุมัติเลย)
 * "สร้างใบสั่งงาน" และ "ดำเนินการแล้ว" ทำได้เฉพาะตอนอนุมัติแล้วเท่านั้น ตามที่ผู้ใช้ระบุ
 * รายการแบ่งจ่ายฯ/มัดจำฯ (6 แบบ) ซ่อนไว้ก่อนทั้งหมด — ยังไม่มี flow มัดจำ/แบ่งชำระในระบบ
 */
const statusOptionsFor = (doc: SalesDocument): ActionOption[] => {
  const s = doc.status
  if (s === 'DRAFT') {
    return [
      { value: 'DRAFT', label: statusLabel.DRAFT },
      { value: 'SEND_APPROVAL', label: 'ส่งอนุมัติ' },
    ]
  }
  if (s === 'WAITING_APPROVAL') {
    return [
      { value: 'WAITING_APPROVAL', label: statusLabel.WAITING_APPROVAL },
      { value: 'APPROVE', label: 'อนุมัติ' },
      { value: 'CREATE_BILLING', label: 'สร้างใบวางบิล' },
      { value: 'CREATE_INVOICE', label: 'สร้างใบแจ้งหนี้/ใบกำกับภาษี' },
      // { value: 'CREATE_CASH_SALE', label: 'สร้างใบกำกับภาษี/ใบเสร็จรับเงิน (เงินสด)' },
      { value: 'CREATE_PO', label: 'สร้างใบสั่งซื้อ' },
      { value: 'REJECT', label: 'ไม่อนุมัติ' },
    ]
  }
  if (s === 'APPROVED') {
    return [
      { value: 'APPROVED', label: statusLabel.APPROVED },
      { value: 'CREATE_SALES_ORDER', label: 'สร้างใบสั่งสินค้า' },
      { value: 'CREATE_JOB_ORDER', label: 'สร้างใบสั่งงาน' },
      { value: 'CREATE_BILLING', label: 'สร้างใบวางบิล' },
      { value: 'CREATE_INVOICE', label: 'สร้างใบแจ้งหนี้/ใบกำกับภาษี' },
      // { value: 'CREATE_CASH_SALE', label: 'สร้างใบกำกับภาษี/ใบเสร็จรับเงิน (เงินสด)' },
      { value: 'CREATE_PO', label: 'สร้างใบสั่งซื้อ' },
      { value: 'REJECT', label: 'ไม่อนุมัติ' },
      { value: 'COMPLETE', label: 'ดำเนินการแล้ว' },
      { value: 'RESET', label: 'รีเซ็ต' },
    ]
  }
  // CONVERTED = ระบบแปลงเอกสารให้อัตโนมัติแล้ว (มีเอกสารลูกผูกอยู่) รีเซ็ตไม่ได้จริง จึงไม่แสดงตัวเลือกอื่น
  if (s === 'CONVERTED') {
    return [{ value: 'CONVERTED', label: statusLabel.CONVERTED }]
  }
  // PROCESSED = ผู้ใช้กด "ดำเนินการแล้ว" จบขั้นตอนเองด้วยมือ เหลือแค่รีเซ็ตกลับไปแก้ไขได้เท่านั้น ตามที่ระบุ
  if (s === 'PROCESSED') {
    return [
      { value: 'PROCESSED', label: statusLabel.PROCESSED },
      { value: 'RESET', label: 'รีเซ็ต' },
    ]
  }
  if (s === 'REJECTED') {
    return [
      { value: 'REJECTED', label: statusLabel.REJECTED },
      { value: 'RESET', label: 'รีเซ็ต' },
    ]
  }
  return [{ value: s, label: statusLabel[s] }]
}

const statusDotClass = (status: SalesDocumentStatus) =>
  ({
    DRAFT: 'bg-gray-400',
    WAITING_APPROVAL: 'bg-amber-500',
    APPROVED: 'bg-blue-500',
    REJECTED: 'bg-red-500',
    CONVERTED: 'bg-green-500',
    PROCESSED: 'bg-teal-500',
  })[status as 'DRAFT' | 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'PROCESSED'] || 'bg-gray-400'

/**
 * เด้งไปหน้าสร้างงานขนส่ง พร้อม prefill เท่าที่ใบเสนอราคามีข้อมูลจริงเท่านั้น — "ที่อยู่ลูกค้า" ไม่ใช่ "ต้นทางขึ้นสินค้า"
 * จึงไม่ prefill ช่องต้นทางให้ (เดาไม่ได้จริง ต้องให้ผู้ใช้กรอกเอง) และไม่เดา fleet จากชื่อโปรเจ็ค (เดาผิดบ่อย ทำให้
 * ไปโผล่หน้า Ceramics ที่ล็อกช่องเบี้ยเลี้ยงแก้ไม่ได้) ให้ผู้ใช้เลือกกองรถเองก่อนเสมอ (ดู pendingFleetAction ด้านล่าง)
 */
const navigateToBookingCreate = (doc: SalesDocument, fleet: BookingCategory, source: 'quotation' | 'sales_order') => {
  /** ส่งรายการสินค้าของใบเสนอราคาไปด้วย (ผ่าน documentPrefillStore เดียวกับ flow สร้างใบวางบิล/ใบแจ้งหนี้) เพื่อให้
   *  หน้าสร้างงานขนส่งใหม่เติม "สินค้า" + "จำนวน" ในรายการขนส่งให้อัตโนมัติ ส่วนปลายทาง/จังหวัด/อำเภอที่ใบเสนอราคา
   *  ไม่มีข้อมูล ยังต้องให้ผู้ใช้กรอกเองอยู่เหมือนเดิม (ดู BookingCreateView.vue) */
  documentPrefillStore.setPrefill(buildPrefillFromQuotation(doc))
  router.push({
    name: 'BookingCreate',
    params: { fleet },
    query: {
      source,
      quotationId: doc.id,
      customer: doc.customer,
      po: doc.reference || '',
      route: doc.project || '',
      shipDate: new Date().toISOString().slice(0, 10),
      amount: String(doc.amount),
    },
  })
}

/** งานยังไม่ทราบว่าเป็นกองรถไหน (ใบเสนอราคาไม่มีข้อมูลนี้) ต้องให้ผู้ใช้เลือกก่อนเด้งไปหน้าสร้างงาน */
const pendingFleetAction = ref<{ doc: SalesDocument; source: 'quotation' | 'sales_order' } | null>(null)
const chooseFleet = (fleet: BookingCategory) => {
  if (!pendingFleetAction.value) return
  navigateToBookingCreate(pendingFleetAction.value.doc, fleet, pendingFleetAction.value.source)
  pendingFleetAction.value = null
}

const createJobOrder = (doc: SalesDocument) => {
  pendingFleetAction.value = { doc, source: 'quotation' }
}

/**
 * "สร้างใบสั่งสินค้า" กับ "สร้างงานขนส่งใหม่" ถูกรวมเป็นการกระทำเดียว — เด้งไปหน้าสร้างงานทันที ไม่มีหน้ารีวิวคั่นกลาง
 * เมื่อกดบันทึกงานในหน้านั้น ระบบจะสร้างระเบียนใบสั่งสินค้าที่ผูกกับงานนี้ให้อัตโนมัติ (ดู BookingCreateView.vue)
 */
const createSalesOrderBooking = (doc: SalesDocument) => {
  pendingFleetAction.value = { doc, source: 'sales_order' }
}

const completeQuotation = (id: string) => {
  salesDocumentsStore.markQuotationProcessed(id)
}

/** สร้าง JSON payload จากใบเสนอราคา + รายการสินค้า ส่งผ่าน documentPrefillStore ไปเติมในหน้าสร้างเอกสารปลายทางโดยตรง (ไม่ผ่านหน้า convert เดิม) */
const buildPrefillFromQuotation = (doc: SalesDocument): DocumentPrefillPayload => ({
  sourceType: 'QUOTATION',
  sourceId: doc.id,
  sourceNumber: doc.number,
  customer: doc.customer,
  items: salesDocumentsStore.itemsForDocument(doc.id).map(({ id, documentId, sortOrder, ...rest }) => rest),
  reference: doc.reference,
  creditDays: doc.creditDays,
  paymentTermMode: doc.paymentTermMode,
  customerAddress: doc.customerAddress,
  customerZipCode: doc.customerZipCode,
  customerTaxId: doc.customerTaxId,
  customerBranchName: doc.customerBranchName,
  project: doc.project,
  salesperson: doc.salesperson,
  currencyCode: doc.currencyCode,
  warehouse: doc.warehouse,
  priceMode: doc.priceMode,
  description: doc.description,
  note: doc.note,
  internalNote: doc.internalNote,
  attachmentImage: doc.attachmentImage,
  useESignature: doc.useESignature,
  discountTotal: doc.discountTotal,
  vatAmount: doc.vatAmount,
  whtAmount: doc.whtAmount,
})

const sendToCreateBilling = (doc: SalesDocument) => {
  documentPrefillStore.setPrefill(buildPrefillFromQuotation(doc))
  router.push('/billing-notes/manual')
}

const sendToCreateInvoice = (doc: SalesDocument) => {
  documentPrefillStore.setPrefill(buildPrefillFromQuotation(doc))
  router.push('/tax-invoices/new')
}

const sendToCreateCashSale = (doc: SalesDocument) => {
  documentPrefillStore.setPrefill(buildPrefillFromQuotation(doc))
  router.push('/cash-sale')
}

const onStatusSelect = (doc: SalesDocument, action: string) => {
  switch (action) {
    case 'SEND_APPROVAL':
      salesDocumentsStore.sendQuotationForApproval(doc.id)
      break
    case 'APPROVE':
      salesDocumentsStore.approveQuotation(doc.id)
      break
    case 'REJECT':
      salesDocumentsStore.rejectQuotation(doc.id)
      break
    case 'RESET':
      salesDocumentsStore.resetQuotation(doc.id)
      break
    case 'CREATE_JOB_ORDER':
      createJobOrder(doc)
      break
    case 'CREATE_SALES_ORDER':
      createSalesOrderBooking(doc)
      break
    case 'COMPLETE':
      completeQuotation(doc.id)
      break
    case 'CREATE_INVOICE':
      sendToCreateInvoice(doc)
      break
    case 'CREATE_CASH_SALE':
      sendToCreateCashSale(doc)
      break
    case 'CREATE_BILLING':
      sendToCreateBilling(doc)
      break
    case 'CREATE_PO':
      createSalesOrderBooking(doc)
      break
    default:
      break
  }
}

const printQuotation = (id: string) => {
  router.push(`/documents/${id}`)
}

/** ดาวน์โหลด = พิมพ์แล้วเลือก "บันทึกเป็น PDF" ที่หน้าต่างพิมพ์ของเบราว์เซอร์ (ระบบนี้ไม่มีไลบรารีสร้าง PDF แยก) */
const downloadQuotation = (id: string) => {
  router.push(`/documents/${id}`)
  setTimeout(() => window.print(), 300)
}

/** แชร์ผ่าน Web Share API ถ้าเบราว์เซอร์รองรับ ไม่งั้นคัดลอกลิงก์เอกสารไปยังคลิปบอร์ดแทน */
const shareQuotation = async (doc: SalesDocument) => {
  const url = `${window.location.origin}/documents/${doc.id}`
  if (navigator.share) {
    try {
      await navigator.share({ title: `ใบเสนอราคา ${doc.number}`, text: `ใบเสนอราคา ${doc.number} — ${doc.customer}`, url })
    } catch {
      // ผู้ใช้ยกเลิกการแชร์ ไม่ต้องแจ้งอะไรเพิ่ม
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    alert('คัดลอกลิงก์เอกสารแล้ว')
  } catch {
    alert(url)
  }
}

const removeQuotation = (doc: SalesDocument) => {
  if (!confirm(`ยืนยันลบใบเสนอราคา ${doc.number}?`)) return
  salesDocumentsStore.deleteQuotation(doc.id)
}

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.status-select {
  @apply h-8 px-2 rounded-full border-0 text-xs font-semibold cursor-pointer focus:outline-none;
}

.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 cursor-pointer text-left;
}

.page-btn {
  @apply w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.fleet-btn {
  @apply h-16 rounded-lg border border-border bg-surface text-text font-semibold text-sm flex items-center justify-center hover:border-primary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer;
}
</style>
