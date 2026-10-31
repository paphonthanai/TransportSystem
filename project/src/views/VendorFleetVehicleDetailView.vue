<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3 flex-wrap">
      <button @click="router.push('/payroll/vendor-fleet')" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <h2 class="text-lg font-bold text-text flex-1">{{ vehicle ? vehiclesStore.fullPlate(vehicle) : 'รายละเอียดรถร่วม' }}</h2>
      <input v-model="period" type="month" class="input-field" />
    </div>

    <div v-if="!vehicle" class="card-lg text-center text-muted py-10">ไม่พบข้อมูลรถคันนี้</div>

    <template v-else>
      <div class="card-lg grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-xs text-muted">ประเภทรถ</div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-text">{{ vehicle.department }}</span>
            <RouterLink to="/settings/vehicles" class="edit-link" title="แก้ที่หน้าตั้งค่ารถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">ยี่ห้อ/รูปแบบตัวถัง</div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-text">{{ vehicle.brand }} {{ vehicle.bodyType }}</span>
            <RouterLink to="/settings/vehicles" class="edit-link" title="แก้ที่หน้าตั้งค่ารถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">คนขับประจำปัจจุบัน</div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-text">{{ currentDriverLabel }}</span>
            <RouterLink to="/settings/vehicles" class="edit-link" title="แก้ที่หน้าตั้งค่ารถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
          </div>
        </div>
        <div>
          <div class="text-xs text-muted">เลขไมล์</div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-text">{{ vehicle.mileage?.toLocaleString('th-TH') || 0 }} กม.</span>
            <RouterLink to="/settings/vehicles" class="edit-link" title="แก้ที่หน้าตั้งค่ารถ"><span class="material-symbols-rounded text-sm">edit</span>แก้</RouterLink>
          </div>
        </div>
      </div>

      <div class="card-lg grid grid-cols-2 sm:grid-cols-6 gap-4 text-sm">
        <div>
          <div class="text-xs text-muted">จำนวนงาน (รอบนี้)</div>
          <div class="font-semibold text-text">{{ rows.length }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">ค่าเที่ยวรวม</div>
          <div class="font-semibold text-green-600">{{ formatBaht(totalTripFee) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">เบี้ยเลี้ยง</div>
          <div class="font-semibold text-green-600">+{{ formatBaht(totalAllowance) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">ค่าน้ำมันที่ใช้</div>
          <div class="font-semibold text-red-500">-{{ formatBaht(totalFuelCost) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">ค่าใช้จ่ายประจำรถ</div>
          <div class="font-semibold text-red-500">-{{ formatBaht(totalVehicleExpense) }}</div>
        </div>
        <div>
          <div class="text-xs text-muted">งานที่แก้ยอดเอง</div>
          <div class="font-semibold text-text">{{ manualCostCount }}</div>
        </div>
      </div>

      <div class="card-lg flex items-center justify-between text-sm">
        <span class="font-semibold text-text">ยอดสุทธิ (ค่าเที่ยว + เบี้ยเลี้ยง − ค่าน้ำมัน − ค่าใช้จ่ายประจำรถ)</span>
        <span class="text-lg font-bold text-primary">{{ formatBaht(netTotal) }}</span>
      </div>

      <div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
        งานในตารางด้านล่าง Trace ตรงจาก Booking → ทะเบียนรถ (ไม่ใช้คนขับประจำปัจจุบันของรถมาไล่ย้อนหลัง) — ค่าน้ำมัน = ลิตร × เรทของงาน,
        ค่าใช้จ่ายประจำรถ = ยอดค่าใช้จ่ายประจำรถของเดือน ÷ จำนวนงานในเดือน (ระบบคำนวณให้) กด "แก้" เพื่อใส่ยอดเองได้ และกด "คำนวณใหม่"
        เพื่อกลับไปใช้ค่าอัตโนมัติ — งานที่ออกเอกสารแล้วล็อกยอดทั้งหมด ต้องยกเลิก/รีเซ็ตก่อนจึงจะแก้ได้
      </div>

      <div v-if="actionError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{{ actionError }}</div>

      <div class="card-lg overflow-x-auto">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 class="font-semibold text-text">ประวัติงาน — รอบ {{ periodLabel }}</h3>
          <div class="flex items-center gap-2 flex-wrap w-full">
            <div class="relative flex-1 min-w-[200px]">
              <span class="material-symbols-rounded text-base text-muted absolute left-2.5 top-1/2 -translate-y-1/2">search</span>
              <input v-model="search" type="text" placeholder="ค้นหาเลขที่งาน / คนขับ / รายละเอียดงาน" class="input-field w-full !pl-8" />
            </div>
            <select v-model="docStatusFilter" class="input-field">
              <option value="NOT_ISSUED">ยังไม่ได้ออก</option>
              <option value="ISSUED">ออกเอกสารแล้ว</option>
            </select>
            <button @click="toggleSelectAll" :disabled="selectableRows.length === 0" class="btn-secondary disabled:opacity-40">
              <span class="material-symbols-rounded text-base">{{ allSelectableChecked ? 'remove_done' : 'done_all' }}</span>
              {{ allSelectableChecked ? 'ยกเลิกเลือกทั้งหมด' : `เลือกทั้งหมด (${selectableRows.length})` }}
            </button>
          </div>
          <div v-if="selectedIds.size > 0" class="flex items-center gap-3 text-sm">
            <span class="text-muted">เลือกแล้ว {{ selectedIds.size }} งาน • สุทธิ <span class="font-bold text-primary">{{ formatBaht(selectedNetTotal) }}</span></span>
            <button v-if="!deductionPanelOpen" @click="openDeductionPanel" class="btn-primary">
              <span class="material-symbols-rounded text-base">receipt_long</span>
              สร้างเอกสาร
            </button>
          </div>
        </div>
        <!-- เลือกรายการหักก่อนออกเอกสาร — คิด % จากรายได้จากงาน (ยอดจริง) ของงานที่เลือก -->
        <div v-if="deductionPanelOpen && selectedIds.size > 0" class="mb-3 rounded-lg border border-primary/40 bg-surface-2 p-4 space-y-3 text-sm">
          <div class="font-semibold text-text">รายการหัก (คิดจากรายได้จากงาน {{ formatBaht(selectedTripTotal) }})</div>
          <div class="flex items-center gap-2 flex-wrap">
            <input type="checkbox" v-model="deductWht" class="w-4 h-4" />
            <span>หักภาษี ณ ที่จ่าย</span>
            <template v-if="deductWht">
              <input v-model.number="whtPercent" type="number" min="0" max="100" step="0.01" placeholder="%" class="input-field !h-8 w-24 text-right" />
              <span>%</span>
              <span class="flex-1 text-right tabular-nums text-red-600">-{{ formatBaht(previewAmount(whtPercent || 0)) }}</span>
            </template>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <input type="checkbox" v-model="deductService" class="w-4 h-4" />
            <span>หักค่าดำเนินการ</span>
            <template v-if="deductService">
              <input v-model.number="servicePercent" type="number" min="0" max="100" step="0.01" placeholder="%" class="input-field !h-8 w-24 text-right" />
              <span>%</span>
              <span class="flex-1 text-right tabular-nums text-red-600">-{{ formatBaht(previewAmount(servicePercent || 0)) }}</span>
            </template>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <input type="checkbox" v-model="deductOther" class="w-4 h-4" />
            <span>หักอื่นๆ</span>
            <template v-if="deductOther">
              <input v-model="otherLabel" type="text" placeholder="ระบุรายการ" class="input-field !h-8 w-48" />
              <input v-model.number="otherPercent" type="number" min="0" max="100" step="0.01" class="input-field !h-8 w-24 text-right" />
              <span>%</span>
              <span class="flex-1 text-right tabular-nums text-red-600">-{{ formatBaht(previewAmount(otherPercent || 0)) }}</span>
            </template>
          </div>
          <div class="border-t border-border pt-3">
            <IncomeAdjustmentEditor v-model="adjustments" />
          </div>
          <div class="flex items-center justify-between border-t border-border pt-3 flex-wrap gap-2">
            <span class="text-muted">
              หัก % รวม <span class="font-semibold text-red-600">{{ formatBaht(previewDeductionTotal) }}</span> • สุทธิ
              <span class="font-bold text-primary">{{ formatBaht(previewNet) }}</span>
            </span>
            <div class="flex gap-2">
              <button @click="deductionPanelOpen = false" class="btn-xs-ghost">ยกเลิก</button>
              <button @click="createDocument" :disabled="creating" class="btn-primary disabled:opacity-40">
                <span class="material-symbols-rounded text-base">receipt_long</span>
                ยืนยันออกเอกสาร
              </button>
            </div>
          </div>
        </div>
        <table class="min-w-[1180px] w-full text-sm border-separate border-spacing-0">
          <thead class="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-2 w-8">
                <input type="checkbox" :checked="allSelectableChecked" :disabled="selectableRows.length === 0" @change="toggleSelectAll" class="w-4 h-4" />
              </th>
              <th class="px-3 py-2 font-semibold">เลขที่งาน</th>
              <th class="px-3 py-2 font-semibold">วันที่</th>
              <th class="px-3 py-2 font-semibold">คนขับ (ของงานนั้นๆ)</th>
              <th class="px-3 py-2 font-semibold">รายละเอียดงาน</th>
              <th class="px-3 py-2 font-semibold text-right">ค่าเที่ยว</th>
              <th class="px-3 py-2 font-semibold text-right">เบี้ยเลี้ยง</th>
              <th class="px-3 py-2 font-semibold text-right">ค่าน้ำมัน</th>
              <th class="px-3 py-2 font-semibold text-right">ค่าใช้จ่ายประจำรถ</th>
              <th class="px-3 py-2 font-semibold">สถานะงาน</th>
              <th class="px-3 py-2 font-semibold">สถานะเอกสาร</th>
              <th class="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in displayedRows" :key="row.booking.id" class="border-t border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2">
                <input
                  v-if="!row.booking.vehicleIncomeDocId"
                  type="checkbox"
                  :checked="selectedIds.has(row.booking.id)"
                  @change="toggleSelect(row.booking.id)"
                  class="w-4 h-4"
                />
              </td>
              <td class="px-3 py-2 font-mono text-text">{{ row.booking.docNo }}</td>
              <td class="px-3 py-2 text-muted">{{ formatDate(row.booking.shipDate || row.booking.completedAt) }}</td>
              <td class="px-3 py-2 text-text">{{ row.booking.driverName || '-' }}</td>
              <td class="px-3 py-2 text-text">{{ destinationLabel(row.booking) }}</td>
              <td v-for="field in moneyFields" :key="field" class="px-3 py-2 text-right whitespace-nowrap">
                <div v-if="isEditing(row.booking.id, field)" class="flex items-center justify-end gap-1">
                  <input v-model.number="draft" type="number" min="0" step="0.01" class="input-field h-8 w-28 text-right text-xs" @keyup.enter="saveCell" />
                  <button @click="saveCell" class="btn-xs">บันทึก</button>
                  <button @click="editingCell = null" class="btn-xs-ghost">ยกเลิก</button>
                </div>
                <template v-else>
                  <div class="flex items-center justify-end gap-1">
                    <span :class="field === 'tripFee' ? 'text-text' : 'text-muted'">{{ formatBaht(cellValue(row.booking, field)) }}</span>
                    <button v-if="!cellBlockedReason(row.booking, field)" @click="startCell(row.booking, field)" class="edit-link" :title="`แก้${fieldLabel[field]}`">
                      <span class="material-symbols-rounded text-sm">edit</span>แก้
                    </button>
                    <span v-else class="text-[11px] text-muted" :title="cellBlockedReason(row.booking, field)">({{ shortReason(cellBlockedReason(row.booking, field)) }})</span>
                  </div>
                  <div v-if="field !== 'tripFee'" class="text-[11px] text-muted">
                    <template v-if="isManual(row.booking, field)">
                      แก้เอง
                      <button v-if="!cellBlockedReason(row.booking, field)" @click="resetCell(row.booking, field)" class="edit-link" title="กลับไปใช้ค่าที่ระบบคำนวณ">คำนวณใหม่</button>
                    </template>
                    <template v-else>{{ field === 'allowance' ? 'ตามงาน' : 'อัตโนมัติ' }}</template>
                  </div>
                </template>
              </td>
              <td class="px-3 py-2">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[row.booking.status]]">{{ bookingStatusLabel[row.booking.status] }}</span>
              </td>
              <td class="px-3 py-2">
                <template v-if="row.booking.vehicleIncomeDocId && vehicleIncomeDocumentsStore.isOrphanedBooking(row.booking)">
                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">ไม่พบเอกสาร</span>
                  <button v-if="vehicleIncomeDocumentsStore.canManage()" @click="releaseOrphan(row.booking)" class="edit-link ml-1" title="ปลดป้ายออกเอกสารแล้ว ให้เลือกออกเอกสารใหม่ได้">
                    <span class="material-symbols-rounded text-sm">lock_open</span>ปลดล็อก
                  </button>
                </template>
                <template v-else-if="row.booking.vehicleIncomeDocId">
                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700">ออกเอกสารแล้ว</span>
                  <button v-if="vehicleIncomeDocumentsStore.canManage()" @click="resetIssued(row.booking)" class="edit-link ml-1" title="เอางานนี้ออกจากเอกสาร ให้แก้ยอด/ออกเอกสารใหม่ได้">
                    <span class="material-symbols-rounded text-sm">restart_alt</span>รีเซ็ต
                  </button>
                </template>
                <span v-else class="text-xs text-muted">-</span>
              </td>
              <td class="px-3 py-2 text-right">
                <RouterLink :to="`/job/${row.booking.id}`" class="text-primary hover:underline text-xs">ดูงาน</RouterLink>
              </td>
            </tr>
            <tr v-if="displayedRows.length === 0">
              <td colspan="12" class="px-3 py-8 text-center text-muted">{{ rows.length ? 'ไม่พบงานที่ตรงกับการค้นหา/ตัวกรอง' : 'ยังไม่มีงานของรถคันนี้ในรอบนี้' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-lg overflow-x-auto">
        <h3 class="font-semibold text-text mb-3">เอกสารที่ออกแล้ว</h3>
        <table class="min-w-[700px] w-full text-sm border-separate border-spacing-0">
          <thead class="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th class="px-3 py-2 font-semibold">เลขที่เอกสาร</th>
              <th class="px-3 py-2 font-semibold">รอบ</th>
              <th class="px-3 py-2 font-semibold text-right">จำนวนงาน</th>
              <th class="px-3 py-2 font-semibold text-right">ยอดสุทธิ</th>
              <th class="px-3 py-2 font-semibold">สถานะจ่าย</th>
              <th class="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in issuedDocuments" :key="doc.id" class="border-t border-border hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2 font-mono text-primary font-semibold">{{ doc.number }}</td>
              <td class="px-3 py-2 text-muted">{{ doc.period }}</td>
              <td class="px-3 py-2 text-right text-text">{{ doc.bookingIds.length }}</td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(doc.netTotal) }}</td>
              <td class="px-3 py-2">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', paymentStatusOf(doc) === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700']">
                  {{ paymentStatusOf(doc) === 'PAID' ? `จ่ายแล้ว${doc.paidDate ? ` (${formatDate(doc.paidDate)})` : ''}` : 'รอจ่าย' }}
                </span>
              </td>
              <td class="px-3 py-2 text-right whitespace-nowrap space-x-3">
                <template v-if="vehicleIncomeDocumentsStore.canManage()">
                  <template v-if="paymentStatusOf(doc) === 'UNPAID'">
                    <button @click="markDocPaid(doc.id)" class="edit-link">
                      <span class="material-symbols-rounded text-sm">payments</span>บันทึกจ่ายแล้ว
                    </button>
                    <button @click="cancelDoc(doc.id, doc.number)" class="inline-flex items-center gap-0.5 text-xs text-red-600 hover:underline">
                      <span class="material-symbols-rounded text-sm">cancel</span>ยกเลิกเอกสาร
                    </button>
                  </template>
                  <button v-else @click="resetDocPayment(doc.id, doc.number)" class="edit-link">
                    <span class="material-symbols-rounded text-sm">undo</span>รีเซ็ตเป็นรอจ่าย
                  </button>
                </template>
                <span v-else class="text-[11px] text-muted">(จัดการเอกสารได้เฉพาะผู้ดูแลระบบ/ฝ่ายบัญชี)</span>
                <RouterLink :to="`/payroll/vendor-fleet/documents/${doc.id}`" class="text-primary hover:underline text-xs">ดู/พิมพ์</RouterLink>
              </td>
            </tr>
            <tr v-if="issuedDocuments.length === 0">
              <td colspan="6" class="px-3 py-8 text-center text-muted">ยังไม่เคยออกเอกสารรายได้ให้รถคันนี้</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-[11px] text-muted">
        ค่าใช้จ่ายประจำรถด้านล่าง (ประกัน/GPS/ค่างวด) เป็นประวัติที่บันทึกไว้ของรถคันนี้ — ตอนนี้ไม่ได้นำมารวมยอดอัตโนมัติแล้ว ให้กรอกยอดต่องานในตารางด้านบนแทน
      </div>
      <VehicleExpensePanel :vehicle-id="vehicle.id" :readonly="!isAdmin" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVehiclesStore } from '@/stores/vehicles'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { isMultiPricing, useBookingStore } from '@/stores/booking'
import {
  computeDeductions,
  useVehicleIncomeDocumentsStore,
  vendorFuelCostOf,
  vendorAllowanceOf,
  paymentStatusOf,
  type VehicleIncomeDeductionOption,
} from '@/stores/vehicleIncomeDocuments'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import VehicleExpensePanel from '@/components/vehicle/VehicleExpensePanel.vue'
import IncomeAdjustmentEditor from '@/components/payroll/IncomeAdjustmentEditor.vue'
import { emptyAdjustments, sumAdjustmentLines, type IncomeAdjustments } from '@/utils/incomeAdjustments'
import type { Booking } from '@/types'

const props = defineProps<{ vehicleId: string }>()
const route = useRoute()
const router = useRouter()
const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()
const bookingStore = useBookingStore()
const vehicleIncomeDocumentsStore = useVehicleIncomeDocumentsStore()
/** ค่าใช้จ่ายประจำรถ (vehicleExpenses) เขียนได้เฉพาะ ADMIN ตาม Firestore Rules — ฝ่ายบัญชีดูอย่างเดียว */
const isAdmin = computed(() => useAuthStore().role === 'ADMIN')

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

/** รอบเดือนเริ่มต้นมาจาก query ?period=YYYY-MM ถ้ามี (เข้ามาจากหน้า /payroll/vendor-fleet ที่เลือกรอบไว้แล้ว) เหมือนหน้าคนขับ */
const period = ref(typeof route.query.period === 'string' ? route.query.period : currentMonthValue())
const periodLabel = computed(() => toBEPeriodLabel(period.value))

/**
 * Trace ตรงจาก Booking.plate -> ทะเบียนรถคันนี้ (เก็บไว้ ณ ตอนจ่ายงานจริง) ไม่ผ่านคนขับปัจจุบันของรถเลย จึงยังเห็นงาน
 * เก่าของรถคันนี้ครบแม้จะเปลี่ยนคนขับไปแล้ว — ตรงตามกฎ "ห้ามใช้ Current Driver มา Join ย้อนหลัง"
 * ค่าน้ำมัน (ลิตร × เรท) และค่าใช้จ่ายประจำรถ (เฉลี่ยต่องานจากยอดเดือน) ระบบคำนวณให้ ผู้ใช้แก้ทับต่องานได้
 */
const rows = computed(() => {
  if (!vehicle.value) return []
  const full = vehiclesStore.fullPlate(vehicle.value)
  return bookingStore.bookings
    .filter((b) => b.status === 'DELIVERED')
    .filter((b) => b.plate === full || b.plate === vehicle.value!.plate)
    .filter((b) => inPeriod(b.shipDate || b.completedAt, period.value))
    .map((b) => ({ booking: b, allowance: vendorAllowanceOf(b), fuelCost: vendorFuelCostOf(b), vehicleExpense: vehicleIncomeDocumentsStore.vehicleExpenseOf(b) }))
    .sort((a, b) => new Date(b.booking.shipDate || b.booking.completedAt || 0).getTime() - new Date(a.booking.shipDate || a.booking.completedAt || 0).getTime())
})

const totalTripFee = computed(() => rows.value.reduce((sum, r) => sum + (r.booking.tripFee || 0), 0))
const totalAllowance = computed(() => rows.value.reduce((sum, r) => sum + r.allowance, 0))
const totalFuelCost = computed(() => rows.value.reduce((sum, r) => sum + r.fuelCost, 0))
const totalVehicleExpense = computed(() => rows.value.reduce((sum, r) => sum + r.vehicleExpense, 0))
const netTotal = computed(() => totalTripFee.value + totalAllowance.value - totalFuelCost.value - totalVehicleExpense.value)

/** ค้นหา (เลขที่งาน/คนขับ/รายละเอียดงาน) + กรองสถานะเอกสาร — การ์ดสรุปด้านบนยังเป็นยอดทั้งรอบ */
const search = ref('')
const docStatusFilter = ref<'ISSUED' | 'NOT_ISSUED'>('NOT_ISSUED')
const displayedRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (docStatusFilter.value === 'ISSUED' && !r.booking.vehicleIncomeDocId) return false
    if (docStatusFilter.value === 'NOT_ISSUED' && r.booking.vehicleIncomeDocId) return false
    if (!q) return true
    return [r.booking.docNo, r.booking.driverName, ...r.booking.items.map((i) => i.siteName)].some((v) => (v || '').toLowerCase().includes(q))
  })
})
const manualCostCount = computed(
  () =>
    rows.value.filter((r) => r.booking.vendorFuelCost !== undefined || r.booking.vendorVehicleExpense !== undefined || r.booking.vendorAllowance !== undefined)
      .length
)

const destinationLabel = (booking: { items: { siteName: string }[] }) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName || '-'
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

/** inline "แก้" ในตาราง — ค่าเที่ยวผ่าน updateBookingPrice (กฎเดิม + ล็อกเมื่อออกเอกสารรายได้รถแล้ว), ค่าน้ำมัน/ค่าใช้จ่ายประจำรถผ่าน updateVendorCosts */
type MoneyField = 'tripFee' | 'allowance' | 'fuelCost' | 'vehicleExpense'
const moneyFields: MoneyField[] = ['tripFee', 'allowance', 'fuelCost', 'vehicleExpense']
const fieldLabel: Record<MoneyField, string> = { tripFee: 'ค่าเที่ยว', allowance: 'ค่าเบี้ยเลี้ยง', fuelCost: 'ค่าน้ำมัน', vehicleExpense: 'ค่าใช้จ่ายประจำรถ' }
/** ช่องที่แก้ผ่าน updateVendorCosts (แก้เอง/คำนวณใหม่ได้) */
const VENDOR_COST_KEY: Record<Exclude<MoneyField, 'tripFee'>, 'fuelCost' | 'vehicleExpense' | 'allowance'> = {
  allowance: 'allowance',
  fuelCost: 'fuelCost',
  vehicleExpense: 'vehicleExpense',
}
const editingCell = ref<{ bookingId: string; field: MoneyField } | null>(null)
const draft = ref<number>(0)
const actionError = ref('')

const cellValue = (b: Booking, field: MoneyField) =>
  field === 'tripFee'
    ? b.tripFee || 0
    : field === 'allowance'
      ? vendorAllowanceOf(b)
      : field === 'fuelCost'
        ? vendorFuelCostOf(b)
        : vehicleIncomeDocumentsStore.vehicleExpenseOf(b)
const isManual = (b: Booking, field: MoneyField) =>
  field === 'allowance' ? b.vendorAllowance !== undefined : field === 'fuelCost' ? b.vendorFuelCost !== undefined : b.vendorVehicleExpense !== undefined
const resetCell = (b: Booking, field: MoneyField) => {
  if (field === 'tripFee') return
  actionError.value = ''
  const result = vehicleIncomeDocumentsStore.updateVendorCosts(b.id, { [VENDOR_COST_KEY[field]]: null })
  if (!result.ok) actionError.value = result.message || 'บันทึกไม่สำเร็จ'
}
const cellBlockedReason = (b: Booking, field: MoneyField) => {
  if (field !== 'tripFee') return vehicleIncomeDocumentsStore.vendorCostEditBlockedReason(b)
  if (isMultiPricing(b)) return 'แยกราคาตามปลายทาง — แก้ที่หน้างาน'
  return bookingStore.tripFeeEditBlockedReason(b)
}
const shortReason = (reason: string) => (reason.includes('เอกสารรายได้รถร่วม') ? 'ออกเอกสารแล้ว' : reason.split(' ')[0])
const isEditing = (bookingId: string, field: MoneyField) => editingCell.value?.bookingId === bookingId && editingCell.value.field === field
const startCell = (b: Booking, field: MoneyField) => {
  editingCell.value = { bookingId: b.id, field }
  draft.value = cellValue(b, field)
  actionError.value = ''
}
const saveCell = () => {
  if (!editingCell.value) return
  const { bookingId, field } = editingCell.value
  const value = Number(draft.value)
  const result =
    field === 'tripFee'
      ? Number.isFinite(value) && value >= 0
        ? bookingStore.updateBookingPrice(bookingId, { tripFee: value, agreedPrice: value })
        : { ok: false, message: 'ค่าเที่ยวต้องเป็นตัวเลขไม่ติดลบ' }
      : vehicleIncomeDocumentsStore.updateVendorCosts(bookingId, { [VENDOR_COST_KEY[field]]: value })
  if (!result.ok) {
    actionError.value = result.message || 'บันทึกไม่สำเร็จ'
    return
  }
  editingCell.value = null
}

/** เลือกงานเพื่อสร้างเอกสารรายได้รถ — งานที่ออกเอกสารไปแล้ว (vehicleIncomeDocId) เลือกซ้ำไม่ได้ ไม่มี checkbox ให้เลย */
const selectedIds = ref<Set<string>>(new Set())
const selectableRows = computed(() => displayedRows.value.filter((r) => !r.booking.vehicleIncomeDocId))
const allSelectableChecked = computed(() => selectableRows.value.length > 0 && selectableRows.value.every((r) => selectedIds.value.has(r.booking.id)))
const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
  selectedIds.value = new Set(selectedIds.value)
}
const toggleSelectAll = () => {
  selectedIds.value = allSelectableChecked.value ? new Set() : new Set(selectableRows.value.map((r) => r.booking.id))
}
const selectedNetTotal = computed(() =>
  rows.value.filter((r) => selectedIds.value.has(r.booking.id)).reduce((sum, r) => sum + (r.booking.tripFee || 0) + r.allowance - r.fuelCost - r.vehicleExpense, 0)
)

const selectedTripTotal = computed(() => rows.value.filter((r) => selectedIds.value.has(r.booking.id)).reduce((sum, r) => sum + (r.booking.tripFee || 0), 0))

// รายการหักที่เลือกก่อนออกเอกสาร (ไม่ติ๊กอะไร = ไม่หัก เหมือนเดิม)
const deductionPanelOpen = ref(false)
const deductWht = ref(false)
const deductService = ref(false)
/** % หักภาษี/ค่าดำเนินการ ให้ผู้ใช้กรอกเองทุกครั้ง (ไม่มีค่าตั้งต้น) */
const whtPercent = ref<number | undefined>()
const servicePercent = ref<number | undefined>()
const deductOther = ref(false)
const otherLabel = ref('')
const otherPercent = ref<number>(0)
const openDeductionPanel = () => {
  actionError.value = ''
  deductionPanelOpen.value = true
}
const deductionOptions = computed<VehicleIncomeDeductionOption[]>(() => [
  ...(deductWht.value ? [{ kind: 'WHT' as const, percent: Number(whtPercent.value) }] : []),
  ...(deductService.value ? [{ kind: 'SERVICE' as const, percent: Number(servicePercent.value) }] : []),
  ...(deductOther.value ? [{ kind: 'OTHER' as const, percent: Number(otherPercent.value), label: otherLabel.value }] : []),
])
const previewAmount = (percent: number) => computeDeductions(selectedTripTotal.value, [{ kind: 'WHT', percent }])[0].amount
const previewDeductionTotal = computed(() => computeDeductions(selectedTripTotal.value, deductionOptions.value).reduce((sum, d) => sum + d.amount, 0))
const adjustments = ref<IncomeAdjustments>(emptyAdjustments())
const previewNet = computed(
  () => selectedNetTotal.value - previewDeductionTotal.value + sumAdjustmentLines(adjustments.value.additions) - sumAdjustmentLines(adjustments.value.deductions)
)

const creating = ref(false)
const createDocument = async () => {
  if (!vehicle.value || selectedIds.value.size === 0 || creating.value) return
  actionError.value = ''
  creating.value = true
  const result = await vehicleIncomeDocumentsStore.createVehicleIncomeDocument(vehicle.value.id, [...selectedIds.value], period.value, deductionOptions.value, adjustments.value)
  creating.value = false
  if (!result.ok || !result.doc) {
    actionError.value = `สร้างเอกสารไม่สำเร็จ — ${result.message || 'กรุณารีเฟรชหน้านี้แล้วลองใหม่'}`
    return
  }
  selectedIds.value = new Set()
  deductionPanelOpen.value = false
  adjustments.value = emptyAdjustments()
  router.push(`/payroll/vendor-fleet/documents/${result.doc.id}`)
}

const issuedDocuments = computed(() => (vehicle.value ? vehicleIncomeDocumentsStore.documentsForVehicle(vehicle.value.id) : []))
const cancelDoc = async (docId: string, number: string) => {
  if (!confirm(`ยืนยันยกเลิกเอกสาร ${number}? เอกสารจะถูกลบ และงานในเอกสารจะกลับมาแก้ยอด/เลือกออกเอกสารใหม่ได้`)) return
  actionError.value = ''
  const result = await vehicleIncomeDocumentsStore.cancelVehicleIncomeDocument(docId)
  if (!result.ok) actionError.value = result.message || 'ยกเลิกเอกสารไม่สำเร็จ'
}
const resetIssued = async (booking: Booking) => {
  const doc = vehicleIncomeDocumentsStore.documents.find((d) => d.id === booking.vehicleIncomeDocId)
  const lastJob = (doc?.bookingIds.length ?? 0) <= 1
  const msg = lastJob
    ? `งาน ${booking.docNo} เป็นงานสุดท้ายในเอกสาร ${doc?.number ?? ''} — รีเซ็ตแล้วเอกสารจะถูกยกเลิกทั้งใบ ยืนยัน?`
    : `ยืนยันเอางาน ${booking.docNo} ออกจากเอกสาร ${doc?.number ?? ''}? ยอดในเอกสารจะคำนวณใหม่จากงานที่เหลือ และงานนี้จะกลับมาแก้ยอด/ออกเอกสารใหม่ได้`
  if (!confirm(msg)) return
  actionError.value = ''
  const result = await vehicleIncomeDocumentsStore.removeBookingFromDocument(booking.id)
  if (!result.ok) actionError.value = result.message || 'รีเซ็ตไม่สำเร็จ'
}
const runDocAction = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
  actionError.value = ''
  const result = await action()
  if (!result.ok) actionError.value = result.message || 'ดำเนินการไม่สำเร็จ'
}
const markDocPaid = (docId: string) => {
  if (!confirm('ยืนยันบันทึกว่าจ่ายเงินเอกสารนี้แล้ว (วันที่จ่าย = วันนี้ แก้ได้ที่หน้าเอกสาร)?')) return
  runDocAction(() => vehicleIncomeDocumentsStore.recordPayment(docId))
}
const resetDocPayment = (docId: string, number: string) => {
  if (!confirm(`ยืนยันรีเซ็ตเอกสาร ${number} จาก "จ่ายแล้ว" กลับเป็น "รอจ่าย"?`)) return
  runDocAction(() => vehicleIncomeDocumentsStore.resetPayment(docId))
}
const releaseOrphan = (booking: Booking) => {
  if (!confirm(`งาน ${booking.docNo} ติดป้าย "ออกเอกสารแล้ว" แต่ไม่พบเอกสารในระบบ — ยืนยันปลดล็อกให้เลือกออกเอกสารใหม่ได้?`)) return
  actionError.value = ''
  const result = vehicleIncomeDocumentsStore.releaseOrphanedBooking(booking.id)
  if (!result.ok) actionError.value = result.message || 'ปลดล็อกไม่สำเร็จ'
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-primary {
  @apply h-9 px-3 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-xs {
  @apply h-8 px-2 rounded-lg border-0 bg-primary text-white font-semibold text-xs cursor-pointer hover:opacity-90;
}

.btn-xs-ghost {
  @apply h-8 px-2 rounded-lg border border-border bg-surface text-text text-xs cursor-pointer hover:bg-surface-2;
}

.edit-link {
  @apply inline-flex items-center gap-0.5 text-xs font-normal text-primary hover:underline;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
