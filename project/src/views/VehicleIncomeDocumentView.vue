<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.back()" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <button v-if="doc" @click="printDoc" class="btn-primary">
        <span class="material-symbols-rounded text-base">print</span>
        พิมพ์เอกสาร
      </button>
    </div>

    <div v-if="!doc" class="card-lg text-center text-muted py-12">ไม่พบเอกสารรายได้รถคันนี้</div>

    <div v-else id="print-area">
      <div class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-8 max-w-3xl mx-auto relative">
        <!-- หัวเอกสาร -->
        <div class="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
          <div class="flex items-start gap-3">
            <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-12 h-12 object-contain flex-shrink-0" />
            <div>
              <div class="text-base font-bold">{{ documentSettingsStore.settings.company.name }}</div>
              <div class="text-sm font-semibold text-primary">เอกสารรายได้รถร่วม/รถหุ้นส่วน</div>
              <div v-if="documentSettingsStore.settings.company.phone" class="text-xs text-gray-600">โทร. {{ documentSettingsStore.settings.company.phone }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm">
              ประจำเดือน <span class="font-bold">{{ periodThaiLabel }}</span>
            </div>
          </div>
        </div>

        <!-- ข้อมูลรถ -->
        <div class="flex items-start justify-between mb-4 text-xs">
          <div>
            <div class="font-bold text-sm bg-yellow-100 inline-block px-1">{{ doc.plate }}</div>
            <div v-if="vehicle" class="text-gray-700 mt-0.5">{{ vehicle.department }}</div>
          </div>
          <div class="text-right space-y-0.5">
            <div>ช่วงวันที่ : <span class="font-semibold">{{ periodThaiLabel }}</span></div>
            <div>เลขที่เอกสาร : <span class="font-semibold">{{ doc.number }}</span></div>
            <div>วันที่ออกเอกสาร : <span class="font-semibold">{{ formatDate(doc.createdAt) }}</span></div>
          </div>
        </div>

        <!-- ตารางงาน/เที่ยว (Trace กลับ Booking) -->
        <table class="w-full text-xs border border-gray-400 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-400 px-2 py-1 text-left w-8">#</th>
              <th class="border border-gray-400 px-2 py-1 text-left w-24">เลขที่งาน</th>
              <th class="border border-gray-400 px-2 py-1 text-left w-20">วันที่</th>
              <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียดงาน</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-20">รายได้</th>
              <th v-if="hasAllowance" class="border border-gray-400 px-2 py-1 text-right w-20">เบี้ยเลี้ยง</th>
              <th class="border border-gray-400 px-2 py-1 text-right w-20">ค่าน้ำมัน</th>
              <th v-if="doc.lines" class="border border-gray-400 px-2 py-1 text-right w-24">ค่าใช้จ่ายประจำรถ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="row.booking.id">
              <td class="border border-gray-400 px-2 py-1">{{ idx + 1 }}</td>
              <td class="border border-gray-400 px-2 py-1 font-mono">{{ row.booking.docNo }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ formatDate(row.booking.shipDate || row.booking.completedAt) }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ destinationLabel(row.booking) }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.tripFee) }}</td>
              <td v-if="hasAllowance" class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.allowance) }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.fuelCost) }}</td>
              <td v-if="doc.lines" class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.vehicleExpense) }}</td>
            </tr>
            <tr v-if="rows.length === 0">
              <td :colspan="(doc.lines ? 7 : 6) + (hasAllowance ? 1 : 0)" class="border border-gray-400 px-2 py-4 text-center text-gray-400">ไม่มีงานในเอกสารนี้</td>
            </tr>
          </tbody>
        </table>

        <!-- รายได้ / ค่าใช้จ่าย สองคอลัมน์ -->
        <div class="grid grid-cols-2 gap-4 text-xs border-t border-b border-gray-400 py-3">
          <div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold text-primary border-b border-gray-300 pb-1 mb-1">
              <span>รายได้</span>
              <span>จำนวนเงิน</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>รายได้จากงาน</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.tripIncomeTotal) }}</span>
            </div>
            <template v-if="doc.deductions?.length">
              <div v-for="d in doc.deductions" :key="d.kind + d.label" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
                <span>{{ d.label }} {{ d.percent }}%</span>
                <span class="text-right tabular-nums text-red-600">-{{ formatBaht(d.amount) }}</span>
              </div>
              <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
                <span>รายได้หลังหัก</span>
                <span class="text-right tabular-nums">{{ formatBaht(doc.tripIncomeTotal - (doc.deductionTotal ?? 0)) }}</span>
              </div>
            </template>
            <div v-if="allowanceAsIncome" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>เบี้ยเลี้ยง</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.allowanceTotal ?? 0) }}</span>
            </div>
            <div v-for="(a, i) in doc.additions || []" :key="`add${i}`" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>{{ a.label }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(a.amount) }}</span>
            </div>
            <div v-if="allowanceAsIncome || doc.additions?.length" class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมรายได้</span>
              <span class="text-right tabular-nums">{{ formatBaht(incomeTotal) }}</span>
            </div>
          </div>
          <div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold text-primary border-b border-gray-300 pb-1 mb-1">
              <span>ค่าใช้จ่าย</span>
              <span>จำนวนเงิน</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>ค่าน้ำมันที่ใช้</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.fuelCostTotal) }}</span>
            </div>
            <div v-if="doc.vehicleExpenseTotal > 0" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>ค่าใช้จ่ายประจำรถ{{ doc.lines ? '' : ' (รวม)' }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.vehicleExpenseTotal) }}</span>
            </div>
            <div v-if="allowanceAsExpense" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>ค่าเบี้ยเลี้ยง</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.allowanceTotal ?? 0) }}</span>
            </div>
            <div v-for="(d, i) in doc.manualDeductions || []" :key="`ded${i}`" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>{{ d.label }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(d.amount) }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมค่าใช้จ่าย</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.fuelCostTotal + doc.vehicleExpenseTotal + (doc.manualDeductionTotal ?? 0) + (allowanceAsExpense ? doc.allowanceTotal ?? 0 : 0)) }}</span>
            </div>
          </div>
        </div>

        <!-- ยอดสุทธิ -->
        <div class="flex justify-between items-center mt-3 mb-6">
          <div class="text-xs">
            <div class="text-gray-600">จำนวนเงินเป็นตัวอักษร</div>
            <div class="font-semibold">({{ bahtText(doc.netTotal) }})</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold">ยอดสุทธิ</span>
            <span class="text-xl font-bold bg-yellow-100 px-3 py-1 rounded">{{ formatBaht(doc.netTotal) }}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 -mt-4 mb-6">
          <div class="flex items-center gap-2">
            <span class="text-xs" :class="paymentStatus === 'PAID' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'">
              สถานะจ่ายเงิน: {{ paymentStatus === 'PAID' ? `จ่ายแล้ว (${formatDate(doc.paidDate)})` : 'รอจ่าย' }}
            </span>
            <template v-if="!paymentEditing">
              <button v-if="canManage" @click="startPaymentEdit" class="no-print inline-flex items-center gap-0.5 text-xs font-normal text-primary hover:underline" title="แก้สถานะจ่ายเงิน">
                <span class="material-symbols-rounded text-sm">edit</span>แก้
              </button>
              <span v-else class="no-print text-xs text-gray-400">(เฉพาะผู้ดูแลระบบ/ฝ่ายบัญชี)</span>
            </template>
          </div>
          <div v-if="paymentEditing" class="no-print flex items-center gap-2 flex-wrap justify-end text-xs">
            <span>วันที่จ่าย</span>
            <input v-model="paidDateDraft" type="date" :max="todayValue" class="h-8 px-2 border border-gray-300 rounded-lg" />
            <button @click="savePayment" :disabled="saving || !paidDateDraft" class="h-8 px-3 rounded-lg bg-primary text-white font-semibold disabled:opacity-40">
              {{ paymentStatus === 'PAID' ? 'บันทึกวันที่จ่าย' : 'บันทึกจ่ายแล้ว' }}
            </button>
            <button v-if="paymentStatus === 'PAID'" @click="resetPayment" :disabled="saving" class="h-8 px-3 rounded-lg border border-gray-300 text-red-600">
              รีเซ็ตเป็นรอจ่าย
            </button>
            <button @click="paymentEditing = false" class="h-8 px-3 rounded-lg border border-gray-300">ยกเลิก</button>
          </div>
          <div v-if="paymentError" class="no-print text-xs text-red-600">{{ paymentError }}</div>
        </div>

        <div class="text-[11px] text-gray-500 mb-6">
          หมายเหตุ: ยอดทั้งหมดในเอกสารนี้เป็น Snapshot ณ ตอนสร้างเอกสาร ไม่เปลี่ยนตามภายหลังแม้จะมีการแก้ไขค่าใช้จ่ายประจำรถเพิ่มเติม —
          ไม่รวมรายได้/รายการหักของคนขับ (ดูเอกสารรายได้คนขับแยกต่างหาก)
        </div>

        <!-- ลายเซ็น -->
        <div class="grid grid-cols-2 gap-8 text-sm mt-12">
          <div>
            <div class="font-semibold mb-8">ในนาม {{ doc.plate }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้รับเงิน / เจ้าของรถ</div>
              <div class="border-t border-gray-500 pt-2">วันที่</div>
            </div>
          </div>
          <div class="relative">
            <img
              v-if="documentSettingsStore.settings.company.stamp"
              :src="documentSettingsStore.settings.company.stamp"
              class="w-14 h-14 object-contain absolute right-6 -top-12 opacity-90"
            />
            <div class="font-semibold mb-8">ในนาม {{ documentSettingsStore.settings.company.name }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้มีอำนาจอนุมัติ</div>
              <div class="border-t border-gray-500 pt-2">วันที่</div>
            </div>
          </div>
        </div>

        <!-- Footer ข้อมูลการพิมพ์ -->
        <div class="flex justify-between text-[10px] text-gray-500 mt-8 pt-2 border-t border-gray-300">
          <span>เอกสารเลขที่ {{ doc.number }} — ยอดคงที่ตามที่บันทึกไว้ ณ ตอนสร้างเอกสาร</span>
          <span>พิมพ์เมื่อ: {{ formatDateTime(new Date()) }} โดย {{ authStore.userName || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVehiclesStore } from '@/stores/vehicles'
import { useBookingStore } from '@/stores/booking'
import { paymentStatusOf, useVehicleIncomeDocumentsStore } from '@/stores/vehicleIncomeDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useAuthStore } from '@/stores/auth'
import { bahtText } from '@/utils/companyInfo'
import { fuelCostOf } from '@/utils/bookingMoney'

/**
 * เอกสารรายได้รถร่วม/รถหุ้นส่วน — เวอร์ชันนี้เป็น viewer ของ VehicleIncomeDocument ที่ persisted จริงแล้ว (สร้างจากการ
 * เลือกงานเองที่ VendorFleetVehicleDetailView.vue) ยอดเงินทั้งหมดมาจาก Snapshot ณ ตอนสร้างเอกสารตรงๆ ไม่คำนวณสดใหม่
 * ทุกครั้งที่เปิดหน้า (ต่างจากเวอร์ชันเดิมก่อนหน้านี้) — ตารางรายเที่ยวยัง lookup รายละเอียดการแสดงผล (วันที่/ปลายทาง)
 * จาก Booking ตรงๆ เพราะข้อมูลเหล่านี้ไม่เปลี่ยนหลังงานส่งสำเร็จอยู่แล้ว
 */
const props = defineProps<{ docId: string }>()
const router = useRouter()
const vehiclesStore = useVehiclesStore()
const bookingStore = useBookingStore()
const vehicleIncomeDocumentsStore = useVehicleIncomeDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const authStore = useAuthStore()

const doc = computed(() => vehicleIncomeDocumentsStore.documents.find((d) => d.id === props.docId) || null)
const vehicle = computed(() => (doc.value ? vehiclesStore.vehicles.find((v) => v.id === doc.value!.vehicleId) : undefined))

const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const periodThaiLabel = computed(() => {
  if (!doc.value) return '-'
  const [y, m] = doc.value.period.split('-')
  const monthIndex = Number(m) - 1
  return `${thaiMonths[monthIndex] || m} ${Number(y) + 543}`
})

const fuelCost = (booking: { fuelLiters?: number; fuelRate?: number }) => fuelCostOf(booking)

/**
 * ยอดต่องานใช้ Snapshot ใน doc.lines (เอกสารใหม่ — ค่าน้ำมัน/ค่าใช้จ่ายประจำรถที่ผู้ใช้กรอกเอง) ถ้าไม่มี (เอกสารเก่า)
 * ใช้ค่าเที่ยวจากงาน + ค่าน้ำมันลิตร × เรท แบบเดิม
 */
const rows = computed(() => {
  if (!doc.value) return []
  const lines = doc.value.lines
  return doc.value.bookingIds
    .map((id) => bookingStore.bookings.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => {
      const line = lines?.find((l) => l.bookingId === b.id)
      return line
        ? { booking: b, tripFee: line.tripFee, allowance: line.allowance ?? 0, fuelCost: line.fuelCost, vehicleExpense: line.vehicleExpense }
        : { booking: b, tripFee: b.tripFee || 0, allowance: 0, fuelCost: fuelCost(b), vehicleExpense: 0 }
    })
    .sort((a, b) => new Date(a.booking.shipDate || a.booking.completedAt || 0).getTime() - new Date(b.booking.shipDate || b.booking.completedAt || 0).getTime())
})

/** เอกสารก่อนมีเบี้ยเลี้ยงรถร่วมไม่มี allowanceTotal — ไม่แสดงคอลัมน์/บรรทัดเบี้ยเลี้ยง */
const hasAllowance = computed(() => doc.value?.allowanceTotal !== undefined)
/** เบี้ยเลี้ยงเป็นรายจ่าย (เอกสารใหม่) หรือรายได้ (เอกสารช่วงสั้นๆ ก่อนเปลี่ยน — ยอด Snapshot คิดแบบนั้น) */
const allowanceAsExpense = computed(() => hasAllowance.value && !!doc.value?.allowanceIsExpense)
const allowanceAsIncome = computed(() => hasAllowance.value && !doc.value?.allowanceIsExpense)
/** รายได้หลังหัก % + รายได้ส่วนเพิ่ม (+ เบี้ยเลี้ยง เฉพาะเอกสารแบบเดิม) */
const incomeTotal = computed(() =>
  doc.value
    ? doc.value.tripIncomeTotal - (doc.value.deductionTotal ?? 0) + (allowanceAsIncome.value ? doc.value.allowanceTotal ?? 0 : 0) + (doc.value.additionTotal ?? 0)
    : 0
)

const destinationLabel = (booking: { items: { siteName: string }[] }) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName || '-'
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')
const formatDateTime = (date: Date) => new Date(date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

const printDoc = () => window.print()

/** inline "แก้" สถานะจ่าย — เหมือนหน้าเอกสารรายได้คนขับ (DriverIncomeDocumentView.vue) store เช็คสิทธิ์ + เขียน log */
const paymentStatus = computed(() => (doc.value ? paymentStatusOf(doc.value) : 'UNPAID'))
const canManage = computed(() => vehicleIncomeDocumentsStore.canManage())
const toDateValue = (date: Date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayValue = toDateValue(new Date())
const paymentEditing = ref(false)
const paidDateDraft = ref('')
const saving = ref(false)
const paymentError = ref('')
const startPaymentEdit = () => {
  paidDateDraft.value = doc.value?.paidDate ? toDateValue(doc.value.paidDate) : todayValue
  paymentError.value = ''
  paymentEditing.value = true
}
const runPayment = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
  saving.value = true
  const result = await action()
  saving.value = false
  if (!result.ok) {
    paymentError.value = result.message || 'บันทึกไม่สำเร็จ'
    return
  }
  paymentEditing.value = false
}
const savePayment = () => {
  if (!doc.value || !paidDateDraft.value) return
  const [y, m, d] = paidDateDraft.value.split('-').map(Number)
  const paidDate = new Date(y, m - 1, d)
  const id = doc.value.id
  runPayment(() => (paymentStatus.value === 'PAID' ? vehicleIncomeDocumentsStore.updatePaidDate(id, paidDate) : vehicleIncomeDocumentsStore.recordPayment(id, paidDate)))
}
const resetPayment = () => {
  if (!doc.value || !confirm(`ยืนยันรีเซ็ตเอกสาร ${doc.value.number} จาก "จ่ายแล้ว" กลับเป็น "รอจ่าย"?`)) return
  const id = doc.value.id
  runPayment(() => vehicleIncomeDocumentsStore.resetPayment(id))
}
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
}
</style>
