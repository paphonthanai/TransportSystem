<template>
  <Teleport to="body" v-if="booking">
    <div @click="$emit('close')" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
      <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl animate-slide max-h-full overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div class="font-bold text-text">จบงาน {{ booking.docNo }}</div>
            <div class="text-xs text-muted">เพิ่ม/ลดหนี้ กระทบยอดกับค่าแรงคนขับในเที่ยวนี้</div>
          </div>
          <button @click="$emit('close')" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="px-6 py-5 space-y-3">
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">
              เลขไมล์สิ้นสุด (กม.)
              <span class="text-[10px] font-normal text-muted">(ไม่บังคับ — เมื่อรถกลับถึง ใช้คำนวณระยะทาง/อัตราสิ้นเปลืองน้ำมัน)</span>
            </label>
            <input v-model.number="odometerAfter" type="number" placeholder="0" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">
              ลิตรน้ำมันที่เติม
              <span class="text-[10px] font-normal text-muted">(มาตรฐานปลายทาง {{ standardFuel ?? '-' }} ล.)</span>
            </label>
            <input
              v-model.number="fuelLiters"
              :disabled="fuelNotRefilled"
              type="number"
              min="0"
              placeholder="0"
              class="input-field w-full disabled:opacity-50"
            />
            <label class="mt-2 flex items-center gap-2 text-sm text-text cursor-pointer">
              <input v-model="fuelNotRefilled" type="checkbox" />
              ไม่เติมน้ำมัน (รถคันนี้ไม่ได้เติมน้ำมันเที่ยวนี้)
            </label>
          </div>
          <div v-if="issues.length" class="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2 space-y-0.5">
            <div class="font-semibold">ข้อมูลยังไม่ครบ จึงยังจบงานไม่ได้:</div>
            <div v-for="issue in issues" :key="issue.code + issue.message">• {{ issue.message }}</div>
          </div>
          <div v-if="mileageSummary" class="grid grid-cols-2 gap-2 text-xs bg-surface-2 rounded-lg p-3 border border-border">
            <div>ระยะทางเที่ยวนี้: <span class="font-semibold text-text">{{ mileageSummary.distanceKm }} กม.</span></div>
            <div>สะสม: <span class="font-semibold text-text">{{ mileageSummary.cumulativeKm }} กม.</span></div>
            <div>เฉลี่ย: <span class="font-semibold text-text">{{ mileageSummary.avgKmPerLiter ?? '-' }} กม./ลิตร</span></div>
            <div>น้ำมันที่กำหนด: <span class="font-semibold text-text">{{ mileageSummary.standardFuelLiters ?? '-' }} ล.</span></div>
            <div class="col-span-2">
              ชดเชยน้ำมัน:
              <span :class="['font-semibold', (mileageSummary.fuelCompensation ?? 0) >= 0 ? 'text-green-700' : 'text-red-700']">
                {{ mileageSummary.fuelCompensation !== null ? formatBaht(mileageSummary.fuelCompensation) : '-' }}
              </span>
              <span class="text-muted"> (บวก = คนขับใช้น้ำมันน้อยกว่ากำหนด, ลบ = ใช้เกินกำหนด)</span>
            </div>
          </div>
          <div class="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span class="text-muted">เบี้ยเลี้ยงเดิม</span>
            <span class="font-bold text-text">{{ formatBaht(booking.allowance) }}</span>
          </div>
          <div class="space-y-2">
            <div v-for="(adj, i) in debtAdjustments" :key="adj.id" class="flex items-center gap-2">
              <input v-model="adj.label" placeholder="รายการ เช่น ค่าปรับ, คืนเงิน" class="input-field flex-1" />
              <input v-model.number="adj.amount" type="number" placeholder="0" class="input-field w-28" />
              <button @click="debtAdjustments.splice(i, 1)" class="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-red-600 hover:bg-red-50">
                <span class="material-symbols-rounded text-base">delete</span>
              </button>
            </div>
          </div>
          <button @click="addAdjustmentRow" class="btn-secondary w-full justify-center">
            <span class="material-symbols-rounded text-base">add</span>
            เพิ่มรายการเพิ่ม/ลดหนี้
          </button>
          <div class="flex items-center justify-between pt-3 border-t border-border">
            <span class="text-sm font-semibold text-text">เบี้ยเลี้ยงสุทธิ</span>
            <span class="text-xl font-bold text-primary">{{ formatBaht(finalAllowance) }}</span>
          </div>
          <div class="text-[11px] text-muted">
            หมายเหตุ: จำนวนเป็นบวก = เพิ่มหนี้ (หักจากเบี้ยเลี้ยง), จำนวนเป็นลบ = ลดหนี้ (คืนให้เบี้ยเลี้ยง)
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button @click="$emit('close')" class="btn-secondary">ยกเลิก</button>
          <button @click="confirm" :disabled="issues.length > 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-symbols-rounded">task_alt</span>
            ยืนยันจบงาน
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useFuelRateStore } from '@/stores/fuelRates'
import { bookingCompletionIssues } from '@/utils/bookingCompletion'
import type { Booking, DebtAdjustment } from '@/types'

/**
 * ไดอะล็อก "จบงาน" ฝั่งออฟฟิศ (กรอกเลขไมล์/ลิตรน้ำมัน/เพิ่ม-ลดหนี้ แล้วยืนยัน — bookingStore.completeJob) ใช้ร่วมกันทั้งหน้า Booking
 * และหน้ารายละเอียดงาน — ส่ง booking ที่จะจบเข้ามา (null = ปิด) ปิด/จบสำเร็จแล้วส่ง 'close' กลับ
 */
const props = defineProps<{ booking: Booking | null }>()
const emit = defineEmits<{ close: []; done: [bookingId: string] }>()

const bookingStore = useBookingStore()
const fuelRateStore = useFuelRateStore()

const debtAdjustments = ref<DebtAdjustment[]>([])
const odometerAfter = ref(0)
const fuelLiters = ref(0)
const fuelNotRefilled = ref(false)

watch(
  () => props.booking,
  (booking) => {
    debtAdjustments.value = []
    odometerAfter.value = booking?.odometerAfter || 0
    fuelLiters.value = booking?.fuelLiters || 0
    fuelNotRefilled.value = !!booking?.fuelNotRefilled
  },
  { immediate: true }
)

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const standardFuel = computed(() => (props.booking ? fuelRateStore.standardFuelLiters(props.booking.items, props.booking.pricingMode) || undefined : undefined))

/** ปัญหาข้อมูลที่ยังขาดตามค่าที่กรอกอยู่ในไดอะล็อก (ปุ่มยืนยันจะกดไม่ได้จนกว่าจะว่าง) */
const issues = computed(() => {
  const booking = props.booking
  if (!booking) return []
  return bookingCompletionIssues(booking, {
    odometerAfter: odometerAfter.value || undefined,
    fuelLiters: fuelNotRefilled.value ? 0 : Number(fuelLiters.value) || 0,
    fuelNotRefilled: fuelNotRefilled.value,
    standardFuelLiters: standardFuel.value,
  })
})

const addAdjustmentRow = () => {
  debtAdjustments.value.push({ id: `adj${Date.now()}${debtAdjustments.value.length}`, label: '', amount: 0 })
}

const finalAllowance = computed(() => {
  if (!props.booking) return 0
  const net = debtAdjustments.value.reduce((sum, d) => sum + (d.amount || 0), 0)
  return Math.round(((props.booking.allowance || 0) - net) * 100) / 100
})

/** สรุประยะทาง/อัตราสิ้นเปลืองน้ำมัน/ชดเชยน้ำมัน เมื่อกรอกเลขไมล์สิ้นสุดแล้ว (เทียบกับน้ำมันที่กรอกไว้ตอนจัดรถ + ลิตรมาตรฐานรวมของทุกปลายทาง) */
const mileageSummary = computed(() => {
  const booking = props.booking
  if (!booking || !odometerAfter.value || !booking.odometerBefore) return null
  const distanceKm = odometerAfter.value - booking.odometerBefore
  if (distanceKm <= 0) return null
  const cumulativeKm =
    bookingStore.bookings
      .filter((b) => b.plate === booking.plate && b.id !== booking.id && b.odometerBefore !== undefined && b.odometerAfter !== undefined)
      .reduce((sum, b) => sum + ((b.odometerAfter || 0) - (b.odometerBefore || 0)), 0) + distanceKm
  const avgKmPerLiter = booking.fuelLiters ? Math.round((distanceKm / booking.fuelLiters) * 100) / 100 : null
  const standardFuelLiters = fuelRateStore.standardFuelLiters(booking.items, booking.pricingMode) || null
  const fuelCompensation = standardFuelLiters !== null ? Math.round((standardFuelLiters - (booking.fuelLiters || 0)) * (booking.fuelRate || 0) * 100) / 100 : null
  return { distanceKm, cumulativeKm, avgKmPerLiter, standardFuelLiters, fuelCompensation }
})

const confirm = () => {
  const booking = props.booking
  if (!booking) return
  const result = bookingStore.completeJob(
    booking.id,
    debtAdjustments.value.filter((d) => d.label || d.amount),
    odometerAfter.value || undefined,
    { liters: fuelNotRefilled.value ? 0 : Number(fuelLiters.value) || 0, notRefilled: fuelNotRefilled.value }
  )
  if (!result.ok) {
    alert(`จบงานไม่ได้ ข้อมูลยังไม่ครบ:\n- ${result.issues.map((i) => i.message).join('\n- ')}`)
    return
  }
  /** Phase 2: เลิกสร้างใบวางบิลอัตโนมัติตอนจบงาน — Booking ต้องไม่เป็น Trigger ของ Billing อีกต่อไป
   *  ผู้ใช้ต้องไปสร้างใบวางบิลเองที่หน้า "ใบวางบิล" (รวมหลายงาน) หรือปุ่ม "ออกใบวางบิล" ที่หน้าใบสั่งสินค้า (เดี่ยว) */
  emit('done', booking.id)
  emit('close')
}
</script>
