<template>
  <div class="space-y-6">
    <!-- Search -->
    <div class="flex gap-3 flex-wrap">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาเลขที่เอกสาร, ลูกค้า, ชื่อหน้างาน, ทะเบียนรถ..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
    </div>

    <!-- Job Status Table (single fleet) -->
    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">ตารางสถานะงาน · {{ fleet === 'cements' ? 'Fleet Cements' : 'Fleet Ceramics' }}</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ชื่อหน้างาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">อำเภอ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สินค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">เบอร์โทรหน้างาน</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">น้ำมัน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ทะเบียนรถ / คนขับ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in filteredBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
              <td class="px-4 py-3 text-text">{{ booking.customer }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ booking.siteName }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.district }}</td>
              <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.sitePhone || '-' }}</td>
              <td class="px-4 py-3 text-right text-text">{{ booking.fuelLiters || 0 }} ล.</td>
              <td class="px-4 py-3 text-text">
                <div class="font-semibold">{{ booking.plate || '-' }}</div>
                <div class="text-xs text-muted">{{ booking.driverName || '-' }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                  <span v-if="booking.status === 'PENDING_ACCEPT'" class="text-[11px] text-muted">
                    เหลือ {{ formatCountdown(remainingAcceptSeconds(booking)) }}
                  </span>
                  <span
                    v-if="booking.status === 'DELIVERED' && booking.billingStatus"
                    :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[booking.billingStatus]]"
                  >
                    {{ billingStatusLabel[booking.billingStatus] }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="openViewDialog(booking)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button v-if="booking.status === 'WAITING_DISPATCH'" @click="openDispatchDialog(booking)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">local_shipping</span>
                    กรอกทะเบียน / ส่งงาน
                  </button>
                  <button v-else-if="booking.status === 'DISPATCHED'" @click="bookingStore.startTransit(booking.id)" class="btn-sm text-indigo-700">
                    <span class="material-symbols-rounded text-base">directions</span>
                    เริ่มขนส่ง
                  </button>
                  <button v-else-if="booking.status === 'IN_TRANSIT'" @click="openCompleteDialog(booking)" class="btn-sm text-green-700">
                    <span class="material-symbols-rounded text-base">task_alt</span>
                    จบงาน
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredBookings.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Dispatch Dialog -->
    <Teleport to="body" v-if="dispatchTarget">
      <div @click="dispatchTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ส่งงาน {{ dispatchTarget.docNo }}</div>
            <button @click="dispatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ *</label>
              <input v-model="dispatchForm.plate" placeholder="เช่น 82-4417 กรุงเทพ" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">คนขับ</label>
              <select v-model="dispatchForm.driverName" class="input-field w-full">
                <option value="">เลือกคนขับ...</option>
                <option v-for="name in driverOptions" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
            <div class="text-xs font-semibold text-muted pt-2 border-t border-border">
              ข้อมูลหน้างาน (ใส่ทีหลังได้)
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน</label>
              <input v-model="dispatchForm.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน</label>
              <input v-model="dispatchForm.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">พิกัดหน้างาน</label>
              <input v-model="dispatchForm.siteCoords" placeholder="โลเคชั่นหน้างาน" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="dispatchTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmDispatch" :disabled="!dispatchForm.plate" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">send</span>
              ส่งงาน
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Complete Job Dialog (เพิ่ม/ลดหนี้) -->
    <Teleport to="body" v-if="completeTarget">
      <div @click="completeTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <div class="font-bold text-text">จบงาน {{ completeTarget.docNo }}</div>
              <div class="text-xs text-muted">เพิ่ม/ลดหนี้ กระทบยอดกับค่าแรงคนขับในเที่ยวนี้</div>
            </div>
            <button @click="completeTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">เบี้ยเลี้ยงเดิม</span>
              <span class="font-bold text-text">{{ formatBaht(completeTarget.allowance) }}</span>
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
            <button @click="completeTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmComplete" class="btn-primary">
              <span class="material-symbols-rounded">task_alt</span>
              ยืนยันจบงาน
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Details Dialog -->
    <Teleport to="body" v-if="viewTarget">
      <div @click="viewTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div>
              <div class="font-bold text-text">รายละเอียดงาน {{ viewTarget.docNo }}</div>
              <div class="text-xs text-muted">{{ viewTarget.customer }}</div>
            </div>
            <button @click="viewTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex gap-2">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[viewTarget.status]]">{{ bookingStatusLabel[viewTarget.status] }}</span>
                <span
                  v-if="viewTarget.status === 'DELIVERED' && viewTarget.billingStatus"
                  :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[viewTarget.billingStatus]]"
                >
                  {{ billingStatusLabel[viewTarget.billingStatus] }}
                </span>
              </div>
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', viewTarget.category === 'cements' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700']">
                {{ viewTarget.category === 'cements' ? 'Fleet Cements' : 'Fleet Ceramics' }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-muted">ชื่อหน้างาน:</span> {{ viewTarget.siteName }}</div>
              <div><span class="text-muted">อำเภอ:</span> {{ viewTarget.district }}</div>
              <div class="col-span-2"><span class="text-muted">สินค้า:</span> {{ productLabel(viewTarget) }}</div>
              <div v-if="viewTarget.jobType"><span class="text-muted">ประเภทงาน:</span> {{ viewTarget.jobType }}</div>
              <div><span class="text-muted">เบอร์โทรหน้างาน:</span> {{ viewTarget.sitePhone || '-' }}</div>
              <div><span class="text-muted">พิกัดหน้างาน:</span> {{ viewTarget.siteCoords || '-' }}</div>
              <div><span class="text-muted">ทะเบียนรถ:</span> {{ viewTarget.plate || '-' }}</div>
              <div><span class="text-muted">คนขับ:</span> {{ viewTarget.driverName || '-' }}</div>
              <div v-if="viewTarget.dispatchedAt">
                <span class="text-muted">วันที่จ่ายงาน:</span> {{ formatDate(viewTarget.dispatchedAt) }}
              </div>
              <div v-if="viewTarget.transitStartedAt">
                <span class="text-muted">วันที่เดินทาง/เริ่มงาน:</span> {{ formatDate(viewTarget.transitStartedAt) }}
              </div>
              <div v-if="viewTarget.completedAt" class="col-span-2">
                <span class="text-muted">วันที่ส่งของ (ของถึง/พนักงานขับรถกดจบงาน):</span> {{ formatDate(viewTarget.completedAt) }}
              </div>
            </div>

            <div v-if="!canEditPrice(viewTarget)" class="grid grid-cols-2 gap-3">
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">ค่าเที่ยว</div>
                <div class="font-bold text-text">{{ formatBaht(viewTarget.tripFee) }}</div>
              </div>
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">ราคาที่ตกลง</div>
                <div class="font-bold text-text">{{ formatBaht(viewTarget.agreedPrice) }}</div>
              </div>
            </div>
            <div v-else class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว</label>
                <input v-model.number="priceForm.tripFee" type="number" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ราคาที่ตกลง</label>
                <input v-model.number="priceForm.agreedPrice" type="number" class="input-field w-full" />
              </div>
              <div class="col-span-2 flex justify-end">
                <button @click="savePrice" class="btn-sm text-primary">
                  <span class="material-symbols-rounded text-base">save</span>
                  บันทึกราคา
                </button>
              </div>
            </div>
            <div v-if="viewTarget.status !== 'WAITING_DISPATCH' && !isAdmin" class="text-[11px] text-muted -mt-2">
              ราคาถูกล็อกหลังจัดรถแล้ว แก้ไขได้เฉพาะผู้ดูแลระบบ (Admin)
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">น้ำมัน</div>
                <div class="font-bold text-text">{{ viewTarget.fuelLiters || 0 }} ล. x {{ formatBaht(viewTarget.fuelRate) }}</div>
              </div>
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">เบี้ยเลี้ยง</div>
                <div class="font-bold text-text">{{ formatBaht(viewTarget.allowance) }}</div>
              </div>
              <div v-if="viewTarget.finalAllowance !== undefined" class="bg-primary text-white rounded-lg p-3 col-span-2">
                <div class="text-xs opacity-90 mb-1">เบี้ยเลี้ยงสุทธิ</div>
                <div class="font-bold">{{ formatBaht(viewTarget.finalAllowance) }}</div>
              </div>
            </div>

            <div v-if="viewTarget.extraCharges?.length">
              <div class="text-xs font-semibold text-muted mb-1">ค่าใช้จ่ายเพิ่มเติม (extra)</div>
              <div v-for="extra in viewTarget.extraCharges" :key="extra.id" class="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                <span class="text-text">{{ extra.label }}</span>
                <span class="text-text">{{ formatBaht(extra.amount) }}</span>
              </div>
            </div>

            <div v-if="viewTarget.debtAdjustments?.length">
              <div class="text-xs font-semibold text-muted mb-1">รายการเพิ่ม/ลดหนี้</div>
              <div v-for="adj in viewTarget.debtAdjustments" :key="adj.id" class="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                <span class="text-text">{{ adj.label || '-' }}</span>
                <span :class="adj.amount >= 0 ? 'text-red-500' : 'text-green-600'">{{ adj.amount >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(adj.amount)) }}</span>
              </div>
            </div>

            <div v-if="viewTarget.podImage">
              <div class="text-xs font-semibold text-muted mb-1">รูปหลักฐานการส่งมอบสินค้า (POD)</div>
              <img :src="viewTarget.podImage" class="w-full max-h-64 object-contain rounded-lg border border-border" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="viewTarget = null" class="btn-secondary">ปิด</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useAppStore } from '@/stores/app'
import type { Booking, BookingCategory, BookingStatus, DebtAdjustment } from '@/types'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'

const props = defineProps<{ fleet: BookingCategory }>()

const bookingStore = useBookingStore()
const appStore = useAppStore()

const searchQuery = ref('')

// นาฬิกาสำหรับนับถอยหลังเวลาที่เหลือให้คนขับตอบรับงาน (PENDING_ACCEPT)
const now = ref(Date.now())
let clockTimer: number
onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(clockTimer))

const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000
const remainingAcceptSeconds = (booking: Booking) => {
  if (!booking.dispatchedAt) return 0
  const deadline = new Date(booking.dispatchedAt).getTime() + ACCEPT_TIMEOUT_MS
  return Math.max(0, Math.floor((deadline - now.value) / 1000))
}
const formatCountdown = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

const driverOptions = ['สมชาย ทองดี', 'ประเสริฐ มั่นคง', 'วิรัตน์ ใจกล้า', 'สมหมาย เพียรงาน', 'ธีรพงษ์ ขยันยิ่ง']

const isAdmin = computed(() => appStore.currentRole === 'admin')

const statusRank: Record<BookingStatus, number> = {
  WAITING_DISPATCH: 0,
  PENDING_ACCEPT: 1,
  DISPATCHED: 2,
  IN_TRANSIT: 3,
  DELIVERED: 4,
}

const sortedBookings = computed(() =>
  bookingStore.bookings
    .filter((b) => b.category === props.fleet)
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status]
      if (rankDiff !== 0) return rankDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
)

const filteredBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sortedBookings.value
  return sortedBookings.value.filter(
    (b) =>
      b.docNo.toLowerCase().includes(q) ||
      b.customer.toLowerCase().includes(q) ||
      b.siteName.toLowerCase().includes(q) ||
      (b.plate || '').toLowerCase().includes(q)
  )
})

const productLabel = (booking: Booking) => {
  if (booking.category === 'ceramics') return 'ปูนซีเมนต์'
  const types = (booking.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

// --- View details & price edit ---
const viewTarget = ref<Booking | null>(null)
const priceForm = ref({ tripFee: 0, agreedPrice: 0 })

/** ราคาแก้ไขได้อิสระตอน WAITING_DISPATCH เท่านั้น หลังจากนั้นต้องเป็น admin */
const canEditPrice = (booking: Booking) => booking.status === 'WAITING_DISPATCH' || isAdmin.value

const openViewDialog = (booking: Booking) => {
  viewTarget.value = booking
  priceForm.value = { tripFee: booking.tripFee, agreedPrice: booking.agreedPrice }
}

const savePrice = () => {
  if (!viewTarget.value) return
  bookingStore.updateBookingPrice(viewTarget.value.id, priceForm.value)
}

// --- Dispatch flow ---
const dispatchTarget = ref<Booking | null>(null)
const dispatchForm = ref({ plate: '', driverName: '', siteContactName: '', sitePhone: '', siteCoords: '' })

const openDispatchDialog = (booking: Booking) => {
  dispatchTarget.value = booking
  dispatchForm.value = {
    plate: '',
    driverName: '',
    siteContactName: booking.siteContactName || '',
    sitePhone: booking.sitePhone || '',
    siteCoords: booking.siteCoords || '',
  }
}

const confirmDispatch = () => {
  if (!dispatchTarget.value || !dispatchForm.value.plate) return
  bookingStore.dispatchBooking(dispatchTarget.value.id, dispatchForm.value.plate, {
    driverName: dispatchForm.value.driverName || undefined,
    siteContactName: dispatchForm.value.siteContactName || undefined,
    sitePhone: dispatchForm.value.sitePhone || undefined,
    siteCoords: dispatchForm.value.siteCoords || undefined,
  })
  dispatchTarget.value = null
}

// --- Complete job flow ---
const completeTarget = ref<Booking | null>(null)
const debtAdjustments = ref<DebtAdjustment[]>([])

const openCompleteDialog = (booking: Booking) => {
  completeTarget.value = booking
  debtAdjustments.value = []
}

const addAdjustmentRow = () => {
  debtAdjustments.value.push({ id: `adj${Date.now()}${debtAdjustments.value.length}`, label: '', amount: 0 })
}

const finalAllowance = computed(() => {
  if (!completeTarget.value) return 0
  const net = debtAdjustments.value.reduce((sum, d) => sum + (d.amount || 0), 0)
  return Math.round((completeTarget.value.allowance || 0) - net)
})

const confirmComplete = () => {
  if (!completeTarget.value) return
  bookingStore.completeJob(completeTarget.value.id, debtAdjustments.value.filter((d) => d.label || d.amount))
  completeTarget.value = null
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
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.animate-fade {
  animation: tmsfade 0.2s ease both;
}

.animate-slide {
  animation: tmsslide 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

@keyframes tmsfade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes tmsslide {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
