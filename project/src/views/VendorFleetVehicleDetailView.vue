<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3 flex-wrap">
      <button @click="router.push('/payroll/vendor-fleet')" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <h2 class="text-lg font-bold text-text flex-1">{{ vehicle ? vehiclesStore.fullPlate(vehicle) : 'รายละเอียดรถร่วม' }}</h2>
      <input v-model="period" type="month" class="input-field" />
      <button v-if="vehicle" @click="router.push({ path: `/payroll/vendor-fleet/${vehicle.id}/print`, query: { period } })" class="btn-secondary">
        <span class="material-symbols-rounded text-base">receipt_long</span>
        สร้างเอกสารรายได้รถ
      </button>
    </div>

    <div v-if="!vehicle" class="card-lg text-center text-muted py-10">ไม่พบข้อมูลรถคันนี้</div>

    <template v-else>
      <div class="card-lg grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-xs text-muted">ประเภทรถ</div>
          <div class="font-semibold text-text">{{ vehicle.department }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">ยี่ห้อ/รูปแบบตัวถัง</div>
          <div class="font-semibold text-text">{{ vehicle.brand }} {{ vehicle.bodyType }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">คนขับประจำปัจจุบัน</div>
          <div class="font-semibold text-text">{{ currentDriverLabel }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">เลขไมล์</div>
          <div class="font-semibold text-text">{{ vehicle.mileage?.toLocaleString('th-TH') || 0 }} กม.</div>
        </div>
      </div>

      <div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
        งานในตารางด้านล่าง Trace ตรงจาก Booking → ทะเบียนรถ (ไม่ใช้คนขับประจำปัจจุบันของรถมาไล่ย้อนหลัง) จึงยังคงแสดง
        งานเดิมของรถคันนี้ครบ แม้จะเคยเปลี่ยนคนขับมาแล้วก็ตาม — ค่าน้ำมันด้านล่าง Trace ได้ตรงจาก Booking ส่วนค่าใช้จ่าย
        ประจำรถ (ประกัน/GPS/ค่างวด) อยู่ในส่วนแยกด้านล่างนี้ ผูกกับรถคันนี้โดยตรง ไม่ปนกับรายการหักของคนขับ (ประกันงาน/
        ผ่อนชำระของคนขับ) ที่ดูได้ที่หน้ารายละเอียดพนักงานขับรถแทน — สองรายการนี้เป็นคนละ Entity กัน ไม่รวมยอดกัน
      </div>

      <div class="card-lg space-y-4 text-sm">
        <div>
          <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">รายได้ (Sync จาก Booking — รอบนี้)</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div class="text-xs text-muted">จำนวนงาน</div>
              <div class="font-semibold text-text">{{ rows.length }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">รายได้จากงาน</div>
              <div class="font-semibold text-green-600">{{ formatBaht(totalTripFee) }}</div>
            </div>
          </div>
        </div>

        <div class="border-t border-border pt-4">
          <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">ค่าใช้จ่าย</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div class="text-xs text-muted">ค่าน้ำมันที่ใช้ (Sync จาก Booking — รอบนี้)</div>
              <div class="font-semibold text-red-500">-{{ formatBaht(totalFuelCost) }}</div>
            </div>
            <div>
              <div class="text-xs text-muted">ค่าใช้จ่ายประจำรถ (ผู้ใช้กรอก — สะสมทั้งหมด)</div>
              <div class="font-semibold text-red-500">-{{ formatBaht(totalVehicleExpense) }}</div>
            </div>
          </div>
        </div>

        <div class="border-t border-border pt-4 grid grid-cols-3 gap-4">
          <div>
            <div class="text-xs text-muted">รายได้รวม</div>
            <div class="font-bold text-green-600">{{ formatBaht(totalTripFee) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">ค่าใช้จ่ายรวม</div>
            <div class="font-bold text-red-500">-{{ formatBaht(totalFuelCost + totalVehicleExpense) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">ยอดสุทธิ</div>
            <div class="font-bold text-primary">{{ formatBaht(netTotal) }}</div>
          </div>
        </div>
      </div>

      <VehicleExpensePanel :vehicle-id="vehicle.id" />

      <div class="card-lg overflow-x-auto">
        <h3 class="font-semibold text-text mb-3">งาน — รอบ {{ periodLabel }}</h3>
        <table class="min-w-[900px] w-full text-sm border-separate border-spacing-0">
          <thead class="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-2 font-semibold">เลขที่งาน</th>
              <th class="px-3 py-2 font-semibold">วันที่</th>
              <th class="px-3 py-2 font-semibold">คนขับ (ของงานนั้นๆ)</th>
              <th class="px-3 py-2 font-semibold">รายละเอียดงาน</th>
              <th class="px-3 py-2 font-semibold text-right">ค่าเที่ยว</th>
              <th class="px-3 py-2 font-semibold text-right">ค่าน้ำมัน</th>
              <th class="px-3 py-2 font-semibold">สถานะงาน</th>
              <th class="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.booking.id" class="border-t border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2 font-mono text-text">{{ row.booking.docNo }}</td>
              <td class="px-3 py-2 text-muted">{{ formatDate(row.booking.shipDate || row.booking.completedAt) }}</td>
              <td class="px-3 py-2 text-text">{{ row.booking.driverName || '-' }}</td>
              <td class="px-3 py-2 text-text">{{ destinationLabel(row.booking) }}</td>
              <td class="px-3 py-2 text-right text-text">{{ formatBaht(row.booking.tripFee) }}</td>
              <td class="px-3 py-2 text-right text-muted">{{ formatBaht(row.fuelCost) }}</td>
              <td class="px-3 py-2">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[row.booking.status]]">{{ bookingStatusLabel[row.booking.status] }}</span>
              </td>
              <td class="px-3 py-2 text-right">
                <RouterLink :to="`/job/${row.booking.id}`" class="text-primary hover:underline text-xs">ดูงาน</RouterLink>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="8" class="px-3 py-8 text-center text-muted">ยังไม่มีงานของรถคันนี้ในรอบนี้</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useBookingStore } from '@/stores/booking'
import { useVehicleExpensesStore } from '@/stores/vehicleExpenses'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import VehicleExpensePanel from '@/components/vehicle/VehicleExpensePanel.vue'

const props = defineProps<{ vehicleId: string }>()
const router = useRouter()
const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()
const bookingStore = useBookingStore()
const vehicleExpensesStore = useVehicleExpensesStore()

const vehicle = computed(() => vehiclesStore.vehicles.find((v) => v.id === props.vehicleId) || null)
const currentDriverLabel = computed(() => {
  const code = vehicle.value?.driverCode
  if (!code) return 'ไม่มีคนขับประจำ'
  const driver = driversStore.drivers.find((d) => d.code === code)
  return driver ? driversStore.fullName(driver) : code
})

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function toBEPeriodLabel(monthValue: string): string {
  const [y, m] = monthValue.split('-')
  return `${Number(y) + 543}-${m}`
}
function inPeriod(date: Date | undefined, monthValue: string): boolean {
  if (!date) return false
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthValue
}

const period = ref(currentMonthValue())
const periodLabel = computed(() => toBEPeriodLabel(period.value))

const fuelCost = (booking: { fuelLiters?: number; fuelRate?: number }) => Math.round((booking.fuelLiters || 0) * (booking.fuelRate || 0))

/**
 * Trace ตรงจาก Booking.plate -> ทะเบียนรถคันนี้ (เก็บไว้ ณ ตอนจ่ายงานจริง) ไม่ผ่านคนขับปัจจุบันของรถเลย จึงยังเห็นงาน
 * เก่าของรถคันนี้ครบแม้จะเปลี่ยนคนขับไปแล้ว — ตรงตามกฎ "ห้ามใช้ Current Driver มา Join ย้อนหลัง"
 */
const rows = computed(() => {
  if (!vehicle.value) return []
  const full = vehiclesStore.fullPlate(vehicle.value)
  return bookingStore.bookings
    .filter((b) => b.status === 'DELIVERED')
    .filter((b) => b.plate === full || b.plate === vehicle.value!.plate)
    .filter((b) => inPeriod(b.shipDate || b.completedAt, period.value))
    .map((b) => ({ booking: b, fuelCost: fuelCost(b) }))
    .sort((a, b) => new Date(b.booking.shipDate || b.booking.completedAt || 0).getTime() - new Date(a.booking.shipDate || a.booking.completedAt || 0).getTime())
})

const totalTripFee = computed(() => rows.value.reduce((sum, r) => sum + (r.booking.tripFee || 0), 0))
const totalFuelCost = computed(() => rows.value.reduce((sum, r) => sum + r.fuelCost, 0))
/** ค่าใช้จ่ายประจำรถ (ประกัน/GPS/ค่างวด/อื่นๆ) เป็นสะสมทั้งหมด ไม่กรองตามรอบเดือนเหมือนงาน เพราะรายการแบบนี้มักจ่ายเป็นก้อนไม่ใช่รายเดือน (เช่น ประกันต่อปี) กรองตามรอบจะทำให้ยอดหายไปผิดๆ */
const totalVehicleExpense = computed(() => (vehicle.value ? vehicleExpensesStore.expensesForVehicle(vehicle.value.id).reduce((sum, e) => sum + e.amount, 0) : 0))
/** ยอดสุทธิ = รายได้จากงาน (รอบนี้) - (ค่าน้ำมันรอบนี้ + ค่าใช้จ่ายประจำรถสะสมทั้งหมด) — เพื่อการแสดงผลสรุปเท่านั้น ไม่ใช้แก้ Driver Income/Vehicle Expense ที่มาจากแหล่งข้อมูลจริง */
const netTotal = computed(() => totalTripFee.value - totalFuelCost.value - totalVehicleExpense.value)

const destinationLabel = (booking: { items: { siteName: string }[] }) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName || '-'
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
