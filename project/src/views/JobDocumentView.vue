<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.back()" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <div v-if="booking" class="flex items-center gap-2">
        <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
        <span
          v-if="booking.billingStatus"
          :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[booking.billingStatus]]"
        >
          {{ billingStatusLabel[booking.billingStatus] }}
        </span>
        <button @click="printDoc" class="btn-primary">
          <span class="material-symbols-rounded text-base">print</span>
          พิมพ์เอกสาร
        </button>
      </div>
    </div>

    <div v-if="!booking" class="card-lg text-center text-muted py-12">ไม่พบงาน</div>

    <template v-else>
      <!-- Printable PO / Quotation Sheet -->
      <div id="print-area" class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-10 max-w-3xl mx-auto">
        <div class="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
          <div>
            <div class="text-lg font-bold">{{ companyInfo.name }}</div>
            <div class="text-xs leading-relaxed max-w-xs">{{ companyInfo.address }}</div>
            <div class="text-xs">เลขประจำตัวผู้เสียภาษี: {{ companyInfo.taxId }}</div>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold">{{ docTitleTh }}</div>
            <div class="text-xs text-gray-600">{{ docTitleEn }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div class="font-semibold mb-1">ลูกค้า</div>
            <div class="font-bold">{{ booking.customer }}</div>
            <div class="text-xs leading-relaxed">{{ customer.address }}</div>
            <div class="text-xs">เลขประจำตัวผู้เสียภาษี: {{ customer.taxId }}</div>
          </div>
          <div class="text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">เลขที่เอกสาร</span>
              <span class="font-bold">{{ booking.docNo }}</span>
            </div>
            <div v-if="booking.po" class="flex justify-between">
              <span class="text-gray-600">ใบสั่งงาน (PO)</span>
              <span>{{ booking.po }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">วันที่ออกเอกสาร</span>
              <span>{{ formatDate(booking.createdAt) }}</span>
            </div>
            <div v-if="booking.shipDate" class="flex justify-between">
              <span class="text-gray-600">วันที่ขนส่ง</span>
              <span>{{ formatDate(booking.shipDate) }}</span>
            </div>
          </div>
        </div>

        <table class="w-full text-sm border border-gray-400 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-400 px-2 py-1 text-left w-10">ลำดับ</th>
              <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียด</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-16">จำนวน</th>
              <th class="border border-gray-400 px-2 py-1 text-left w-16">หน่วย</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-28">ราคาต่อหน่วย</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-28">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-400 px-2 py-1">1</td>
              <td class="border border-gray-400 px-2 py-1">
                {{ booking.siteName }} ({{ booking.district }}) · {{ productLabel(booking) }}
                <span v-if="booking.jobType" class="text-xs text-gray-600">· {{ booking.jobType }}</span>
              </td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ lineQty }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ lineUnit }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(lineUnitPrice) }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(booking.tripFee) }}</td>
            </tr>
            <tr v-for="n in fillerRows" :key="'filler' + n">
              <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
              <td class="border border-gray-400 px-2 py-1"></td>
              <td class="border border-gray-400 px-2 py-1"></td>
              <td class="border border-gray-400 px-2 py-1"></td>
              <td class="border border-gray-400 px-2 py-1"></td>
              <td class="border border-gray-400 px-2 py-1"></td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-between items-start mb-6">
          <div class="text-sm">
            <div class="text-gray-600 text-xs">จำนวนเงินเป็นตัวอักษร</div>
            <div class="font-semibold">({{ bahtText(booking.agreedPrice || booking.tripFee) }})</div>
          </div>
          <div class="w-64 text-sm space-y-1">
            <div class="flex justify-between">
              <span class="text-gray-600">รวมเป็นเงิน</span>
              <span>{{ formatBaht(booking.tripFee) }}</span>
            </div>
            <div v-if="booking.agreedPrice !== booking.tripFee" class="flex justify-between">
              <span class="text-gray-600">ราคาที่ตกลงกับลูกค้า</span>
              <span>{{ formatBaht(booking.agreedPrice) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">ภาษีมูลค่าเพิ่ม 0%</span>
              <span>{{ formatBaht(0) }}</span>
            </div>
            <div class="flex justify-between font-bold border-t border-black pt-1">
              <span>จำนวนเงินรวมทั้งสิ้น</span>
              <span>{{ formatBaht(booking.agreedPrice || booking.tripFee) }}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6 text-sm text-center mt-16">
          <div>
            <div class="border-t border-gray-500 pt-2 mx-8">ผู้เสนอราคา</div>
          </div>
          <div>
            <div class="border-t border-gray-500 pt-2 mx-8">ผู้สั่งซื้อ / ผู้อนุมัติ</div>
          </div>
        </div>
      </div>

      <!-- Internal Ops Info (ไม่พิมพ์ - สำหรับเจ้าหน้าที่เท่านั้น) -->
      <div class="card-lg no-print space-y-4">
        <div class="flex items-center justify-between">
          <div class="font-bold text-text">ข้อมูลภายใน (ไม่พิมพ์)</div>
          <span :class="['text-xs font-semibold px-2 py-1 rounded-full', booking.category === 'cements' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700']">
            {{ booking.category === 'cements' ? 'Fleet Cements' : 'Fleet Ceramics' }}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span class="text-muted">เบอร์โทรหน้างาน:</span> {{ booking.sitePhone || '-' }}</div>
          <div><span class="text-muted">พิกัดหน้างาน:</span> {{ booking.siteCoords || '-' }}</div>
          <div><span class="text-muted">ทะเบียนรถ:</span> {{ booking.plate || '-' }}</div>
          <div><span class="text-muted">คนขับ:</span> {{ booking.driverName || '-' }}</div>
          <div v-if="booking.dispatchedAt"><span class="text-muted">วันที่จ่ายงาน:</span> {{ formatDate(booking.dispatchedAt) }}</div>
          <div v-if="booking.transitStartedAt"><span class="text-muted">วันที่เริ่มขนส่ง:</span> {{ formatDate(booking.transitStartedAt) }}</div>
          <div v-if="booking.completedAt"><span class="text-muted">วันที่ส่งของสำเร็จ:</span> {{ formatDate(booking.completedAt) }}</div>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold text-muted">ค่าเที่ยว / ราคาที่ตกลง</div>
          <button
            v-if="!isEditing"
            @click="startEdit"
            :disabled="!canEditPrice"
            :title="canEditPrice ? 'แก้ไขราคา' : 'ราคาถูกล็อกหลังจัดรถแล้ว แก้ไขได้เฉพาะ Admin'"
            class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="material-symbols-rounded text-base">edit</span>
            แก้ไข
          </button>
        </div>
        <div v-if="!isEditing" class="grid grid-cols-2 gap-3">
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">ค่าเที่ยว</div>
            <div class="font-bold text-text">{{ formatBaht(booking.tripFee) }}</div>
          </div>
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">ราคาที่ตกลง</div>
            <div class="font-bold text-text">{{ formatBaht(booking.agreedPrice) }}</div>
          </div>
        </div>
        <div v-else class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว</label>
            <input v-model.number="priceForm.tripFee" type="number" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ราคาที่ตกลง</label>
            <input v-model.number="priceForm.agreedPrice" type="number" class="input-field w-full" />
          </div>
          <div class="col-span-2 flex justify-end gap-2">
            <button @click="isEditing = false" class="btn-secondary">ยกเลิก</button>
            <button @click="savePrice" class="btn-sm text-primary">
              <span class="material-symbols-rounded text-base">save</span>
              บันทึกราคา
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">น้ำมัน</div>
            <div class="font-bold text-text">{{ booking.fuelLiters || 0 }} ล. x {{ formatBaht(booking.fuelRate) }}</div>
          </div>
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">เบี้ยเลี้ยง</div>
            <div class="font-bold text-text">{{ formatBaht(booking.allowance) }}</div>
          </div>
          <div v-if="booking.finalAllowance !== undefined" class="bg-primary text-white rounded-lg p-3 col-span-2">
            <div class="text-xs opacity-90 mb-1">เบี้ยเลี้ยงสุทธิ</div>
            <div class="font-bold">{{ formatBaht(booking.finalAllowance) }}</div>
          </div>
        </div>

        <div v-if="booking.extraCharges?.length">
          <div class="text-xs font-semibold text-muted mb-1">ค่าใช้จ่ายเพิ่มเติม (extra)</div>
          <div v-for="extra in booking.extraCharges" :key="extra.id" class="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
            <span class="text-text">{{ extra.label }}</span>
            <span class="text-text">{{ formatBaht(extra.amount) }}</span>
          </div>
        </div>

        <div v-if="booking.debtAdjustments?.length">
          <div class="text-xs font-semibold text-muted mb-1">รายการเพิ่ม/ลดหนี้</div>
          <div v-for="adj in booking.debtAdjustments" :key="adj.id" class="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
            <span class="text-text">{{ adj.label || '-' }}</span>
            <span :class="adj.amount >= 0 ? 'text-red-500' : 'text-green-600'">{{ adj.amount >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(adj.amount)) }}</span>
          </div>
        </div>

        <div v-if="booking.podImage">
          <div class="text-xs font-semibold text-muted mb-1">รูปหลักฐานการส่งมอบสินค้า (POD)</div>
          <img :src="booking.podImage" class="w-full max-h-64 object-contain rounded-lg border border-border" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAppStore } from '@/stores/app'
import { companyInfo, bahtText } from '@/utils/companyInfo'
import { lookupCustomer } from '@/utils/customerDirectory'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import type { Booking } from '@/types'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const appStore = useAppStore()

const isAdmin = computed(() => appStore.currentRole === 'admin')

const booking = computed(() => bookingStore.bookings.find((b) => b.id === route.params.bookingId))
const customer = computed(() => lookupCustomer(booking.value?.customer || ''))

/** ยังไม่จัดคนขับ = ใบสั่งซื้อสินค้า (Purchase Order), จัดคนขับแล้ว = ใบสั่งงานขนส่ง (Work Order) */
const isDispatched = computed(() => !!booking.value?.driverName)
const docTitleTh = computed(() => (isDispatched.value ? 'ใบสั่งงานขนส่ง' : 'ใบสั่งซื้อสินค้า'))
const docTitleEn = computed(() => (isDispatched.value ? 'WORK ORDER' : 'PURCHASE ORDER'))

const fillerRows = computed(() => 3)

const lineUnit = computed(() => {
  if (!booking.value) return 'เที่ยว'
  if (booking.value.weight) return 'ตัน'
  if (booking.value.qty) return 'ชิ้น'
  return 'เที่ยว'
})

const lineQty = computed(() => {
  if (!booking.value) return 1
  return booking.value.weight || booking.value.qty || 1
})

const lineUnitPrice = computed(() => {
  if (!booking.value) return 0
  return lineQty.value ? Math.round((booking.value.tripFee || 0) / lineQty.value) : booking.value.tripFee || 0
})

const productLabel = (b: Booking) => {
  if (b.category === 'ceramics') return 'ปูนซีเมนต์'
  const types = (b.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const formatBaht = (value: number) => Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

const printDoc = () => window.print()

// --- Price edit ---
const isEditing = ref(false)
const priceForm = ref({ tripFee: 0, agreedPrice: 0 })

/** ราคาแก้ไขได้อิสระตอน WAITING_DISPATCH เท่านั้น หลังจากนั้นต้องเป็น admin */
const canEditPrice = computed(() => !!booking.value && (booking.value.status === 'WAITING_DISPATCH' || isAdmin.value))

const startEdit = () => {
  if (!booking.value || !canEditPrice.value) return
  priceForm.value = { tripFee: booking.value.tripFee, agreedPrice: booking.value.agreedPrice }
  isEditing.value = true
}

const savePrice = () => {
  if (!booking.value) return
  bookingStore.updateBookingPrice(booking.value.id, priceForm.value)
  isEditing.value = false
}
</script>

<style scoped>
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
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
}
</style>
