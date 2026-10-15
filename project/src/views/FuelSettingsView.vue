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
      ตั้งค่าลิตรมาตรฐานต่อเที่ยวตามอำเภอ และราคาน้ำมันประจำวันแยกตามประเภทรถ — ระบบจะดึงมากรอกให้อัตโนมัติตอนสร้างงานเมื่อกรอกอำเภอ (แก้ไขเองได้เพื่อป้องกันการโกงน้ำมัน)
    </div>
    <!-- เดิมบันทึกไม่สำเร็จ (เช่น หลุดสิทธิ์/หลุดเน็ต) แล้วเงียบ — ไม่มีจุดไหนแสดง fuelRateStore.error เลยสักที่ ผู้ใช้เห็นรายการ
         ที่เพิ่งเพิ่มในหน้าจอตามปกติ (แค่ยังไม่ได้ขึ้น Firestore จริง) พอรีเฟรชเลยดูเหมือนข้อมูลหายไปทั้งที่กดบันทึกแล้ว -->
    <div v-if="fuelRateStore.error" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
      <span class="material-symbols-rounded text-base">error</span>
      บันทึกการตั้งค่าไป Firestore ไม่สำเร็จ: {{ fuelRateStore.error }} — ข้อมูลที่เพิ่ง แก้ไข/เพิ่ม/ลบ อาจไม่ถูกบันทึกจริง กรุณาลองรีเฟรชหน้าแล้วทำซ้ำ
    </div>

    <div class="card-lg">
      <div class="font-bold text-text mb-1">ราคาน้ำมันประจำวัน (บาท/ลิตร) แยกตามประเภทรถ</div>
      <FuelPriceForm ref="priceFormRef" />

      <div class="mt-5 overflow-x-auto">
        <table class="min-w-[560px] w-full text-sm border-separate border-spacing-0">
          <thead class="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th class="px-4 py-2 font-semibold">มีผลตั้งแต่วันที่</th>
              <th v-for="type in vehicleTypeOptions" :key="type" class="px-4 py-2 font-semibold text-right">{{ type }}</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in sortedHistory" :key="entry.date" class="border-t border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-2 font-semibold text-text">{{ entry.date }}</td>
              <td v-for="type in vehicleTypeOptions" :key="type" class="px-4 py-2 text-right text-text">{{ entry.prices[type] ? entry.prices[type] : '-' }}</td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="editEntry(entry)" class="btn-sm">แก้ไข</button>
                  <button @click="removeEntry(entry)" class="btn-sm text-red-600">ลบ</button>
                </div>
              </td>
            </tr>
            <tr v-if="sortedHistory.length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-muted">ยังไม่มีราคาน้ำมันประจำวัน — งานที่ยังไม่มีราคาจะขึ้น "ยังไม่มีเรท" และยังไม่ถูกนำไปคิดเงิน</td>
            </tr>
          </tbody>
        </table>
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
import { ref, computed } from 'vue'
import { useFuelRateStore, type FuelRate } from '@/stores/fuelRates'
import { useBookingStore } from '@/stores/booking'
import FuelPriceForm from '@/components/fuel/FuelPriceForm.vue'
import type { CurrentVehicleType } from '@/types'
import type { FuelPriceEntry } from '@/utils/fuelPrice'

const fuelRateStore = useFuelRateStore()
const bookingStore = useBookingStore()

const vehicleTypeOptions: CurrentVehicleType[] = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม']

/** ฟอร์มกรอกราคาประจำวัน + ประวัติราคา (ใช้ฟอร์มเดียวกับป๊อปอัพ "ตั้งค่าน้ำมัน" ในหน้า Booking) */
const priceFormRef = ref<InstanceType<typeof FuelPriceForm> | null>(null)

const sortedHistory = computed<FuelPriceEntry[]>(() =>
  [...(fuelRateStore.settings.priceHistory || [])].sort((a, b) => b.date.localeCompare(a.date))
)

const editEntry = (entry: FuelPriceEntry) => priceFormRef.value?.loadEntry(entry)

const removeEntry = (entry: FuelPriceEntry) => {
  fuelRateStore.settings.priceHistory = (fuelRateStore.settings.priceHistory || []).filter((e) => e.date !== entry.date)
  const result = bookingStore.repriceFuelRates()
  priceFormRef.value?.showMessage(priceFormRef.value.describeReprice(result))
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
  // ไม่มีโอกาสจับ error นี้เลย — ตัดคีย์ corridor ออกไปเลยเมื่อว่าง แทนที่จะเซ็ตเป็น undefined
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
