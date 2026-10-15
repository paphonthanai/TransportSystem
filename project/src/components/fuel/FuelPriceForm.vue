<template>
  <div>
    <div class="text-[11px] text-muted mb-3">
      กรอกราคาของวันที่ราคาเปลี่ยน — งานแต่ละงานใช้ราคาล่าสุดที่ไม่เกินวันที่สร้างงาน (งานนำเข้า Excel = วันที่นำเข้า)
      ช่องที่เว้นว่าง = ไม่ประกาศราคาใหม่ของประเภทนั้น (ใช้ราคาก่อนหน้าต่อ)
    </div>
    <div v-if="legacyPrices" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-3 flex-wrap">
      <span>
        ราคาเดิมที่เคยตั้งไว้ (ไม่มีวันที่ ระบบเลิกใช้คำนวณแล้ว):
        {{ legacyPrices.map(([type, price]) => type + ' ' + price).join(' · ') }}
      </span>
      <button type="button" @click="useLegacyPrices" class="h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs hover:bg-surface-2">
        ใช้เป็นค่าตั้งต้นของฟอร์มนี้
      </button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <div>
        <label class="block text-xs font-semibold text-muted mb-1">ราคามีผลตั้งแต่วันที่</label>
        <input v-model="priceDate" type="date" class="price-input w-full" />
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
          class="price-input w-full"
        />
      </div>
    </div>
    <div class="mt-4 flex items-center gap-3 flex-wrap">
      <button
        type="button"
        @click="save"
        :disabled="!priceDate || !hasDraftPrice"
        class="h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span class="material-symbols-rounded text-base">save</span>
        บันทึกราคาของวันที่นี้
      </button>
      <span v-if="message" class="text-xs font-semibold text-green-700 flex items-center gap-1">
        <span class="material-symbols-rounded text-base">check_circle</span>
        {{ message }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useBookingStore } from '@/stores/booking'
import { bangkokDay, type FuelPriceEntry } from '@/utils/fuelPrice'
import type { CurrentVehicleType } from '@/types'

/**
 * ฟอร์มกรอกราคาน้ำมันประจำวัน (ใช้ร่วมกันทั้งหน้า "ตั้งค่าน้ำมัน" และป๊อปอัพ "ตั้งค่าน้ำมัน" ในหน้า Booking)
 * เลือกวันที่ + ราคาแต่ละประเภทรถ (เว้นว่าง = ไม่ประกาศใหม่) กดบันทึกแล้วเขียนเป็นรายการของวันนั้นใน priceHistory
 * (ถ้ามีวันนั้นอยู่แล้ว = รวม/แก้เฉพาะประเภทที่กรอก) จากนั้นคำนวณเรทของงานใหม่ตามวันที่ของแต่ละงาน (repriceFuelRates)
 */
const fuelRateStore = useFuelRateStore()
const bookingStore = useBookingStore()

const emit = defineEmits<{ saved: [message: string] }>()

const vehicleTypeOptions: CurrentVehicleType[] = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม']

const priceDate = ref(bangkokDay(new Date()) as string)
const priceDraft = ref<Partial<Record<CurrentVehicleType, number>>>({})
const message = ref('')
const hasDraftPrice = computed(() => Object.values(priceDraft.value).some((v) => v && v > 0))

const setTypePrice = (type: CurrentVehicleType, raw: string) => {
  const map = { ...priceDraft.value }
  const value = parseFloat(raw)
  if (Number.isFinite(value) && value > 0) map[type] = value
  else delete map[type]
  priceDraft.value = map
}

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

const save = () => {
  if (!priceDate.value || !hasDraftPrice.value) return
  const history = [...(fuelRateStore.settings.priceHistory || [])]
  const idx = history.findIndex((e) => e.date === priceDate.value)
  const prices = { ...(idx !== -1 ? history[idx].prices : {}), ...priceDraft.value }
  const entry: FuelPriceEntry = { date: priceDate.value, prices }
  if (idx !== -1) history[idx] = entry
  else history.push(entry)
  fuelRateStore.settings.priceHistory = history
  priceDraft.value = {}
  message.value = describeReprice(bookingStore.repriceFuelRates())
  emit('saved', message.value)
}

/** โหลดรายการของวันหนึ่งกลับเข้าฟอร์มเพื่อแก้ไข (เรียกจากตารางประวัติ) */
const loadEntry = (entry: FuelPriceEntry) => {
  priceDate.value = entry.date
  priceDraft.value = { ...entry.prices } as Partial<Record<CurrentVehicleType, number>>
  message.value = ''
}
/** แสดงข้อความผลลัพธ์จากภายนอก (เช่นหลังลบรายการในตารางประวัติ) */
const showMessage = (text: string) => {
  message.value = text
}

defineExpose({ loadEntry, showMessage, describeReprice })
</script>

<style scoped>
.price-input {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}
</style>
