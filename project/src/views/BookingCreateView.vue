<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-end gap-3">
        <div>
          <label class="field-label">เลขที่ใบปล่อยรถ</label>
          <div class="flex items-center h-9 px-2 rounded-lg bg-surface-2 text-sm text-muted font-mono">{{ nextReleaseNoPreview }}</div>
        </div>
        <div>
          <label class="field-label">วันที่สร้างงาน</label>
          <input v-model="header.jobDate" type="date" class="input-field h-9 px-2 text-sm" />
        </div>
        <div class="text-xs text-muted pb-2">{{ isCements ? 'Fleet Cements' : 'Fleet Ceramics' }}</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="goBack" class="btn-secondary">ยกเลิก</button>
        <button @click="saveAllItems" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึกงาน ({{ lineItems.length }} รายการ)
        </button>
      </div>
    </div>

    <!-- ข้อมูลทั่วไปของงาน -->
    <div class="card-lg space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-3">
          <div>
            <label class="field-label">ชื่อลูกค้า</label>
            <input v-model="header.customer" list="customerNameOptions" placeholder="ชื่อลูกค้า (พิมพ์ใหม่ได้ หรือเลือกจากสมุดรายชื่อ)" class="input-field w-full" />
            <datalist id="customerNameOptions">
              <option v-for="c in customerStore.customers" :key="c.name" :value="c.name" />
            </datalist>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="field-label">ใบสั่งงาน (PO)</label>
              <input v-model="header.po" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">วันที่ขนส่ง</label>
              <input v-model="header.shipDate" type="date" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">ทะเบียนรถ <span class="font-normal text-[10px]">(กรอกทีหลังได้)</span></label>
              <input v-model="header.plate" list="headerVehicleOptions" placeholder="เช่น 82-4417 กรุงเทพ" class="input-field w-full" />
              <datalist id="headerVehicleOptions">
                <option v-for="v in vehicleOptions" :key="v" :value="v" />
              </datalist>
            </div>
            <div>
              <label class="field-label">คนขับ <span class="font-normal text-[10px]">(กรอกทีหลังได้)</span></label>
              <select v-model="header.driverName" class="input-field w-full">
                <option value="">เลือกคนขับ...</option>
                <option v-for="name in driverOptions" :key="name" :value="name">{{ driverOptionLabel(name) }}</option>
              </select>
            </div>
            <div>
              <label class="field-label">วันที่กลับ <span class="font-normal text-[10px]">(แก้ไขทีหลังได้)</span></label>
              <input v-model="header.returnDate" type="date" class="input-field w-full" />
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex justify-end">
            <DocumentActionBar :disabled="!canSave" @print="printAction" @download="toolbarNotReady" @share="toolbarNotReady" @envelope="toolbarNotReady" @history="toolbarNotReady" @settings="toolbarNotReady" />
          </div>
          <div>
            <label class="field-label">
              รูปแบบคิดราคา
              <span class="font-normal text-[10px]">(เลือกก่อนเพิ่มรายการสินค้า)</span>
            </label>
            <div class="flex gap-2 flex-wrap">
              <button
                type="button"
                @click="header.pricingMode = 'SINGLE_DESTINATION'"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                  header.pricingMode === 'SINGLE_DESTINATION' ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                ]"
              >
                รวมทั้งเที่ยว (ปลายทางเดียว)
              </button>
              <button
                type="button"
                @click="header.pricingMode = 'MULTI_DESTINATION'"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                  header.pricingMode === 'MULTI_DESTINATION' ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                ]"
              >
                แยกค่าเที่ยวตามปลายทาง
              </button>
            </div>
          </div>
          <div>
            <label class="field-label">
              ค่าเที่ยว (บาท)
              <span class="font-normal text-[10px]">{{ header.pricingMode === 'MULTI_DESTINATION' ? '(รวมจากรายการด้านล่าง)' : '(รวมทั้งเที่ยว)' }}</span>
            </label>
            <input v-if="header.pricingMode !== 'MULTI_DESTINATION'" v-model.number="header.tripFee" type="number" placeholder="0" class="input-field w-full" />
            <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(multiTripFeeTotal) }} (อัตโนมัติ)</div>
          </div>
          <div>
            <label class="field-label">
              ราคาที่ตกลงกับลูกค้า (บาท)
              <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยว)</span>
            </label>
            <input v-model.number="header.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
          </div>
          <div>
            <label class="field-label">ส่วนลด</label>
            <select v-model="header.discountMode" class="input-field w-full mb-1 text-xs">
              <option v-for="opt in discountModeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input v-if="header.discountMode !== 'fixed'" v-model.number="header.discountPercent" type="number" min="0" max="100" class="input-field w-full" />
            <input v-else v-model.number="header.discountAmount" type="number" min="0" class="input-field w-full" />
          </div>
          <div>
            <label class="field-label">อัตราภาษีมูลค่าเพิ่ม (%)</label>
            <input v-model.number="header.vatRate" type="number" min="0" max="100" class="input-field w-full" />
          </div>
          <div>
            <label class="field-label">เบี้ยเลี้ยงคนขับ</label>
            <input v-if="isCements" v-model.number="header.allowance" type="number" placeholder="0" class="input-field w-full" />
            <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(headerCalculatedAllowance) }} (อัตโนมัติ)</div>
          </div>
        </div>
      </div>

      <!-- เลขชิพเม้น / เส้นทาง / ต้นทาง / เลขที่อ้างอิง / รายละเอียด -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-border">
        <div>
          <label class="field-label">เลขชิพเม้น</label>
          <input v-model="header.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">เส้นทาง</label>
          <input v-model="header.route" placeholder="เช่น กรุงเทพ-นครสวรรค์-เชียงใหม่" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">ต้นทาง</label>
          <input v-model="header.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">เลขที่อ้างอิง</label>
          <input v-model="header.reference" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">รายละเอียด</label>
          <input v-model="header.description" class="input-field w-full" />
        </div>
      </div>

      <div>
        <label class="field-label">หมายเหตุ</label>
        <textarea v-model="header.note" rows="3" class="input-field w-full" />
      </div>
    </div>

    <!-- รายการขนส่ง -->
    <div class="card-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-text">รายการขนส่ง ({{ lineItems.length }} รายการ)</h3>
        <button @click="openAddItem" class="btn-secondary">
          <span class="material-symbols-rounded text-base">add</span>
          เพิ่มรายการ
        </button>
      </div>
      <div v-if="lineItems.length === 0" class="border border-border rounded-lg px-4 py-6 text-center text-muted text-sm">
        ยังไม่มีรายการ กด "เพิ่มรายการ" เพื่อเริ่มกรอกสินค้า/ปลายทาง
      </div>
      <template v-else>
        <div v-if="hasIncompleteDestination" class="text-xs text-amber-600 flex items-center gap-1 mb-2">
          <span class="material-symbols-rounded text-sm">info</span>
          เติมสินค้า/จำนวนจากใบเสนอราคาให้แล้ว แต่ยังไม่มีปลายทาง — กด "แก้ไข" ที่แต่ละรายการเพื่อกรอกสถานที่ส่งสินค้า/จังหวัด/อำเภอก่อนบันทึกงาน
        </div>
        <div class="overflow-x-auto border border-border rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-3 py-2 font-semibold text-muted">สินค้า</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">จำนวน</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ปลายทาง</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ข้อมูลติดต่อ</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">น้ำมันมาตรฐาน</th>
                <template v-if="header.pricingMode === 'MULTI_DESTINATION'">
                  <th class="text-right px-3 py-2 font-semibold text-muted">ค่าเที่ยว/เที่ยว</th>
                  <th class="text-right px-3 py-2 font-semibold text-muted">รวม</th>
                </template>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(li, idx) in lineItems" :key="li.id" class="border-b border-border last:border-0">
                <td class="px-3 py-2 text-text">{{ li.product }} <span v-if="li.jobType" class="text-muted">({{ li.jobType }})</span></td>
                <td class="px-3 py-2 text-right text-text">{{ li.qty }} {{ li.unit }}</td>
                <td class="px-3 py-2 text-text">
                  <span v-if="li.siteName">
                    {{ li.siteName }} <span class="text-muted">({{ li.province }} / {{ li.district }})</span>
                  </span>
                  <span v-else class="text-amber-600 text-xs">ยังไม่ได้กรอกปลายทาง</span>
                  <span v-if="idx === 0 && header.pricingMode === 'SINGLE_DESTINATION'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">รายการหลัก</span>
                </td>
                <td class="px-3 py-2 text-muted">{{ li.siteContactName || '-' }} {{ li.sitePhone ? `(${li.sitePhone})` : '' }}</td>
                <td class="px-3 py-2 text-right text-muted">{{ fuelRateStore.findRate(li.province, li.district)?.liters ?? '-' }}</td>
                <template v-if="header.pricingMode === 'MULTI_DESTINATION'">
                  <td class="px-3 py-2 text-right text-text">{{ formatBaht(li.tripFee || 0) }} x {{ li.tripCount || 1 }}</td>
                  <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht((li.tripFee || 0) * (li.tripCount || 1)) }}</td>
                </template>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button @click="openEditItem(idx)" class="text-muted hover:text-text mr-2">
                    <span class="material-symbols-rounded text-base">edit</span>
                  </button>
                  <button @click="removeLineItem(idx)" class="text-red-500 hover:text-red-700">
                    <span class="material-symbols-rounded text-base">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="header.pricingMode === 'MULTI_DESTINATION' && lineItems.length">
              <tr class="bg-surface-2 font-semibold text-text">
                <td colspan="6" class="px-3 py-2 text-right">รวมค่าเที่ยวทั้งงาน</td>
                <td class="px-3 py-2 text-right">{{ formatBaht(multiTripFeeTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </div>

    <!-- สรุปงาน -->
    <div class="card-lg">
      <h3 class="font-semibold text-text mb-3">สรุปงาน</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-muted text-xs">จำนวนรายการ</div>
          <div class="font-semibold text-text">{{ lineItems.length }} รายการ</div>
        </div>
        <div>
          <div class="text-muted text-xs">ปลายทาง</div>
          <div class="font-semibold text-text">{{ destinationSummary }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">น้ำมันมาตรฐานรวม</div>
          <div class="font-semibold text-text">{{ computedFuel }} ล.</div>
        </div>
        <div>
          <div class="text-muted text-xs">ค่าเที่ยวรวม</div>
          <div class="font-semibold text-text">{{ formatBaht(header.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal : header.tripFee) }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">ราคาที่ตกลงกับลูกค้า</div>
          <div class="font-semibold text-text">{{ formatBaht(header.agreedPrice || (header.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal : header.tripFee)) }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">เบี้ยเลี้ยงคนขับ</div>
          <div class="font-semibold text-text">{{ formatBaht(isCements ? header.allowance || 0 : headerCalculatedAllowance) }}</div>
        </div>
      </div>
    </div>

    <!-- สรุปยอดเอกสาร -->
    <div class="card-lg">
      <h3 class="font-semibold text-text mb-3">สรุปยอดเอกสาร</h3>
      <div class="bg-surface-2 rounded-xl p-4 space-y-1.5 text-sm max-w-sm ml-auto">
        <div class="flex justify-between">
          <span class="text-muted">รวมเป็นเงิน</span>
          <span>{{ formatBaht(docSubtotal) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">ส่วนลดรวม</span>
          <span>{{ formatBaht(docDiscountTotal) }}</span>
        </div>
        <div class="flex justify-between font-semibold border-t border-border pt-1.5">
          <span>ราคาหลังหักส่วนลด</span>
          <span>{{ formatBaht(docAfterDiscount) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">ภาษีมูลค่าเพิ่ม</span>
          <span>{{ formatBaht(docVatTotal) }}</span>
        </div>
        <div class="flex justify-between font-bold text-primary border-t border-border pt-1.5">
          <span>จำนวนเงินรวมทั้งสิ้น</span>
          <span>{{ formatBaht(docGrandTotal) }}</span>
        </div>
      </div>
    </div>

    <JobItemEditorModal
      :open="itemEditorOpen"
      :item="editingIndex !== null ? lineItems[editingIndex] : null"
      :pricing-mode="header.pricingMode"
      :locked-destination="lockedDestination"
      :product-options="productOptionsForFleet"
      :is-cements="isCements"
      :customer-name="header.customer"
      :other-items="editingIndex !== null ? lineItems.filter((_, i) => i !== editingIndex) : lineItems"
      @save="onItemSave"
      @close="closeItemEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentPrefillStore } from '@/stores/documentPrefill'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import type { Booking, BookingCategory, BookingStatus, JobItem, PricingMode } from '@/types'
import { parseGpsInput } from '@/utils/gps'
import JobItemEditorModal, { type JobItemDraft } from '@/components/booking/JobItemEditorModal.vue'
import DocumentActionBar from '@/components/shared/DocumentActionBar.vue'
import { computeRowAmount, computeRowVat, computeRowDiscountBaht } from '@/utils/documentTotals'

const props = defineProps<{ fleet: BookingCategory }>()

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentPrefillStore = useDocumentPrefillStore()
const documentSettingsStore = useDocumentSettingsStore()
const fixedCustomer = bookingStore.fixedCustomer

const discountModeOptions = [
  { value: 'percent', label: '%' },
  { value: 'fixed', label: 'บาท' },
]

/** หาคนขับจากชื่อเต็ม รองรับทั้งแบบมีคำนำหน้าและไม่มี (เดิมเคยอยู่ใน driversStore.findDriverByVehicle) */
const findDriverByName = (name: string) => driversStore.drivers.find((d) => driversStore.fullName(d) === name || `${d.firstName} ${d.lastName}` === name)

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))
const vehicleOptions = computed(() => vehiclesStore.vehicles.map((v) => vehiclesStore.fullPlate(v)))
const nextReleaseNoPreview = computed(() => bookingStore.nextReleaseNo())

// --- ป้ายกำกับคนขับใน dropdown: บอกว่าว่างหรือกำลังวิ่งเที่ยวที่เท่าไหร่ (ซ้ำกับ BookingView.vue เพราะฟอร์มสร้างงานแยกไฟล์แล้ว) ---
const driverOptions = computed(() => driversStore.drivers.filter((d) => d.employmentStatus === 'active').map((d) => `${d.firstName} ${d.lastName}`))
const ACTIVE_STATUSES: BookingStatus[] = ['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'DELIVERING']
const isSameCalendarDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const bookingDayKey = (b: Booking) => new Date(b.shipDate || b.createdAt)
const driverBookingsForDay = (driverName: string, refDate: Date) =>
  bookingStore.bookings
    .filter((b) => b.driverName === driverName && isSameCalendarDay(bookingDayKey(b), refDate))
    .sort((a, b) => new Date(a.dispatchedAt || a.createdAt).getTime() - new Date(b.dispatchedAt || b.createdAt).getTime())
const driverTripNumberForBooking = (booking: Booking) => {
  if (!booking.driverName) return 1
  const list = driverBookingsForDay(booking.driverName, bookingDayKey(booking))
  const idx = list.findIndex((b) => b.id === booking.id)
  return idx === -1 ? 1 : idx + 1
}
const activeBookingForDriver = (name: string) =>
  bookingStore.bookings
    .filter((b) => b.driverName === name && ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.dispatchedAt || b.createdAt).getTime() - new Date(a.dispatchedAt || a.createdAt).getTime())[0]
const driverOptionLabel = (name: string) => {
  const activeBooking = activeBookingForDriver(name)
  if (!activeBooking) return `${name} — ว่าง`
  const tripNo = driverTripNumberForBooking(activeBooking)
  return `${name} — กำลังวิ่งเที่ยวที่ ${tripNo} (${activeBooking.docNo})`
}

/**
 * รับ query params จากปุ่ม "สร้างใบสั่งงาน" (ทางลัดจากใบเสนอราคา) หรือ "สร้างใบสั่งสินค้า"/"สร้างใหม่"
 * (สะพานข้าม Sales → Operations) — ใบเสนอราคาไม่มีโครงสร้างข้อมูลตรงกับ JobItem (ไม่มีปลายทาง/จังหวัด/อำเภอ)
 * จึง sync ได้แค่ระดับหัวเอกสาร ส่วนรายการขนส่งจริงยังต้องให้ผู้ใช้กรอกเองผ่าน "เพิ่มรายการ" ตามปกติ
 */
const prefill = route.query
/** ทุกงานที่บันทึกสำเร็จ (ไม่ว่ามาจากช่องทางไหน) ต้องสร้างระเบียนใบสั่งสินค้าที่ผูกกับงานนี้อัตโนมัติเสมอ
 * ดูฟังก์ชัน createSalesOrderForBooking ใน salesDocuments.ts */
/** ถ้ามาจากใบเสนอราคา (ทั้งทางลัด "สร้างใบสั่งงาน" และ "สร้างใบสั่งสินค้า") ให้ผูกอ้างอิงกลับไปเพื่อดูย้อนหลังได้ */
const sourceQuotationId = typeof prefill.quotationId === 'string' ? prefill.quotationId : undefined
const defaultHeader = () => ({
  po: (prefill.po as string) || bookingStore.nextPoNo(),
  shipDate: (prefill.shipDate as string) || new Date().toISOString().slice(0, 10),
  jobDate: new Date().toISOString().slice(0, 10),
  returnDate: '',
  customer: (prefill.customer as string) || (isCements.value ? '' : fixedCustomer),
  plate: '',
  driverName: '',
  shipmentNo: '',
  route: (prefill.route as string) || '',
  origin: (prefill.origin as string) || '',
  reference: '',
  description: '',
  note: '',
  tripFee: prefill.amount ? Number(prefill.amount) : 0,
  agreedPrice: prefill.amount ? Number(prefill.amount) : 0,
  discountMode: 'percent' as 'percent' | 'fixed',
  discountPercent: 0,
  discountAmount: 0,
  vatRate: documentSettingsStore.settings.vatRate,
  allowance: 0,
  pricingMode: 'SINGLE_DESTINATION' as PricingMode,
})
const header = ref(defaultHeader())

/**
 * รายการในใบเสนอราคามีแค่ชื่อสินค้า+จำนวน ไม่มีปลายทาง/จังหวัด/อำเภอที่ JobItem ต้องใช้ จึงเติมให้ได้แค่บางส่วน
 * (สินค้า+จำนวน+หน่วย) ส่วนปลายทางเว้นว่างไว้ให้ผู้ใช้กดแก้ไขรายการเพื่อกรอกเองก่อนบันทึกงานจริง
 */
const quotationItemsPrefill = documentPrefillStore.consumePrefill(['QUOTATION'])
const lineItems = ref<JobItem[]>(
  quotationItemsPrefill && quotationItemsPrefill.sourceId === sourceQuotationId
    ? quotationItemsPrefill.items.map((item, idx) => ({
        id: `item${Date.now()}${idx}${Math.random().toString(36).slice(2, 4)}`,
        product: item.description,
        qty: item.qty,
        unit: item.unit,
        siteName: '',
        province: '',
        district: '',
      }))
    : []
)

const hasIncompleteDestination = computed(() => lineItems.value.some((i) => !i.siteName))

/** รวมลิตรน้ำมันมาตรฐานของงานนี้ ตาม pricingMode (SINGLE_DESTINATION คิดจากรายการหลักเพียงครั้งเดียว, MULTI_DESTINATION รวมทุกรายการ) */
const computedFuel = computed(() => fuelRateStore.standardFuelLiters(lineItems.value, header.value.pricingMode))

const headerCalculatedAllowance = computed(() => {
  const fee = header.value.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal.value : header.value.tripFee || 0
  return Math.round(fee * 0.99 * 0.62 - computedFuel.value * fuelRateStore.settings.todayPricePerLiter)
})

/** รวมค่าเที่ยวจากทุกรายการ (tripFee * tripCount) — ใช้เฉพาะงาน MULTI_DESTINATION เป็น booking.tripFee โดยอัตโนมัติ */
const multiTripFeeTotal = computed(() => lineItems.value.reduce((sum, i) => sum + (i.tripFee || 0) * (i.tripCount || 1), 0))

/** ค่าเที่ยวที่ใช้จริงตาม pricingMode — ใช้ทั้งเป็น input ให้ documentTotals engine และตอนบันทึกงาน (แทนที่จะคำนวณซ้ำใน saveAllItems) */
const resolvedTripFee = computed(() => (header.value.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal.value : header.value.tripFee))

/** แถวสังเคราะห์ 1 แถวสำหรับงานนี้ทั้งก้อน (qty=1) ป้อนเข้า documentTotals.ts engine เดียวกับเอกสารขาย — ไม่เขียนสูตรคำนวณใหม่ */
const pricingRow = computed(() => ({
  qty: 1,
  unitPrice: resolvedTripFee.value,
  discountMode: header.value.discountMode,
  discountPercent: header.value.discountPercent,
  discountAmount: header.value.discountAmount,
  vatRate: header.value.vatRate,
}))
const docSubtotal = computed(() => pricingRow.value.unitPrice)
const docDiscountTotal = computed(() => computeRowDiscountBaht(pricingRow.value))
const docAfterDiscount = computed(() => computeRowAmount(pricingRow.value))
const docVatTotal = computed(() => computeRowVat(pricingRow.value))
const docGrandTotal = computed(() => docAfterDiscount.value + docVatTotal.value)

const destinationSummary = computed(() => {
  if (!lineItems.value.length) return '-'
  if (header.value.pricingMode === 'SINGLE_DESTINATION') return lineItems.value[0].siteName
  const names = [...new Set(lineItems.value.map((i) => i.siteName))]
  return names.length > 1 ? `${names[0]} +${names.length - 1} ที่อื่น` : names[0]
})

// กรอกช่องคนขับ หรือทะเบียนรถ ให้ดึงข้อมูลคู่กันแบบเดียวกับหน้าส่งงาน โดยอ้างอิงความสัมพันธ์รถ-คนขับจาก vehiclesStore เสมอ
watch(
  () => header.value.driverName,
  (name) => {
    if (!name) return
    const driver = findDriverByName(name)
    if (!driver) return
    const vehicle = vehiclesStore.vehicleForDriver(driver.code)
    if (vehicle) header.value.plate = vehiclesStore.fullPlate(vehicle)
  }
)
watch(
  () => header.value.plate,
  (plateText) => {
    if (!plateText) return
    const vehicle = vehiclesStore.findByFullPlate(plateText)
    if (!vehicle?.driverCode) return
    const driver = driversStore.drivers.find((d) => d.code === vehicle.driverCode)
    if (driver) header.value.driverName = `${driver.firstName} ${driver.lastName}`
  }
)

// --- Item editor modal state ---
const itemEditorOpen = ref(false)
const editingIndex = ref<number | null>(null)

/** SINGLE_DESTINATION: รายการที่ 2 เป็นต้นไปต้องใช้ปลายทางเดียวกับรายการหลัก (รายการแรก) จึงล็อกฟิลด์ปลายทางไว้เสมอ ยกเว้นตอนแก้ไขรายการหลักเอง */
const lockedDestination = computed(() => {
  if (header.value.pricingMode !== 'SINGLE_DESTINATION') return null
  if (lineItems.value.length === 0) return null
  if (editingIndex.value === 0) return null
  const primary = lineItems.value[0]
  return {
    siteName: primary.siteName,
    province: primary.province,
    district: primary.district,
    gpsInput: primary.mapUrl || '',
    pickupOriginName: primary.pickupOriginName || '',
  }
})

const openAddItem = () => {
  editingIndex.value = null
  itemEditorOpen.value = true
}
const openEditItem = (idx: number) => {
  editingIndex.value = idx
  itemEditorOpen.value = true
}
const closeItemEditor = () => {
  itemEditorOpen.value = false
  editingIndex.value = null
}

const draftToItem = (draft: JobItemDraft, existingId?: string): JobItem => {
  const isMulti = header.value.pricingMode === 'MULTI_DESTINATION'
  const gps = parseGpsInput(draft.gpsInput)
  return {
    id: existingId || `item${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    siteName: draft.siteName,
    province: draft.province,
    district: draft.district,
    siteContactName: draft.siteContactName || undefined,
    sitePhone: draft.sitePhone || undefined,
    latitude: gps.latitude,
    longitude: gps.longitude,
    mapUrl: draft.gpsInput || undefined,
    pickupOriginName: draft.pickupOriginName || undefined,
    product: draft.product,
    qty: draft.qty,
    unit: draft.unit,
    jobType: isCements.value ? draft.jobType : undefined,
    tripFee: isMulti ? draft.tripFee : undefined,
    tripCount: isMulti ? draft.tripCount || 1 : undefined,
    extraProducts: draft.extraProducts.length ? draft.extraProducts : undefined,
  }
}

const onItemSave = (draft: JobItemDraft) => {
  const isSingle = header.value.pricingMode === 'SINGLE_DESTINATION'
  if (editingIndex.value === null) {
    const newItem = draftToItem(draft)
    if (isSingle && lineItems.value.length > 0) {
      const primary = lineItems.value[0]
      newItem.siteName = primary.siteName
      newItem.province = primary.province
      newItem.district = primary.district
      newItem.mapUrl = primary.mapUrl
      newItem.latitude = primary.latitude
      newItem.longitude = primary.longitude
      newItem.pickupOriginName = primary.pickupOriginName
    }
    lineItems.value.push(newItem)
  } else {
    const idx = editingIndex.value
    const updated = draftToItem(draft, lineItems.value[idx].id)
    lineItems.value[idx] = updated
    if (isSingle && idx === 0) {
      for (let i = 1; i < lineItems.value.length; i++) {
        lineItems.value[i] = {
          ...lineItems.value[i],
          siteName: updated.siteName,
          province: updated.province,
          district: updated.district,
          mapUrl: updated.mapUrl,
          latitude: updated.latitude,
          longitude: updated.longitude,
          pickupOriginName: updated.pickupOriginName,
        }
      }
    }
  }
  closeItemEditor()
}

const removeLineItem = (idx: number) => {
  lineItems.value.splice(idx, 1)
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const canSave = computed(() => {
  if (!header.value.customer || lineItems.value.length === 0) return false
  if (header.value.pricingMode === 'MULTI_DESTINATION') {
    return lineItems.value.every((i) => (i.tripFee || 0) > 0 && Number.isInteger(i.tripCount) && (i.tripCount || 0) >= 1)
  }
  return header.value.tripFee > 0
})

const goBack = () => router.push(`/booking/${props.fleet}`)

const printAction = () => window.print()
const toolbarNotReady = () => window.alert('ฟีเจอร์นี้ยังไม่พร้อมใช้งาน')

const saveAllItems = () => {
  if (!canSave.value) return
  const shipDate = header.value.shipDate ? new Date(header.value.shipDate) : undefined
  const returnDate = header.value.returnDate ? new Date(header.value.returnDate) : undefined
  const createdAt = header.value.jobDate ? new Date(header.value.jobDate) : undefined
  const newBooking = bookingStore.addBooking({
    category: props.fleet,
    docNo: bookingStore.nextDocNo(props.fleet),
    releaseNo: bookingStore.nextReleaseNo(),
    po: header.value.po || undefined,
    sourceDocumentId: sourceQuotationId,
    shipDate,
    returnDate,
    createdAt,
    shipmentNo: header.value.shipmentNo || undefined,
    route: header.value.route || undefined,
    origin: header.value.origin || undefined,
    reference: header.value.reference || undefined,
    description: header.value.description || undefined,
    note: header.value.note || undefined,
    customer: header.value.customer,
    items: lineItems.value,
    allowance: isCements.value ? header.value.allowance || 0 : headerCalculatedAllowance.value,
    tripFee: resolvedTripFee.value,
    agreedPrice: header.value.agreedPrice || resolvedTripFee.value,
    discountMode: header.value.discountMode,
    discountPercent: header.value.discountPercent || undefined,
    discountAmount: header.value.discountAmount || undefined,
    vatRate: header.value.vatRate || undefined,
    pricingMode: header.value.pricingMode,
    fuelLiters: computedFuel.value,
    fuelRate: fuelRateStore.settings.todayPricePerLiter,
    plate: header.value.plate || '',
    driverName: header.value.driverName || undefined,
  })
  // ทุกงานที่สร้าง (ไม่ว่าจะมาจากช่องทางไหน) ต้องมีระเบียนใบสั่งสินค้าคู่กันเสมอ ไม่ใช่แค่ตอนมาจากใบเสนอราคา/หน้าใบสั่งสินค้า
  const salesOrderDoc = salesDocumentsStore.createSalesOrderForBooking({
    bookingId: newBooking.id,
    customer: newBooking.customer,
    amount: resolvedTripFee.value,
    reference: newBooking.po,
    quotationId: sourceQuotationId,
    items: [
      {
        description: `${newBooking.docNo} · ${destinationSummary.value}`,
        qty: 1,
        unit: 'เที่ยว',
        unitPrice: resolvedTripFee.value,
        amount: resolvedTripFee.value,
        discountMode: header.value.discountMode,
        discountPercent: header.value.discountPercent || undefined,
        discountAmount: header.value.discountAmount || undefined,
        vatRate: header.value.vatRate || undefined,
      },
    ],
  })
  newBooking.sourceDocumentId = salesOrderDoc.id
  // ปรับคนขับประจำของรถให้ตรงกับที่เลือกไว้ในงานนี้ เพื่อให้ทุกหน้าที่ใช้รถเห็นคนขับล่าสุด
  if (header.value.plate && header.value.driverName) {
    const vehicle = vehiclesStore.findByFullPlate(header.value.plate)
    const driver = findDriverByName(header.value.driverName)
    if (vehicle && driver) vehiclesStore.assignDriver(vehicle.id, driver.code)
  }
  goBack()
}
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
}
</style>
