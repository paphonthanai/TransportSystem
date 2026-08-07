<template>
  <Teleport to="body" v-if="open">
    <div @click="$emit('close')" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
      <div @click.stop class="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div class="font-bold text-text">{{ item ? 'แก้ไขรายการสินค้า' : 'เพิ่มรายการสินค้า' }}</div>
          <button @click="$emit('close')" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <div class="px-6 py-5 space-y-4">
          <div v-if="lockedDestination" class="text-xs text-muted bg-surface-2 border border-border rounded-lg px-3 py-2">
            งานนี้เป็นโหมด "รวมทั้งเที่ยว" — ทุกรายการต้องส่งปลายทางเดียวกับรายการหลัก จึงล็อกฟิลด์ปลายทางไว้
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
              <input v-model="draft.siteName" :disabled="!!lockedDestination" placeholder="ชื่อหน้างาน" class="input-field w-full disabled:opacity-70" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">จังหวัด</label>
              <input
                v-model="draft.province"
                :disabled="!!lockedDestination"
                list="itemEditorProvinceOptions"
                placeholder="จังหวัด"
                class="input-field w-full disabled:opacity-70"
              />
              <datalist id="itemEditorProvinceOptions">
                <option v-for="p in fuelRateStore.provincesList" :key="p" :value="p" />
              </datalist>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                อำเภอ
                <span v-if="standardLiters !== null" class="font-normal text-[10px]">(ลิตรมาตรฐาน: {{ standardLiters }} ล.)</span>
              </label>
              <input
                v-model="draft.district"
                :disabled="!!lockedDestination"
                list="itemEditorDistrictOptions"
                placeholder="อำเภอ"
                class="input-field w-full disabled:opacity-70"
              />
              <datalist id="itemEditorDistrictOptions">
                <option v-for="d in fuelRateStore.districtsForProvince(draft.province)" :key="d" :value="d" />
              </datalist>
            </div>
            <div v-if="corridorWarning" class="md:col-span-2 text-xs text-amber-600">
              ⚠ ปลายทางนี้อยู่คนละสาย/เส้นทางกับรายการอื่นในงานนี้ ตรวจสอบว่าต้องการรวมในงานเดียวกันจริงหรือไม่
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง/จุดรับสินค้า (ไม่บังคับ)</label>
              <input
                v-model="draft.pickupOriginName"
                :disabled="!!lockedDestination"
                list="itemEditorOriginOptions"
                placeholder="ว่าง = ใช้ต้นทางของงาน"
                class="input-field w-full disabled:opacity-70"
              />
              <datalist id="itemEditorOriginOptions">
                <option v-for="n in originsStore.originNames" :key="n" :value="n" />
              </datalist>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน (ไม่บังคับ)</label>
              <input v-model="draft.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน (ไม่บังคับ)</label>
              <input v-model="draft.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-muted mb-1">พิกัด/ลิงก์ Google Maps หน้างาน (ไม่บังคับ)</label>
              <input
                v-model="draft.gpsInput"
                :disabled="!!lockedDestination"
                placeholder="วางลิงก์ Google Maps หรือพิกัด lat,lng"
                class="input-field w-full disabled:opacity-70"
              />
              <div v-if="draftGps.latitude !== undefined" class="text-[11px] text-muted mt-1">พิกัด: {{ draftGps.latitude }}, {{ draftGps.longitude }}</div>
              <div v-else-if="draft.gpsInput" class="text-[11px] text-muted mt-1">ไม่สามารถอ่านพิกัดจากข้อความนี้ได้ ใช้เป็นลิงก์อ้างอิงแทน</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-border">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">สินค้า</label>
              <input v-model="draft.product" list="itemEditorProductOptions" placeholder="พิมพ์หรือเลือกชื่อสินค้า" class="input-field w-full" />
              <datalist id="itemEditorProductOptions">
                <option v-for="p in productOptions" :key="p.id" :value="p.name" />
              </datalist>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ปริมาณ</label>
                <input v-model.number="draft.qty" type="number" placeholder="0" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">หน่วย</label>
                <input v-model="draft.unit" placeholder="หน่วย" class="input-field w-full" />
              </div>
            </div>
            <div class="md:col-span-2 pt-2">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-xs font-semibold text-muted">สินค้าอื่นในรายการนี้ (ไม่มีผลกับราคา)</label>
                <button type="button" @click="addExtraProduct" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  <span class="material-symbols-rounded text-sm">add</span>
                  เพิ่มสินค้าอื่น
                </button>
              </div>
              <div v-for="(ep, idx) in draft.extraProducts" :key="idx" class="grid grid-cols-[1fr_90px_70px_auto] gap-2 items-center mb-2">
                <input
                  v-model="ep.product"
                  @change="setExtraProductUnit(ep)"
                  list="itemEditorProductOptions"
                  placeholder="พิมพ์หรือเลือกชื่อสินค้า"
                  class="input-field w-full"
                />
                <input v-model.number="ep.qty" type="number" placeholder="0" class="input-field w-full" />
                <input v-model="ep.unit" placeholder="หน่วย" class="input-field w-full" />
                <button
                  type="button"
                  @click="removeExtraProduct(idx)"
                  class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border shrink-0"
                >
                  <span class="material-symbols-rounded text-base text-red-600">delete</span>
                </button>
              </div>
            </div>
            <template v-if="pricingMode === 'MULTI_DESTINATION'">
              <div class="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยวรายการนี้ (บาท)</label>
                  <input v-model.number="draft.tripFee" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">จำนวนเที่ยว (คิดราคา)</label>
                  <input v-model.number="draft.tripCount" type="number" min="1" step="1" placeholder="1" class="input-field w-full" />
                </div>
              </div>
              <!-- จำนวนเที่ยวสำหรับคิดราคาเท่านั้น ไม่ใช่จำนวนเที่ยวที่รถวิ่งจริง — งานนี้ยังเป็น 1 เที่ยวรถเสมอ -->
              <div class="text-[11px] text-muted md:col-span-2">สำหรับคำนวณราคาเท่านั้น ไม่ใช่จำนวนเที่ยวที่รถวิ่งจริง — งานนี้ยังเป็น 1 เที่ยวรถเสมอ</div>
            </template>
            <template v-if="isCements">
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-muted mb-1">ประเภทงาน</label>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-for="jt in jobTypeOptions"
                    :key="jt"
                    type="button"
                    @click="draft.jobType = jt"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      draft.jobType === jt ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                    ]"
                  >
                    {{ jt }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
          <button @click="$emit('close')" class="btn-secondary">ยกเลิก</button>
          <button @click="handleSave" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-symbols-rounded text-base">playlist_add</span>
            {{ item ? 'บันทึกรายการ' : 'ยืนยันเพิ่มรายการสินค้า' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useOriginsStore } from '@/stores/origins'
import { useBookingStore } from '@/stores/booking'
import type { BookingJobType, JobItem, PricingMode } from '@/types'
import type { Product } from '@/stores/inventory'
import { parseGpsInput } from '@/utils/gps'

export interface JobItemDraft {
  siteName: string
  province: string
  district: string
  siteContactName: string
  sitePhone: string
  gpsInput: string
  pickupOriginName: string
  product: string
  qty: number
  unit: string
  jobType: BookingJobType | undefined
  tripFee: number
  tripCount: number
  extraProducts: { product: string; qty: number; unit: string }[]
}

const props = defineProps<{
  open: boolean
  item: JobItem | null
  pricingMode: PricingMode
  /** ไม่เป็น null เมื่อโหมด SINGLE_DESTINATION และรายการนี้ไม่ใช่รายการหลัก — ล็อกฟิลด์ปลายทางให้ตรงกับรายการหลักเสมอ */
  lockedDestination: { siteName: string; province: string; district: string; gpsInput: string; pickupOriginName: string } | null
  productOptions: Product[]
  isCements: boolean
  /** ชื่อลูกค้าของงานนี้ ใช้ดึงผู้ติดต่อ/เบอร์โทรเริ่มต้นจากสมุดรายชื่อเมื่อยังไม่มีประวัติหน้างานนี้มาก่อน */
  customerName: string
  /** รายการอื่นในงานเดียวกัน (ไม่รวมรายการที่กำลังแก้ไขนี้) ใช้เช็คว่าปลายทางนี้อยู่คนละสาย/เส้นทางหรือไม่ (เตือนเท่านั้น) */
  otherItems: JobItem[]
}>()

const emit = defineEmits<{ save: [draft: JobItemDraft]; close: [] }>()

const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const originsStore = useOriginsStore()
const bookingStore = useBookingStore()

const jobTypeOptions: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

const defaultDraft = (): JobItemDraft => ({
  siteName: '',
  province: '',
  district: '',
  siteContactName: '',
  sitePhone: '',
  gpsInput: '',
  pickupOriginName: '',
  product: '',
  qty: 0,
  unit: '',
  jobType: undefined,
  tripFee: 0,
  tripCount: 1,
  extraProducts: [],
})

const draft = ref<JobItemDraft>(defaultDraft())

const applyLock = () => {
  if (!props.lockedDestination) return
  draft.value.siteName = props.lockedDestination.siteName
  draft.value.province = props.lockedDestination.province
  draft.value.district = props.lockedDestination.district
  draft.value.gpsInput = props.lockedDestination.gpsInput
  draft.value.pickupOriginName = props.lockedDestination.pickupOriginName
}

const seed = () => {
  if (props.item) {
    const i = props.item
    draft.value = {
      siteName: i.siteName,
      province: i.province,
      district: i.district,
      siteContactName: i.siteContactName || '',
      sitePhone: i.sitePhone || '',
      gpsInput: i.mapUrl || '',
      pickupOriginName: i.pickupOriginName || '',
      product: i.product,
      qty: i.qty,
      unit: i.unit,
      jobType: i.jobType,
      tripFee: i.tripFee || 0,
      tripCount: i.tripCount || 1,
      extraProducts: (i.extraProducts || []).map((ep) => ({ ...ep })),
    }
  } else {
    draft.value = defaultDraft()
  }
  applyLock()
}

watch(() => props.open, (isOpen) => { if (isOpen) seed() })

const standardLiters = computed(() => fuelRateStore.findRate(draft.value.province, draft.value.district)?.liters ?? null)
const draftGps = computed(() => parseGpsInput(draft.value.gpsInput))
/** เตือน (ไม่บล็อก) เมื่อปลายทางที่กำลังกรอกอยู่คนละสายกับรายการอื่นในงาน MULTI_DESTINATION นี้ */
const corridorWarning = computed(() => {
  if (props.pricingMode !== 'MULTI_DESTINATION') return false
  return fuelRateStore.isDifferentCorridor(draft.value.province, draft.value.district, props.otherItems)
})

// เลือกสินค้าปุ๊บ เติมหน่วยนับจากสินค้าที่ตั้งค่าไว้ให้เป็นค่าเริ่มต้นเฉยๆ (เฉพาะตอนช่องหน่วยยังว่างอยู่) ไม่ทับค่าที่ผู้ใช้พิมพ์เองไว้แล้ว — ผู้ใช้แก้ไขหน่วยเองได้อิสระเสมอ
watch(
  () => draft.value.product,
  (name) => {
    if (draft.value.unit) return
    const match = inventoryStore.products.find((p) => p.name === name)
    if (match?.unit) draft.value.unit = match.unit
  }
)

// พิมพ์ชื่อหน้างานที่เคยส่งของให้ลูกค้าคนนี้มาก่อน -> ดึงผู้ติดต่อ/เบอร์โทร/พิกัดหน้างานจากรายการล่าสุดที่ตรงกันมาให้อัตโนมัติ
watch(
  () => draft.value.siteName,
  (name) => {
    if (!name || props.lockedDestination) return
    const customer = customerStore.lookupCustomer(props.customerName)
    const match = bookingStore.bookings
      .filter((b) => b.customer === props.customerName)
      .flatMap((b) => b.items.map((i) => ({ ...i, createdAt: b.createdAt })))
      .filter((i) => i.siteName.trim().toLowerCase() === name.trim().toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    if (match) {
      if (!draft.value.siteContactName || draft.value.siteContactName === customer.contact) {
        draft.value.siteContactName = match.siteContactName || draft.value.siteContactName
      }
      if (!draft.value.sitePhone || draft.value.sitePhone === customer.phone) {
        draft.value.sitePhone = match.sitePhone || draft.value.sitePhone
      }
      if (!draft.value.gpsInput) draft.value.gpsInput = match.mapUrl || ''
      return
    }
    if (!draft.value.siteContactName) draft.value.siteContactName = customer.contact || ''
    if (!draft.value.sitePhone) draft.value.sitePhone = customer.phone || ''
  }
)

const canSave = computed(
  () =>
    !!draft.value.siteName &&
    !!draft.value.province &&
    !!draft.value.district &&
    !!draft.value.product &&
    draft.value.qty > 0 &&
    (props.pricingMode !== 'MULTI_DESTINATION' ||
      (draft.value.tripFee > 0 && Number.isInteger(draft.value.tripCount) && draft.value.tripCount >= 1))
)

const addExtraProduct = () => {
  draft.value.extraProducts.push({ product: '', qty: 0, unit: '' })
}

const removeExtraProduct = (idx: number) => {
  draft.value.extraProducts.splice(idx, 1)
}

const setExtraProductUnit = (row: { product: string; unit: string }) => {
  if (row.unit) return
  const match = inventoryStore.products.find((p) => p.name === row.product)
  if (match?.unit) row.unit = match.unit
}

const handleSave = () => {
  if (!canSave.value) return
  applyLock()
  emit('save', { ...draft.value, extraProducts: draft.value.extraProducts.filter((ep) => ep.product) })
}
</script>
