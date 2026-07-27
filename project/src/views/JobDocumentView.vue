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
          <div class="flex items-start gap-3">
            <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-14 h-14 object-contain flex-shrink-0" />
            <div>
              <div class="text-lg font-bold">{{ documentSettingsStore.settings.company.name }}</div>
              <div class="text-xs leading-relaxed max-w-xs">{{ documentSettingsStore.settings.company.address }}</div>
              <div class="text-xs">เลขประจำตัวผู้เสียภาษี: {{ documentSettingsStore.settings.company.taxId }}</div>
            </div>
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
            <div class="flex justify-between">
              <span class="text-gray-600">ใบสั่งงาน (PO)</span>
              <span>{{ booking.po || '-' }}</span>
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
              <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียด (ปลายทาง / สินค้า)</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-20">ปริมาณ</th>
              <th class="border border-gray-400 px-2 py-1 text-left w-16">หน่วย</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in productRows" :key="row.destinationName + row.product + i">
              <td class="border border-gray-400 px-2 py-1">{{ i + 1 }}</td>
              <td class="border border-gray-400 px-2 py-1">
                {{ row.destinationName }} ({{ row.province }} · {{ row.district }}) · {{ row.product }}
                <span v-if="row.jobType" class="text-xs text-gray-600">· {{ row.jobType }}</span>
              </td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ row.qty }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ row.unit }}</td>
            </tr>
            <tr v-for="n in fillerRows" :key="'filler' + n">
              <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
              <td class="border border-gray-400 px-2 py-1"></td>
              <td class="border border-gray-400 px-2 py-1"></td>
              <td class="border border-gray-400 px-2 py-1"></td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-between items-start mb-6">
          <div class="text-sm">
            <div class="text-gray-600 text-xs">จำนวนเงินเป็นตัวอักษร</div>
            <div class="font-semibold">({{ bahtText(grandTotal) }})</div>
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
            <div v-if="showVatRow" class="flex justify-between">
              <span class="text-gray-600">ภาษีมูลค่าเพิ่ม {{ documentSettingsStore.settings.vatRate }}%</span>
              <span>{{ formatBaht(vatAmount) }}</span>
            </div>
            <div class="flex justify-between font-bold border-t border-black pt-1">
              <span>จำนวนเงินรวมทั้งสิ้น</span>
              <span>{{ formatBaht(grandTotal) }}</span>
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

      <div class="flex justify-center no-print">
        <button @click="detailDrawerOpen = true" class="btn-secondary">
          <span class="material-symbols-rounded text-base">info</span>
          ดูรายละเอียดเพิ่มเติม
        </button>
      </div>

      <!-- Detail Side Drawer: ข้อมูลปฏิบัติการ/ราคา/ค่าใช้จ่าย ที่ไม่ได้แสดงในใบเสนอราคา/PO -->
      <Teleport to="body" v-if="detailDrawerOpen">
        <div
          @click="detailDrawerOpen = false"
          class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 no-print"
        >
          <div
            @click.stop
            class="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out translate-x-0"
          >
            <div class="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <div class="font-bold text-text">รายละเอียดเพิ่มเติม</div>
              <button @click="detailDrawerOpen = false" class="btn-icon">
                <span class="material-symbols-rounded">close</span>
              </button>
            </div>

            <div class="p-5 space-y-5">
              <!-- ข้อมูลปฏิบัติการ -->
              <div>
                <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">ข้อมูลปฏิบัติการ</div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div><span class="text-muted">ทะเบียนรถ:</span> {{ booking.plate || '-' }}</div>
                  <div><span class="text-muted">คนขับ:</span> {{ booking.driverName || '-' }}</div>
                  <div><span class="text-muted">ต้นทาง:</span> {{ booking.origin || '-' }}</div>
                  <div v-if="booking.dispatchedAt"><span class="text-muted">วันที่จ่ายงาน:</span> {{ formatDate(booking.dispatchedAt) }}</div>
                  <div v-if="booking.transitStartedAt"><span class="text-muted">วันที่เริ่มขนส่ง:</span> {{ formatDate(booking.transitStartedAt) }}</div>
                  <div v-if="booking.completedAt"><span class="text-muted">วันที่ส่งของสำเร็จ:</span> {{ formatDate(booking.completedAt) }}</div>
                  <div v-if="booking.odometerBefore !== undefined"><span class="text-muted">เลขไมล์เริ่มต้น:</span> {{ booking.odometerBefore }} กม.</div>
                  <div v-if="booking.odometerAfter !== undefined"><span class="text-muted">เลขไมล์สิ้นสุด:</span> {{ booking.odometerAfter }} กม.</div>
                </div>
              </div>

              <!-- รายละเอียดปลายทาง/สินค้าแต่ละรายการ -->
              <div v-if="booking.items.length" class="border-t border-border pt-4">
                <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">รายละเอียดปลายทาง/สินค้าแต่ละรายการ</div>
                <div class="space-y-2">
                  <div
                    v-for="(item, idx) in booking.items"
                    :key="item.id"
                    class="text-sm bg-surface-2 rounded-lg p-3 border border-border space-y-1"
                  >
                    <div class="font-semibold text-text flex items-center justify-between">
                      <span>{{ idx + 1 }}. {{ item.siteName }}</span>
                      <span :class="item.deliveryStatus === 'DELIVERED' ? 'text-green-600' : 'text-amber-600'" class="text-xs font-semibold">
                        {{ item.deliveryStatus === 'DELIVERED' ? `ส่งแล้ว (ผู้รับ: ${item.deliveredBy})` : 'รอส่ง' }}
                      </span>
                    </div>
                    <div class="text-xs text-muted">{{ item.province }} · {{ item.district }}</div>
                    <div><span class="text-muted">สินค้า:</span> {{ item.product }} {{ item.qty }} {{ item.unit }}</div>
                    <div><span class="text-muted">ต้นทาง:</span> {{ item.pickupOriginName || booking.origin || '-' }}</div>
                    <div><span class="text-muted">ผู้ติดต่อ:</span> {{ item.siteContactName || '-' }} {{ item.sitePhone ? '· ' + item.sitePhone : '' }}</div>
                    <div>
                      <span class="text-muted">พิกัด:</span>
                      {{ item.latitude !== undefined && item.longitude !== undefined ? `${item.latitude}, ${item.longitude}` : item.mapUrl || '-' }}
                    </div>
                    <div v-if="isMulti" class="font-semibold text-text">
                      <span class="text-muted font-normal">ค่าเที่ยว:</span>
                      {{ formatBaht(item.tripFee || 0) }} x {{ item.tripCount || 1 }} = {{ formatBaht((item.tripFee || 0) * (item.tripCount || 1)) }}
                    </div>
                    <img v-if="item.podImage" :src="item.podImage" class="w-full max-h-32 object-contain rounded border border-border" />
                  </div>
                </div>
                <div v-if="isMulti" class="text-sm text-text mt-2 text-right font-semibold">
                  รวมค่าเที่ยวทั้งงาน: {{ formatBaht(booking.tripFee) }}
                </div>
              </div>

              <!-- สรุประยะทาง/น้ำมัน -->
              <div v-if="mileageSummary" class="border-t border-border pt-4">
                <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">สรุประยะทาง/น้ำมัน</div>
                <div class="grid grid-cols-2 gap-3 text-sm bg-surface-2 rounded-lg p-3 border border-border">
                  <div>ระยะทางเที่ยวนี้: <span class="font-semibold text-text">{{ mileageSummary.distanceKm }} กม.</span></div>
                  <div>สะสม: <span class="font-semibold text-text">{{ mileageSummary.cumulativeKm }} กม.</span></div>
                  <div>เฉลี่ย: <span class="font-semibold text-text">{{ mileageSummary.avgKmPerLiter ?? '-' }} กม./ลิตร</span></div>
                  <div>น้ำมันที่กำหนด: <span class="font-semibold text-text">{{ mileageSummary.standardFuelLiters ?? '-' }} ล.</span></div>
                  <div class="col-span-2">
                    ชดเชยน้ำมัน:
                    <span :class="['font-semibold', (mileageSummary.fuelCompensation ?? 0) >= 0 ? 'text-green-700' : 'text-red-700']">
                      {{ mileageSummary.fuelCompensation !== null ? formatBaht(mileageSummary.fuelCompensation) : '-' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- ราคา/ค่าใช้จ่าย -->
              <div class="border-t border-border pt-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-bold text-muted uppercase tracking-wide">ราคา/ค่าใช้จ่าย</div>
                  <button
                    v-if="!isEditing && !isMulti"
                    @click="startEdit"
                    :disabled="!canEditPrice"
                    :title="canEditPrice ? 'แก้ไขราคา' : 'ราคาถูกล็อกหลังจัดรถแล้ว แก้ไขได้เฉพาะ Admin'"
                    class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                </div>
                <div v-if="isMulti" class="text-[11px] text-muted -mt-2">
                  งานนี้แยกค่าเที่ยวตามปลายทาง — แก้ไขราคาแบบแยกปลายทางได้ที่หน้าแก้ไขงาน (ปุ่มแก้ไขงานในรายการงาน)
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
              </div>

              <!-- POD -->
              <div v-if="booking.podImage" class="border-t border-border pt-4">
                <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">รูปหลักฐานการส่งมอบสินค้า (POD)</div>
                <img :src="booking.podImage" class="w-full max-h-64 object-contain rounded-lg border border-border" />
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAppStore } from '@/stores/app'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { bahtText } from '@/utils/companyInfo'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import type { Booking } from '@/types'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const appStore = useAppStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()

const isAdmin = computed(() => appStore.currentRole === 'admin')

const booking = computed(() => bookingStore.bookings.find((b) => b.id === route.params.bookingId))
/** งาน MULTI_DESTINATION = แต่ละรายการมีค่าเที่ยวเป็นของตัวเอง — แก้ไขราคาต้องทำผ่านหน้าแก้ไขงานเท่านั้น ไม่ใช่หน้านี้ */
const isMulti = computed(() => (booking.value?.pricingMode ?? 'SINGLE_DESTINATION') === 'MULTI_DESTINATION')
const customer = computed(() => customerStore.lookupCustomer(booking.value?.customer || ''))

const detailDrawerOpen = ref(false)

/** ยังไม่จัดคนขับ = ใบสั่งซื้อสินค้า (Purchase Order), จัดคนขับแล้ว = ใบสั่งงานขนส่ง (Work Order) */
const isDispatched = computed(() => !!booking.value?.driverName)
const docTitleTh = computed(() => (isDispatched.value ? 'ใบสั่งงานขนส่ง' : 'ใบสั่งซื้อสินค้า'))
const docTitleEn = computed(() => (isDispatched.value ? 'WORK ORDER' : 'PURCHASE ORDER'))

const fillerRows = computed(() => 3)

const productLabel = (b: Booking) => {
  const names = [...new Set(b.items.map((i) => i.product).filter(Boolean))]
  return names.length ? names.join(', ') : '-'
}

/** แต่ละรายการสินค้าในงานนี้ ขึ้นแถวของตัวเองในตารางเอกสาร คนละแถวไม่รวมกัน */
const productRows = computed(() => {
  if (!booking.value) return []
  return booking.value.items.map((item) => ({
    product: item.product,
    qty: item.qty,
    unit: item.unit,
    destinationName: item.siteName,
    province: item.province,
    district: item.district,
    jobType: item.jobType,
  }))
})

/** สรุประยะทาง/อัตราสิ้นเปลืองน้ำมัน/ชดเชยน้ำมัน เมื่อมีเลขไมล์เริ่มต้น-สิ้นสุดครบแล้ว */
const mileageSummary = computed(() => {
  const b = booking.value
  if (!b || b.odometerBefore === undefined || b.odometerAfter === undefined) return null
  const distanceKm = b.odometerAfter - b.odometerBefore
  if (distanceKm <= 0) return null
  const cumulativeKm =
    bookingStore.bookings
      .filter((x) => x.plate === b.plate && x.id !== b.id && x.odometerBefore !== undefined && x.odometerAfter !== undefined)
      .reduce((sum, x) => sum + ((x.odometerAfter || 0) - (x.odometerBefore || 0)), 0) + distanceKm
  const avgKmPerLiter = b.fuelLiters ? Math.round((distanceKm / b.fuelLiters) * 100) / 100 : null
  const standardFuelLiters = fuelRateStore.standardFuelLiters(b.items, b.pricingMode) || null
  const fuelCompensation = standardFuelLiters !== null ? Math.round((standardFuelLiters - (b.fuelLiters || 0)) * (b.fuelRate || 0)) : null
  return { distanceKm, cumulativeKm, avgKmPerLiter, standardFuelLiters, fuelCompensation }
})

const subtotalAmount = computed(() => booking.value?.agreedPrice || booking.value?.tripFee || 0)
const showVatRow = computed(() => documentSettingsStore.settings.calcMode.purchase.vat !== 'included')
const vatAmount = computed(() =>
  showVatRow.value ? Math.round((subtotalAmount.value * documentSettingsStore.settings.vatRate) / 100) : 0
)
const grandTotal = computed(() => subtotalAmount.value + vatAmount.value)

const formatBaht = (value: number) =>
  `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

const printDoc = () => window.print()

// --- Price edit ---
const isEditing = ref(false)
const priceForm = ref({ tripFee: 0, agreedPrice: 0 })

/** ราคาแก้ไขได้อิสระตอน WAITING_DISPATCH เท่านั้น หลังจากนั้นต้องเป็น admin */
const canEditPrice = computed(() => !!booking.value && !isMulti.value && (booking.value.status === 'WAITING_DISPATCH' || isAdmin.value))

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
