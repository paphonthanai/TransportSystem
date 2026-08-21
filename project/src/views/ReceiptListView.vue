<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="text-xs text-muted">ใบเสร็จรับเงิน &gt; {{ statusFilterLabel }}</div>
      <div class="flex items-center gap-2">
        <!-- ปุ่ม Sync (ซิงก์เอกสารที่ขาดหาย/ซิงก์ข้อมูลก่อนหน้า/ซิงก์ความสัมพันธ์เอกสารต้นทาง) ซ่อนจาก UI ตาม requirement — ฟังก์ชันเบื้องหลัง
             (syncMissingSalesOrders/syncBillingReadiness/syncReceiptReferences) ยังอยู่ครบ ไม่ได้ลบ ไม่มี auto-trigger ที่ไหน
             เรียกเฉพาะตอนกดปุ่มเหล่านี้เท่านั้น (ตรวจแล้วก่อนซ่อน) -->
        <div class="relative">
          <button @click="createMenuOpen = !createMenuOpen" class="btn-primary">
            <span class="material-symbols-rounded text-base">add</span>
            สร้างใหม่
            <span class="material-symbols-rounded text-base">expand_more</span>
          </button>
          <div v-if="createMenuOpen" v-click-outside="() => (createMenuOpen = false)" class="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
            <button @click="createMenuOpen = false; router.push('/receipts/new-from-bookings')" class="menu-item">
              <span class="material-symbols-rounded text-base">call_merge</span>
              ใบเสร็จรับเงิน (จากงานขนส่ง)
            </button>
            <button @click="createMenuOpen = false; router.push('/receipts/new-manual')" class="menu-item">
              <span class="material-symbols-rounded text-base">payments</span>
              รับเงินอื่นๆ
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <select v-model="statusFilter" class="input-field w-44">
          <option value="all">แสดงทั้งหมด</option>
          <option value="DRAFT">รอดำเนินการ</option>
          <option value="PAID">เก็บเงินแล้ว</option>
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
              <th class="text-right px-3 py-3 font-semibold text-muted">จำนวนงาน</th>
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
              <td class="px-3 py-3 text-right text-muted">{{ doc.bookingIds.length || '-' }}</td>
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
                    v-if="doc.status === 'DRAFT' || !doc.sourceDocumentIds?.length"
                    @click="router.push(editRouteFor(doc))"
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

    <!-- บันทึกการรับชำระเงิน -->
    <Teleport to="body">
      <div v-if="paymentDoc" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="paymentDoc = null">
        <div class="bg-surface rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
          <h3 class="text-lg font-bold text-text">บันทึกการรับชำระเงิน</h3>
          <div class="text-sm text-muted">
            เลขที่เอกสาร: <span class="font-mono font-semibold text-text">{{ paymentDoc.number }}</span> ({{ paymentDoc.customer }})
          </div>
          <div>
            <label class="field-label">วันที่รับชำระ</label>
            <input type="date" v-model="paymentDate" class="input-field w-full" />
          </div>
          <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
            <input type="checkbox" v-model="whtEnabled" class="w-4 h-4" />
            หัก ณ ที่จ่าย
          </label>
          <div v-if="whtEnabled">
            <label class="field-label">จำนวนเงินหัก ณ ที่จ่าย</label>
            <input v-model.number="whtAmount" type="number" min="0" class="input-field w-full" />
          </div>
          <div>
            <label class="field-label">วิธีการรับชำระ</label>
            <select v-model="paymentMethod" class="input-field w-full">
              <option value="เงินสด">เงินสด</option>
              <option value="โอนเงิน">โอนเงิน</option>
              <option value="เช็ค">เช็ค</option>
            </select>
          </div>
          <div>
            <label class="field-label">หมายเหตุ</label>
            <textarea v-model="paymentNote" rows="2" class="input-field w-full" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button @click="paymentDoc = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmPayment" class="btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesDocumentsStore, type SalesDocument, type SalesDocumentStatus } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { salesDocumentStatusClass } from '@/utils/salesDocumentStatus'

const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()

const statusFilter = ref<'all' | SalesDocumentStatus>('all')
const search = ref('')
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

const statusLabel: Partial<Record<SalesDocumentStatus, string>> = {
  DRAFT: 'รอดำเนินการ',
  PAID: 'เก็บเงินแล้ว',
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

/** ซ่อม sourceDocumentIds ของใบเสร็จที่ขาด/ชี้ผิด โดยจับคู่กับเลขที่เอกสารต้นทาง (ใบแจ้งหนี้/ใบวางบิล) ที่เก็บไว้ใน
 * reference ตรงตัวเป๊ะเท่านั้น ไม่เดา ดู repairReceiptReferences ใน stores/salesDocuments.ts */
const syncReceiptReferences = () => {
  const result = salesDocumentsStore.repairReceiptReferences()
  const lines: string[] = []
  if (result.repaired.length > 0) {
    lines.push(`ซ่อมความสัมพันธ์ให้ ${result.repaired.length} ใบ: ${result.repaired.map((r) => `${r.number} → ${r.matchedSource}`).join(', ')}`)
  } else {
    lines.push(`ตรวจสอบแล้ว ${result.checked} ใบ ไม่พบรายการที่ reference ขาด/ชี้ผิด`)
  }
  if (result.unmatched.length > 0) {
    lines.push(`\nจับคู่ไม่ได้ (ต้องตรวจสอบเอง) ${result.unmatched.length} ใบ: ${result.unmatched.map((u) => u.number).join(', ')}`)
  }
  alert(lines.join('\n'))
}

const allReceipts = computed(() => salesDocumentsStore.documents.filter((d) => d.type === 'RECEIPT'))

const filteredDocs = computed(() =>
  allReceipts.value.filter((d) => {
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
      { value: 'COLLECT', label: 'เก็บเงิน' },
      { value: 'CANCEL', label: 'ยกเลิก' },
    ]
  }
  if (s === 'PAID') {
    return [
      { value: 'PAID', label: statusLabel.PAID! },
      { value: 'DELETE', label: 'ลบ' },
    ]
  }
  return [{ value: s, label: s }]
}

const statusDotClass = (status: SalesDocumentStatus) => ({ DRAFT: 'bg-amber-500', PAID: 'bg-green-500' })[status as 'DRAFT' | 'PAID'] || 'bg-gray-400'

/** ใบเสร็จที่มาจากใบแจ้งหนี้ (มี sourceDocumentIds) แก้ไขผ่านฟอร์มอ้างอิงใบแจ้งหนี้ (ReceiptCreateView.vue) ส่วนใบเสร็จกรอกเอง แก้ไขผ่านฟอร์มรายการสินค้าเดิม (ReceiptFormView.vue) — ห้ามสลับกันเพราะโครงสร้างรายการต่างกัน */
const editRouteFor = (doc: SalesDocument) => (doc.sourceDocumentIds?.length ? `/receipts/create/${doc.id}/edit` : `/receipts/new-manual/${doc.id}/edit`)

const paymentDoc = ref<SalesDocument | null>(null)
const paymentDate = ref(new Date().toISOString().slice(0, 10))
const whtEnabled = ref(false)
const whtAmount = ref(0)
const paymentMethod = ref('เงินสด')
const paymentNote = ref('')

const openPaymentModal = (doc: SalesDocument) => {
  paymentDoc.value = doc
  paymentDate.value = new Date().toISOString().slice(0, 10)
  whtEnabled.value = false
  whtAmount.value = 0
  paymentMethod.value = 'เงินสด'
  paymentNote.value = ''
}

const confirmPayment = () => {
  if (!paymentDoc.value) return
  salesDocumentsStore.recordReceiptPayment(paymentDoc.value.id, {
    paidDate: new Date(paymentDate.value),
    whtAmount: whtEnabled.value ? whtAmount.value : undefined,
    paymentMethod: paymentMethod.value,
    note: paymentNote.value || undefined,
  })
  paymentDoc.value = null
}

const onStatusSelect = (doc: SalesDocument, action: string) => {
  switch (action) {
    case 'COLLECT':
      openPaymentModal(doc)
      break
    case 'CANCEL':
      if (confirm(`ยืนยันยกเลิกใบเสร็จรับเงิน ${doc.number}?`)) salesDocumentsStore.cancelReceipt(doc.id)
      break
    case 'DELETE':
      if (confirm(`ยืนยันลบใบเสร็จรับเงิน ${doc.number}? งานขนส่งที่ผูกอยู่จะกลับมาเลือกออกใบเสร็จใหม่ได้อีกครั้ง (ไม่กระทบใบแจ้งหนี้/ใบวางบิลต้นทาง)`))
        salesDocumentsStore.deleteReceipt(doc.id)
      break
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

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
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

.page-btn {
  @apply w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}

.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 cursor-pointer text-left;
}
</style>
