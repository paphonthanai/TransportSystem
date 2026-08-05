<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-end gap-3">
        <div>
          <label class="field-label">เลขที่เอกสาร</label>
          <input v-model="documentNumber" class="input-field h-9 px-2 font-mono text-sm w-40" />
        </div>
        <div>
          <label class="field-label">วันที่</label>
          <input type="date" v-model="dateStr" class="input-field h-9 px-2 text-sm" />
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/billing-notes')" class="btn-secondary">ปิดหน้าต่าง</button>
        <button @click="submit" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึกเอกสาร
        </button>
      </div>
    </div>

    <div v-if="sourceNumber" class="text-xs text-muted flex items-center gap-1">
      <span class="material-symbols-rounded text-sm">request_quote</span>
      ดึงข้อมูลมาจากใบเสนอราคา <span class="font-mono font-semibold text-text">{{ sourceNumber }}</span>
    </div>

    <div class="card-lg space-y-6">
      <!-- Customer + document header -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-3">
          <div>
            <label class="field-label">ชื่อลูกค้า</label>
            <input
              v-model="customerName"
              list="billing-customer-options"
              @change="onCustomerChange"
              placeholder="เลือกลูกค้า หรือพิมพ์เพื่อสร้างใหม่"
              class="input-field w-3/4"
            />
            <datalist id="billing-customer-options">
              <option v-for="c in customerStore.customers" :key="c.code" :value="c.name" />
            </datalist>
          </div>
          <div>
            <label class="field-label">ที่อยู่</label>
            <textarea v-model="customerAddress" rows="2" class="input-field w-3/4" />
          </div>
          <div class="grid grid-cols-1 sm:grid-rows-3 gap-3 w-2/4">
            <div>
              <label class="field-label">รหัสไปรษณีย์</label>
              <input v-model="customerZipCode" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">เลขประจำตัวผู้เสียภาษี</label>
              <input v-model="customerTaxId" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">สำนักงาน/สาขาเลขที่</label>
              <input v-model="customerBranchName" class="input-field w-full" />
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
            <label class="field-label">วันที่</label>
            <input type="date" v-model="dateStr" class="input-field w-full" />
          </div>
          <div>
            <label class="field-label">{{ paymentTermLabel }}</label>
            <select v-model="paymentTermMode" class="input-field w-full">
              <option value="CREDIT_DAYS">เครดิต (วัน)</option>
              <option value="CASH">เงินสด</option>
              <option value="CREDIT_NO_DATE">เครดิต (ไม่แสดงวันที่)</option>
            </select>
            <input
              v-if="paymentTermMode === 'CREDIT_DAYS'"
              v-model.number="creditDays"
              type="number"
              min="0"
              placeholder="จำนวนวัน"
              class="input-field w-full mt-2"
            />
          </div>
          <div v-if="paymentTermMode === 'CREDIT_DAYS'">
            <label class="field-label">ครบกำหนด</label>
            <div class="input-field w-full bg-surface-2 text-muted">{{ formatDateDisplay(dueDate) }}</div>
          </div>
          <div>
            <label class="field-label">พนักงานขาย</label>
            <select v-model="salesperson" class="input-field w-full">
              <option v-for="name in salespersonOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div>
            <label class="field-label">สกุลเงิน</label>
            <select v-model="currencyCode" class="input-field w-full">
              <option value="THB">THB - ไทย</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Project / reference / price mode / description / warehouse -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-border">
        <div>
          <label class="field-label">โปรเจ็ค</label>
          <input v-model="project" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">เลขที่อ้างอิง</label>
          <input v-model="reference" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">ราคาสินค้า</label>
          <select v-model="priceMode" class="input-field w-full">
            <option value="exclusive">ราคาไม่รวมภาษี</option>
            <option value="inclusive">ราคารวมภาษี</option>
          </select>
        </div>
        <div>
          <label class="field-label">รายละเอียด</label>
          <input v-model="description" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">คลังสินค้า</label>
          <select v-model="warehouse" class="input-field w-full">
            <option value="คลังสินค้า">คลังสินค้า</option>
          </select>
        </div>
      </div>

      <!-- Items -->
      <div class="space-y-2">
        <div class="border border-border rounded-xl overflow-x-auto">
          <table class="w-full text-sm min-w-[900px]">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="text-left px-3 py-2 font-semibold w-10">ลำดับ</th>
                <th class="text-left px-3 py-2 font-semibold">ชื่อสินค้า/รายละเอียด</th>
                <th class="text-right px-3 py-2 font-semibold w-20">จำนวน</th>
                <th class="text-left px-3 py-2 font-semibold w-20">หน่วย</th>
                <th class="text-right px-3 py-2 font-semibold w-24">ราคาต่อหน่วย</th>
                <th class="text-right px-3 py-2 font-semibold w-24">ส่วนลด</th>
                <th class="text-right px-3 py-2 font-semibold w-20">ภาษี (%)</th>
                <th class="text-left px-3 py-2 font-semibold w-24">หัก ณ ที่จ่าย</th>
                <th class="text-right px-3 py-2 font-semibold w-28">ราคารวม</th>
                <th class="w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="idx" class="border-t border-border align-top">
                <td class="px-3 py-2 text-muted">{{ idx + 1 }}</td>
                <td class="px-3 py-2">
                  <select :value="row.productId || ''" @change="onProductSelected(idx, ($event.target as HTMLSelectElement).value)" class="input-field w-full mb-1">
                    <option value="">กำหนดเอง</option>
                    <option v-for="p in inventoryStore.products" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                  <input v-model="row.description" placeholder="รายละเอียด" class="input-field w-full" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="row.qty" type="number" min="0" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2">
                  <input v-model="row.unit" class="input-field w-full" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="row.unitPrice" type="number" min="0" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2">
                  <select v-model="row.discountMode" class="input-field w-full mb-1 text-xs">
                    <option v-for="opt in discountModeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <input v-if="row.discountMode !== 'fixed'" v-model.number="row.discountPercent" type="number" min="0" max="100" class="input-field w-full text-right" />
                  <input v-else v-model.number="row.discountAmount" type="number" min="0" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2">
                  <input v-model.number="row.vatRate" type="number" min="0" max="100" class="input-field w-full text-right" />
                </td>
                <td class="px-3 py-2">
                  <select v-model.number="row.whtRate" class="input-field w-full">
                    <option v-for="opt in whtOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(rowAmount(row)) }}</td>
                <td class="px-3 py-2 text-right">
                  <button @click="rows.splice(idx, 1)" class="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-red-50 hover:text-red-600">
                    <span class="material-symbols-rounded text-sm">close</span>
                  </button>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td colspan="10" class="px-3 py-6 text-center text-muted">ยังไม่มีรายการ</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="addRow" class="btn-sm">
          <span class="material-symbols-rounded text-base">add</span>
          เพิ่มแถวรายการ
        </button>
      </div>

      <!-- Signature / notes / attachment + totals -->
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
          <label class="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all">
            <input type="file" accept="image/*" class="hidden" @change="onAttachmentSelected" />
            <img v-if="attachmentPreview" :src="attachmentPreview" class="max-h-40 mx-auto rounded-lg object-contain" />
            <template v-else>
              <span class="material-symbols-rounded text-3xl text-muted block mb-1">upload_file</span>
              <div class="text-sm text-muted">คลิกเพื่อเลือกไฟล์ หรือลากและวางไฟล์ที่นี่</div>
            </template>
          </label>
          <div v-if="attachmentError" class="text-xs text-red-600 flex items-center gap-1">
            <span class="material-symbols-rounded text-sm">error</span>
            {{ attachmentError }}
          </div>
        </div>

        <div class="bg-surface-2 rounded-xl p-4 space-y-1.5 text-sm h-fit">
          <div class="flex justify-between">
            <span class="text-muted">รวมเป็นเงิน</span>
            <span class="text-text">{{ formatBaht(subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">ส่วนลดรวม</span>
            <span class="text-text">{{ formatBaht(discountTotal) }}</span>
          </div>
          <div class="flex justify-between font-semibold border-t border-border pt-1.5">
            <span class="text-text">ราคาหลังหักส่วนลด</span>
            <span class="text-text">{{ formatBaht(afterDiscount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">มูลค่าที่ไม่มี/ยกเว้นภาษี</span>
            <span class="text-text">{{ formatBaht(exemptAmount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">มูลค่าที่คำนวณภาษี</span>
            <span class="text-text">{{ formatBaht(taxableAmount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">ภาษีมูลค่าเพิ่ม</span>
            <span class="text-text">{{ formatBaht(vatTotal) }}</span>
          </div>
          <div class="flex justify-between font-bold border-t border-border pt-1.5">
            <span class="text-text">จำนวนเงินรวมทั้งสิ้น</span>
            <span class="text-text">{{ formatBaht(grandTotal) }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted">หัก ณ ที่จ่ายทั้งสิ้น</span>
            <div class="flex items-center gap-1">
              <input
                v-if="whtOverrideEditing"
                v-model.number="whtOverride"
                type="number"
                min="0"
                class="input-field w-24 text-right"
                @blur="whtOverrideEditing = false"
              />
              <span v-else class="text-text">{{ formatBaht(whtTotal) }}</span>
              <button @click="startEditWht" class="w-6 h-6 rounded flex items-center justify-center hover:bg-border text-muted">
                <span class="material-symbols-rounded text-sm">edit</span>
              </button>
            </div>
          </div>
          <div class="flex justify-between font-bold text-primary border-t border-border pt-1.5 text-base">
            <span>ยอดชำระ</span>
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
      doc-type-label="ใบวางบิล"
      @close="shareModalOpen = false"
    />
    <DocumentHistoryModal :open="historyModalOpen" :doc-id="currentId || ''" :number="documentNumber" @close="historyModalOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesDocumentsStore, type SalesDocumentItem } from '@/stores/salesDocuments'
import { useDocumentSettingsStore, type PriceDisplay } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'
import { useDocumentPrefillStore } from '@/stores/documentPrefill'
import DocumentActionBar from '@/components/shared/DocumentActionBar.vue'
import ShareDocumentModal from '@/components/shared/ShareDocumentModal.vue'
import DocumentHistoryModal from '@/components/shared/DocumentHistoryModal.vue'
import { computeRowAmount, computeRowVat, computeRowWht, computeRowDiscountBaht } from '@/utils/documentTotals'

const route = useRoute()
const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const documentPrefillStore = useDocumentPrefillStore()

const editingId = typeof route.params.id === 'string' ? route.params.id : undefined
const isEditMode = !!editingId
const editingDoc = editingId ? salesDocumentsStore.documents.find((d) => d.id === editingId && d.type === 'BILLING') : undefined

/** เปิดหน้านี้มาจากดรอปดาวน์สถานะของใบเสนอราคา (กดสร้างใบวางบิลจากใบเสนอราคา) — มี payload รอเติมข้อมูลอยู่ (ไม่เกิดพร้อมกับโหมดแก้ไข) */
const prefill = isEditMode ? undefined : documentPrefillStore.consumePrefill(['QUOTATION'])
const sourceQuotationId = ref(prefill?.sourceId)
const sourceNumber = ref(prefill?.sourceNumber)

const todayStr = () => new Date().toISOString().slice(0, 10)

const customerName = ref(prefill?.customer || '')
const customerAddress = ref(prefill?.customerAddress || '')
const customerZipCode = ref(prefill?.customerZipCode || '')
const customerTaxId = ref(prefill?.customerTaxId || '')
const customerBranchName = ref(prefill?.customerBranchName || '')

const dateStr = ref(todayStr())

type PaymentTermMode = 'CREDIT_DAYS' | 'CASH' | 'CREDIT_NO_DATE'
const paymentTermModeLabel: Record<PaymentTermMode, string> = {
  CREDIT_DAYS: 'เครดิต (วัน)',
  CASH: 'เงินสด',
  CREDIT_NO_DATE: 'เครดิต (ไม่แสดงวันที่)',
}
const paymentTermMode = ref<PaymentTermMode>(prefill?.paymentTermMode || 'CREDIT_DAYS')
const paymentTermLabel = computed(() => paymentTermModeLabel[paymentTermMode.value])
const creditDays = ref(prefill?.creditDays ?? 30)
/** รายชื่อพนักงานขาย ดึงจากผู้ใช้งานจริงในระบบ (Settings > จัดการผู้ใช้งาน) แทนรายชื่อตัวอย่างเดิม */
const salespersonOptions = computed(() =>
  [authStore.userName, ...userStore.users.filter((u) => u.active).map((u) => u.name)].filter((v, i, arr) => arr.indexOf(v) === i)
)
const salesperson = ref(prefill?.salesperson || authStore.userName)
const currencyCode = ref(prefill?.currencyCode || 'THB')

const project = ref(prefill?.project || '')
/** ค่าเริ่มต้น = เลขที่เอกสารต้นทาง (sourceNumber) ก่อนเสมอ ไม่ใช่ reference เดิมที่อาจสืบทอดมาจากรุ่นก่อนหน้า */
const reference = ref(prefill?.sourceNumber || prefill?.reference || '')
const priceMode = ref<PriceDisplay>(prefill?.priceMode || documentSettingsStore.settings.priceDisplay)
const description = ref(prefill?.description || '')
const warehouse = ref(prefill?.warehouse || 'คลังสินค้า')

const useESignature = ref(prefill?.useESignature ?? true)
const note = ref(prefill?.note || '')
const internalNote = ref(prefill?.internalNote || '')

const attachmentPreview = ref<string | null>(prefill?.attachmentImage || null)
const attachmentError = ref('')

const onAttachmentSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  attachmentError.value = ''
  attachmentPreview.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) {
    attachmentError.value = 'ไฟล์ที่แนบไม่ใช่รูปภาพ กรุณาแนบไฟล์ที่ถูกต้อง'
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    attachmentPreview.value = reader.result as string
  }
  reader.onerror = () => {
    attachmentError.value = 'ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่'
  }
  reader.readAsDataURL(file)
}

const onCustomerChange = () => {
  const found = customerStore.customers.find((c) => c.name === customerName.value)
  if (!found) return
  customerAddress.value = found.address
  customerZipCode.value = found.zipCode
  customerTaxId.value = found.taxId
  customerBranchName.value = found.branchName
  if (found.creditDays) creditDays.value = found.creditDays
}

type Row = {
  productId?: string
  description: string
  qty: number
  unit: string
  unitPrice: number
  discountMode: 'percent' | 'fixed'
  discountPercent: number
  discountAmount: number
  vatRate: number
  whtRate: number
}

const whtOptions = [
  { value: 0, label: 'ไม่หัก' },
  { value: 1, label: '1%' },
  { value: 1.5, label: '1.5%' },
  { value: 2, label: '2%' },
  { value: 3, label: '3%' },
  { value: 5, label: '5%' },
]

const discountModeOptions = [
  { value: 'percent', label: '%' },
  { value: 'fixed', label: 'บาท' },
]

const rows = ref<Row[]>(
  prefill
    ? prefill.items.map((i) => ({
        productId: i.productId,
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        unitPrice: i.unitPrice,
        discountMode: i.discountMode || 'percent',
        discountPercent: i.discountPercent || 0,
        discountAmount: i.discountAmount || 0,
        vatRate: i.vatRate ?? documentSettingsStore.settings.vatRate,
        whtRate: i.whtRate || 0,
      }))
    : []
)

const addRow = () => {
  rows.value.push({ description: '', qty: 1, unit: '', unitPrice: 0, discountMode: 'percent', discountPercent: 0, discountAmount: 0, vatRate: documentSettingsStore.settings.vatRate, whtRate: 0 })
}

if (!prefill && !editingDoc) addRow()

const onProductSelected = (idx: number, productId: string) => {
  const row = rows.value[idx]
  if (!productId) {
    row.productId = undefined
    return
  }
  const product = inventoryStore.products.find((p) => p.id === productId)
  if (!product) return
  row.productId = product.id
  row.description = product.description || product.name
  row.unit = product.unit
  row.unitPrice = product.price ?? row.unitPrice
  row.vatRate = product.vatRate ?? row.vatRate
}

const rowAmount = (row: Row) => computeRowAmount(row)
const rowVat = (row: Row) => computeRowVat(row)
const rowWht = (row: Row) => computeRowWht(row)

const subtotal = computed(() => rows.value.reduce((sum, r) => sum + r.qty * r.unitPrice, 0))
const discountTotal = computed(() => rows.value.reduce((sum, r) => sum + computeRowDiscountBaht(r), 0))
const afterDiscount = computed(() => subtotal.value - discountTotal.value)
const exemptAmount = computed(() => rows.value.filter((r) => !r.vatRate).reduce((sum, r) => sum + rowAmount(r), 0))
const taxableAmount = computed(() => rows.value.filter((r) => r.vatRate > 0).reduce((sum, r) => sum + rowAmount(r), 0))
const vatTotal = computed(() => rows.value.reduce((sum, r) => sum + rowVat(r), 0))
const grandTotal = computed(() => afterDiscount.value + vatTotal.value)
const whtComputed = computed(() => rows.value.reduce((sum, r) => sum + rowWht(r), 0))
const whtOverride = ref<number | null>(null)
const whtOverrideEditing = ref(false)
const whtTotal = computed(() => whtOverride.value ?? whtComputed.value)
const netPayable = computed(() => grandTotal.value - whtTotal.value)

const startEditWht = () => {
  if (whtOverride.value === null) whtOverride.value = Math.round(whtComputed.value)
  whtOverrideEditing.value = true
}

if (editingDoc) {
  customerName.value = editingDoc.customer
  customerAddress.value = editingDoc.customerAddress || ''
  customerZipCode.value = editingDoc.customerZipCode || ''
  customerTaxId.value = editingDoc.customerTaxId || ''
  customerBranchName.value = editingDoc.customerBranchName || ''
  dateStr.value = new Date(editingDoc.date).toISOString().slice(0, 10)
  paymentTermMode.value = editingDoc.paymentTermMode || 'CREDIT_DAYS'
  creditDays.value = editingDoc.creditDays ?? 30
  salesperson.value = editingDoc.salesperson || authStore.userName
  currencyCode.value = editingDoc.currencyCode || 'THB'
  project.value = editingDoc.project || ''
  reference.value = editingDoc.reference || ''
  priceMode.value = editingDoc.priceMode || documentSettingsStore.settings.priceDisplay
  description.value = editingDoc.description || ''
  warehouse.value = editingDoc.warehouse || 'คลังสินค้า'
  useESignature.value = editingDoc.useESignature ?? true
  note.value = editingDoc.note || ''
  internalNote.value = editingDoc.internalNote || ''
  attachmentPreview.value = editingDoc.attachmentImage || null
  if (editingDoc.whtAmount) whtOverride.value = editingDoc.whtAmount
  rows.value = salesDocumentsStore.itemsForDocument(editingDoc.id).map((i) => ({
    productId: i.productId,
    description: i.description,
    qty: i.qty,
    unit: i.unit,
    unitPrice: i.unitPrice,
    discountMode: i.discountMode || 'percent',
    discountPercent: i.discountPercent || 0,
    discountAmount: i.discountAmount || 0,
    vatRate: i.vatRate ?? documentSettingsStore.settings.vatRate,
    whtRate: i.whtRate || 0,
  }))
}

const dueDate = computed(() => {
  const d = new Date(dateStr.value)
  d.setDate(d.getDate() + creditDays.value)
  return d
})

const previewNumber = computed(() => {
  if (editingDoc) return editingDoc.number
  const numbering = documentSettingsStore.settings.numbering.billingList
  const seq = salesDocumentsStore.documents.filter((d) => d.type === 'BILLING').length + 1
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${numbering.prefix}${yyyy}${mm}${dd}${documentSettingsStore.padNumber(seq, numbering.padding)}`
})

/** เลขที่เอกสารแก้ไขเองได้ — ตั้งต้นจากเลขที่ auto-generate แล้วผู้ใช้พิมพ์ทับได้อิสระ */
const documentNumber = ref(previewNumber.value)

const canSubmit = computed(() => customerName.value.trim().length > 0 && rows.value.length > 0 && rows.value.every((r) => r.qty > 0))

/** เงินสด = เครดิต 0 วัน (ครบกำหนดวันเดียวกัน), เครดิต (ไม่แสดงวันที่) = ไม่บันทึกจำนวนวัน/วันครบกำหนดเลย */
const resolvedCreditDays = computed<number | undefined>(() => {
  if (paymentTermMode.value === 'CASH') return 0
  if (paymentTermMode.value === 'CREDIT_NO_DATE') return undefined
  return creditDays.value
})

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDateDisplay = (date: Date) => date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

/** id ของเอกสารที่ "บันทึกแล้ว" ล่าสุด — เริ่มจาก editingId (ถ้าแก้ไขเอกสารเดิม) แล้วอัปเดตเป็น id ใหม่ทันทีที่มีการสร้างเอกสารครั้งแรก
 *  (เช่น กดปุ่มพิมพ์/แชร์/ดาวน์โหลดก่อนกด "บันทึกเอกสาร") เพื่อให้การกดซ้ำครั้งต่อไปเป็นการอัปเดต ไม่ใช่สร้างซ้ำ */
const currentId = ref<string | undefined>(editingId)

/** บันทึกเอกสาร (สร้างใหม่ หรืออัปเดตถ้าบันทึกไปแล้วอย่างน้อยหนึ่งครั้ง) แล้วคืนเอกสารกลับมา ใช้ร่วมกันทั้งปุ่ม
 *  "บันทึกเอกสาร" และปุ่มลัดในแถบเครื่องมือ (พิมพ์/แชร์/ดาวน์โหลด) ที่ต้องมีเอกสารจริงก่อนถึงจะทำงานได้ */
const saveAndGetDoc = () => {
  if (!canSubmit.value) return null
  const items: Array<Omit<SalesDocumentItem, 'id' | 'documentId' | 'sortOrder'>> = rows.value.map((r) => ({
    productId: r.productId,
    description: r.description || r.unit,
    qty: r.qty,
    unit: r.unit,
    unitPrice: r.unitPrice,
    discountMode: r.discountMode,
    discountPercent: r.discountPercent,
    discountAmount: r.discountAmount,
    vatRate: r.vatRate,
    whtRate: r.whtRate,
    amount: rowAmount(r),
  }))
  const payload = {
    customer: customerName.value.trim(),
    items,
    number: documentNumber.value.trim() || undefined,
    date: new Date(dateStr.value),
    creditDays: resolvedCreditDays.value,
    paymentTermMode: paymentTermMode.value,
    reference: reference.value || undefined,
    customerAddress: customerAddress.value || undefined,
    customerZipCode: customerZipCode.value || undefined,
    customerTaxId: customerTaxId.value || undefined,
    customerBranchName: customerBranchName.value || undefined,
    project: project.value || undefined,
    salesperson: salesperson.value || undefined,
    currencyCode: currencyCode.value,
    warehouse: warehouse.value,
    priceMode: priceMode.value,
    description: description.value || undefined,
    note: note.value || undefined,
    internalNote: internalNote.value || undefined,
    attachmentImage: attachmentPreview.value || undefined,
    useESignature: useESignature.value,
    discountTotal: discountTotal.value,
    vatAmount: vatTotal.value,
    whtAmount: whtTotal.value,
    sourceQuotationId: sourceQuotationId.value,
  }
  if (currentId.value) return salesDocumentsStore.updateBillingManual(currentId.value, payload)
  const created = salesDocumentsStore.createBillingManual(payload)
  currentId.value = created.id
  return created
}

const submit = () => {
  const doc = saveAndGetDoc()
  if (doc) router.push(`/documents/${doc.id}`)
}

/** พิมพ์/ดาวน์โหลด = บันทึกแล้วพาไปหน้าพรีวิวเอกสาร ให้ผู้ใช้ปรับจำนวนชุด/ตั้งค่าก่อนค่อยกดพิมพ์จริงที่หน้านั้น */
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
