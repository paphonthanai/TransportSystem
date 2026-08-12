<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="text-xs text-muted">ใบแจ้งหนี้/ใบกำกับภาษี &gt; {{ statusFilterLabel }}</div>
      <div class="flex items-center gap-2">
        <button
          @click="syncMissingSalesOrders"
          class="btn-secondary"
          title="สร้างใบสั่งสินค้าให้กับงานขนส่งที่ยังไม่มีใบสั่งสินค้าผูกอยู่ — เอกสารขั้นก่อนหน้าต้องครบก่อนออกใบแจ้งหนี้/ใบกำกับภาษีได้"
        >
          <span class="material-symbols-rounded text-base">sync</span>
          ซิงก์เอกสารที่ขาดหาย
        </button>
        <button
          @click="syncBillingReadiness"
          class="btn-secondary"
          title="ซ่อมสถานะวางบิลที่ค้างจากระบบเดิม ให้งานที่ส่งของสำเร็จแล้วสามารถเดินเอกสารต่อได้ตามปกติ โดยไม่ต้อง Reset งาน"
        >
          <span class="material-symbols-rounded text-base">sync_alt</span>
          ซิงก์ข้อมูล/เอกสารก่อนหน้า
        </button>
        <button
          @click="syncInvoiceReferences"
          class="btn-secondary"
          title="ซ่อมความสัมพันธ์ใบวางบิล → ใบแจ้งหนี้/ใบกำกับภาษี — เติม reference ที่ขาดโดยจับคู่กับเลขที่ใบวางบิลต้นทางที่บันทึกไว้"
        >
          <span class="material-symbols-rounded text-base">link</span>
          ซิงก์ความสัมพันธ์ใบวางบิล
        </button>
        <button @click="router.push('/tax-invoices/new')" class="btn-primary">
          <span class="material-symbols-rounded text-base">add</span>
          สร้างใหม่
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
              <td colspan="7" class="px-3 py-8 text-center text-muted">ยังไม่มีเอกสาร</td>
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
import { salesDocumentStatusClass } from '@/utils/salesDocumentStatus'
import ShareDocumentModal from '@/components/shared/ShareDocumentModal.vue'

const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()

const statusFilter = ref<'all' | SalesDocumentStatus>('all')
const search = ref('')

const statusLabel: Partial<Record<SalesDocumentStatus, string>> = {
  DRAFT: 'ร่าง',
  SENT: 'เปิดใบเสร็จแล้ว',
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

const statusOptionsFor = (doc: SalesDocument): ActionOption[] => {
  const s = doc.status
  if (s === 'DRAFT') {
    return [
      { value: 'DRAFT', label: statusLabel.DRAFT! },
      { value: 'SEND', label: 'ส่งใบแจ้งหนี้' },
      { value: 'CREATE_RECEIPT', label: 'สร้างใบเสร็จรับเงิน' },
      { value: 'CANCEL', label: 'ยกเลิก' },
    ]
  }
  if (s === 'SENT') {
    return [
      { value: 'SENT', label: statusLabel.SENT! },
      { value: 'CREATE_RECEIPT', label: 'สร้างใบเสร็จรับเงิน' },
      { value: 'RESET', label: 'รีเซ็ต' },
    ]
  }
  if (s === 'PAID') return [{ value: 'PAID', label: statusLabel.PAID! }]
  return [{ value: s, label: s }]
}

const statusDotClass = (status: SalesDocumentStatus) =>
  ({ DRAFT: 'bg-gray-400', SENT: 'bg-amber-500', PAID: 'bg-green-500' })[status as 'DRAFT' | 'SENT' | 'PAID'] || 'bg-gray-400'

const shareTarget = ref<SalesDocument | null>(null)

const onStatusSelect = (doc: SalesDocument, action: string) => {
  switch (action) {
    case 'SEND':
      // ปุ่ม "ส่งใบแจ้งหนี้" เปิด Share Document เดิม (ไม่สร้าง logic ส่งใหม่) แล้วค่อยปรับสถานะเป็นส่งแล้วเหมือนเดิม
      salesDocumentsStore.sendInvoice(doc.id)
      shareTarget.value = doc
      break
    case 'CREATE_RECEIPT':
      router.push(`/receipts/select?customer=${encodeURIComponent(doc.customer)}&invoiceId=${doc.id}`)
      break
    case 'CANCEL':
      if (confirm(`ยืนยันยกเลิกใบแจ้งหนี้ ${doc.number}? งานขนส่ง/ใบวางบิลที่ผูกไว้จะกลับไปสถานะก่อนหน้า`)) salesDocumentsStore.cancelTaxInvoice(doc.id)
      break
    case 'RESET': {
      if (!confirm(`ยืนยัน Reset ใบแจ้งหนี้ ${doc.number} กลับเป็นร่าง?`)) break
      const result = salesDocumentsStore.resetTaxInvoice(doc.id)
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
</style>
