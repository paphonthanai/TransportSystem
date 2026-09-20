<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">เลือกงานขนส่งเพื่อวางบิลรวม</h2>
        <div class="text-xs text-muted mt-0.5">เลือกลูกค้าและงานขนส่ง แล้วนำข้อมูลไปแสดงในหน้าสร้างใบวางบิล</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push('/billing-notes')" class="btn-secondary">ยกเลิก</button>
        <button @click="goToForm" :disabled="pickerSelectedIds.size === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">arrow_forward</span>
          ถัดไป ({{ pickerSelectedIds.size }})
        </button>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <div>
          <label class="field-label">ลูกค้า</label>
          <select v-model="customerName" class="input-field w-full">
            <option value="">เลือกลูกค้า...</option>
            <option v-for="c in eligibleCustomers" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">ประเภทงาน (Feed)</label>
          <select v-model="bookingCategory" :disabled="!customerName.trim()" class="input-field w-full disabled:opacity-40">
            <option value="">เลือกประเภทงาน...</option>
            <option v-for="c in bookingCategories" :key="c" :value="c">{{ categoryFeedLabel[c] }}</option>
          </select>
        </div>
      </div>
      <div v-if="bookingCategories.length > 1" class="text-[11px] text-muted">ลูกค้ารายนี้มีงานมากกว่าหนึ่งประเภท ต้องวางบิลแยกทีละประเภท (Feed) เสมอ</div>

      <div v-if="bookingCategory" class="border border-border rounded-lg overflow-x-auto bg-surface">
        <table class="w-full text-sm min-w-[1200px]">
          <thead class="bg-surface-2 text-xs text-muted">
            <tr>
              <th class="px-3 py-2 w-8"></th>
              <th class="text-left px-3 py-2 font-semibold w-10 cursor-pointer select-none" @click="toggleSort('index')">
                ลำดับ<span class="material-symbols-rounded text-sm align-text-bottom">{{ sortIcon('index') }}</span>
              </th>
              <th class="text-left px-3 py-2 font-semibold">ชื่อสินค้า/รายละเอียด</th>
              <th class="text-left px-3 py-2 font-semibold">ทะเบียน</th>
              <th class="text-left px-3 py-2 font-semibold">ชนิดปูน</th>
              <th class="text-left px-3 py-2 font-semibold cursor-pointer select-none" @click="toggleSort('po')">
                เลขที่ PO<span class="material-symbols-rounded text-sm align-text-bottom">{{ sortIcon('po') }}</span>
              </th>
              <th class="text-left px-3 py-2 font-semibold cursor-pointer select-none" @click="toggleSort('shipDate')">
                วันที่ส่งงาน<span class="material-symbols-rounded text-sm align-text-bottom">{{ sortIcon('shipDate') }}</span>
              </th>
              <th class="text-right px-3 py-2 font-semibold">จำนวน</th>
              <th class="text-left px-3 py-2 font-semibold">หน่วย</th>
              <th class="text-right px-3 py-2 font-semibold">ราคาต่อหน่วย</th>
              <th class="text-right px-3 py-2 font-semibold">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in sortedEligibleBookings" :key="b.id" class="border-t border-border">
              <td class="px-3 py-2">
                <input type="checkbox" :checked="pickerSelectedIds.has(b.id)" @change="toggleBooking(b.id)" class="w-4 h-4" />
              </td>
              <td class="px-3 py-2 text-muted">{{ idx + 1 }}</td>
              <td class="px-3 py-2 text-text">
                {{ bookingDescription(b) }}
                <span v-if="billingWarning(b)" class="inline-flex items-center gap-0.5 text-amber-600 text-[11px] ml-1" :title="billingWarning(b) || ''">
                  <span class="material-symbols-rounded text-xs">warning</span>{{ billingWarning(b) }}
                </span>
              </td>
              <td class="px-3 py-2 text-text">{{ b.plate || '-' }}</td>
              <td class="px-3 py-2 text-text">{{ bookingProducts(b) }}</td>
              <td class="px-3 py-2 text-text">{{ b.po || '-' }}</td>
              <td class="px-3 py-2 text-text">{{ formatDateShort(b.shipDate) }}</td>
              <td class="px-3 py-2 text-right text-text">1</td>
              <td class="px-3 py-2 text-text">เที่ยว</td>
              <td class="px-3 py-2 text-right text-text">{{ formatBaht(bookingTotal(b)) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(b)) }}</td>
            </tr>
            <tr v-if="eligibleBookings.length === 0">
              <td colspan="11" class="px-3 py-6 text-center text-muted">ลูกค้ารายนี้ไม่มีงานประเภทนี้ที่รอวางบิล</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="bookingCategory" class="flex justify-end text-sm">
        <span class="text-muted">ยอดรวมที่เลือก:</span>
        <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useBillingRuleStore } from '@/stores/billingRule'
import { categoryFeedLabel } from '@/utils/bookingStatus'
import type { Booking, BookingCategory } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const documentSettingsStore = useDocumentSettingsStore()
const billingRuleStore = useBillingRuleStore()

/** เงื่อนไขเดียวกับ createBillingFromBookings/createBillingManual (claim ทางตรง) ทุกประการ — สถานะงานอ่านจาก
 *  billingRuleStore.isStatusBillable (DELIVERED/IN_TRANSIT บังคับเสมอ + สถานะอื่นที่แอดมินเปิดเพิ่มจาก "เงื่อนไขวางบิล") */
const isBookingBillable = (b: Booking) => billingRuleStore.isStatusBillable(b.status) && !b.billingNoteDocId

/** แจ้งเตือนแบบไม่บล็อก (soft warning) ตามเงื่อนไขเพิ่มเติมที่แอดมินเปิดไว้ — ไม่ตัดงานออกจากรายการที่เลือกได้ */
const billingWarning = (b: Booking): string | null => {
  if (billingRuleStore.rule.requirePOD && !billingRuleStore.hasAllPods(b)) return 'POD ยังไม่ครบทุกรายการ'
  if (billingRuleStore.rule.requirePrice && !billingRuleStore.priceMatches(b)) return 'ราคายังไม่ตรงกับที่ตกลงไว้'
  return null
}

const eligibleCustomers = computed(() => [...new Set(bookingStore.bookings.filter(isBookingBillable).map((b) => b.customer))].sort())

const customerName = ref('')
const bookingCategory = ref<BookingCategory | ''>('')
const pickerSelectedIds = ref<Set<string>>(new Set())

const bookingCategories = computed<BookingCategory[]>(() => {
  if (!customerName.value.trim()) return []
  const cats = new Set(bookingStore.bookings.filter((b) => b.customer === customerName.value && isBookingBillable(b)).map((b) => b.category))
  return [...cats].sort()
})

const eligibleBookings = computed<Booking[]>(() => {
  if (!bookingCategory.value) return []
  return bookingStore.bookings.filter((b) => b.customer === customerName.value && b.category === bookingCategory.value && isBookingBillable(b))
})

/** เรียงลำดับตารางตามคอลัมน์ที่คลิก (ลำดับ/เลขที่ PO/วันที่ส่งงาน) — 'ลำดับ' หมายถึงลำดับเดิมจากการ query เรียง
 *  ปกติ/ย้อนกลับ ไม่ใช่ field จริงในข้อมูล ค่าเริ่มต้น (sortKey ว่าง) = เรียงตามลำดับเดิมเสมอ */
type SortKey = 'index' | 'po' | 'shipDate'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const toggleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
const sortIcon = (key: SortKey) => (sortKey.value !== key ? 'unfold_more' : sortDir.value === 'asc' ? 'arrow_upward' : 'arrow_downward')
const sortedEligibleBookings = computed(() => {
  const list = [...eligibleBookings.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  if (sortKey.value === 'po') list.sort((a, b) => (a.po || '').localeCompare(b.po || '') * dir)
  else if (sortKey.value === 'shipDate') list.sort((a, b) => (new Date(a.shipDate || 0).getTime() - new Date(b.shipDate || 0).getTime()) * dir)
  else if (sortKey.value === 'index' && dir === -1) list.reverse()
  return list
})
/** เปลี่ยนลูกค้า/ประเภทงาน = บริบทใหม่ทั้งหมด ล้างการเรียงเดิมทิ้งด้วย ไม่งั้นค้างเรียงข้ามลูกค้าดูสับสน */
watch([customerName, bookingCategory], () => {
  sortKey.value = null
  sortDir.value = 'asc'
})

const toggleBooking = (id: string) => {
  if (pickerSelectedIds.value.has(id)) pickerSelectedIds.value.delete(id)
  else pickerSelectedIds.value.add(id)
  pickerSelectedIds.value = new Set(pickerSelectedIds.value)
}

const bookingDestination = (b: Booking) => {
  if (!b.items.length) return '-'
  const first = b.items[0].siteName
  return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
}
const bookingDescription = (b: Booking) => {
  const dest = bookingDestination(b)
  const products = [...new Set(b.items.map((i) => i.product).filter(Boolean))].join(' + ')
  return products ? `${dest} — ${products}` : dest
}
/** ชนิดปูน (Phase 3 — PM-requested column) — ข้อมูลเดียวกับที่ผสมอยู่ใน bookingDescription ด้านบนอยู่แล้ว
 *  (b.items[].product) แค่แยกออกมาเป็นคอลัมน์ของตัวเอง ไม่มี field/schema ใหม่ */
const bookingProducts = (b: Booking) => {
  const products = [...new Set(b.items.map((i) => i.product).filter(Boolean))].join(' + ')
  return products || '-'
}
const bookingTotal = (b: Booking) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
/** วันที่ส่งงาน แบบย่อ วว/ดด/ปป (พ.ศ. 2 หลัก) เช่น "14/08/69" — รูปแบบเดียวกับ formatDateShort ใน InvoiceDocumentView.vue
 *  (คอลัมน์วันที่ส่งในตารางรายเที่ยว) */
const formatDateShort = (date?: Date) => {
  if (!date) return '-'
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String((d.getFullYear() + 543) % 100).padStart(2, '0')
  return `${dd}/${mm}/${yy}`
}

const selectedTotal = computed(() => eligibleBookings.value.filter((b) => pickerSelectedIds.value.has(b.id)).reduce((sum, b) => sum + bookingTotal(b), 0))

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH')}`

const goToForm = () => {
  if (pickerSelectedIds.value.size === 0) return
  router.push({ path: '/billing-notes/manual', query: { bookingIds: [...pickerSelectedIds.value].join(',') } })
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
