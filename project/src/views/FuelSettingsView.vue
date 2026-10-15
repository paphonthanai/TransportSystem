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
      <div class="text-[11px] text-muted mb-3">
        กรอกราคาของแต่ละวันที่ราคาเปลี่ยน — งานแต่ละงานใช้ราคาล่าสุดที่ไม่เกินวันที่สร้างงาน (งานนำเข้า Excel = วันที่นำเข้า) ของงานนั้น
        การเพิ่มหรือแก้ราคาของวันหนึ่งจึงไม่ทำให้งานของวันอื่นเปลี่ยน ช่องที่เว้นว่าง = ไม่ประกาศราคาใหม่ของประเภทนั้นในวันนี้ (ใช้ราคาก่อนหน้าต่อ)
      </div>
      <div v-if="legacyPrices" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-3 flex-wrap">
        <span>
          ราคาเดิมที่เคยตั้งไว้ (ไม่มีวันที่ ระบบเลิกใช้คำนวณแล้ว):
          {{ legacyPrices.map(([type, price]) => type + ' ' + price).join(' · ') }}
        </span>
        <button @click="useLegacyPrices" class="btn-sm">ใช้เป็นค่าตั้งต้นของฟอร์มด้านล่าง</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ราคามีผลตั้งแต่วันที่</label>
          <input v-model="priceDate" type="date" class="input-field w-full" />
        </div>
        <div v-for="type in vehicleTypeOptions" :key="type">
          <label class="block text-xs font-semibold text-muted mb-1">{{ type }}</label>
          <input
            :value="priceDraft[type] ?? ''"
            @input="(e) => setTypePrice(type, (e.target as HTMLInputElement).value)"
            type="number"
            min="0"
            step="0.01"
            placeholder="ไม่ประกาศ"
            class="input-field w-full"
          />
        </div>
      </div>
      <div class="mt-5 pt-4 border-t border-border flex items-center gap-3 flex-wrap">
        <button @click="saveFuelPrices" :disabled="!priceDate || !hasDraftPrice" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึกราคาของวันที่นี้
        </button>
        <span v-if="priceSavedMessage" class="text-xs font-semibold text-green-700 flex items-center gap-1">
          <span class="material-symbols-rounded text-base">check_circle</span>
          {{ priceSavedMessage }}
        </span>
      </div>

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
import type { CurrentVehicleType } from '@/types'
import { bangkokDay, type FuelPriceEntry } from '@/utils/fuelPrice'

const fuelRateStore = useFuelRateStore()
const bookingStore = useBookingStore()

const vehicleTypeOptions: CurrentVehicleType[] = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม']

/** วันนี้ตามเวลาไทย (YYYY-MM-DD) ใช้เป็นค่าเริ่มต้นของช่องวันที่ราคา */
const todayDay = () => bangkokDay(new Date()) as string

/**
 * ฟอร์มกรอกราคาประจำวัน: เลือกวันที่ + ราคาแต่ละประเภทรถ (เว้นว่าง = ไม่ประกาศใหม่) กด "บันทึก" แล้วเขียนเป็นรายการของวันนั้นใน
 * priceHistory (ถ้ามีวันนั้นอยู่แล้ว = รวม/แก้เฉพาะประเภทที่กรอก) จากนั้นคำนวณเรทของงานใหม่ตามวันที่ของแต่ละงาน (repriceFuelRates)
 * — เรทของงานวันอื่นที่ราคาไม่เปลี่ยนจึงได้ค่าเดิมเป๊ะ ไม่ถูกเขียนทับด้วยราคาเดียวทั้งระบบเหมือนเดิม
 */
const priceDate = ref(todayDay())
const priceDraft = ref<Partial<Record<CurrentVehicleType, number>>>({})
const priceSavedMessage = ref('')
const hasDraftPrice = computed(() => Object.values(priceDraft.value).some((v) => v && v > 0))

const setTypePrice = (type: CurrentVehicleType, raw: string) => {
  const map = { ...priceDraft.value }
  const value = parseFloat(raw)
  if (Number.isFinite(value) && value > 0) map[type] = value
  else delete map[type]
  priceDraft.value = map
}

const sortedHistory = computed<FuelPriceEntry[]>(() =>
  [...(fuelRateStore.settings.priceHistory || [])].sort((a, b) => b.date.localeCompare(a.date))
)

/** ราคาเดิมแบบค่าเดียวต่อประเภทรถ (ก่อนมีประวัติรายวัน) — แสดงเป็นข้อมูลอ้างอิงจนกว่าจะมีประวัติรายวัน */
const legacyPrices = computed(() => {
  if ((fuelRateStore.settings.priceHistory || []).length > 0) return null
  const entries = Object.entries(fuelRateStore.settings.pricePerLiterByVehicleType || {}).filter(([, v]) => v && v > 0)
  return entries.length ? entries : null
})
const useLegacyPrices = () => {
  const next: Partial<Record<CurrentVehicleType, number>> = {}
  for (const [type, price] of legacyPrices.value || []) next[type as CurrentVehicleType] = price as number
  priceDraft.value = next
}

const describeReprice = (r: { updated: number; noPrice: number; manual: number }) => {
  const parts = [`คำนวณเรทน้ำมันของงานตามราคาประจำวันแล้ว (เปลี่ยน ${r.updated} งาน)`]
  if (r.noPrice > 0) parts.push(`${r.noPrice} งานยังไม่มีราคาน้ำมันของวันนั้น จึงยังไม่ถูกนำไปคิดเงิน`)
  if (r.manual > 0) parts.push(`${r.manual} งานกรอกเรทเองจึงไม่ถูกแก้`)
  return parts.join(' · ')
}

const saveFuelPrices = () => {
  if (!priceDate.value || !hasDraftPrice.value) return
  const history = [...(fuelRateStore.settings.priceHistory || [])]
  const idx = history.findIndex((e) => e.date === priceDate.value)
  const prices = { ...(idx !== -1 ? history[idx].prices : {}), ...priceDraft.value }
  const entry: FuelPriceEntry = { date: priceDate.value, prices }
  if (idx !== -1) history[idx] = entry
  else history.push(entry)
  fuelRateStore.settings.priceHistory = history
  priceDraft.value = {}
  priceSavedMessage.value = describeReprice(bookingStore.repriceFuelRates())
}

const editEntry = (entry: FuelPriceEntry) => {
  priceDate.value = entry.date
  priceDraft.value = { ...entry.prices } as Partial<Record<CurrentVehicleType, number>>
}

const removeEntry = (entry: FuelPriceEntry) => {
  fuelRateStore.settings.priceHistory = (fuelRateStore.settings.priceHistory || []).filter((e) => e.date !== entry.date)
  priceSavedMessage.value = describeReprice(bookingStore.repriceFuelRates())
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
