<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.push(`/payroll/staff/${props.id}`)" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <button v-if="record" @click="printDoc" class="btn-primary">
        <span class="material-symbols-rounded text-base">print</span>
        พิมพ์เอกสาร
      </button>
    </div>

    <div v-if="!record" class="card-lg text-center text-muted py-12">ไม่พบข้อมูลเงินเดือนนี้</div>

    <div v-else id="print-area">
      <div class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-8 max-w-3xl mx-auto relative">
        <!-- หัวเอกสาร -->
        <div class="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
          <div class="flex items-start gap-3">
            <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-12 h-12 object-contain flex-shrink-0" />
            <div>
              <div class="text-base font-bold">{{ documentSettingsStore.settings.company.name }}</div>
              <div class="text-sm font-semibold text-primary">ใบจ่ายเงินเดือน</div>
              <div v-if="documentSettingsStore.settings.company.phone" class="text-xs text-gray-600">โทร. {{ documentSettingsStore.settings.company.phone }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm">
              ประจำเดือน <span class="font-bold">{{ periodThaiLabel }}</span>
            </div>
            <div v-if="documentStatusLabel" class="status-stamp">{{ documentStatusLabel }}</div>
          </div>
        </div>

        <!-- ข้อมูลพนักงาน -->
        <div class="flex items-start justify-between mb-4 text-xs">
          <div>
            <div class="font-bold text-sm bg-yellow-100 inline-block px-1">{{ staffName }}</div>
            <div class="text-gray-700 mt-0.5">{{ staffPosition || '-' }}</div>
            <div v-if="staffBankAccount" class="text-gray-700">เลขที่บัญชี : {{ staffBankAccount }}</div>
          </div>
          <div class="text-right space-y-0.5">
            <div>รหัสพนักงาน : <span class="font-semibold">{{ staffCode || '-' }}</span></div>
            <div>เลขที่บัตรประชาชน : <span class="font-semibold">{{ staffIdCard || '-' }}</span></div>
            <div>เลขที่เอกสาร : <span class="font-semibold">{{ record.documentNumber || '-' }}</span></div>
            <div v-if="record.documentDate">วันที่ออกเอกสาร : <span class="font-semibold">{{ formatDate(record.documentDate) }}</span></div>
          </div>
        </div>

        <!-- ตารางเงินได้ / รายการหัก สองคอลัมน์ -->
        <div class="grid grid-cols-2 gap-4 text-xs border-t border-b border-gray-400 py-3">
          <div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold text-primary border-b border-gray-300 pb-1 mb-1">
              <span>เงินได้</span>
              <span>จำนวนเงิน</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>เงินเดือนฐาน</span>
              <span class="text-right tabular-nums">{{ formatBaht(record.baseSalary) }}</span>
            </div>
            <div v-for="a in record.additions" :key="a.id" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>{{ a.label }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(a.amount) }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมเงินได้</span>
              <span class="text-right tabular-nums">{{ formatBaht(record.baseSalary + additionsTotal) }}</span>
            </div>
          </div>
          <div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold text-primary border-b border-gray-300 pb-1 mb-1">
              <span>รายการหัก</span>
              <span>จำนวนเงิน</span>
            </div>
            <div v-if="record.deductions.length === 0" class="text-gray-400 py-0.5">ไม่มีรายการหัก</div>
            <div v-for="d in record.deductions" :key="d.id" class="grid grid-cols-[1fr_auto] gap-x-2 py-0.5">
              <span>{{ d.label }}</span>
              <span class="text-right tabular-nums">{{ formatBaht(d.amount) }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-x-2 font-bold border-t border-gray-300 mt-1 pt-1">
              <span>รวมรายการหัก</span>
              <span class="text-right tabular-nums">{{ formatBaht(deductionsTotal) }}</span>
            </div>
          </div>
        </div>

        <!-- ยอดสุทธิ -->
        <div class="flex justify-between items-center mt-3 mb-6">
          <div class="text-xs">
            <div class="text-gray-600">จำนวนเงินเป็นตัวอักษร</div>
            <div class="font-semibold">({{ bahtText(record.netAmount) }})</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold">รับสุทธิ</span>
            <span class="text-xl font-bold bg-yellow-100 px-3 py-1 rounded">{{ formatBaht(record.netAmount) }}</span>
          </div>
        </div>
        <div class="flex justify-end -mt-4 mb-6">
          <span class="text-xs" :class="record.status === 'PAID' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'">
            สถานะจ่ายเงิน: {{ record.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย' }}
          </span>
        </div>

        <div v-if="record.note" class="text-xs text-gray-600 mb-6">หมายเหตุ: {{ record.note }}</div>

        <!-- ลายเซ็น -->
        <div class="grid grid-cols-2 gap-8 text-sm mt-12">
          <div>
            <div class="font-semibold mb-8">ในนาม {{ staffName }}</div>
            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="border-t border-gray-500 pt-2">ผู้รับเงิน</div>
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
          <span>บันทึกล่าสุด: {{ formatDateTime(record.updatedAt) }}</span>
          <span>พิมพ์เมื่อ: {{ formatDateTime(new Date()) }} โดย {{ authStore.userName || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStaffStore } from '@/stores/staff'
import { useStaffSalaryStore } from '@/stores/staffSalaries'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useAuthStore } from '@/stores/auth'
import { bahtText } from '@/utils/companyInfo'

const props = defineProps<{ id: string }>()
const router = useRouter()
const staffStore = useStaffStore()
const staffSalaryStore = useStaffSalaryStore()
const documentSettingsStore = useDocumentSettingsStore()
const authStore = useAuthStore()

const record = computed(() => staffSalaryStore.records.find((r) => r.id === props.id) || null)
const staffRecord = computed(() => staffStore.staffList.find((s) => s.id === record.value?.staffId) || null)
const staffName = computed(() => (staffRecord.value ? staffStore.fullName(staffRecord.value) : record.value?.staffId || '-'))
const staffPosition = computed(() => staffRecord.value?.position || '')
const staffCode = computed(() => staffRecord.value?.code || '')
const staffIdCard = computed(() => staffRecord.value?.idCard || '')
const staffBankAccount = computed(() => staffRecord.value?.bankAccount || '')

const additionsTotal = computed(() => record.value?.additions.reduce((sum, a) => sum + a.amount, 0) || 0)
const deductionsTotal = computed(() => record.value?.deductions.reduce((sum, d) => sum + d.amount, 0) || 0)

const documentStatusLabel = computed(() => {
  if (!record.value?.documentStatus) return ''
  return record.value.documentStatus === 'ISSUED' ? 'ออกเอกสารแล้ว' : 'ร่าง'
})

const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
/** record.period เก็บเป็น "YYYY-MM" แบบ พ.ศ. อยู่แล้ว (เช่น "2569-08") แปลงเป็นชื่อเดือนไทยสำหรับพิมพ์บนเอกสาร */
const periodThaiLabel = computed(() => {
  if (!record.value) return '-'
  const [y, m] = record.value.period.split('-')
  if (!y || !m) return record.value.period || '-'
  const monthIndex = Number(m) - 1
  return `${thaiMonths[monthIndex] || m} ${y}`
})

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date: Date) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
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

.status-stamp {
  @apply inline-block text-[11px] font-bold px-2 py-0.5 rounded border border-primary text-primary mt-1;
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
