<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">สร้างใบแจ้งหนี้/ใบกำกับภาษีรวม</h2>
        <div class="text-xs text-muted mt-0.5">
          {{ phase === 'select' ? 'เลือกงานขนส่งที่ส่งเสร็จแล้ว (DELIVERED) ของลูกค้ารายเดียวกัน' : 'ตรวจสอบ/แก้ไขข้อมูลเอกสารก่อนบันทึกจริง' }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="phase === 'select'" @click="router.push('/tax-invoices')" class="btn-secondary">ยกเลิก</button>
        <button v-if="phase === 'select'" @click="goToReview" :disabled="!canSubmit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">arrow_forward</span>
          ถัดไป: ตรวจสอบเอกสาร
        </button>
        <button v-if="phase === 'review'" @click="phase = 'select'" class="btn-secondary">ย้อนกลับ</button>
        <button v-if="phase === 'review'" @click="confirmSave" :disabled="saving" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">check</span>
          {{ saving ? 'กำลังบันทึก...' : 'ยืนยันสร้างใบแจ้งหนี้' }}
        </button>
      </div>
    </div>

    <!-- Phase 1: เลือกงานขนส่ง -->
    <div v-if="phase === 'select'" class="card-lg space-y-4">
      <div>
        <label class="field-label">ลูกค้า</label>
        <select v-model="selectedCustomer" class="input-field w-full max-w-sm">
          <option value="">เลือกลูกค้า...</option>
          <option v-for="c in eligibleCustomers" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div v-if="selectedCustomer" class="max-w-sm">
        <ContactPickerField :customer-id="selectedCustomerId" v-model="contactId" />
      </div>

      <!-- ใบแจ้งหนี้หนึ่งใบต้องมีสินค้า Feed เดียวเหมือนใบวางบิล (store บังคับไว้แล้ว — เดิมหน้านี้ไม่มีตัวเลือกนี้เลย) -->
      <div v-if="selectedCustomer" class="max-w-sm">
        <label class="field-label">ประเภทงาน (Feed)</label>
        <select v-model="selectedCategory" class="input-field w-full">
          <option value="">เลือกประเภทงาน...</option>
          <option v-for="c in eligibleCategoriesForCustomer" :key="c" :value="c">{{ categoryFeedLabel[c] }}</option>
        </select>
        <div v-if="eligibleCategoriesForCustomer.length > 1" class="text-[11px] text-muted mt-1">
          ลูกค้ารายนี้มีงานมากกว่าหนึ่งประเภท ต้องออกใบแจ้งหนี้แยกทีละประเภท (Feed) เสมอ
        </div>
      </div>

      <div v-if="selectedCustomer && selectedCategory" class="grid grid-cols-2 gap-3 max-w-sm">
        <div>
          <label class="field-label">วันที่เริ่ม <span class="font-normal text-[10px]">(ไม่บังคับ)</span></label>
          <input v-model="dateFrom" type="date" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">วันที่สิ้นสุด <span class="font-normal text-[10px]">(ไม่บังคับ)</span></label>
          <input v-model="dateTo" type="date" class="input-field w-full" />
        </div>
      </div>

      <div v-if="selectedCustomer && selectedCategory" class="space-y-2">
        <div class="border border-border rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="px-3 py-2 w-8"></th>
                <th class="text-left px-3 py-2 font-semibold">เลขที่งาน</th>
                <th class="text-left px-3 py-2 font-semibold">ปลายทาง</th>
                <th class="text-left px-3 py-2 font-semibold">วันที่ส่งเสร็จ</th>
                <th class="text-right px-3 py-2 font-semibold">ยอดเที่ยว</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in eligibleBookings" :key="b.id" class="border-t border-border">
                <td class="px-3 py-2">
                  <input type="checkbox" :checked="selectedIds.has(b.id)" @change="toggleBooking(b.id)" class="w-4 h-4" />
                </td>
                <td class="px-3 py-2 font-mono text-text">{{ b.docNo }}</td>
                <td class="px-3 py-2 text-muted">{{ destinationLabel(b) }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(b.completedAt) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(b)) }}</td>
              </tr>
              <tr v-if="eligibleBookings.length === 0">
                <td colspan="5" class="px-3 py-6 text-center text-muted">ลูกค้ารายนี้ไม่มีงานประเภทนี้ที่รอวางบิล</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end">
          <div class="text-sm">
            <span class="text-muted">จำนวนเที่ยวที่เลือก:</span>
            <span class="font-bold text-text ml-1">{{ selectedIds.size }} เที่ยว</span>
            <span class="text-muted ml-3">ยอดรวมที่เลือก:</span>
            <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 2: ตรวจสอบ/แก้ไขก่อนบันทึกจริง -->
    <div v-else class="card-lg space-y-4">
      <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{{ saveError }}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="field-label">เลขที่เอกสาร <span class="font-normal text-[10px]">(ว่างไว้ = ออกเลขอัตโนมัติ)</span></label>
          <input v-model="reviewNumber" class="input-field w-full font-mono" placeholder="ออกอัตโนมัติ" />
        </div>
        <div>
          <label class="field-label">เครดิต (วัน)</label>
          <input v-model.number="reviewCreditDays" type="number" min="0" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">เลขที่อ้างอิง</label>
          <input v-model="reviewReference" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">ที่อยู่ลูกค้า</label>
          <textarea v-model="reviewCustomerAddress" rows="2" class="input-field w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="field-label">รหัสไปรษณีย์</label>
            <input v-model="reviewCustomerZipCode" class="input-field w-full" />
          </div>
          <div>
            <label class="field-label">เลขประจำตัวผู้เสียภาษี</label>
            <input v-model="reviewCustomerTaxId" class="input-field w-full" />
          </div>
        </div>
      </div>

      <div class="border border-border rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 text-xs text-muted">
            <tr>
              <th class="text-left px-3 py-2 font-semibold">รายการ</th>
              <th class="text-right px-3 py-2 font-semibold">จำนวนเงิน</th>
              <th class="text-right px-3 py-2 font-semibold">
                <div class="flex items-center justify-end gap-1.5">
                  <input type="checkbox" :checked="allRowsTaxed" @change="toggleAllTax" class="w-4 h-4" />
                  ภาษี (%)
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in reviewRows" :key="idx" class="border-t border-border">
              <td class="px-3 py-2 text-text">{{ row.description }}</td>
              <td class="px-3 py-2 text-right font-mono text-text">{{ formatBaht(row.amount) }}</td>
              <td class="px-3 py-2">
                <TaxRateCell v-model="row.vatRate" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-end gap-6 text-sm">
        <div><span class="text-muted">ยอดก่อนภาษี:</span> <span class="font-semibold text-text ml-1">{{ formatBaht(reviewTotals.amount) }}</span></div>
        <div><span class="text-muted">ภาษีมูลค่าเพิ่ม:</span> <span class="font-semibold text-text ml-1">{{ formatBaht(reviewTotals.vatAmount) }}</span></div>
        <div><span class="text-muted">รวมทั้งสิ้น:</span> <span class="font-bold text-primary ml-1">{{ formatBaht(reviewTotals.amount + reviewTotals.vatAmount) }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { useContactStore } from '@/stores/contacts'
import ContactPickerField from '@/components/shared/ContactPickerField.vue'
import TaxRateCell from '@/components/shared/TaxRateCell.vue'
import { sortBookingsForDocumentMerge } from '@/utils/bookingMergeSort'
import { categoryFeedLabel } from '@/utils/bookingStatus'
import { computeDocumentTotals } from '@/utils/documentTotals'
import type { Booking, BookingCategory } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()
const contactStore = useContactStore()

/** เช็คเฉพาะ taxInvoiceDocId ของงาน เป็นอิสระจาก billingNoteDocId/receiptDocId — งานที่วางบิลรวม/รับเงินรวมไปแล้วยังออกใบแจ้งหนี้รวม
 *  ตรงจากงานขนส่งได้อีก ไม่ต้องผ่าน/แปลงจากใบวางบิลก่อน (Booking ยังเป็น Source of Truth เหมือนเดิม) */
const isUnbilledEligible = (b: Booking) => b.status === 'DELIVERED' && !b.taxInvoiceDocId

const eligibleCustomers = computed(() => [...new Set(bookingStore.bookings.filter(isUnbilledEligible).map((b) => b.customer))].sort())

const selectedCustomer = ref('')
const selectedCustomerId = computed(() => customerStore.customers.find((c) => c.name === selectedCustomer.value)?.id)
const contactId = ref<string | undefined>(undefined)
/** เหมือน BillingCreateFromBookingsView.vue — ต้องเลือก Feed ก่อน (store บังคับ sameCategory guard แล้ว) */
const selectedCategory = ref<BookingCategory | ''>('')
watch(selectedCustomer, (name) => {
  const customer = customerStore.customers.find((c) => c.name === name)
  contactId.value = customer?.id ? contactStore.primaryContactFor(customer.id)?.id : undefined
  selectedCategory.value = ''
  selectedIds.value = new Set()
})
const selectedIds = ref<Set<string>>(new Set())

const dateFrom = ref('')
const dateTo = ref('')

const eligibleCategoriesForCustomer = computed<BookingCategory[]>(() => {
  if (!selectedCustomer.value) return []
  const categories = new Set(bookingStore.bookings.filter((b) => b.customer === selectedCustomer.value && isUnbilledEligible(b)).map((b) => b.category))
  return [...categories].sort()
})

const eligibleBookings = computed(() => {
  if (!selectedCategory.value) return []
  const list = bookingStore.bookings.filter((b) => {
    if (b.customer !== selectedCustomer.value || b.category !== selectedCategory.value || !isUnbilledEligible(b)) return false
    const refDate = b.completedAt ? new Date(b.completedAt) : undefined
    if (dateFrom.value && (!refDate || refDate < new Date(dateFrom.value))) return false
    if (dateTo.value) {
      const endOfDay = new Date(dateTo.value)
      endOfDay.setHours(23, 59, 59, 999)
      if (!refDate || refDate > endOfDay) return false
    }
    return true
  })
  return sortBookingsForDocumentMerge(list)
})

watch(selectedCategory, () => {
  selectedIds.value = new Set()
})

const toggleBooking = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}

/** เหมือน bookingReferenceDoc ใน stores/salesDocuments.ts เป๊ะ */
const bookingReferenceDoc = (b: Booking): string => {
  const salesOrder = b.sourceDocumentId ? salesDocumentsStore.documents.find((d) => d.type === 'SALES_ORDER' && d.id === b.sourceDocumentId) : undefined
  return salesOrder?.number || b.docNo
}

const bookingTotal = (b: Booking) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
const destinationLabel = (b: Booking) => {
  if (!b.items.length) return '-'
  const first = b.items[0].siteName
  return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
}

const selectedTotal = computed(() => eligibleBookings.value.filter((b) => selectedIds.value.has(b.id)).reduce((sum, b) => sum + bookingTotal(b), 0))

const canSubmit = computed(() => selectedIds.value.size > 0)

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

/** Create/Edit flow เหมือน BillingCreateFromBookingsView.vue — ยังไม่ persist อะไรจนกว่าจะกด "ยืนยันสร้างใบแจ้งหนี้" */
const phase = ref<'select' | 'review'>('select')
const saving = ref(false)
const saveError = ref('')
const reviewNumber = ref('')
const reviewReference = ref('')
const reviewCreditDays = ref(30)
const reviewCustomerAddress = ref('')
const reviewCustomerZipCode = ref('')
const reviewCustomerTaxId = ref('')

interface ReviewRow {
  bookingId: string
  description: string
  qty: number
  unit: string
  unitPrice: number
  amount: number
  discountMode?: 'percent' | 'fixed'
  discountPercent?: number
  discountAmount?: number
  vatRate?: number
  shipDate?: Date
  plate?: string
  referenceDoc?: string
  deliveryNo?: string
}
const reviewRows = ref<ReviewRow[]>([])

const goToReview = () => {
  if (!canSubmit.value) return
  const orderedIds = eligibleBookings.value.filter((b) => selectedIds.value.has(b.id)).map((b) => b.id)
  const targetBookings = orderedIds.map((id) => bookingStore.bookings.find((b) => b.id === id)!).filter(Boolean)
  reviewNumber.value = ''
  reviewCreditDays.value = 30
  reviewReference.value = targetBookings.map(bookingReferenceDoc).join(', ')
  const customer = customerStore.customers.find((c) => c.name === selectedCustomer.value)
  reviewCustomerAddress.value = customer?.address || ''
  reviewCustomerZipCode.value = customer?.zipCode || ''
  reviewCustomerTaxId.value = customer?.taxId || ''
  reviewRows.value = targetBookings.map((b) => {
    const unitPrice = (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
    const dest = b.items.length > 1 ? `${b.items[0]?.siteName} +${b.items.length - 1} ที่อื่น` : b.items[0]?.siteName || '-'
    const products = [...new Set(b.items.map((i) => i.product).filter(Boolean))].join(' + ')
    return {
      bookingId: b.id,
      description: products ? `${dest} — ${products}` : dest,
      qty: 1,
      unit: 'เที่ยว',
      unitPrice,
      amount: unitPrice,
      discountMode: b.discountMode,
      discountPercent: b.discountPercent,
      discountAmount: b.discountAmount,
      vatRate: b.vatRate,
      shipDate: b.shipDate,
      plate: b.plate,
      referenceDoc: bookingReferenceDoc(b),
      deliveryNo: b.docNo,
    }
  })
  saveError.value = ''
  phase.value = 'review'
}

const allRowsTaxed = computed(() => reviewRows.value.length > 0 && reviewRows.value.every((r) => !!r.vatRate))
const toggleAllTax = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  const rate = documentSettingsStore.settings.vatRate || 7
  reviewRows.value.forEach((r) => {
    r.vatRate = checked ? rate : undefined
  })
}

const reviewTotals = computed(() => computeDocumentTotals(reviewRows.value))

const confirmSave = () => {
  saveError.value = ''
  saving.value = true
  try {
    const orderedIds = reviewRows.value.map((r) => r.bookingId)
    const result = salesDocumentsStore.createTaxInvoiceFromBookings(orderedIds, {
      contactId: contactId.value,
      number: reviewNumber.value.trim() || undefined,
      reference: reviewReference.value.trim() || undefined,
      creditDays: reviewCreditDays.value,
      customerAddress: reviewCustomerAddress.value.trim() || undefined,
      customerZipCode: reviewCustomerZipCode.value.trim() || undefined,
      customerTaxId: reviewCustomerTaxId.value.trim() || undefined,
      items: reviewRows.value.map(({ bookingId, ...row }) => row),
    })
    if (!result) {
      saveError.value = reviewNumber.value.trim()
        ? `บันทึกไม่สำเร็จ — เลขที่เอกสาร ${reviewNumber.value.trim()} อาจถูกใช้ไปแล้ว หรืองานที่เลือกไม่ตรงเงื่อนไข (สถานะ/ลูกค้า/Feed/POD) อีกต่อไป`
        : 'บันทึกไม่สำเร็จ — งานที่เลือกไม่ตรงเงื่อนไข (สถานะ/ลูกค้า/Feed/POD) อีกต่อไป ลองย้อนกลับไปเลือกใหม่'
      return
    }
    router.push(`/documents/${result.id}`)
  } finally {
    saving.value = false
  }
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

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
