<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-end gap-3">
        <div>
          <label class="field-label">เลขที่เอกสาร</label>
          <input :value="documentNumber" disabled class="input-field h-9 px-2 font-mono text-sm w-40 opacity-70" />
        </div>
        <div>
          <label class="field-label">วันที่</label>
          <input type="date" v-model="dateStr" class="input-field h-9 px-2 text-sm" />
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/receipts')" class="btn-secondary">ปิดหน้าต่าง</button>
        <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึกเอกสาร
        </button>
      </div>
    </div>

    <div v-if="submitError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
      <span class="material-symbols-rounded text-base">error</span>
      {{ submitError }}
    </div>

    <!-- แก้ไขเอกสารเดิม แต่ store ยังโหลดจาก Firestore ไม่เสร็จ (เช่น เข้าหน้านี้ตรงๆ ด้วย hard reload) — รอให้โหลดก่อนแสดงฟอร์ม กันข้อมูลว่างเปล่าทับของเดิม -->
    <div v-if="editingId && !editingDoc && salesDocumentsStore.loading" class="card-lg text-center text-muted py-10">กำลังโหลดข้อมูลเอกสาร...</div>
    <div v-else-if="editingId && !editingDoc" class="card-lg text-center text-muted py-10">ไม่พบเอกสารที่ต้องการแก้ไข</div>

    <div v-else-if="sourceIds.length === 0" class="card-lg text-center text-muted py-10">
      ยังไม่ได้เลือก{{ sourceLabel }}ต้นทาง
      <div class="pt-3 flex items-center justify-center gap-2">
        <button @click="openPicker('TAX_INVOICE')" class="btn-primary">เลือกใบแจ้งหนี้</button>
        <button @click="openPicker('BILLING')" class="btn-secondary">เลือกใบวางบิลโดยตรง</button>
      </div>
    </div>

    <div v-else class="card-lg space-y-6">
      <!-- Customer + document header -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-3">
          <div>
            <label class="field-label">ชื่อลูกค้า</label>
            <input v-model="customerName" list="receipt-inv-customer-options" @change="onCustomerChange" placeholder="ชื่อลูกค้า" class="input-field w-3/4" />
            <datalist id="receipt-inv-customer-options">
              <option v-for="c in customerStore.customers" :key="c.code" :value="c.name" />
            </datalist>
          </div>
          <div class="w-3/4">
            <ContactPickerField :customer-id="selectedCustomerId" v-model="contactId" />
          </div>
          <div>
            <label class="field-label">ที่อยู่</label>
            <textarea v-model="customerAddress" rows="2" class="input-field w-3/4" />
          </div>
          <div class="grid grid-cols-1 sm:grid-rows-2 gap-3 w-2/4">
            <div>
              <label class="field-label">รหัสไปรษณีย์</label>
              <input v-model="customerZipCode" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">เลขประจำตัวผู้เสียภาษี</label>
              <input v-model="customerTaxId" class="input-field w-full" />
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex justify-end">
            <DocumentActionBar
              :disabled="!canSubmit"
              @print="printAction"
              @download="downloadAction"
              @share="openShareModal"
              @envelope="envelopeAction"
              @history="historyAction"
              @settings="settingsAction"
            />
          </div>
          <div class="text-right">
            <div class="text-xs text-muted">จำนวนเงินรวมทั้งสิ้น</div>
            <div class="text-2xl font-bold text-primary">{{ formatBaht(grandTotal) }}</div>
          </div>
          <div>
            <label class="field-label">พนักงานขาย</label>
            <select v-model="salesperson" class="input-field w-full">
              <option v-for="name in salespersonOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div>
            <label class="field-label">เลขที่อ้างอิง</label>
            <input v-model="reference" class="input-field w-full" />
          </div>
        </div>
      </div>

      <!-- Source docs -->
      <div class="space-y-2 pt-4 border-t border-border">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">{{ sourceLabel }}ต้นทาง ({{ sourceDocs.length }})</div>
          <button @click="openPicker(sourceType)" class="btn-sm">
            <span class="material-symbols-rounded text-base">add</span>
            เพิ่ม{{ sourceLabel }}
          </button>
        </div>
        <div v-if="warnings.length" class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 space-y-1">
          <div v-for="(w, idx) in warnings" :key="idx" class="flex items-center gap-1.5">
            <span class="material-symbols-rounded text-sm">warning</span>
            {{ w }}
          </div>
        </div>
        <div class="border border-border rounded-xl overflow-x-auto">
          <table class="w-full text-sm min-w-[700px]">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="text-left px-3 py-2 font-semibold w-10">#</th>
                <th class="text-left px-3 py-2 font-semibold">เลขที่เอกสาร</th>
                <th class="text-left px-3 py-2 font-semibold">วันที่เอกสาร</th>
                <th class="text-left px-3 py-2 font-semibold">วันครบกำหนด</th>
                <th class="text-right px-3 py-2 font-semibold">ยอดรวมตามเอกสาร</th>
                <th class="text-right px-3 py-2 font-semibold">หัก ณ ที่จ่าย</th>
                <th class="text-right px-3 py-2 font-semibold">ยอดชำระ</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(inv, idx) in sourceDocs" :key="inv.id" class="border-t border-border">
                <td class="px-3 py-2 text-muted">{{ idx + 1 }}</td>
                <td class="px-3 py-2 font-mono text-text">
                  <RouterLink :to="`/documents/${inv.id}`" class="hover:text-primary hover:underline">{{ inv.number }}</RouterLink>
                </td>
                <td class="px-3 py-2 text-muted">{{ formatDate(inv.date) }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(inv.dueDate) }}</td>
                <td class="px-3 py-2 text-right text-text">{{ formatBaht(invGrandTotal(inv)) }}</td>
                <td class="px-3 py-2 text-right text-text">{{ formatBaht(inv.whtAmount || 0) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(invGrandTotal(inv) - (inv.whtAmount || 0)) }}</td>
                <td class="px-3 py-2 text-right">
                  <button @click="removeSourceDoc(inv.id)" class="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-red-50 hover:text-red-600">
                    <span class="material-symbols-rounded text-sm">close</span>
                  </button>
                </td>
              </tr>
              <tr v-if="sourceDocs.length === 0">
                <td colspan="8" class="px-3 py-6 text-center text-muted">ยังไม่มี{{ sourceLabel }}ต้นทาง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Notes/signature/attachment + totals -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border">
        <div class="space-y-4">
          <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
            <input type="checkbox" v-model="useESignature" class="w-4 h-4" />
            ลายเซ็นอิเล็กทรอนิกส์และตรายาง
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="field-label">หมายเหตุ</label>
              <textarea v-model="note" rows="3" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">โน้ตภายในบริษัท</label>
              <textarea v-model="internalNote" rows="3" class="input-field w-full" />
            </div>
          </div>
        </div>

        <div class="bg-surface-2 rounded-xl p-4 space-y-1.5 text-sm h-fit">
          <div class="text-[11px] text-muted pb-1">ยอด/ภาษี/ส่วนลดด้านล่างดึงจาก{{ sourceLabel }}ต้นทางโดยตรง ไม่คำนวณใหม่</div>
          <div class="flex justify-between">
            <span class="text-muted">ส่วนลดรวม</span>
            <span class="text-text">{{ formatBaht(totals.discountTotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">ภาษีมูลค่าเพิ่ม</span>
            <span class="text-text">{{ formatBaht(totals.vatAmount) }}</span>
          </div>
          <div class="flex justify-between font-bold border-t border-border pt-1.5">
            <span class="text-text">จำนวนเงินรวมทั้งสิ้น</span>
            <span class="text-text">{{ formatBaht(grandTotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">หัก ณ ที่จ่ายทั้งสิ้น</span>
            <span class="text-text">{{ formatBaht(totals.whtAmount) }}</span>
          </div>
          <div class="flex justify-between font-bold text-primary border-t border-border pt-1.5 text-base">
            <span>ยอดรับชำระสุทธิ</span>
            <span>{{ formatBaht(netPayable) }}</span>
          </div>
        </div>
      </div>
    </div>

    <ShareDocumentModal
      :open="shareModalOpen"
      :doc-id="currentId || ''"
      :number="documentNumber"
      :customer="customerName"
      doc-type-label="ใบเสร็จรับเงิน"
      @close="shareModalOpen = false"
    />
    <DocumentHistoryModal :open="historyModalOpen" :doc-id="currentId || ''" :number="documentNumber" @close="historyModalOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesDocumentsStore, type ReceiptSourceType } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { useContactStore } from '@/stores/contacts'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'
import DocumentActionBar from '@/components/shared/DocumentActionBar.vue'
import ShareDocumentModal from '@/components/shared/ShareDocumentModal.vue'
import DocumentHistoryModal from '@/components/shared/DocumentHistoryModal.vue'
import ContactPickerField from '@/components/shared/ContactPickerField.vue'

const props = defineProps<{ id?: string }>()

const route = useRoute()
const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()
const contactStore = useContactStore()
const authStore = useAuthStore()
const userStore = useUserStore()

const editingId = props.id
const currentId = ref<string | undefined>(editingId)

/** reactive (ไม่ใช่ lookup ครั้งเดียวตอน setup) เพราะตอน hard reload ตรงมาที่หน้านี้ salesDocumentsStore ยังโหลดจาก Firestore
 *  ไม่เสร็จในจังหวะที่ component mount — ต้องรอให้ documents.value มีของจริงก่อน ไม่งั้น editingDoc จะติด undefined ตลอดไป
 *  (ดู watch ด้านล่างที่ prefill ฟอร์มทันทีที่ editingDoc ปรากฏ ไม่ว่าจะพร้อมตั้งแต่ mount หรือมาทีหลังจาก fetch เสร็จ) */
const editingDoc = computed(() => (editingId ? salesDocumentsStore.documents.find((d) => d.id === editingId && d.type === 'RECEIPT') : undefined))

const todayStr = () => new Date().toISOString().slice(0, 10)

const customerName = ref('')
const customerAddress = ref('')
const customerZipCode = ref('')
const customerTaxId = ref('')
const selectedCustomerId = computed(() => customerStore.customers.find((c) => c.name === customerName.value)?.id)
const contactId = ref<string | undefined>(undefined)
const dateStr = ref(todayStr())
const reference = ref('')
const salespersonOptions = computed(() =>
  [authStore.userName, ...userStore.users.filter((u) => u.active).map((u) => u.name)].filter((v, i, arr) => arr.indexOf(v) === i)
)
const salesperson = ref(authStore.userName)
const useESignature = ref(true)
const note = ref('')
const internalNote = ref('')

const onCustomerChange = () => {
  const found = customerStore.customers.find((c) => c.name === customerName.value)
  if (!found) return
  customerAddress.value = found.address
  customerZipCode.value = found.zipCode
  customerTaxId.value = found.taxId
  contactId.value = found.id ? contactStore.primaryContactFor(found.id)?.id : undefined
}

/** รายการ id เอกสารต้นทางปัจจุบัน — query ?ids= (เพิ่งกลับมาจากหน้าเลือกพร้อมรายการที่เลือกใหม่) ต้องมาก่อนเสมอ ไม่งั้นตอนแก้ไข
 *  เอกสารเดิมแล้วกลับมาจากหน้าเลือก จะโดนค่าที่บันทึกไว้เดิมทับรายการที่เพิ่งเลือกใหม่ (ดู prefill watch ด้านล่างสำหรับกรณีไม่มี query) */
const queryIds = ((route.query.ids as string) || '').split(',').filter(Boolean)
const sourceIds = ref<string[]>(queryIds)

/** prefill ฟอร์มจาก editingDoc ครั้งเดียวตอนที่มันปรากฏจริง (ไม่ว่าจะพร้อมตั้งแต่ mount หรือมาทีหลัง) กันไม่ให้ทับค่าที่ผู้ใช้เพิ่งแก้ */
const prefilled = ref(false)
watch(
  editingDoc,
  (doc) => {
    if (!doc || prefilled.value) return
    prefilled.value = true
    customerName.value = doc.customer
    customerAddress.value = doc.customerAddress || ''
    customerZipCode.value = doc.customerZipCode || ''
    customerTaxId.value = doc.customerTaxId || ''
    contactId.value = doc.contactId
    dateStr.value = new Date(doc.date).toISOString().slice(0, 10)
    reference.value = doc.reference || ''
    salesperson.value = doc.salesperson || authStore.userName
    useESignature.value = doc.useESignature ?? true
    note.value = doc.note || ''
    internalNote.value = doc.internalNote || ''
    if (queryIds.length === 0 && doc.sourceDocumentIds) sourceIds.value = [...doc.sourceDocumentIds]
  },
  { immediate: true }
)

const sourceDocs = computed(() =>
  salesDocumentsStore.documents.filter((d) => sourceIds.value.includes(d.id) && (d.type === 'TAX_INVOICE' || d.type === 'BILLING'))
)
/** ชนิดเอกสารต้นทางของใบเสร็จนี้ — อนุมานจากเอกสารที่เลือกไว้จริง (ไม่ผสมสองชนิดในใบเดียว) ถ้ายังไม่มีเลย ใช้ query ?source= เป็นค่าเริ่มต้น (มาจากหน้าเลือกเอกสาร) */
const sourceType = computed<ReceiptSourceType>(() => sourceDocs.value[0]?.type === 'BILLING' ? 'BILLING' : sourceDocs.value[0]?.type === 'TAX_INVOICE' ? 'TAX_INVOICE' : (route.query.source as string) === 'billing' ? 'BILLING' : 'TAX_INVOICE')
const sourceLabel = computed(() => (sourceType.value === 'BILLING' ? 'ใบวางบิล' : 'ใบแจ้งหนี้'))

watch(
  sourceDocs,
  (docs) => {
    if (docs.length && !customerName.value) customerName.value = docs[0].customer
    if (docs.length && !reference.value) reference.value = docs.map((d) => d.number).join(', ')
    /** ค่าเริ่มต้นผู้ติดต่อของใบเสร็จที่สร้างจากเอกสารต้นทาง = ผู้ติดต่อที่ Snapshot ไว้บนเอกสารต้นทางนั้นเอง (ไม่ใช่ Primary
     *  Contact ปัจจุบันของลูกค้า) — สอดคล้องกับ resolveContactSnapshot ฝั่ง store ที่ fallback ไปใช้ contactId ของเอกสารต้นทาง
     *  ผู้ใช้ยังเปลี่ยนเองที่ picker ได้เสมอ */
    if (docs.length && !contactId.value && !prefilled.value) contactId.value = docs[0].contactId
  },
  { immediate: true }
)

const totals = computed(() => {
  const amount = sourceDocs.value.reduce((sum, d) => sum + d.amount, 0)
  const discountTotal = sourceDocs.value.reduce((sum, d) => sum + (d.discountTotal || 0), 0)
  const vatAmount = sourceDocs.value.reduce((sum, d) => sum + (d.vatAmount || 0), 0)
  const whtAmount = sourceDocs.value.reduce((sum, d) => sum + (d.whtAmount || 0), 0)
  return { amount, discountTotal, vatAmount, whtAmount }
})
/** จำนวนเงินรวมทั้งสิ้น = subtotal (ก่อน VAT) + VAT — ตามธรรมเนียมเดียวกับที่หน้าพิมพ์เอกสาร (InvoiceDocumentView.vue) ใช้กับเอกสารทุกประเภท (activeDoc.amount = subtotal, grandTotal = subtotal + vatAmount) */
const grandTotal = computed(() => totals.value.amount + totals.value.vatAmount)
const netPayable = computed(() => grandTotal.value - totals.value.whtAmount)
/** ยอดรวมทั้งสิ้นของเอกสารต้นทางแต่ละใบ (รวม VAT แล้ว) ใช้แสดงในตาราง ให้ตรงกับที่หน้าพิมพ์แสดง ไม่ใช่ subtotal ก่อน VAT */
const invGrandTotal = (inv: { amount: number; vatAmount?: number }) => inv.amount + (inv.vatAmount || 0)

const warnings = computed(() => {
  const w: string[] = []
  sourceDocs.value.forEach((d) => {
    const label = d.type === 'BILLING' ? 'ใบวางบิล' : 'ใบแจ้งหนี้'
    if (d.dueDate === undefined) w.push(`${label} ${d.number} ไม่มีวันครบกำหนด`)
    if (d.vatAmount === undefined && d.whtAmount === undefined) w.push(`${label} ${d.number} ไม่มีข้อมูลภาษี/หัก ณ ที่จ่าย — ตรวจสอบยอดก่อนเก็บเงินจริง`)
  })
  return w
})

const removeSourceDoc = (id: string) => {
  sourceIds.value = sourceIds.value.filter((sid) => sid !== id)
}

const openPicker = (type: ReceiptSourceType) => {
  const query: Record<string, string> = { preselect: sourceIds.value.join(','), customer: customerName.value }
  if (currentId.value) query.editId = currentId.value
  if (type === 'BILLING') query.source = 'billing'
  router.push({ path: '/receipts/select', query })
}

const previewNumber = computed(() => {
  if (editingDoc.value) return editingDoc.value.number
  const numbering = documentSettingsStore.settings.numbering.receipt
  const seq = salesDocumentsStore.documents.filter((d) => d.type === 'RECEIPT').length + 1
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${numbering.prefix}${yyyy}${mm}${dd}${documentSettingsStore.padNumber(seq, numbering.padding)}`
})
const documentNumber = computed(() => previewNumber.value)

const canSubmit = computed(() => customerName.value.trim().length > 0 && sourceIds.value.length > 0)

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

const submitError = ref('')

/** บันทึก (สร้างใหม่ หรืออัปเดตถ้าบันทึกไปแล้วอย่างน้อยหนึ่งครั้ง) แล้วคืนเอกสารกลับมา — ใช้ร่วมกันทั้งปุ่ม "บันทึกเอกสาร" และปุ่มลัดในแถบเครื่องมือ
 *  เรียก createReceiptFromSourceDocs/updateReceiptFromSourceDocs เดียวกันไม่ว่าเอกสารต้นทางจะเป็นใบแจ้งหนี้หรือใบวางบิล (sourceType บอกทาง) */
const saveAndGetDoc = () => {
  if (!canSubmit.value) return null
  submitError.value = ''
  const overrides = { customer: customerName.value.trim(), reference: reference.value || undefined, contactId: contactId.value }
  const result = currentId.value
    ? salesDocumentsStore.updateReceiptFromSourceDocs(currentId.value, sourceIds.value, sourceType.value, overrides)
    : salesDocumentsStore.createReceiptFromSourceDocs(sourceIds.value, sourceType.value, overrides)
  if (!result) {
    submitError.value = `บันทึกไม่สำเร็จ — ${sourceLabel.value}ที่เลือกอาจถูกใช้ในใบเสร็จอื่นแล้ว เก็บเงิน/ออกใบแจ้งหนี้ไปแล้ว หรือเป็นลูกค้าคนละราย`
    return null
  }
  currentId.value = result.doc.id
  return result.doc
}

const submit = () => {
  const doc = saveAndGetDoc()
  if (doc) router.push(`/documents/${doc.id}`)
}

const printAction = () => {
  const doc = saveAndGetDoc()
  if (doc) router.push(`/documents/${doc.id}`)
}

const downloadAction = () => {
  const doc = saveAndGetDoc()
  if (doc) router.push(`/documents/${doc.id}`)
}

const shareModalOpen = ref(false)
const openShareModal = () => {
  const doc = saveAndGetDoc()
  if (doc) shareModalOpen.value = true
}

const envelopeAction = () => {
  const doc = saveAndGetDoc()
  if (doc) router.push(`/documents/${doc.id}/envelope`)
}

const historyModalOpen = ref(false)
const historyAction = () => {
  if (!currentId.value) {
    alert('กรุณาบันทึกเอกสารก่อน ถึงจะดูประวัติได้')
    return
  }
  historyModalOpen.value = true
}

const settingsAction = () => {
  const doc = saveAndGetDoc()
  if (doc) router.push(`/documents/${doc.id}?settings=1`)
}
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
}

.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-9 px-3 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
