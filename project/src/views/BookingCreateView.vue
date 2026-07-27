<template>
  <div class="space-y-6 max-w-5xl mx-auto pb-10">
    <div class="flex items-center gap-3">
      <button @click="goBack" class="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
        <span class="material-symbols-rounded">arrow_back</span>
      </button>
      <div>
        <div class="font-bold text-text text-lg">สร้างงานขนส่งใหม่ ({{ isCements ? 'Fleet Cements' : 'Fleet Ceramics' }})</div>
        <div class="text-xs text-muted">เลขที่เอกสารจะออกให้อัตโนมัติ 1 เลขต่องาน (เพิ่มปลายทาง/สินค้าได้หลายรายการในงานเดียวกัน)</div>
      </div>
    </div>

    <!-- ข้อมูลทั่วไปของงาน -->
    <div class="card-lg">
      <h3 class="font-semibold text-text mb-3">ข้อมูลเอกสาร</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เลขที่ใบปล่อยรถ</label>
          <div class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-muted font-medium">{{ nextReleaseNoPreview }} (อัตโนมัติ)</div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">วันที่สร้างงาน</label>
          <input v-model="header.jobDate" type="date" class="input-field w-full" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-muted mb-1">ชื่อลูกค้า</label>
          <input v-model="header.customer" list="customerNameOptions" placeholder="ชื่อลูกค้า (พิมพ์ใหม่ได้ หรือเลือกจากสมุดรายชื่อ)" class="input-field w-full" />
          <datalist id="customerNameOptions">
            <option v-for="c in customerStore.customers" :key="c.name" :value="c.name" />
          </datalist>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ใบสั่งงาน (PO)</label>
          <input v-model="header.po" placeholder="เลขที่ PO (ระบบแนะนำให้เมื่อเลือกลูกค้า)" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">วันที่ขนส่ง</label>
          <input v-model="header.shipDate" type="date" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ <span class="font-normal text-[10px]">(กรอกทีหลังได้)</span></label>
          <input v-model="header.plate" list="headerVehicleOptions" placeholder="เช่น 82-4417 กรุงเทพ" class="input-field w-full" />
          <datalist id="headerVehicleOptions">
            <option v-for="v in vehicleOptions" :key="v" :value="v" />
          </datalist>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">คนขับ <span class="font-normal text-[10px]">(กรอกทีหลังได้)</span></label>
          <select v-model="header.driverName" class="input-field w-full">
            <option value="">เลือกคนขับ...</option>
            <option v-for="name in driverOptions" :key="name" :value="name">{{ driverOptionLabel(name) }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">วันที่กลับ <span class="font-normal text-[10px]">(แก้ไขทีหลังได้)</span></label>
          <input v-model="header.returnDate" type="date" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้น</label>
          <input v-model="header.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เส้นทาง</label>
          <input v-model="header.route" placeholder="เช่น กรุงเทพ-นครสวรรค์-เชียงใหม่" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
          <input v-model="header.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-muted mb-1">
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
          <label class="block text-xs font-semibold text-muted mb-1">
            ค่าเที่ยว (บาท)
            <span class="font-normal text-[10px]">{{ header.pricingMode === 'MULTI_DESTINATION' ? '(รวมจากรายการด้านล่าง)' : '(รวมทั้งเที่ยว)' }}</span>
          </label>
          <input v-if="header.pricingMode !== 'MULTI_DESTINATION'" v-model.number="header.tripFee" type="number" placeholder="0" class="input-field w-full" />
          <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(multiTripFeeTotal) }} (อัตโนมัติ)</div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">
            ราคาที่ตกลงกับลูกค้า (บาท)
            <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยว)</span>
          </label>
          <input v-model.number="header.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
          <input v-if="isCements" v-model.number="header.allowance" type="number" placeholder="0" class="input-field w-full" />
          <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(headerCalculatedAllowance) }} (อัตโนมัติ)</div>
        </div>
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
      <div v-else class="overflow-x-auto border border-border rounded-lg">
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
                {{ li.siteName }} <span class="text-muted">({{ li.province }} / {{ li.district }})</span>
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

    <div class="flex justify-end gap-3">
      <button @click="goBack" class="btn-secondary">ยกเลิก</button>
      <button @click="saveAllItems" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
        <span class="material-symbols-rounded">save</span>
        บันทึกงาน (1 เที่ยว, {{ lineItems.length }} รายการ)
      </button>
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
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDriversStore } from '@/stores/drivers'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import type { Booking, BookingCategory, BookingStatus, JobItem, PricingMode } from '@/types'
import { parseGpsInput } from '@/utils/gps'
import JobItemEditorModal, { type JobItemDraft } from '@/components/booking/JobItemEditorModal.vue'

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const bookingStore = useBookingStore()
const driversStore = useDriversStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const fixedCustomer = bookingStore.fixedCustomer

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))
const vehicleOptions = computed(() => driversStore.drivers.map((d) => d.vehicle).filter(Boolean))
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

const defaultHeader = () => ({
  po: '',
  shipDate: new Date().toISOString().slice(0, 10),
  jobDate: new Date().toISOString().slice(0, 10),
  returnDate: '',
  customer: isCements.value ? '' : fixedCustomer,
  plate: '',
  driverName: '',
  shipmentNo: '',
  route: '',
  origin: '',
  tripFee: 0,
  agreedPrice: 0,
  allowance: 0,
  pricingMode: 'SINGLE_DESTINATION' as PricingMode,
})
const header = ref(defaultHeader())

const lineItems = ref<JobItem[]>([])

/** รวมลิตรน้ำมันมาตรฐานของงานนี้ ตาม pricingMode (SINGLE_DESTINATION คิดจากรายการหลักเพียงครั้งเดียว, MULTI_DESTINATION รวมทุกรายการ) */
const computedFuel = computed(() => fuelRateStore.standardFuelLiters(lineItems.value, header.value.pricingMode))

const headerCalculatedAllowance = computed(() => {
  const fee = header.value.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal.value : header.value.tripFee || 0
  return Math.round(fee * 0.99 * 0.62 - computedFuel.value * fuelRateStore.settings.todayPricePerLiter)
})

/** รวมค่าเที่ยวจากทุกรายการ (tripFee * tripCount) — ใช้เฉพาะงาน MULTI_DESTINATION เป็น booking.tripFee โดยอัตโนมัติ */
const multiTripFeeTotal = computed(() => lineItems.value.reduce((sum, i) => sum + (i.tripFee || 0) * (i.tripCount || 1), 0))

const destinationSummary = computed(() => {
  if (!lineItems.value.length) return '-'
  if (header.value.pricingMode === 'SINGLE_DESTINATION') return lineItems.value[0].siteName
  const names = [...new Set(lineItems.value.map((i) => i.siteName))]
  return names.length > 1 ? `${names[0]} +${names.length - 1} ที่อื่น` : names[0]
})

// กรอกช่องคนขับ หรือทะเบียนรถ ให้ดึงข้อมูลคู่กันแบบเดียวกับหน้าส่งงาน
watch(
  () => header.value.driverName,
  (name) => {
    if (!name) return
    const vehicle = driversStore.findVehicleByDriverName(name)
    if (vehicle) header.value.plate = vehicle
  }
)
watch(
  () => header.value.plate,
  (plate) => {
    if (!plate) return
    const driver = driversStore.findDriverByVehicle(plate)
    if (driver) header.value.driverName = `${driver.firstName} ${driver.lastName}`
  }
)

// เลือกลูกค้าที่มีรหัสผู้ติดต่อในสมุดรายชื่อ และยังไม่ได้กรอกเลข PO เอง -> แนะนำเลข PO ให้อัตโนมัติ
watch(
  () => header.value.customer,
  (name) => {
    if (!name || header.value.po) return
    const now = new Date()
    const todaysJobCount = bookingStore.bookings.filter((b) => {
      if (b.customer !== name) return false
      const d = new Date(b.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    }).length
    const suggestion = customerStore.suggestPoNumber(name, todaysJobCount)
    if (suggestion) header.value.po = suggestion
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

const saveAllItems = () => {
  if (!canSave.value) return
  const shipDate = header.value.shipDate ? new Date(header.value.shipDate) : undefined
  const returnDate = header.value.returnDate ? new Date(header.value.returnDate) : undefined
  const createdAt = header.value.jobDate ? new Date(header.value.jobDate) : undefined
  const resolvedTripFee = header.value.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal.value : header.value.tripFee
  bookingStore.addBooking({
    category: props.fleet,
    docNo: bookingStore.nextDocNo(props.fleet),
    releaseNo: bookingStore.nextReleaseNo(),
    po: header.value.po || undefined,
    shipDate,
    returnDate,
    createdAt,
    shipmentNo: header.value.shipmentNo || undefined,
    route: header.value.route || undefined,
    origin: header.value.origin || undefined,
    customer: header.value.customer,
    items: lineItems.value,
    allowance: isCements.value ? header.value.allowance || 0 : headerCalculatedAllowance.value,
    tripFee: resolvedTripFee,
    agreedPrice: header.value.agreedPrice || resolvedTripFee,
    pricingMode: header.value.pricingMode,
    fuelLiters: computedFuel.value,
    fuelRate: fuelRateStore.settings.todayPricePerLiter,
    plate: header.value.plate || '',
    driverName: header.value.driverName || undefined,
  })
  goBack()
}
</script>
