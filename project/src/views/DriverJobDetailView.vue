<template>
  <div class="min-h-screen bg-primary flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary to-blue-700 text-white p-5 flex-shrink-0">
        <div class="flex items-center gap-2 mb-1">
          <button @click="router.push('/driver-app')" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center -ml-1.5">
            <span class="material-symbols-rounded text-lg">arrow_back</span>
          </button>
          <div class="font-bold flex-1 truncate">{{ job?.docNo || 'ไม่พบงาน' }}</div>
          <span
            v-if="job"
            :class="['text-xs font-semibold px-2 py-1 rounded-full', job.category === 'cements' ? 'bg-white/20' : 'bg-white/20']"
          >
            {{ job.category === 'cements' ? 'Cements' : 'Ceramics' }}
          </span>
        </div>
        <div v-if="job" class="text-xs opacity-90">{{ bookingStatusLabel[job.status] }} · {{ destinationLabel(job) }}</div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div v-if="!job" class="text-center py-10 text-muted text-sm">
          <span class="material-symbols-rounded text-3xl block mb-2">search_off</span>
          ไม่พบงานนี้ในรายการของคุณ
        </div>

        <template v-else>
          <!-- STEP 1: ASSIGNED — รอตอบรับงาน (ไม่มีปุ่มไม่รับงาน) -->
          <template v-if="job.status === 'ASSIGNED'">
            <div class="text-[11px] text-center text-muted">
              กรุณาตอบรับภายใน {{ formatCountdown(remainingAcceptSeconds(job)) }} มิฉะนั้นงานจะถูกจัดให้คนขับคนอื่นอัตโนมัติ
            </div>
            <button
              @click="bookingStore.acceptDispatch(job.id)"
              class="w-full h-10 rounded-lg bg-amber-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
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
              class="w-full h-10 rounded-lg bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">local_gas_station</span>
              รับน้ำมัน
            </button>
          </template>

          <!-- STEP 3: FUEL_RECEIVED — ปุ่มเริ่มรับสินค้า -->
          <template v-else-if="job.status === 'FUEL_RECEIVED'">
            <button
              @click="bookingStore.startLoading(job.id)"
              class="w-full h-10 rounded-lg bg-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
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
              <div v-if="item.jobType" class="text-xs text-muted">ประเภทงาน: {{ item.jobType }}</div>
              <button
                v-if="item.pickupStatus !== 'PICKED_UP'"
                @click="bookingStore.pickupJobItem(job.id, item.id, actingDriverName)"
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
              class="w-full h-10 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">directions</span>
              เริ่มขนส่ง
            </button>
          </template>

          <!-- STEP 6/7: IN_TRANSIT/DELIVERING — แสดงจุดส่งของถัดไปเพียงจุดเดียว จนกว่าจะส่งครบแล้วจึงแสดงปุ่มดำเนินการเสร็จสิ้น -->
          <template v-else-if="job.status === 'IN_TRANSIT' || job.status === 'DELIVERING'">
            <template v-if="nextDelivery(job)">
              <div class="text-[11px] text-muted">ส่งสินค้าจุดที่ {{ (nextDelivery(job)!.deliverySequence ?? 0) + 1 }} จาก {{ job.items.length }}</div>
              <div class="rounded-xl bg-surface-2 p-2.5 space-y-1.5">
                <div class="text-sm font-semibold text-text">
                  {{ nextDelivery(job)!.siteName }} <span class="text-xs text-muted font-normal">({{ nextDelivery(job)!.province }} · {{ nextDelivery(job)!.district }})</span>
                </div>
                <div class="text-xs text-text"><span class="text-muted">สินค้า:</span> {{ nextDelivery(job)!.product }} {{ nextDelivery(job)!.qty }} {{ nextDelivery(job)!.unit }}</div>
                <div v-if="nextDelivery(job)!.jobType" class="text-xs text-text"><span class="text-muted">ประเภทงาน:</span> {{ nextDelivery(job)!.jobType }}</div>
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
                  @click="openDeliverItem(nextDelivery(job)!)"
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
                class="w-full h-10 rounded-lg bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-rounded text-base">flag_circle</span>
                ดำเนินการเสร็จสิ้น
              </button>
            </template>
          </template>

          <div v-else-if="job.status === 'DELIVERED'" class="text-center py-8 text-green-700 bg-green-50 rounded-xl">
            <span class="material-symbols-rounded text-3xl block mb-1">task_alt</span>
            ส่งของสำเร็จแล้ว
          </div>

          <!-- รายละเอียดงาน -->
          <div class="border-t border-border pt-3 mt-3 space-y-1.5">
            <div class="text-xs font-bold text-muted uppercase tracking-wide mb-1">รายละเอียดงาน</div>
            <div v-for="item in job.items" :key="item.id" class="text-xs text-text flex justify-between gap-2">
              <span class="text-muted truncate">{{ item.siteName }}</span>
              <span class="whitespace-nowrap">{{ item.product }} {{ item.qty }} {{ item.unit }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Deliver Item with POD Modal -->
    <Teleport to="body" v-if="deliverTarget && job">
      <div @click="closeDeliverItem" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-4">
        <div @click.stop class="w-full max-w-sm bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="font-bold text-text">ส่งของจุดนี้ {{ deliverTarget!.siteName }}</div>
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
              :disabled="!podPreview || !deliveredByInput || podUploading"
              class="h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">task_alt</span>
              {{ podUploading ? 'กำลังอัปโหลด POD...' : 'ยืนยันส่งของจุดนี้' }}
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
import { bookingStatusLabel } from '@/utils/bookingStatus'
import { matchesSelectedDriver } from '@/utils/driverJobs'
import podRepository from '@/repositories/podRepository'

const props = defineProps<{ id: string }>()

const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()
const salesDocumentsStore = useSalesDocumentsStore()
const driversStore = useDriversStore()

const isDriverRole = computed(() => authStore.role === 'DRIVER')

/** ชื่อคนขับที่ "กำลังทำรายการอยู่จริง" — บัญชีคนขับใช้ชื่อตัวเอง (resolve ผ่าน driverId เสมอ แม่นยำกว่าชื่อบัญชี),
 *  ผู้ดูแลระบบที่เปิดดูงานคนขับคนอื่น (debug/support) ใช้ชื่อคนขับของ Booking นี้แทน ไม่ใช้ Vehicle.driverCode เด็ดขาด */
const selectedDriver = ref(authStore.userName)
watch(
  () => driversStore.drivers,
  (list) => {
    if (isDriverRole.value && authStore.profile?.driverId) {
      const linked = list.find((d) => d.id === authStore.profile?.driverId)
      if (linked) selectedDriver.value = driversStore.fullName(linked)
    }
  },
  { immediate: true }
)
const selectedDriverId = computed(() => (isDriverRole.value ? authStore.profile?.driverId : undefined))

const job = computed<Booking | undefined>(() => {
  const b = bookingStore.bookings.find((x) => x.id === props.id)
  if (!b) return undefined
  // เข้าจาก URL ตรงๆ ต้องเป็นงานของคนขับที่ล็อกอินอยู่เท่านั้น (ผู้ดูแลระบบดูได้ทุกงาน)
  if (isDriverRole.value && !matchesSelectedDriver(b, selectedDriverId.value, selectedDriver.value)) return undefined
  return b
})

const actingDriverName = computed(() => {
  if (isDriverRole.value) return selectedDriver.value
  const linked = job.value?.driverId ? driversStore.drivers.find((d) => d.id === job.value!.driverId) : undefined
  return linked ? driversStore.fullName(linked) : job.value?.driverName || authStore.userName
})

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
const remainingAcceptSeconds = (b: Booking) => {
  if (!b.dispatchedAt) return 0
  const deadline = new Date(b.dispatchedAt).getTime() + ACCEPT_TIMEOUT_MS
  return Math.max(0, Math.floor((deadline - now.value) / 1000))
}
const formatCountdown = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

/** รายการถัดไปที่ต้องส่ง เรียงตาม deliverySequence (คำนวณอัตโนมัติเป็นลำดับย้อนกลับของลำดับรับสินค้า) — คืนค่า null เมื่อส่งครบทุกรายการแล้ว */
const nextDelivery = (b: Booking): JobItem | null => {
  const pending = b.items.filter((i) => i.deliveryStatus !== 'DELIVERED')
  if (!pending.length) return null
  return [...pending].sort((a, c) => (a.deliverySequence ?? 0) - (c.deliverySequence ?? 0))[0]
}

const destinationLabel = (b: Booking) => {
  if (!b.items.length) return '-'
  const first = b.items[0].siteName
  return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
}

/** ลิงก์นำทาง: ใช้ลิงก์/พิกัดที่ผู้ใช้กรอกไว้ก่อน ถ้าไม่มีแต่มีพิกัดตัวเลขที่ parse ได้ ให้สร้างลิงก์ค้นหาจากพิกัดนั้นแทน */
const navigateUrl = (item: JobItem) => {
  if (item.mapUrl) return /^https?:\/\//.test(item.mapUrl) ? item.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapUrl)}`
  if (item.latitude !== undefined && item.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
  }
  return ''
}

// --- Deliver a single JobItem (stop) with its own POD photo + recipient name ---
const deliverTarget = ref<JobItem | null>(null)
const deliveredByInput = ref('')
const podPreview = ref<string | null>(null)
const podError = ref('')
const podUploading = ref(false)

const openDeliverItem = (item: JobItem) => {
  deliverTarget.value = item
  deliveredByInput.value = ''
  podPreview.value = null
  podError.value = ''
  podUploading.value = false
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

/**
 * อัปโหลดรูป POD ขึ้น Firebase Storage ก่อนเสมอ (ดู repositories/podRepository.ts) แล้วเก็บแค่ URL ที่ได้ลง
 * JobItem.podImage แทนการฝัง base64 ตรงๆ เหมือนเดิม (เสี่ยงชนขีดจำกัดขนาดเอกสาร Firestore เวลามีหลายปลายทาง)
 */
const confirmDeliverItem = async () => {
  if (!job.value || !deliverTarget.value || !podPreview.value || !deliveredByInput.value) return
  const bookingId = job.value.id
  const itemId = deliverTarget.value.id
  const deliveredBy = deliveredByInput.value
  podUploading.value = true
  podError.value = ''
  try {
    const url = await podRepository.upload(bookingId, itemId, podPreview.value)
    bookingStore.deliverJobItem(bookingId, itemId, url, deliveredBy)
    closeDeliverItem()
  } catch (err: any) {
    podError.value = err?.message || 'อัปโหลดรูป POD ไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    podUploading.value = false
  }
}

// --- Finish driver job (DELIVERING -> DELIVERED) หลังส่งของครบทุกรายการแล้ว บันทึกเลขไมล์สิ้นสุดที่จุดนี้ ---
const finishTarget = ref<Booking | null>(null)
const finishOdometerAfter = ref(0)

const openFinishJob = (b: Booking) => {
  finishTarget.value = b
  finishOdometerAfter.value = b.odometerAfter || 0
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
  router.push('/driver-app')
}
</script>
