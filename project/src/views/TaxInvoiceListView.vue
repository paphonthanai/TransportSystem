<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="text-xs text-muted">ใบแจ้งหนี้/ใบกำกับภาษี &gt; {{ statusFilterLabel }}</div>
      <div class="flex items-center gap-2">
        <!-- ปุ่ม Sync (ซิงก์เอกสารที่ขาดหาย/ซิงก์ข้อมูลก่อนหน้า/ซิงก์ความสัมพันธ์ใบวางบิล) ซ่อนจาก UI ตาม requirement — ฟังก์ชันเบื้องหลัง
             (syncMissingSalesOrders/syncBillingReadiness/syncInvoiceReferences) ยังอยู่ครบ ไม่ได้ลบ ไม่มี auto-trigger ที่ไหน
             เรียกเฉพาะตอนกดปุ่มเหล่านี้เท่านั้น (ตรวจแล้วก่อนซ่อน) -->
        <!-- ยกเลิกการสร้างเอกสารแบบ Dropdown ตาม requirement — ไปหน้าเลือกประเภทแบบการ์ด (TaxInvoiceTypeSelectView.vue) แทน -->
        <button @click="router.push('/tax-invoices/type-select')" class="btn-primary">
          <span class="material-symbols-rounded text-base">add</span>
          สร้างใบแจ้งหนี้
        </button>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <select v-model="statusFilter" class="input-field w-44">
          <option value="all">แสดงทั้งหมด</option>
          <option value="DRAFT">ร่าง</option>
          <option value="SENT">ส่งแล้ว</option>
          <option value="PAID">ชำระแล้ว</option>
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
              <th class="text-left px-3 py-3 font-semibold text-muted">วันที่</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">ชื่อลูกค้า</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">วันครบกำหนด</th>
              <th class="text-right px-3 py-3 font-semibold text-muted">ยอดรวมสุทธิ</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เอกสารต่อเนื่อง</th>
              <th class="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in pagedDocs" :key="doc.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ formatDate(doc.date) }}</td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-2 font-bold text-primary">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDotClass(doc.status)"></span>
                  {{ doc.number }}
                  <button @click="editDocumentNumber(doc)" class="text-muted hover:text-primary" title="แก้ไขเลขที่เอกสาร">
                    <span class="material-symbols-rounded text-sm">edit_note</span>
                  </button>
                </div>
              </td>
              <td class="px-3 py-3 font-semibold text-text">{{ doc.customer }}</td>
              <td class="px-3 py-3 text-muted">{{ formatDate(doc.dueDate) }}</td>
              <td class="px-3 py-3 text-right font-semibold text-text">{{ formatBaht(doc.amount + (doc.vatAmount || 0)) }}</td>
              <td class="px-3 py-3">
                <select
                  :value="doc.status"
                  @change="onStatusSelect(doc, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = doc.status"
                  class="status-select"
                  :class="salesDocumentStatusClass(doc.type, doc.status)"
                >
                  <option v-for="opt in statusOptionsFor(doc)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </td>
              <td class="px-3 py-3">
                <div v-if="downstreamReceiptsFor(doc).length" class="flex flex-col gap-1">
                  <RouterLink
                    v-for="d in downstreamReceiptsFor(doc)"
                    :key="d.id"
                    :to="`/documents/${d.id}`"
                    class="inline-flex items-center gap-1.5 hover:underline w-fit"
                    :title="d.number"
                  >
                    <span class="text-[11px] text-muted">{{ salesDocumentTypeLabel[d.type] }}</span>
                    <span class="text-xs font-semibold px-1.5 py-0.5 rounded-full" :class="salesDocumentStatusClass(d.type, d.status)">
                      {{ salesDocumentStatusLabel(d.type, d.status) }}
                    </span>
                  </RouterLink>
                </div>
                <span v-else class="text-xs text-muted">-</span>
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="doc.status === 'DRAFT'"
                    @click="router.push(`/tax-invoices/${doc.id}/edit`)"
                    class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2"
                  >
                    <span class="material-symbols-rounded text-base">edit</span>
                  </button>
                  <button @click="router.push(`/documents/${doc.id}`)" class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
                    <span class="material-symbols-rounded text-base">print</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="pagedDocs.length === 0">
              <td colspan="8" class="px-3 py-8 text-center text-muted">ยังไม่มีเอกสาร</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 text-sm">
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

    <ShareDocumentModal
      v-if="shareTarget"
      :open="!!shareTarget"
      :doc-id="shareTarget.id"
      :number="shareTarget.number"
      :customer="shareTarget.customer"
      doc-type-label="ใบแจ้งหนี้/ใบกำกับภาษี"
      @close="shareTarget = null"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesDocumentsStore, type SalesDocument, type SalesDocumentStatus } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useBookingStore } from '@/stores/booking'
import { salesDocumentStatusClass, salesDocumentStatusLabel, salesDocumentTypeLabel } from '@/utils/salesDocumentStatus'
import ShareDocumentModal from '@/components/shared/ShareDocumentModal.vue'

const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
/** ต้อง instantiate ตั้งแต่หน้านี้โหลด (แม้ไม่ได้ใช้แสดงผลตรงๆ) เพื่อให้ bookingStore เริ่มดึงข้อมูลจาก Firestore ล่วงหน้า
 *  ก่อนผู้ใช้จะกด "สร้างใบเสร็จรับเงิน" — ดูเหตุผลเดียวกันใน BillingListView.vue */
useBookingStore()

const statusFilter = ref<'all' | SalesDocumentStatus>('all')
const search = ref('')

const statusLabel: Partial<Record<SalesDocumentStatus, string>> = {
  DRAFT: 'ร่าง',
  SENT: 'ส่งแล้ว',
  PAID: 'ชำระแล้ว',
}

const statusFilterLabel = computed(() => (statusFilter.value === 'all' ? 'แสดงทั้งหมด' : statusLabel[statusFilter.value] || 'แสดงทั้งหมด'))

const syncMissingSalesOrders = () => {
  const created = salesDocumentsStore.backfillMissingSalesOrders()
  alert(created > 0 ? `สร้างใบสั่งสินค้าให้งานที่ขาดหายแล้ว ${created} ใบ` : 'ทุกงานมีใบสั่งสินค้าครบแล้ว ไม่มีรายการที่ต้องซิงก์')
}

/** ซ่อมสถานะวางบิล (billingStatus) ที่ค้างจากระบบเดิม ให้กลับมาเดินเอกสารต่อได้ตามปกติ — ไม่สร้าง/ลบเอกสารใดๆ
 * ไม่แตะสถานะงานขนส่ง ทำได้ปลอดภัยแม้กดซ้ำหลายครั้ง (idempotent) ดู syncBillingReadiness ใน stores/salesDocuments.ts */
const syncBillingReadiness = () => {
  const result = salesDocumentsStore.syncBillingReadiness()
  if (result.repaired.length === 0) {
    alert(`ตรวจสอบแล้ว ${result.checked} งาน ไม่พบรายการที่ค้างสถานะวางบิลจากระบบเดิม`)
    return
  }
  const list = result.repaired.map((r) => `- ${r.docNo} (เดิม: ${r.previousBillingStatus})`).join('\n')
  alert(`ซ่อมสถานะวางบิลให้ ${result.repaired.length} งาน สามารถเดินเอกสารต่อได้แล้ว:\n${list}`)
}

/** ซ่อม parentDocumentId ของใบแจ้งหนี้/ใบกำกับภาษีที่ขาด/ชี้ผิด โดยจับคู่กับเลขที่ใบวางบิลต้นทางที่เก็บไว้ใน
 * reference ตรงตัวเป๊ะเท่านั้น ไม่เดา ดู repairTaxInvoiceReferences ใน stores/salesDocuments.ts */
const syncInvoiceReferences = () => {
  const result = salesDocumentsStore.repairTaxInvoiceReferences()
  const lines: string[] = []
  if (result.repaired.length > 0) {
    lines.push(`ซ่อมความสัมพันธ์ให้ ${result.repaired.length} ใบ: ${result.repaired.map((r) => `${r.number} → ${r.matchedBilling}`).join(', ')}`)
  } else {
    lines.push(`ตรวจสอบแล้ว ${result.checked} ใบ ไม่พบรายการที่ reference ขาด/ชี้ผิด`)
  }
  if (result.unmatched.length > 0) {
    lines.push(`\nจับคู่ไม่ได้ (ต้องตรวจสอบเอง) ${result.unmatched.length} ใบ: ${result.unmatched.map((u) => u.number).join(', ')}`)
  }
  alert(lines.join('\n'))
}

/** เมนูเลือก "สร้างใบแจ้งหนี้" (เดี่ยว) / "สร้างใบแจ้งหนี้รวม" — รวมปุ่มสร้างเป็นกลุ่มเดียว (เหมือน BillingListView.vue) */
const createMenuOpen = ref(false)
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

const allInvoices = computed(() => salesDocumentsStore.documents.filter((d) => d.type === 'TAX_INVOICE'))

const filteredDocs = computed(() =>
  allInvoices.value.filter((d) => {
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
const totalAmount = computed(() => filteredDocs.value.reduce((sum, d) => sum + d.amount + (d.vatAmount || 0), 0))

type ActionOption = { value: string; label: string }

/** ใบที่ถูกใบเสร็จรับเงิน (ที่ยังไม่ถูกยกเลิก) อ้างอิงไปแล้ว — กันเสนอ "สร้างใบเสร็จรับเงิน" ซ้ำ ดู sourceDocsClaimedByOtherReceipts */
const claimedByReceipt = computed(() => new Set(salesDocumentsStore.invoicesClaimedByOtherReceipts(allInvoices.value.map((d) => d.id))))

/** ย้ายตัวเลือก "สร้างใบเสร็จรับเงิน" กลับมาไว้ที่ปุ่มสถานะต่อแถวของใบแจ้งหนี้ (นำทางไปหน้าเลือกเอกสารจริง /receipts/select
 *  ไม่ใช่การสร้างลัดแบบเดิมที่เคยถูกถอดออกไป — ดู onStatusSelect กรณี CREATE_RECEIPT) แทนที่จะต้องเริ่มจากฝั่งใบเสร็จเท่านั้น
 *  recordTaxInvoicePayment ยังอยู่ในสโตร์ครบ ไม่ได้ลบ ไม่มี UI เรียกแล้วเพราะการเก็บเงินย้ายไปอยู่ที่ใบเสร็จรับเงินทั้งหมด */
const statusOptionsFor = (doc: SalesDocument): ActionOption[] => {
  const s = doc.status
  const canCreateReceipt = !claimedByReceipt.value.has(doc.id)
  const createReceiptOpt: ActionOption[] = canCreateReceipt ? [{ value: 'CREATE_RECEIPT', label: 'สร้างใบเสร็จรับเงิน' }] : []
  if (s === 'DRAFT') {
    return [
      { value: 'DRAFT', label: statusLabel.DRAFT! },
      { value: 'SEND', label: 'ส่งใบแจ้งหนี้' },
      ...createReceiptOpt,
      { value: 'DELETE', label: 'ลบ' },
      { value: 'CANCEL', label: 'ยกเลิก' },
    ]
  }
  if (s === 'SENT') {
    return [{ value: 'SENT', label: statusLabel.SENT! }, ...createReceiptOpt, { value: 'RESET', label: 'รีเซ็ต' }, { value: 'DELETE', label: 'ลบ' }]
  }
  if (s === 'PAID') {
    return [{ value: 'PAID', label: statusLabel.PAID! }, { value: 'DELETE', label: 'ลบ' }]
  }
  return [{ value: s, label: s }]
}

/** item 2.1/3: แก้ไขเลขที่เอกสารได้ทุกสถานะ พร้อมกันเลขซ้ำ (ดู changeDocumentNumber ใน stores/salesDocuments.ts) */
const editDocumentNumber = (doc: SalesDocument) => {
  const input = prompt('เลขที่เอกสารใหม่:', doc.number)
  if (input === null) return
  const result = salesDocumentsStore.changeDocumentNumber(doc.id, input)
  if (!result.ok && result.message) alert(result.message)
}

const statusDotClass = (status: SalesDocumentStatus) =>
  ({ DRAFT: 'bg-gray-400', SENT: 'bg-amber-500', PAID: 'bg-green-500' })[status as 'DRAFT' | 'SENT' | 'PAID'] || 'bg-gray-400'

/** ใบเสร็จรับเงินที่ออกจากใบแจ้งหนี้นี้แล้ว — ใบแจ้งหนี้ไม่มี convertedToDocumentIds ของตัวเอง (ต่างจากใบวางบิล) จึงต้อง
 *  หาย้อนกลับจาก sourceDocumentIds ของใบเสร็จแทน แสดงสถานะสดแบบ reactive เพื่อให้เห็นว่าใบแจ้งหนี้นี้เดินไปถึงไหนแล้ว */
const downstreamReceiptsFor = (doc: SalesDocument): SalesDocument[] =>
  salesDocumentsStore.documents.filter((d) => d.type === 'RECEIPT' && d.sourceDocumentIds?.includes(doc.id))

const shareTarget = ref<SalesDocument | null>(null)

const onStatusSelect = (doc: SalesDocument, action: string) => {
  switch (action) {
    case 'CREATE_RECEIPT':
      router.push({ path: '/receipts/select', query: { customer: doc.customer, invoiceId: doc.id } })
      break
    case 'SEND':
      // ปุ่ม "ส่งใบแจ้งหนี้" เปิด Share Document เดิม (ไม่สร้าง logic ส่งใหม่) แล้วค่อยปรับสถานะเป็นส่งแล้วเหมือนเดิม
      salesDocumentsStore.sendInvoice(doc.id)
      shareTarget.value = doc
      break
    case 'CANCEL': {
      if (!confirm(`ยืนยันยกเลิกใบแจ้งหนี้ ${doc.number}? งานขนส่ง/ใบวางบิลที่ผูกไว้จะกลับไปสถานะก่อนหน้า`)) break
      const ok = salesDocumentsStore.cancelTaxInvoice(doc.id)
      if (!ok) alert(`ยกเลิกไม่สำเร็จ — มีใบเสร็จรับเงินที่ออกจากใบแจ้งหนี้ ${doc.number} ไปแล้ว ให้ลบใบเสร็จนั้นก่อน`)
      break
    }
    case 'RESET': {
      if (!confirm(`ยืนยัน Reset ใบแจ้งหนี้ ${doc.number} กลับเป็นร่าง?`)) break
      const result = salesDocumentsStore.resetTaxInvoice(doc.id)
      if (!result.ok && result.message) {
        alert(result.message)
        break
      }
      // resetTaxInvoice เปลี่ยน status เป็น DRAFT จริง (แก้ไขได้ทันที) แต่ถ้า statusFilter ที่ผู้ใช้เลือกดูอยู่ไม่ใช่
      // "ร่าง"/"แสดงทั้งหมด" (เช่นกำลังดูแท็บ "ส่งแล้ว") แถวนี้จะหายไปจากตารางทันทีเพราะไม่ตรง filteredDocs อีกต่อไป —
      // ดูเหมือน Reset แล้ว "แก้ไขไม่ได้" ทั้งที่จริงข้อมูลสมบูรณ์และแก้ไขได้แล้ว (PM-reported) สลับ filter ให้เห็นแถวทันที
      if (statusFilter.value !== 'all' && statusFilter.value !== 'DRAFT') statusFilter.value = 'all'
      alert(`Reset สำเร็จ — ใบแจ้งหนี้ ${doc.number} เปลี่ยนเป็นสถานะ "ร่าง" แล้ว กดปุ่มแก้ไข (ไอคอนดินสอ) ที่แถวนี้เพื่อแก้ไขข้อมูลได้ทันที`)
      break
    }
    case 'DELETE': {
      if (!confirm(`ยืนยันลบใบแจ้งหนี้ ${doc.number}? งานขนส่ง/ใบวางบิลที่ผูกไว้จะกลับไปสถานะก่อนหน้า`)) break
      const result = salesDocumentsStore.deleteTaxInvoice(doc.id)
      if (!result.ok && result.message) alert(result.message)
      break
    }
    default:
      break
  }
}

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
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

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.page-btn {
  @apply w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}

.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 cursor-pointer text-left;
}
</style>
