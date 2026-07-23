<template>
  <div class="min-h-screen bg-primary flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary to-blue-700 text-white p-5 flex-shrink-0">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded">local_shipping</span>
            <div class="font-bold">Driver App</div>
          </div>
          <button @click="logout" title="ออกจากระบบ" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <span class="material-symbols-rounded text-lg">logout</span>
          </button>
        </div>
        <div class="text-xs opacity-90 mb-3">ระบบสำหรับพนักงานขับรถ · THANTHARA</div>
        <select
          v-model="selectedDriver"
          :disabled="isDriverRole"
          class="w-full h-10 px-3 rounded-lg text-sm font-semibold text-text bg-white/95 border-0 outline-none disabled:opacity-80"
        >
          <option v-for="name in driverOptions" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5">
        <!-- Assigned Jobs -->
        <div>
          <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">งานที่ได้รับมอบหมาย</div>

          <div v-if="activeJobs.length === 0" class="text-center py-8 text-muted text-sm">
            <span class="material-symbols-rounded text-3xl block mb-2">inbox</span>
            ไม่มีงานที่ได้รับมอบหมายในขณะนี้
          </div>

          <div
            v-for="job in activeJobs"
            :key="job.id"
            class="border border-border rounded-2xl p-4 mb-3 space-y-2 last:mb-0"
          >
            <div class="flex items-center justify-between">
              <div class="font-bold text-primary">{{ job.docNo }}</div>
              <div class="flex gap-1">
                <span
                  :class="[
                    'text-xs font-semibold px-2 py-1 rounded-full',
                    job.category === 'cements' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700',
                  ]"
                >
                  {{ job.category === 'cements' ? 'Cements' : 'Ceramics' }}
                </span>
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[job.status]]">
                  {{ bookingStatusLabel[job.status] }}
                </span>
              </div>
            </div>
            <div class="text-xs text-text"><span class="text-muted">ต้องรับน้ำมันทั้งหมด:</span> {{ job.fuelLiters || 0 }} ล.</div>
            <div
              v-for="(dest, idx) in job.destinations"
              :key="dest.id"
              class="rounded-xl bg-surface-2 p-2.5 space-y-1.5"
            >
              <div class="text-sm font-semibold text-text">
                {{ idx + 1 }}. {{ dest.name }} <span class="text-xs text-muted font-normal">({{ dest.province }} · {{ dest.district }})</span>
              </div>
              <div v-for="item in dest.items" :key="item.id" class="text-xs text-text">
                <span class="text-muted">สินค้า:</span> {{ item.product }} {{ item.qty }} {{ item.unit }}
                <span v-if="item.jobType" class="text-muted">· {{ item.jobType }}</span>
              </div>
              <div class="flex gap-2 pt-1">
                <a
                  :href="dest.contactPhone ? `tel:${dest.contactPhone}` : undefined"
                  :class="[
                    'flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5',
                    dest.contactPhone ? 'bg-primary text-white' : 'bg-white text-muted cursor-not-allowed pointer-events-none',
                  ]"
                >
                  <span class="material-symbols-rounded text-sm">call</span>
                  {{ dest.contactPhone || 'ไม่มีเบอร์โทร' }}
                </a>
                <a
                  :href="navigateUrl(dest) || undefined"
                  target="_blank"
                  :class="[
                    'flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-border',
                    navigateUrl(dest) ? 'text-text bg-white' : 'text-muted bg-white cursor-not-allowed pointer-events-none',
                  ]"
                >
                  <span class="material-symbols-rounded text-sm">near_me</span>
                  นำทาง
                </a>
              </div>
              <div v-if="job.status === 'IN_TRANSIT' || job.status === 'DELIVERING'" class="pt-1">
                <button
                  v-if="dest.deliveryStatus !== 'DELIVERED'"
                  @click="openDeliverDestination(job, dest)"
                  class="w-full h-8 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-rounded text-sm">task_alt</span>
                  ส่งของจุดนี้
                </button>
                <div v-else class="w-full h-8 rounded-lg bg-green-50 text-green-700 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <span class="material-symbols-rounded text-sm">check_circle</span>
                  ส่งแล้ว (ผู้รับ: {{ dest.deliveredBy }})
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between px-1 pt-1">
              <div v-for="(step, i) in jobSteps(job)" :key="i" class="flex-1 flex flex-col items-center gap-1">
                <div
                  :class="[
                    'w-2.5 h-2.5 rounded-full',
                    step.done ? 'bg-green-500' : step.current ? 'bg-primary' : 'bg-surface-2 border border-border',
                  ]"
                ></div>
                <div :class="['text-[9px] text-center leading-tight', step.current ? 'text-primary font-semibold' : 'text-muted']">
                  {{ step.label }}
                </div>
              </div>
              <div v-if="job.status === 'IN_TRANSIT' || job.status === 'DELIVERING'" class="flex-1 flex flex-col items-center gap-1">
                <div class="w-2.5 h-2.5 rounded-full bg-primary"></div>
                <div class="text-[9px] text-center leading-tight text-primary font-semibold">{{ tripProgressLabel(job) }}</div>
              </div>
            </div>
            <div v-if="job.status === 'ASSIGNED'" class="space-y-1.5">
              <div class="text-[11px] text-center text-muted">
                กรุณาตอบรับภายใน {{ formatCountdown(remainingAcceptSeconds(job)) }} มิฉะนั้นงานจะถูกจัดให้คนขับคนอื่นอัตโนมัติ
              </div>
              <div class="flex gap-2">
                <button
                  @click="declineJob(job)"
                  class="flex-1 h-9 rounded-lg border border-red-300 text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-rounded text-base">cancel</span>
                  ไม่รับงาน
                </button>
                <button
                  @click="bookingStore.acceptDispatch(job.id)"
                  class="flex-1 h-9 rounded-lg bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-rounded text-base">how_to_reg</span>
                  ตอบรับงาน
                </button>
              </div>
            </div>
            <button
              v-else-if="job.status === 'ACCEPTED'"
              @click="bookingStore.markFuelReceived(job.id)"
              class="w-full h-9 rounded-lg bg-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">local_gas_station</span>
              รับน้ำมัน
            </button>
            <button
              v-else-if="job.status === 'FUEL_RECEIVED'"
              @click="bookingStore.startLoading(job.id)"
              class="w-full h-9 rounded-lg bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">inventory_2</span>
              เริ่มรับสินค้า
            </button>
            <button
              v-else-if="job.status === 'LOADING'"
              @click="openConfirmLoaded(job)"
              class="w-full h-9 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">check_circle</span>
              ยืนยันรับสินค้าครบ
            </button>
            <button
              v-else-if="job.status === 'LOADED'"
              @click="bookingStore.startTransit(job.id)"
              class="w-full h-9 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">directions</span>
              เริ่มขนส่ง
            </button>
          </div>
        </div>

        <!-- Recent Trips / Income -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-muted uppercase tracking-wide">เที่ยวล่าสุด</div>
            <div class="text-xs font-bold text-primary">รวม {{ formatBaht(totalRecentIncome) }}</div>
          </div>
          <div v-if="recentJobs.length === 0" class="text-center py-6 text-muted text-sm">ยังไม่มีประวัติเที่ยวงาน</div>
          <div v-for="job in recentJobs" :key="job.id" class="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div class="min-w-0">
              <div class="text-sm font-semibold text-text truncate">{{ job.docNo }} · {{ destinationLabel(job) }}</div>
              <div class="text-xs text-muted">{{ formatDate(job.completedAt) }}</div>
            </div>
            <div class="text-sm font-bold text-green-600 whitespace-nowrap">{{ formatBaht(job.finalAllowance ?? job.allowance) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Goods Received Modal -->
    <Teleport to="body" v-if="loadingTarget">
      <div @click="closeConfirmLoaded" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-4">
        <div @click.stop class="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="font-bold text-text">ยืนยันรับสินค้าครบ {{ loadingTarget.docNo }}</div>
            <button @click="closeConfirmLoaded" class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>
          <div class="p-5 space-y-3">
            <div class="text-xs text-muted">ยืนยันว่ารับสินค้าครบทุกรายการแล้ว ระบบจะตัดสต๊อกสินค้าออกจากคลังต้นทางทันที</div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ผู้ดำเนินการรับสินค้า</label>
              <input v-model="goodsReceivedByInput" placeholder="ชื่อผู้รับสินค้า" class="w-full h-9 px-3 rounded-lg border border-border text-sm" />
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button @click="closeConfirmLoaded" class="h-9 px-4 rounded-lg border border-border text-sm font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmLoaded"
              class="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">check_circle</span>
              ยืนยันรับสินค้าครบ
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Deliver Destination with POD Modal -->
    <Teleport to="body" v-if="deliverTarget">
      <div @click="closeDeliverDestination" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-4">
        <div @click.stop class="w-full max-w-sm bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="font-bold text-text">ส่งของจุดนี้ {{ deliverTarget.destination.name }}</div>
            <button @click="closeDeliverDestination" class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้รับสินค้า</label>
              <input v-model="deliveredByInput" placeholder="ชื่อผู้รับสินค้า" class="w-full h-9 px-3 rounded-lg border border-border text-sm" />
            </div>
            <div v-if="isLastPendingDestination">
              <label class="block text-xs font-semibold text-muted mb-1">เลขไมล์สิ้นสุด (กม.) <span class="font-normal text-[10px]">(จุดส่งสุดท้ายของงานนี้)</span></label>
              <input v-model.number="podOdometerAfter" type="number" placeholder="0" class="w-full h-9 px-3 rounded-lg border border-border text-sm" />
            </div>
            <div class="text-xs text-muted">
              ต้องแนบรูปหลักฐานการส่งมอบสินค้า (POD) ของจุดนี้ให้ถูกต้องก่อนจึงจะกดยืนยันได้
            </div>
            <label class="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all">
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="onPodSelected" />
              <img v-if="podPreview" :src="podPreview" class="max-h-48 mx-auto rounded-lg object-contain" />
              <template v-else>
                <span class="material-symbols-rounded text-3xl text-muted block mb-1">add_a_photo</span>
                <div class="text-sm text-muted">แตะเพื่อถ่ายรูป/แนบรูป POD</div>
              </template>
            </label>
            <div v-if="podError" class="text-xs text-red-600 flex items-center gap-1">
              <span class="material-symbols-rounded text-sm">error</span>
              {{ podError }}
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button @click="closeDeliverDestination" class="h-9 px-4 rounded-lg border border-border text-sm font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmDeliverDestination"
              :disabled="!podPreview || !deliveredByInput"
              class="h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">task_alt</span>
              ยืนยันส่งของจุดนี้
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import type { Booking, Destination } from '@/types'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'

const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()

const driverOptions = ['สมชาย ทองดี', 'ประเสริฐ มั่นคง', 'วิรัตน์ ใจกล้า', 'สมหมาย เพียรงาน', 'ธีรพงษ์ ขยันยิ่ง']

// เข้าสู่ระบบด้วยบัญชีคนขับ (role: driver) ให้ล็อกชื่อตามผู้ใช้ที่ล็อกอิน แยกจากมุมมองแอดมิน
const isDriverRole = computed(() => authStore.role === 'driver')
const selectedDriver = ref(
  isDriverRole.value && driverOptions.includes(authStore.userName) ? authStore.userName : driverOptions[0]
)

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'DELIVERING'] as const

const activeJobs = computed(() =>
  bookingStore.bookings.filter(
    (b) => b.driverName === selectedDriver.value && (ACTIVE_STATUSES as readonly string[]).includes(b.status)
  )
)

// นาฬิกาสำหรับนับถอยหลังเวลาที่เหลือให้ตอบรับงาน
const now = ref(Date.now())
let clockTimer: number
onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(clockTimer))

const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000
const remainingAcceptSeconds = (job: Booking) => {
  if (!job.dispatchedAt) return 0
  const deadline = new Date(job.dispatchedAt).getTime() + ACCEPT_TIMEOUT_MS
  return Math.max(0, Math.floor((deadline - now.value) / 1000))
}
const formatCountdown = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

// ขั้นตอนงานของคนขับ 5 ช่วงแรก: ตอบรับ -> รับน้ำมัน -> รับสินค้า -> ยืนยันรับสินค้าครบ -> เดินทาง/ขนส่ง
// หลังจากนั้นสถานะการส่งของแยกเป็นรายปลายทาง (Destination) ไม่ใช่ขั้นตอนเดียวของทั้งงานอีกต่อไป ดูที่ tripProgressLabel แทน
const jobSteps = (job: Booking) => {
  const order = ['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED']
  const labels = ['รับงาน', 'รับน้ำมัน', 'เริ่มรับสินค้า', 'รับสินค้าครบ', 'เดินทาง/ขนส่ง']
  const idx = order.indexOf(job.status)
  const stepIndex = idx === -1 ? labels.length : idx
  return labels.map((label, i) => ({
    label,
    done: i < stepIndex,
    current: i === stepIndex && job.status !== 'IN_TRANSIT' && job.status !== 'DELIVERING',
  }))
}

/** จำนวนปลายทางที่ส่งของสำเร็จแล้วของงานนี้ */
const deliveredCount = (job: Booking) => job.destinations.filter((d) => d.deliveryStatus === 'DELIVERED').length

/** ป้าย "เที่ยวที่ N/M" อิงจากจำนวนปลายทางที่ส่งสำเร็จแล้ว/ทั้งหมด ใช้แทนขั้นตอนสุดท้ายของ stepper ระหว่าง IN_TRANSIT/DELIVERING */
const tripProgressLabel = (job: Booking) => `เที่ยวที่ ${Math.min(deliveredCount(job) + 1, job.destinations.length)}/${job.destinations.length}`

const declineJob = (job: Booking) => {
  if (!window.confirm(`ยืนยันไม่รับงาน ${job.docNo}? งานนี้จะถูกส่งกลับไปรอจัดคนขับใหม่`)) return
  bookingStore.declineDispatch(job.id)
}

const recentJobs = computed(() =>
  bookingStore.bookings
    .filter((b) => b.driverName === selectedDriver.value && b.status === 'DELIVERED')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 5)
)

const totalRecentIncome = computed(() =>
  recentJobs.value.reduce((sum, b) => sum + (b.finalAllowance ?? b.allowance ?? 0), 0)
)

const destinationLabel = (booking: Booking) => {
  if (!booking.destinations.length) return '-'
  const first = booking.destinations[0].name
  return booking.destinations.length > 1 ? `${first} +${booking.destinations.length - 1} ที่อื่น` : first
}

/** ลิงก์นำทาง: ใช้ลิงก์/พิกัดที่ผู้ใช้กรอกไว้ก่อน ถ้าไม่มีแต่มีพิกัดตัวเลขที่ parse ได้ ให้สร้างลิงก์ค้นหาจากพิกัดนั้นแทน */
const navigateUrl = (dest: Destination) => {
  if (dest.mapUrl) return /^https?:\/\//.test(dest.mapUrl) ? dest.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.mapUrl)}`
  if (dest.latitude !== undefined && dest.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${dest.latitude},${dest.longitude}`
  }
  return ''
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

// --- Confirm goods received at origin (LOADING -> LOADED, deducts stock once for the whole job) ---
const loadingTarget = ref<Booking | null>(null)
const goodsReceivedByInput = ref('')

const openConfirmLoaded = (job: Booking) => {
  loadingTarget.value = job
  goodsReceivedByInput.value = job.driverName || ''
}

const closeConfirmLoaded = () => {
  loadingTarget.value = null
}

const confirmLoaded = () => {
  if (!loadingTarget.value) return
  bookingStore.confirmGoodsReceived(loadingTarget.value.id, goodsReceivedByInput.value || undefined)
  closeConfirmLoaded()
}

// --- Deliver a single Destination (stop) with its own POD photo + recipient name ---
const deliverTarget = ref<{ booking: Booking; destination: Destination } | null>(null)
const deliveredByInput = ref('')
const podPreview = ref<string | null>(null)
const podError = ref('')
const podOdometerAfter = ref(0)

/** จุดนี้เป็นปลายทางสุดท้ายที่ยังไม่ส่งของงานนี้หรือไม่ (ถ้าใช่ ต้องกรอกเลขไมล์สิ้นสุดด้วย เพราะเป็นจุดที่ปิดงานทั้งใบ) */
const isLastPendingDestination = computed(() => {
  if (!deliverTarget.value) return false
  return deliverTarget.value.booking.destinations.filter((d) => d.deliveryStatus !== 'DELIVERED').length === 1
})

const openDeliverDestination = (job: Booking, destination: Destination) => {
  deliverTarget.value = { booking: job, destination }
  deliveredByInput.value = ''
  podPreview.value = null
  podError.value = ''
  podOdometerAfter.value = job.odometerAfter || 0
}

const closeDeliverDestination = () => {
  deliverTarget.value = null
}

const onPodSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  podError.value = ''
  podPreview.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) {
    podError.value = 'ไฟล์ที่แนบไม่ใช่รูปภาพ กรุณาแนบรูป POD ที่ถูกต้อง'
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    podPreview.value = reader.result as string
  }
  reader.onerror = () => {
    podError.value = 'ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่'
  }
  reader.readAsDataURL(file)
}

const confirmDeliverDestination = () => {
  if (!deliverTarget.value || !podPreview.value || !deliveredByInput.value) return
  bookingStore.deliverDestination(
    deliverTarget.value.booking.id,
    deliverTarget.value.destination.id,
    podPreview.value,
    deliveredByInput.value,
    isLastPendingDestination.value ? podOdometerAfter.value || undefined : undefined
  )
  closeDeliverDestination()
}
</script>
