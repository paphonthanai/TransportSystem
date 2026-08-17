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
              <th class="border border-gray-400 px-2 py-1 text-right w-20">ค่าน้ำมัน</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="row.booking.id">
              <td class="border border-gray-400 px-2 py-1">{{ idx + 1 }}</td>
              <td class="border border-gray-400 px-2 py-1 font-mono">{{ row.booking.docNo }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ formatDate(row.booking.shipDate || row.booking.completedAt) }}</td>
              <td class="border border-gray-400 px-2 py-1">{{ destinationLabel(row.booking) }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.booking.tripFee) }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right tabular-nums">{{ formatBaht(row.fuelCost) }}</td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="6" class="border border-gray-400 px-2 py-4 text-center text-gray-400">ไม่มีงานในเอกสารนี้</td>
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
              <span>ค่าใช้จ่ายประจำรถ (รวม)</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.vehicleExpenseTotal) }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมค่าใช้จ่าย</span>
              <span class="text-right tabular-nums">{{ formatBaht(doc.fuelCostTotal + doc.vehicleExpenseTotal) }}</span>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useVehiclesStore } from '@/stores/vehicles'
import { useBookingStore } from '@/stores/booking'
import { useVehicleIncomeDocumentsStore } from '@/stores/vehicleIncomeDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useAuthStore } from '@/stores/auth'
import { bahtText } from '@/utils/companyInfo'

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

const fuelCost = (booking: { fuelLiters?: number; fuelRate?: number }) => Math.round((booking.fuelLiters || 0) * (booking.fuelRate || 0))

const rows = computed(() => {
  if (!doc.value) return []
  return doc.value.bookingIds
    .map((id) => bookingStore.bookings.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => ({ booking: b, fuelCost: fuelCost(b) }))
    .sort((a, b) => new Date(a.booking.shipDate || a.booking.completedAt || 0).getTime() - new Date(b.booking.shipDate || b.booking.completedAt || 0).getTime())
})

const destinationLabel = (booking: { items: { siteName: string }[] }) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName || '-'
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')
const formatDateTime = (date: Date) => new Date(date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

const printDoc = () => window.print()
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
