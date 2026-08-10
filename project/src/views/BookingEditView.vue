<template>
  <div v-if="!target" class="space-y-4 max-w-3xl mx-auto pt-10 text-center">
    <div class="text-text font-semibold">ไม่พบงานนี้</div>
    <button @click="goBack" class="btn-secondary mx-auto">กลับไปหน้ารายการงาน</button>
  </div>

  <div v-else class="space-y-6 max-w-5xl mx-auto pb-10">
    <div class="flex items-center gap-3">
      <button @click="goBack" class="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
        <span class="material-symbols-rounded">arrow_back</span>
      </button>
      <div>
        <div class="font-bold text-text text-lg">แก้ไขงาน {{ target.docNo }}</div>
        <div class="text-xs text-muted">แก้ไขได้ทุกสถานะงาน ไม่จำกัดสิทธิ์ ใช้ฟอร์มเดียวกับตอนสร้างงาน</div>
      </div>
    </div>

    <div class="card-lg">
      <h3 class="font-semibold text-text mb-3">ข้อมูลเอกสาร</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ใบสั่งงาน (PO)</label>
          <input v-model="editForm.po" placeholder="เลขที่ PO" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">วันที่ขนส่ง</label>
          <input v-model="editForm.shipDate" type="date" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">วันที่กลับ</label>
          <input v-model="editForm.returnDate" type="date" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้น</label>
          <input v-model="editForm.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เส้นทาง</label>
          <input v-model="editForm.route" placeholder="เช่น กรุงเทพ-นครสวรรค์-เชียงใหม่" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
          <input v-model="editForm.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
        </div>
        <div class="md:col-span-3">
          <label class="block text-xs font-semibold text-muted mb-1">
            รูปแบบคิดราคา
            <span class="font-normal text-[10px]">(เปลี่ยนโหมดต้องยืนยันก่อน)</span>
          </label>
          <div class="flex gap-2 flex-wrap">
            <button
              type="button"
              @click="requestPricingModeChange('SINGLE_DESTINATION')"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                editPricingMode === 'SINGLE_DESTINATION' ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
              ]"
            >
              รวมทั้งเที่ยว (ปลายทางเดียว)
            </button>
            <button
              type="button"
              @click="requestPricingModeChange('MULTI_DESTINATION')"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                editPricingMode === 'MULTI_DESTINATION' ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
              ]"
            >
              แยกค่าเที่ยวตามปลายทาง
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">
            ค่าเที่ยว (บาท)
            <span class="font-normal text-[10px]">{{ editPricingMode === 'MULTI_DESTINATION' ? '(รวมจากรายการด้านล่าง)' : '(รวมทั้งเที่ยว)' }}</span>
          </label>
          <input v-if="editPricingMode !== 'MULTI_DESTINATION'" v-model.number="editForm.tripFee" type="number" placeholder="0" class="input-field w-full" />
          <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(editMultiTripFeeTotal) }} (อัตโนมัติ)</div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">
            ราคาที่ตกลงกับลูกค้า (บาท)
            <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยว)</span>
          </label>
          <input v-model.number="editForm.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
          <input v-if="isCements" v-model.number="editForm.allowance" type="number" placeholder="0" class="input-field w-full" />
          <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(editCalculatedAllowance) }} (อัตโนมัติ)</div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">
            น้ำมัน (ลิตร)
            <span class="font-normal text-[10px]">(มาตรฐานตามปลายทาง: {{ standardFuelEstimate }} ล.)</span>
          </label>
          <input v-model.number="editForm.fuelLiters" type="number" placeholder="0" class="input-field w-full" :readonly="fuelLiterLocked" :class="fuelLiterLocked && 'bg-surface-2 cursor-not-allowed'" />
          <div v-if="fuelLiterLocked" class="text-[10px] text-amber-600 mt-1">ปลายทางนี้ยังไม่ได้ตั้งค่าน้ำมันไว้ล่วงหน้า ต้องให้ผู้จัดการเป็นผู้กรอกค่านี้</div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร)</label>
          <input v-model.number="editForm.fuelRate" type="number" placeholder="0" class="input-field w-full" />
        </div>
      </div>
    </div>

    <!-- รายการขนส่ง -->
    <div class="card-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-text">รายการขนส่ง ({{ editLineItems.length }} รายการ)</h3>
        <button @click="openAddItem" class="btn-secondary">
          <span class="material-symbols-rounded text-base">add</span>
          เพิ่มรายการ
        </button>
      </div>
      <div v-if="editLineItems.length === 0" class="border border-border rounded-lg px-4 py-6 text-center text-muted text-sm">
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
              <template v-if="editPricingMode === 'MULTI_DESTINATION'">
                <th class="text-right px-3 py-2 font-semibold text-muted">ค่าเที่ยว/เที่ยว</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">รวม</th>
              </template>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(li, idx) in editLineItems" :key="li.id" class="border-b border-border last:border-0">
              <td class="px-3 py-2 text-text">
                {{ li.product }} <span v-if="li.jobType" class="text-muted">({{ li.jobType }})</span>
                <div v-for="(ep, epIdx) in li.extraProducts || []" :key="epIdx" class="text-[11px] text-muted">
                  + สินค้าอื่น: {{ ep.product }} {{ ep.qty }} {{ ep.unit }}
                </div>
              </td>
              <td class="px-3 py-2 text-right text-text">{{ li.qty }} {{ li.unit }}</td>
              <td class="px-3 py-2 text-text">
                {{ li.siteName }} <span class="text-muted">({{ li.province }} / {{ li.district }})</span>
                <span v-if="idx === 0 && editPricingMode === 'SINGLE_DESTINATION'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">รายการหลัก</span>
              </td>
              <td class="px-3 py-2 text-muted">{{ li.siteContactName || '-' }} {{ li.sitePhone ? `(${li.sitePhone})` : '' }}</td>
              <td class="px-3 py-2 text-right text-muted">{{ fuelRateStore.findRate(li.province, li.district)?.liters ?? '-' }}</td>
              <template v-if="editPricingMode === 'MULTI_DESTINATION'">
                <td class="px-3 py-2 text-right text-text">{{ formatBaht(li.tripFee || 0) }} x {{ li.tripCount || 1 }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht((li.tripFee || 0) * (li.tripCount || 1)) }}</td>
              </template>
              <td class="px-3 py-2 text-right whitespace-nowrap">
                <button @click="openEditItem(idx)" class="text-muted hover:text-text mr-2">
                  <span class="material-symbols-rounded text-base">edit</span>
                </button>
                <button @click="removeEditLineItem(idx)" class="text-red-500 hover:text-red-700">
                  <span class="material-symbols-rounded text-base">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="editPricingMode === 'MULTI_DESTINATION' && editLineItems.length">
            <tr class="bg-surface-2 font-semibold text-text">
              <td colspan="6" class="px-3 py-2 text-right">รวมค่าเที่ยวทั้งงาน</td>
              <td class="px-3 py-2 text-right">{{ formatBaht(editMultiTripFeeTotal) }}</td>
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
          <div class="font-semibold text-text">{{ editLineItems.length }} รายการ</div>
        </div>
        <div>
          <div class="text-muted text-xs">ปลายทาง</div>
          <div class="font-semibold text-text">{{ destinationSummary }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">น้ำมันมาตรฐานรวม</div>
          <div class="font-semibold text-text">{{ standardFuelEstimate }} ล.</div>
        </div>
        <div>
          <div class="text-muted text-xs">ค่าเที่ยวรวม</div>
          <div class="font-semibold text-text">{{ formatBaht(editPricingMode === 'MULTI_DESTINATION' ? editMultiTripFeeTotal : editForm.tripFee) }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">ราคาที่ตกลงกับลูกค้า</div>
          <div class="font-semibold text-text">{{ formatBaht(editForm.agreedPrice || (editPricingMode === 'MULTI_DESTINATION' ? editMultiTripFeeTotal : editForm.tripFee)) }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">เบี้ยเลี้ยงคนขับ</div>
          <div class="font-semibold text-text">{{ formatBaht(editDisplayedAllowance) }}</div>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-3">
      <button @click="goBack" class="btn-secondary">ยกเลิก</button>
      <button @click="confirmEditBooking" :disabled="!canSaveEdit" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
        <span class="material-symbols-rounded text-base">save</span>
        บันทึก
      </button>
    </div>

    <JobItemEditorModal
      :open="itemEditorOpen"
      :item="editingIndex !== null ? editLineItems[editingIndex] : null"
      :pricing-mode="editPricingMode"
      :locked-destination="lockedDestination"
      :product-options="productOptionsForFleet"
      :is-cements="isCements"
      :customer-name="target.customer"
      :other-items="editingIndex !== null ? editLineItems.filter((_, i) => i !== editingIndex) : editLineItems"
      @save="onItemSave"
      @close="closeItemEditor"
    />

    <!-- Pricing Mode Change Confirmation -->
    <Teleport to="body" v-if="pricingModeChangeConfirm">
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-[60] flex items-center justify-center p-6 animate-fade">
        <div class="w-full max-w-md bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ยืนยันเปลี่ยนรูปแบบคิดราคา</div>
          </div>
          <div class="px-6 py-5 space-y-3 text-sm text-text">
            <template v-if="pricingModeChangeConfirm.to === 'MULTI_DESTINATION'">
              <div>
                เปลี่ยนเป็น <span class="font-semibold">แยกค่าเที่ยวตามปลายทาง</span> — ค่าเที่ยวเดิม
                <span class="font-semibold">{{ formatBaht(editForm.tripFee) }}</span>
                จะไม่ถูกแบ่งให้อัตโนมัติ คุณต้องกรอกค่าเที่ยว+จำนวนเที่ยวใหม่ให้ครบทุกรายการก่อนจึงจะบันทึกได้
              </div>
            </template>
            <template v-else>
              <div>
                เปลี่ยนเป็น <span class="font-semibold">รวมทั้งเที่ยว</span> — ระบบคำนวณผลรวมจากรายการปัจจุบันได้
                <span class="font-semibold">{{ formatBaht(pendingSingleTripFee) }}</span>
                ตรวจสอบ/แก้ไขตัวเลขนี้ก่อนยืนยัน ทุกรายการจะถูกปรับให้ใช้ปลายทางเดียวกับรายการหลักด้วย
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยวรวม (บาท)</label>
                <input v-model.number="pendingSingleTripFee" type="number" class="input-field w-full" />
              </div>
            </template>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="cancelPricingModeChange" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmPricingModeChange" class="btn-primary">ยืนยันเปลี่ยนโหมด</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useInventoryStore } from '@/stores/inventory'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useAuthStore } from '@/stores/auth'
import type { Booking, BookingCategory, JobItem, PricingMode } from '@/types'
import { parseGpsInput } from '@/utils/gps'
import JobItemEditorModal, { type JobItemDraft } from '@/components/booking/JobItemEditorModal.vue'

const props = defineProps<{ fleet: BookingCategory; id: string }>()

const router = useRouter()
const bookingStore = useBookingStore()
const inventoryStore = useInventoryStore()
const fuelRateStore = useFuelRateStore()
const authStore = useAuthStore()

/** ล็อกช่องน้ำมันถ้ามีปลายทางที่ยังไม่ได้ตั้งค่าน้ำมันไว้ล่วงหน้า — ต้องเป็นบัญชีที่มีสิทธิ์ผู้จัดการ (canOverrideFuelRate) เท่านั้นที่กรอกค่านอกเหนือจากที่ตั้งไว้ได้ */
const hasUnconfiguredDistrict = computed(() => editLineItems.value.some((li) => !fuelRateStore.findRate(li.province, li.district)))
const fuelLiterLocked = computed(() => hasUnconfiguredDistrict.value && !authStore.currentUser?.canOverrideFuelRate)

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))

const target = computed(() => bookingStore.bookings.find((b) => b.id === props.id) || null)

const toDateInput = (d?: Date) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const editForm = ref({
  po: '',
  shipDate: '',
  returnDate: '',
  shipmentNo: '',
  route: '',
  origin: '',
  tripFee: 0,
  agreedPrice: 0,
  allowance: 0,
  fuelLiters: 0,
  fuelRate: 0,
})
const editLineItems = ref<JobItem[]>([])
const editPricingMode = ref<PricingMode>('SINGLE_DESTINATION')

// --- Pricing mode change confirmation (ประกาศก่อน watch(target, ...) ด้านล่าง เพราะ immediate watcher เรียก callback ทันทีตอน setup) ---
const pricingModeChangeConfirm = ref<{ from: PricingMode; to: PricingMode } | null>(null)
const pendingSingleTripFee = ref(0)

watch(
  target,
  (booking) => {
    if (!booking) return
    editForm.value = {
      po: booking.po || '',
      shipDate: toDateInput(booking.shipDate),
      returnDate: toDateInput(booking.returnDate),
      shipmentNo: booking.shipmentNo || '',
      route: booking.route || '',
      origin: booking.origin || '',
      tripFee: booking.tripFee,
      agreedPrice: booking.agreedPrice,
      allowance: booking.allowance || 0,
      fuelLiters: booking.fuelLiters || 0,
      fuelRate: booking.fuelRate || 0,
    }
    editLineItems.value = booking.items.map((i) => ({ ...i }))
    editPricingMode.value = booking.pricingMode ?? 'SINGLE_DESTINATION'
    pricingModeChangeConfirm.value = null
  },
  { immediate: true }
)

/** รวมค่าเที่ยวจากทุกรายการในฟอร์มแก้ไข (tripFee * tripCount) — ใช้เฉพาะงาน MULTI_DESTINATION เป็น booking.tripFee โดยอัตโนมัติ */
const editMultiTripFeeTotal = computed(() => editLineItems.value.reduce((sum, i) => sum + (i.tripFee || 0) * (i.tripCount || 1), 0))

const editFuelCost = computed(() => (editForm.value.fuelLiters || 0) * (editForm.value.fuelRate || 0))
const editCalculatedAllowance = computed(() => {
  const fee = editPricingMode.value === 'MULTI_DESTINATION' ? editMultiTripFeeTotal.value : editForm.value.tripFee || 0
  return Math.round(fee * 0.99 * 0.62 - editFuelCost.value)
})
const editDisplayedAllowance = computed(() => (isCements.value ? editForm.value.allowance || 0 : editCalculatedAllowance.value))

/** น้ำมันมาตรฐานโดยประมาณตามปลายทางปัจจุบัน (อ้างอิงเท่านั้น ไม่ทับค่า fuelLiters จริงที่กรอกไว้ — ค่าจริงถูกล็อกไว้ตั้งแต่ตอนจัดรถแล้ว) */
const standardFuelEstimate = computed(() => fuelRateStore.standardFuelLiters(editLineItems.value, editPricingMode.value))

const destinationSummary = computed(() => {
  if (!editLineItems.value.length) return '-'
  if (editPricingMode.value === 'SINGLE_DESTINATION') return editLineItems.value[0].siteName
  const names = [...new Set(editLineItems.value.map((i) => i.siteName))]
  return names.length > 1 ? `${names[0]} +${names.length - 1} ที่อื่น` : names[0]
})

const requestPricingModeChange = (targetMode: PricingMode) => {
  if (targetMode === editPricingMode.value) return
  if (targetMode === 'SINGLE_DESTINATION') pendingSingleTripFee.value = editMultiTripFeeTotal.value
  pricingModeChangeConfirm.value = { from: editPricingMode.value, to: targetMode }
}

const cancelPricingModeChange = () => {
  pricingModeChangeConfirm.value = null
}

/**
 * ยืนยันเปลี่ยนโหมด: SINGLE->MULTI ล้างค่าเที่ยวรายการเป็นค่าว่าง (บังคับกรอกใหม่ทุกรายการ)
 * MULTI->SINGLE ใช้ยอดรวมที่ตรวจสอบแล้วเป็นค่าเที่ยวเดียว และบังคับให้ทุกรายการใช้ปลายทางเดียวกับรายการหลัก (รายการแรก)
 */
const confirmPricingModeChange = () => {
  if (!target.value || !pricingModeChangeConfirm.value) return
  const { to } = pricingModeChangeConfirm.value
  if (to === 'MULTI_DESTINATION') {
    editLineItems.value = editLineItems.value.map((i) => ({ ...i, tripFee: 0, tripCount: 1 }))
    bookingStore.switchPricingMode(target.value.id, 'MULTI_DESTINATION', editLineItems.value, editForm.value.tripFee)
  } else {
    const primary = editLineItems.value[0]
    editLineItems.value = editLineItems.value.map(({ tripFee, tripCount, ...rest }) =>
      primary
        ? {
            ...rest,
            siteName: primary.siteName,
            province: primary.province,
            district: primary.district,
            mapUrl: primary.mapUrl,
            latitude: primary.latitude,
            longitude: primary.longitude,
            pickupOriginName: primary.pickupOriginName,
          }
        : rest
    )
    editForm.value.tripFee = pendingSingleTripFee.value
    bookingStore.switchPricingMode(target.value.id, 'SINGLE_DESTINATION', editLineItems.value, pendingSingleTripFee.value)
  }
  editPricingMode.value = to
  pricingModeChangeConfirm.value = null
}

// --- Item editor modal state ---
const itemEditorOpen = ref(false)
const editingIndex = ref<number | null>(null)

const lockedDestination = computed(() => {
  if (editPricingMode.value !== 'SINGLE_DESTINATION') return null
  if (editLineItems.value.length === 0) return null
  if (editingIndex.value === 0) return null
  const primary = editLineItems.value[0]
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
  const isMulti = editPricingMode.value === 'MULTI_DESTINATION'
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
  const isSingle = editPricingMode.value === 'SINGLE_DESTINATION'
  if (editingIndex.value === null) {
    const newItem = draftToItem(draft)
    if (isSingle && editLineItems.value.length > 0) {
      const primary = editLineItems.value[0]
      newItem.siteName = primary.siteName
      newItem.province = primary.province
      newItem.district = primary.district
      newItem.mapUrl = primary.mapUrl
      newItem.latitude = primary.latitude
      newItem.longitude = primary.longitude
      newItem.pickupOriginName = primary.pickupOriginName
    }
    editLineItems.value.push(newItem)
  } else {
    const idx = editingIndex.value
    const updated = draftToItem(draft, editLineItems.value[idx].id)
    editLineItems.value[idx] = updated
    if (isSingle && idx === 0) {
      for (let i = 1; i < editLineItems.value.length; i++) {
        editLineItems.value[i] = {
          ...editLineItems.value[i],
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

const removeEditLineItem = (idx: number) => {
  editLineItems.value.splice(idx, 1)
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

/** ปุ่มบันทึกหลักถูกบล็อกไว้จนกว่างาน MULTI_DESTINATION จะกรอกค่าเที่ยว/จำนวนเที่ยวครบทุกรายการ (การเปลี่ยนโหมดเองยืนยันแยกต่างหากไปแล้วผ่าน confirmPricingModeChange) */
const canSaveEdit = computed(() => {
  if (editPricingMode.value !== 'MULTI_DESTINATION') return true
  return (
    editLineItems.value.length > 0 &&
    editLineItems.value.every((i) => (i.tripFee || 0) > 0 && Number.isInteger(i.tripCount) && (i.tripCount || 0) >= 1)
  )
})

const goBack = () => router.push(`/booking/${props.fleet}`)

const confirmEditBooking = () => {
  if (!target.value || !canSaveEdit.value) return
  const f = editForm.value
  const resolvedTripFee = editPricingMode.value === 'MULTI_DESTINATION' ? editMultiTripFeeTotal.value : f.tripFee
  bookingStore.updateBookingFull(target.value.id, {
    items: editLineItems.value,
    po: f.po || undefined,
    shipDate: f.shipDate ? new Date(f.shipDate) : undefined,
    returnDate: f.returnDate ? new Date(f.returnDate) : undefined,
    shipmentNo: f.shipmentNo || undefined,
    route: f.route || undefined,
    origin: f.origin || undefined,
    tripFee: resolvedTripFee,
    agreedPrice: f.agreedPrice || resolvedTripFee,
    allowance: editDisplayedAllowance.value,
    fuelLiters: f.fuelLiters,
    fuelRate: f.fuelRate,
    pricingMode: editPricingMode.value,
  })
  goBack()
}
</script>
