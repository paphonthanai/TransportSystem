<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">ตั้งค่าน้ำมัน</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        เพิ่มอำเภอ
      </button>
    </div>
    <div class="text-xs text-muted">
      ตั้งค่าลิตรมาตรฐานต่อเที่ยวตามอำเภอ และราคาน้ำมัน ณ วันนี้ — ระบบจะดึงมากรอกให้อัตโนมัติตอนสร้างงานเมื่อกรอกอำเภอ (แก้ไขเองได้เพื่อป้องกันการโกงน้ำมัน)
    </div>
    <!-- เดิมบันทึกไม่สำเร็จ (เช่น หลุดสิทธิ์/หลุดเน็ต) แล้วเงียบ — ไม่มีจุดไหนแสดง fuelRateStore.error เลยสักที่ ผู้ใช้เห็นรายการ
         ที่เพิ่งเพิ่มในหน้าจอตามปกติ (แค่ยังไม่ได้ขึ้น Firestore จริง) พอรีเฟรชเลยดูเหมือนข้อมูลหายไปทั้งที่กดบันทึกแล้ว -->
    <div v-if="fuelRateStore.error" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
      <span class="material-symbols-rounded text-base">error</span>
      บันทึกการตั้งค่าไป Firestore ไม่สำเร็จ: {{ fuelRateStore.error }} — ข้อมูลที่เพิ่ง แก้ไข/เพิ่ม/ลบ อาจไม่ถูกบันทึกจริง กรุณาลองรีเฟรชหน้าแล้วทำซ้ำ
    </div>

    <div class="card-lg">
      <div class="font-bold text-text mb-3">ราคาน้ำมัน ณ วันนี้</div>
      <div class="max-w-xs">
        <label class="block text-xs font-semibold text-muted mb-1">ราคาน้ำมัน (บาท/ลิตร)</label>
        <input v-model.number="priceDraft.today" @input="priceDraftDirty = true" type="number" min="0" step="0.01" class="input-field w-full" />
        <div class="text-[11px] text-muted mt-1">ใช้เป็นเรทตั้งต้นทุกอำเภอ อัปเดตทุกวันที่ราคาน้ำมันเปลี่ยน</div>
      </div>
      <div class="mt-5 pt-4 border-t border-border">
        <div class="font-semibold text-text mb-1">เรทน้ำมันแยกตามประเภทรถ</div>
        <div class="text-[11px] text-muted mb-3">
          ระบบจะใช้เรทของประเภทรถที่จัดให้ตอนจ่ายงาน/จัดรถ (ก่อนคนขับรับน้ำมัน) — เว้นว่างหรือใส่ 0 = ใช้ราคาน้ำมัน ณ วันนี้ด้านบน
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="type in vehicleTypeOptions" :key="type">
            <label class="block text-xs font-semibold text-muted mb-1">{{ type }} (บาท/ลิตร)</label>
            <input
              :value="priceDraft.byType[type] ?? ''"
              @input="(e) => setTypePrice(type, (e.target as HTMLInputElement).value)"
              type="number"
              min="0"
              step="0.01"
              :placeholder="String(priceDraft.today)"
              class="input-field w-full"
            />
          </div>
        </div>
      </div>
      <div class="mt-5 pt-4 border-t border-border flex items-center gap-3">
        <button @click="saveFuelPrices" class="btn-primary">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึก
        </button>
        <span v-if="priceSaved" class="text-xs font-semibold text-green-700 flex items-center gap-1">
          <span class="material-symbols-rounded text-base">check_circle</span>
          บันทึกแล้ว — อัปเดตค่าน้ำมันของงานที่ยังไม่จบให้ด้วยแล้ว
        </span>
      </div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[560px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">จังหวัด</th>
            <th class="px-4 py-3 font-semibold">อำเภอ</th>
            <th class="px-4 py-3 font-semibold">สาย/เส้นทาง</th>
            <th class="px-4 py-3 font-semibold text-right">ลิตรมาตรฐาน/เที่ยว</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rate in sortedRates" :key="rate.province + rate.district" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-text">{{ rate.province }}</td>
            <td class="px-4 py-3 font-semibold text-text">{{ rate.district }}</td>
            <td class="px-4 py-3 text-muted">{{ rate.corridor || '-' }}</td>
            <td class="px-4 py-3 text-right text-text">{{ rate.liters }} ลิตร</td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button @click="openDialog(rate)" class="btn-sm">แก้ไข</button>
                <button @click="removeRate(rate)" class="btn-sm text-red-600">ลบ</button>
              </div>
            </td>
          </tr>
          <tr v-if="fuelRateStore.settings.rates.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีข้อมูลอำเภอ</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingIndex === null ? 'เพิ่มอำเภอ' : 'แก้ไขอำเภอ' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">จังหวัด</label>
              <input v-model="form.province" list="fuelProvinceOptions" class="input-field w-full" />
              <datalist id="fuelProvinceOptions">
                <option v-for="p in fuelRateStore.provincesList" :key="p" :value="p" />
              </datalist>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">อำเภอ</label>
              <input v-model="form.district" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ลิตรมาตรฐาน/เที่ยว</label>
              <input v-model.number="form.liters" type="number" min="0" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                สาย/เส้นทาง
                <span class="font-normal text-[10px]">(ไม่บังคับ เช่น สายเหนือ, สายอีสาน)</span>
              </label>
              <input v-model="form.corridor" class="input-field w-full" />
            </div>
            <div v-if="formError" class="text-xs text-red-600">{{ formError }}</div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="!form.province || !form.district" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFuelRateStore, type FuelRate } from '@/stores/fuelRates'
import { useBookingStore } from '@/stores/booking'
import { useVehiclesStore } from '@/stores/vehicles'
import type { CurrentVehicleType } from '@/types'

const fuelRateStore = useFuelRateStore()
const bookingStore = useBookingStore()
const vehiclesStore = useVehiclesStore()

/**
 * ราคาน้ำมัน (ทั่วไป + แยกตามประเภทรถ) เปลี่ยนจาก auto-save ทุกครั้งที่พิมพ์ (v-model ตรงเข้า store) เป็น draft
 * ในเครื่อง + ปุ่ม "บันทึก" ชัดเจนแทน — กันเผลอบันทึกค่าที่พิมพ์ยังไม่เสร็จ และให้เห็นชัดว่าบันทึกสำเร็จเมื่อไหร่
 * (ต่างจากช่องอำเภอ/สาย/ลิตร ที่มี dialog + ปุ่มบันทึกของตัวเองอยู่แล้ว)
 */
const priceDraft = ref({
  today: fuelRateStore.settings.todayPricePerLiter,
  byType: { ...(fuelRateStore.settings.pricePerLiterByVehicleType || {}) } as Partial<Record<CurrentVehicleType, number>>,
})
// ถ้าค่าจาก Firestore เปลี่ยน (เช่น แอดมินอีกคนแก้ไว้) ก่อนที่หน้านี้จะเคยกดบันทึกเอง ให้ sync draft ตาม — แต่หยุด sync
// ทันทีที่ผู้ใช้เริ่มพิมพ์เอง (priceDraftDirty) กันพิมพ์อยู่แล้วโดนค่าจากที่อื่นทับกลางคัน
const priceDraftDirty = ref(false)
watch(
  () => [fuelRateStore.settings.todayPricePerLiter, fuelRateStore.settings.pricePerLiterByVehicleType] as const,
  ([today, byType]) => {
    if (priceDraftDirty.value) return
    priceDraft.value = { today, byType: { ...(byType || {}) } }
  }
)
const priceSaved = ref(false)

/** บันทึกราคาน้ำมันจาก draft ลง store จริง แล้วรีเฟรช booking.fuelRate ของงานที่ยังไม่จบ (ไม่แตะงาน DELIVERED เพราะ
 *  ค่าน้ำมันของงานที่จบแล้วถือเป็นตัวเลขปิดบัญชี/จ่ายเงินเดือนไปแล้ว ห้ามเปลี่ยนย้อนหลัง) ใช้สูตรเดียวกับตอนจัดรถเป๊ะ
 *  (ดู dispatchBooking ใน stores/booking.ts) แก้ปัญหาที่พบจริง: แก้เรทในหน้านี้แล้วงานที่จัดรถไปก่อนหน้าไม่เห็นค่าเปลี่ยนตาม */
const saveFuelPrices = () => {
  fuelRateStore.settings.todayPricePerLiter = priceDraft.value.today
  fuelRateStore.settings.pricePerLiterByVehicleType = { ...priceDraft.value.byType }
  bookingStore.bookings
    .filter((b) => b.status !== 'DELIVERED' && b.plate)
    .forEach((b) => {
      const vehicle = vehiclesStore.findByFullPlate(b.plate!)
      b.fuelRate = fuelRateStore.pricePerLiterFor(vehicle?.department)
    })
  priceDraftDirty.value = false
  priceSaved.value = true
  setTimeout(() => (priceSaved.value = false), 2500)
}

const vehicleTypeOptions: CurrentVehicleType[] = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม']
const setTypePrice = (type: CurrentVehicleType, raw: string) => {
  priceDraftDirty.value = true
  const map = { ...priceDraft.value.byType }
  const value = parseFloat(raw)
  if (Number.isFinite(value) && value > 0) map[type] = value
  else delete map[type]
  priceDraft.value = { ...priceDraft.value, byType: map }
}

const sortedRates = computed(() =>
  [...fuelRateStore.settings.rates].sort((a, b) => a.province.localeCompare(b.province) || a.district.localeCompare(b.district))
)

const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
const form = ref<FuelRate>({ province: '', district: '', liters: 0, corridor: '' })
const formError = ref('')

const openDialog = (rate?: FuelRate) => {
  formError.value = ''
  if (rate) {
    editingIndex.value = fuelRateStore.settings.rates.findIndex((r) => r.province === rate.province && r.district === rate.district)
    form.value = { ...rate }
  } else {
    editingIndex.value = null
    form.value = { province: '', district: '', liters: 0, corridor: '' }
  }
  showDialog.value = true
}

const save = () => {
  formError.value = ''
  if (!form.value.province || !form.value.district) return
  const dupIndex = fuelRateStore.settings.rates.findIndex(
    (r) => r.province === form.value.province && r.district === form.value.district
  )
  if (dupIndex !== -1 && dupIndex !== editingIndex.value) {
    formError.value = 'จังหวัด/อำเภอนี้มีอยู่แล้ว กรุณาแก้ไขรายการเดิมแทน'
    return
  }
  // ห้ามเซ็ต corridor เป็น undefined ตรงๆ (ต่างจากไม่มี key เลย) — Firestore setDoc() reject ค่า undefined ที่ซ้อนอยู่ใน
  // object/array ทันที โยน error แบบ synchronous ก่อนจะได้ Promise คืนมาด้วยซ้ำ ทำให้ .catch() ใน useFirestoreSettings.ts
  // ไม่มีโอกาสจับ error นี้เลย (ผู้ใช้เห็น error เงียบใน console เท่านั้น ไม่มีอะไรขึ้นหน้าจอ) — เป็นสาเหตุจริงที่ทำให้
  // เพิ่ม/แก้ไขอำเภอที่ไม่ได้กรอก "สาย/เส้นทาง" (ค่าเริ่มต้น ไม่บังคับกรอก) ไม่เคยถูกบันทึกลง Firestore เลยสักครั้ง
  // พอรีเฟรชเลยหายไปหมดโดยไม่มีข้อความเตือนใดๆ — ตัดคีย์ corridor ออกไปเลยเมื่อว่าง แทนที่จะเซ็ตเป็น undefined
  const { corridor, ...rest } = form.value
  const trimmedCorridor = corridor?.trim()
  const resolved: FuelRate = trimmedCorridor ? { ...rest, corridor: trimmedCorridor } : rest
  if (editingIndex.value === null) {
    fuelRateStore.settings.rates.unshift(resolved)
  } else {
    fuelRateStore.settings.rates[editingIndex.value] = resolved
  }
  showDialog.value = false
}

const removeRate = (rate: FuelRate) => {
  const idx = fuelRateStore.settings.rates.findIndex((r) => r.province === rate.province && r.district === rate.district)
  if (idx !== -1) fuelRateStore.settings.rates.splice(idx, 1)
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
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
