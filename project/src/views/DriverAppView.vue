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
        <div class="text-xs opacity-90 mb-3">ระบบสำหรับพนักงานขับรถ · มิตรกาญจน์</div>
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
            class="border border-border rounded-2xl p-4 mb-3 space-y-3 last:mb-0"
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

            <!-- STEP 1: ASSIGNED — รอตอบรับงาน (ไม่มีปุ่มไม่รับงาน) -->
            <template v-if="job.status === 'ASSIGNED'">
              <div class="text-[11px] text-center text-muted">
                กรุณาตอบรับภายใน {{ formatCountdown(remainingAcceptSeconds(job)) }} มิฉะนั้นงานจะถูกจัดให้คนขับคนอื่นอัตโนมัติ
              </div>
              <button
                @click="bookingStore.acceptDispatch(job.id)"
                class="w-full h-9 rounded-lg bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-rounded text-base">how_to_reg</span>
                ตอบรับงาน
              </button>
            </template>

            <!-- STEP 2: ACCEPTED — แสดงจำนวนน้ำมันที่ต้องรับ + ปุ่มรับน้ำมัน -->
            <template v-else-if="job.status === 'ACCEPTED'">
              <div class="text-xs text-text bg-surface-2 rounded-xl p-3">
                <span class="text-muted">ต้องรับน้ำมันทั้งหมด:</span> <span class="font-bold">{{ job.fuelLiters || 0 }} ล.</span>
              </div>
              <button
                @click="bookingStore.markFuelReceived(job.id)"
                class="w-full h-9 rounded-lg bg-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-rounded text-base">local_gas_station</span>
                รับน้ำมัน
              </button>
            </template>

            <!-- STEP 3: FUEL_RECEIVED — ปุ่มเริ่มรับสินค้า -->
            <template v-else-if="job.status === 'FUEL_RECEIVED'">
              <button
                @click="bookingStore.startLoading(job.id)"
                class="w-full h-9 rounded-lg bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-rounded text-base">inventory_2</span>
                เริ่มรับสินค้า
              </button>
            </template>

            <!-- STEP 4: LOADING — แสดงสินค้า+ต้นทางทีละรายการ ให้คนขับเลือกลำดับรับสินค้าเอง -->
            <template v-else-if="job.status === 'LOADING'">
              <div class="text-[11px] text-muted">เลือกรับสินค้าทีละรายการ (เลือกลำดับได้เอง) รับครบทุกรายการแล้วจะไปขั้นตอนถัดไปให้อัตโนมัติ</div>
              <div v-for="item in job.items" :key="item.id" class="rounded-xl bg-surface-2 p-2.5 space-y-1.5">
                <div class="text-sm font-semibold text-text">{{ item.product }} <span class="text-xs text-muted font-normal">{{ item.qty }} {{ item.unit }}</span></div>
                <div class="text-xs text-muted">ต้นทาง: {{ item.pickupOriginName || job.origin || '-' }}</div>
                <button
                  v-if="item.pickupStatus !== 'PICKED_UP'"
                  @click="bookingStore.pickupJobItem(job.id, item.id, selectedDriver)"
                  class="w-full h-8 rounded-lg bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-rounded text-sm">local_shipping</span>
                  รับสินค้าจุดนี้
                </button>
                <div v-else class="w-full h-8 rounded-lg bg-green-50 text-green-700 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <span class="material-symbols-rounded text-sm">check_circle</span>
                  รับแล้ว (ลำดับ {{ (item.pickupSequence ?? 0) + 1 }})
                </div>
              </div>
            </template>

            <!-- STEP 5: LOADED — ปุ่มเริ่มขนส่ง -->
            <template v-else-if="job.status === 'LOADED'">
              <button
                @click="bookingStore.startTransit(job.id)"
                class="w-full h-9 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-rounded text-base">directions</span>
                เริ่มขนส่ง
              </button>
            </template>

            <!-- STEP 6/7: IN_TRANSIT/DELIVERING — แสดงจุดส่งของถัดไปเพียงจุดเดียว จนกว่าจะส่งครบแล้วจึงแสดงปุ่มดำเนินการเสร็จสิ้น -->
            <template v-else-if="job.status === 'IN_TRANSIT' || job.status === 'DELIVERING'">
              <template v-if="nextDelivery(job)">
                <div class="text-[11px] text-muted">ส่งสินค้าจุดที่ {{ (nextDelivery(job)!.deliverySequence ?? 0) + 1 }}</div>
                <div class="rounded-xl bg-surface-2 p-2.5 space-y-1.5">
                  <div class="text-sm font-semibold text-text">
                    {{ nextDelivery(job)!.siteName }} <span class="text-xs text-muted font-normal">({{ nextDelivery(job)!.province }} · {{ nextDelivery(job)!.district }})</span>
                  </div>
                  <div class="text-xs text-text"><span class="text-muted">สินค้า:</span> {{ nextDelivery(job)!.product }} {{ nextDelivery(job)!.qty }} {{ nextDelivery(job)!.unit }}</div>
                  <div class="flex gap-2 pt-1">
                    <a
                      :href="nextDelivery(job)!.sitePhone ? `tel:${nextDelivery(job)!.sitePhone}` : undefined"
                      :class="[
                        'flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5',
                        nextDelivery(job)!.sitePhone ? 'bg-primary text-white' : 'bg-white text-muted cursor-not-allowed pointer-events-none',
                      ]"
                    >
                      <span class="material-symbols-rounded text-sm">call</span>
                      {{ nextDelivery(job)!.sitePhone || 'ไม่มีเบอร์โทร' }}
                    </a>
                    <a
                      :href="navigateUrl(nextDelivery(job)!) || undefined"
                      target="_blank"
                      :class="[
                        'flex-1 h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-border',
                        navigateUrl(nextDelivery(job)!) ? 'text-text bg-white' : 'text-muted bg-white cursor-not-allowed pointer-events-none',
                      ]"
                    >
                      <span class="material-symbols-rounded text-sm">near_me</span>
                      นำทาง
                    </a>
                  </div>
                  <button
                    @click="openDeliverItem(job, nextDelivery(job)!)"
                    class="w-full h-8 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <span class="material-symbols-rounded text-sm">task_alt</span>
                    ส่งสินค้าจุดที่ {{ (nextDelivery(job)!.deliverySequence ?? 0) + 1 }}
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="text-xs text-center text-green-700 bg-green-50 rounded-xl p-3">
                  ส่งสินค้าครบทุกรายการแล้ว ({{ job.items.length }}/{{ job.items.length }})
                </div>
                <button
                  @click="openFinishJob(job)"
                  class="w-full h-9 rounded-lg bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-rounded text-base">flag_circle</span>
                  ดำเนินการเสร็จสิ้น
                </button>
              </template>
            </template>
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

    <!-- Deliver Item with POD Modal -->
    <Teleport to="body" v-if="deliverTarget">
      <div @click="closeDeliverItem" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-4">
        <div @click.stop class="w-full max-w-sm bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="font-bold text-text">ส่งของจุดนี้ {{ deliverTarget.item.siteName }}</div>
            <button @click="closeDeliverItem" class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>
          <div class="p-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้รับสินค้า</label>
              <input v-model="deliveredByInput" placeholder="ชื่อผู้รับสินค้า" class="w-full h-9 px-3 rounded-lg border border-border text-sm" />
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
            <button @click="closeDeliverItem" class="h-9 px-4 rounded-lg border border-border text-sm font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmDeliverItem"
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

    <!-- Finish Driver Job Modal -->
    <Teleport to="body" v-if="finishTarget">
      <div @click="closeFinishJob" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-4">
        <div @click.stop class="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="font-bold text-text">ดำเนินการเสร็จสิ้น {{ finishTarget.docNo }}</div>
            <button @click="closeFinishJob" class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>
          <div class="p-5 space-y-3">
            <div class="text-xs text-muted">ส่งสินค้าครบทุกรายการแล้ว กรอกเลขไมล์สิ้นสุดแล้วกดยืนยันเพื่อจบงาน</div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขไมล์สิ้นสุด (กม.)</label>
              <input v-model.number="finishOdometerAfter" type="number" placeholder="0" class="w-full h-9 px-3 rounded-lg border border-border text-sm" />
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button @click="closeFinishJob" class="h-9 px-4 rounded-lg border border-border text-sm font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmFinishJob"
              class="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">flag_circle</span>
              ยืนยันดำเนินการเสร็จสิ้น
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDriversStore } from '@/stores/drivers'
import type { Booking, JobItem } from '@/types'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'

const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()
const salesDocumentsStore = useSalesDocumentsStore()
const driversStore = useDriversStore()

/** รายชื่อคนขับ ดึงจากสมุดรายชื่อจริง (Settings > พนักงานขับรถ) แทนรายชื่อตัวอย่างเดิม */
const driverOptions = computed(() => driversStore.drivers.map((d) => driversStore.fullName(d)))

// เข้าสู่ระบบด้วยบัญชีคนขับ (role: driver) ให้ล็อกชื่อตามผู้ใช้ที่ล็อกอิน แยกจากมุมมองแอดมิน
const isDriverRole = computed(() => authStore.role === 'DRIVER')
const selectedDriver = ref(authStore.userName)
watch(
  driverOptions,
  (opts) => {
    if (opts.length && !opts.includes(selectedDriver.value)) {
      selectedDriver.value = isDriverRole.value && opts.includes(authStore.userName) ? authStore.userName : opts[0]
    }
  },
  { immediate: true }
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

/** รายการถัดไปที่ต้องส่ง เรียงตาม deliverySequence (คำนวณอัตโนมัติเป็นลำดับย้อนกลับของลำดับรับสินค้า) — คืนค่า null เมื่อส่งครบทุกรายการแล้ว */
const nextDelivery = (job: Booking): JobItem | null => {
  const pending = job.items.filter((i) => i.deliveryStatus !== 'DELIVERED')
  if (!pending.length) return null
  return [...pending].sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0))[0]
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
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

/** ลิงก์นำทาง: ใช้ลิงก์/พิกัดที่ผู้ใช้กรอกไว้ก่อน ถ้าไม่มีแต่มีพิกัดตัวเลขที่ parse ได้ ให้สร้างลิงก์ค้นหาจากพิกัดนั้นแทน */
const navigateUrl = (item: JobItem) => {
  if (item.mapUrl) return /^https?:\/\//.test(item.mapUrl) ? item.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapUrl)}`
  if (item.latitude !== undefined && item.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
  }
  return ''
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

// --- Deliver a single JobItem (stop) with its own POD photo + recipient name ---
const deliverTarget = ref<{ booking: Booking; item: JobItem } | null>(null)
const deliveredByInput = ref('')
const podPreview = ref<string | null>(null)
const podError = ref('')

const openDeliverItem = (job: Booking, item: JobItem) => {
  deliverTarget.value = { booking: job, item }
  deliveredByInput.value = ''
  podPreview.value = null
  podError.value = ''
}

const closeDeliverItem = () => {
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

const confirmDeliverItem = () => {
  if (!deliverTarget.value || !podPreview.value || !deliveredByInput.value) return
  bookingStore.deliverJobItem(deliverTarget.value.booking.id, deliverTarget.value.item.id, podPreview.value, deliveredByInput.value)
  closeDeliverItem()
}

// --- Finish driver job (DELIVERING -> DELIVERED) หลังส่งของครบทุกรายการแล้ว บันทึกเลขไมล์สิ้นสุดที่จุดนี้ ---
const finishTarget = ref<Booking | null>(null)
const finishOdometerAfter = ref(0)

const openFinishJob = (job: Booking) => {
  finishTarget.value = job
  finishOdometerAfter.value = job.odometerAfter || 0
}

const closeFinishJob = () => {
  finishTarget.value = null
}

const confirmFinishJob = () => {
  if (!finishTarget.value) return
  const bookingId = finishTarget.value.id
  bookingStore.finishDriverJob(bookingId, finishOdometerAfter.value || undefined)
  /** ส่งของสำเร็จแล้ว -> สร้างใบวางบิลอัตโนมัติทันที เหมือนฝั่งออฟฟิศใน BookingView.vue */
  salesDocumentsStore.createBillingFromBookings([bookingId])
  closeFinishJob()
}
</script>
