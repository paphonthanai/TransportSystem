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
      <!-- Printable PO / Work Order Sheet -->
      <div id="print-area" class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-10 max-w-3xl mx-auto relative">
        <div class="corner-flag"></div>
        <div class="absolute top-2.5 right-3 text-white text-xs font-bold z-10">1</div>

        <div class="flex items-start justify-between mb-6">
          <div class="max-w-[55%] space-y-4">
            <div class="flex items-start gap-3">
              <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-12 h-12 object-contain flex-shrink-0" />
              <div>
                <div class="text-base font-bold">{{ documentSettingsStore.settings.company.name }}</div>
                <div class="text-xs leading-relaxed text-gray-600 max-w-xs">{{ documentSettingsStore.settings.company.address }}</div>
                <div class="text-xs text-gray-600">เลขประจำตัวผู้เสียภาษี: {{ documentSettingsStore.settings.company.taxId }}</div>
              </div>
            </div>
            <div>
              <div class="text-xs font-bold text-primary mb-0.5">ลูกค้า</div>
              <div class="font-bold text-sm">{{ booking.customer }}</div>
              <div class="text-xs leading-relaxed text-gray-700">{{ customer.address }}{{ customer.zipCode ? ' ' + customer.zipCode : '' }}</div>
              <div class="text-xs text-gray-700">เลขประจำตัวผู้เสียภาษี {{ customer.taxId || '-' }}</div>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <div class="text-2xl font-bold text-primary">{{ docTitleTh }}</div>
            <div class="text-xs text-gray-500 mb-3">{{ docTitleEn }}</div>
            <div class="doc-meta-box text-left text-xs w-64">
              <div class="flex justify-between gap-4">
                <span class="text-gray-500">เลขที่เอกสาร</span>
                <span class="font-semibold">{{ booking.docNo }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-500">ใบสั่งงาน (PO)</span>
                <span class="font-semibold">{{ booking.po || '-' }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-500">เลขที่ใบปล่อยรถ</span>
                <span class="font-semibold">{{ booking.releaseNo || '-' }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-500">วันที่ออกเอกสาร</span>
                <span class="font-semibold">{{ formatDate(booking.createdAt) }}</span>
              </div>
              <div v-if="booking.shipDate" class="flex justify-between gap-4">
                <span class="text-gray-500">วันที่ขนส่ง</span>
                <span class="font-semibold">{{ formatDate(booking.shipDate) }}</span>
              </div>
              <div v-if="booking.reference" class="flex justify-between gap-4">
                <span class="text-gray-500">เลขที่อ้างอิง</span>
                <span class="font-semibold text-right max-w-[60%] truncate">{{ booking.reference }}</span>
              </div>
            </div>
          </div>
        </div>

        <table class="w-full text-sm border border-gray-400 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-400 px-2 py-1 text-left w-8">#</th>
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
            <div v-if="discountTotal > 0" class="flex justify-between">
              <span class="text-gray-600">ส่วนลดรวม</span>
              <span>-{{ formatBaht(discountTotal) }}</span>
            </div>
            <div v-if="showVatRow" class="flex justify-between">
              <span class="text-gray-600">ภาษีมูลค่าเพิ่ม{{ booking.vatRate ? ` ${booking.vatRate}%` : '' }}</span>
              <span>{{ formatBaht(vatAmount) }}</span>
            </div>
            <div class="flex justify-between font-bold border-t border-black pt-1">
              <span>จำนวนเงินรวมทั้งสิ้น</span>
              <span>{{ formatBaht(grandTotal) }}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8 text-sm mt-16">
          <div>
            <div class="font-semibold mb-8">ในนาม {{ booking.customer }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้สั่งซื้อ / ผู้อนุมัติ</div>
              <div class="border-t border-gray-500 pt-2">วันที่</div>
            </div>
          </div>
          <div class="relative">
            <img
              v-if="documentSettingsStore.settings.company.stamp"
              :src="documentSettingsStore.settings.company.stamp"
              class="w-14 h-14 object-contain absolute right-6 -top-12 opacity-90"
            />
            <div class="font-semibold mb-8">ในนาม {{ documentSettingsStore.settings.company.name }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้เสนอราคา</div>
              <div class="border-t border-gray-500 pt-2">วันที่</div>
            </div>
          </div>
        </div>
      </div>

      <!-- เอกสารที่เกี่ยวข้อง -->
      <div v-if="relatedBatchId || relatedInvoice" class="flex flex-wrap gap-2 no-print">
        <button v-if="relatedBatchId" @click="router.push(`/billing?batch=${relatedBatchId}`)" class="btn-sm">
          <span class="material-symbols-rounded text-base">receipt_long</span>
          ดูรายการวางบิล
        </button>
        <button v-if="relatedInvoice" @click="router.push(`/documents/${relatedInvoice.id}`)" class="btn-sm">
          <span class="material-symbols-rounded text-base">description</span>
          ดูใบแจ้งหนี้
        </button>
      </div>

      <!-- ข้อมูลลูกค้า -->
      <div class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">ข้อมูลลูกค้า</h3>
        <div class="text-sm mb-4">
          <div class="font-bold text-text">{{ booking.customer }}</div>
          <div class="text-muted">{{ customer.address }}{{ customer.zipCode ? ' ' + customer.zipCode : '' }}</div>
          <div class="text-muted">เลขประจำตัวผู้เสียภาษี: {{ customer.taxId || '-' }}</div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div>
            <div class="text-muted text-xs">เลขที่เอกสาร</div>
            <div class="font-semibold text-text">{{ booking.docNo }}</div>
          </div>
          <div>
            <div class="text-muted text-xs">ใบสั่งงาน (PO)</div>
            <div class="font-semibold text-text">{{ booking.po || '-' }}</div>
          </div>
          <div>
            <div class="text-muted text-xs">เลขที่ใบปล่อยรถ</div>
            <div class="font-semibold text-text">{{ booking.releaseNo || '-' }}</div>
          </div>
          <div>
            <div class="text-muted text-xs">เลขที่อ้างอิง</div>
            <div class="font-semibold text-text">{{ booking.reference || '-' }}</div>
          </div>
          <div>
            <div class="text-muted text-xs">รายละเอียด</div>
            <div class="font-semibold text-text">{{ booking.description || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- ข้อมูลต้นทาง-ปลายทาง -->
      <div class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">ข้อมูลต้นทาง-ปลายทาง</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span class="text-muted">ต้นทาง:</span> {{ booking.origin || '-' }}</div>
          <div><span class="text-muted">เส้นทาง:</span> {{ booking.route || '-' }}</div>
          <div><span class="text-muted">เลขชิพเม้น:</span> {{ booking.shipmentNo || '-' }}</div>
        </div>
      </div>

      <!-- ข้อมูลรถ-คนขับ -->
      <div class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">ข้อมูลรถ-คนขับ</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span class="text-muted">ทะเบียนรถ:</span> {{ booking.plate || '-' }}</div>
          <div><span class="text-muted">คนขับ:</span> {{ booking.driverName || '-' }}</div>
          <div v-if="booking.dispatchedAt"><span class="text-muted">วันที่จ่ายงาน:</span> {{ formatDate(booking.dispatchedAt) }}</div>
          <div v-if="booking.transitStartedAt"><span class="text-muted">วันที่เริ่มขนส่ง:</span> {{ formatDate(booking.transitStartedAt) }}</div>
          <div v-if="booking.completedAt"><span class="text-muted">วันที่ส่งของสำเร็จ:</span> {{ formatDate(booking.completedAt) }}</div>
          <div v-if="booking.odometerBefore !== undefined"><span class="text-muted">เลขไมล์เริ่มต้น:</span> {{ booking.odometerBefore }} กม.</div>
          <div v-if="booking.odometerAfter !== undefined"><span class="text-muted">เลขไมล์สิ้นสุด:</span> {{ booking.odometerAfter }} กม.</div>
        </div>
        <div v-if="mileageSummary" class="border-t border-border mt-3 pt-3">
          <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">สรุประยะทาง/น้ำมัน</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-surface-2 rounded-lg p-3 border border-border">
            <div>ระยะทางเที่ยวนี้: <span class="font-semibold text-text">{{ mileageSummary.distanceKm }} กม.</span></div>
            <div>สะสม: <span class="font-semibold text-text">{{ mileageSummary.cumulativeKm }} กม.</span></div>
            <div>เฉลี่ย: <span class="font-semibold text-text">{{ mileageSummary.avgKmPerLiter ?? '-' }} กม./ลิตร</span></div>
            <div>น้ำมันที่กำหนด: <span class="font-semibold text-text">{{ mileageSummary.standardFuelLiters ?? '-' }} ล.</span></div>
            <div class="sm:col-span-2">
              ชดเชยน้ำมัน:
              <span :class="['font-semibold', (mileageSummary.fuelCompensation ?? 0) >= 0 ? 'text-green-700' : 'text-red-700']">
                {{ mileageSummary.fuelCompensation !== null ? formatBaht(mileageSummary.fuelCompensation) : '-' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- รายการขนส่ง -->
      <div v-if="booking.items.length" class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">รายการขนส่ง</h3>
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
            <div v-if="item.extraProducts && item.extraProducts.length">
              <span class="text-muted">สินค้าอื่น:</span>
              {{ item.extraProducts.map((ep) => `${ep.product} ${ep.qty} ${ep.unit}`).join(', ') }}
            </div>
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

      <!-- ราคา/ค่าใช้จ่าย -->
      <div class="card-lg no-print space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-text">ราคา/ค่าใช้จ่าย</h3>
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
        <div v-if="!isEditing" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">ค่าเที่ยว</div>
            <div class="font-bold text-text">{{ formatBaht(booking.tripFee) }}</div>
          </div>
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">ราคาที่ตกลง</div>
            <div class="font-bold text-text">{{ formatBaht(booking.agreedPrice) }}</div>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว</label>
            <input v-model.number="priceForm.tripFee" type="number" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ราคาที่ตกลง</label>
            <input v-model.number="priceForm.agreedPrice" type="number" class="input-field w-full" />
          </div>
          <div class="sm:col-span-2 flex justify-end gap-2">
            <button @click="isEditing = false" class="btn-secondary">ยกเลิก</button>
            <button @click="savePrice" class="btn-sm text-primary">
              <span class="material-symbols-rounded text-base">save</span>
              บันทึกราคา
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">น้ำมัน</div>
            <div class="font-bold text-text">{{ booking.fuelLiters || 0 }} ล. x {{ formatBaht(booking.fuelRate) }}</div>
          </div>
          <div class="bg-surface-2 rounded-lg p-3">
            <div class="text-xs text-muted mb-1">เบี้ยเลี้ยง</div>
            <div class="font-bold text-text">{{ formatBaht(booking.allowance) }}</div>
          </div>
          <div v-if="booking.finalAllowance !== undefined" class="bg-primary text-white rounded-lg p-3 sm:col-span-2">
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
      <div v-if="booking.podImage" class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">รูปหลักฐานการส่งมอบสินค้า (POD)</h3>
        <img :src="booking.podImage" class="w-full max-h-64 object-contain rounded-lg border border-border" />
      </div>

      <!-- หมายเหตุ -->
      <div class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">หมายเหตุ</h3>
        <div class="text-sm text-text">{{ booking.note || '-' }}</div>
      </div>

      <!-- ประวัติ -->
      <div class="card-lg no-print">
        <h3 class="font-semibold text-text mb-3">ประวัติ</h3>
        <EntityTimeline :booking-id="booking.id" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { bahtText } from '@/utils/companyInfo'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import { computeRowDiscountBaht, computeRowAmount, computeRowVat } from '@/utils/documentTotals'
import EntityTimeline from '@/components/shared/EntityTimeline.vue'
import type { Booking } from '@/types'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()

const isAdmin = computed(() => authStore.role === 'ADMIN')

const booking = computed(() => bookingStore.bookings.find((b) => b.id === route.params.bookingId))
/** งาน MULTI_DESTINATION = แต่ละรายการมีค่าเที่ยวเป็นของตัวเอง — แก้ไขราคาต้องทำผ่านหน้าแก้ไขงานเท่านั้น ไม่ใช่หน้านี้ */
const isMulti = computed(() => (booking.value?.pricingMode ?? 'SINGLE_DESTINATION') === 'MULTI_DESTINATION')
const customer = computed(() => customerStore.lookupCustomer(booking.value?.customer || ''))
const relatedBatchId = computed(() => booking.value?.batchId)
const relatedInvoice = computed(() => bookingStore.documents.find((d) => booking.value && d.bookingIds.includes(booking.value.id)))

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

/** แถวสังเคราะห์ 1 แถวป้อนเข้า documentTotals.ts engine เดียวกับที่ BookingCreateView.vue ใช้ — ไม่เขียนสูตรคำนวณใหม่
 *  ใช้ discountMode/discountPercent/discountAmount/vatRate ของงานนี้เอง แทนค่าคงที่ระดับระบบเหมือนเดิม */
const pricingRow = computed(() => ({
  qty: 1,
  unitPrice: subtotalAmount.value,
  discountMode: booking.value?.discountMode,
  discountPercent: booking.value?.discountPercent,
  discountAmount: booking.value?.discountAmount,
  vatRate: booking.value?.vatRate,
}))
const discountTotal = computed(() => computeRowDiscountBaht(pricingRow.value))
const afterDiscount = computed(() => computeRowAmount(pricingRow.value))
const vatAmount = computed(() => (showVatRow.value ? computeRowVat(pricingRow.value) : 0))
const grandTotal = computed(() => afterDiscount.value + vatAmount.value)

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

<style scoped>
.corner-flag {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 56px 56px 0;
  border-color: transparent var(--primary) transparent transparent;
}

.doc-meta-box {
  @apply border border-gray-300 rounded-lg p-3 space-y-1;
}
</style>
