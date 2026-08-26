<template>
  <!-- Full-bleed mobile shell เหมือน DriverJobsView.vue — header/main เต็มความกว้างจอ ไม่ใช่การ์ดลอย
       ปุ่ม action หลักของแต่ละ step ย้ายไปอยู่แถบล่างสุดแบบ sticky (thumb-reach ดีสุดสำหรับใช้มือเดียว) -->
  <div class="min-h-screen bg-surface-2 flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-10 bg-gradient-to-r from-primary to-blue-700 text-white shadow-md flex-shrink-0">
      <div class="px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div class="flex items-center gap-1 mb-1">
          <button @click="router.push('/driver-app')" class="w-11 h-11 -ml-2 rounded-lg hover:bg-white/10 active:bg-white/20 flex items-center justify-center">
            <span class="material-symbols-rounded text-xl">arrow_back</span>
          </button>
          <div class="font-bold text-lg flex-1 truncate">{{ job?.docNo || 'ไม่พบงาน' }}</div>
          <span
            v-if="job"
            class="text-xs font-semibold px-2 py-1 rounded-full bg-white/20 flex-shrink-0"
          >
            {{ job.category === 'cements' ? 'Cements' : 'Ceramics' }}
          </span>
        </div>
        <div v-if="job" class="text-sm opacity-90 truncate">{{ bookingStatusLabel[job.status] }} · {{ destinationLabel(job) }}</div>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div v-if="!job" class="text-center py-10 text-muted text-sm">
        <span class="material-symbols-rounded text-3xl block mb-2">search_off</span>
        ไม่พบงานนี้ในรายการของคุณ
      </div>

      <template v-else>
        <!-- STEP 1: ASSIGNED — รอตอบรับงาน (ไม่มีปุ่มไม่รับงาน) -->
        <template v-if="job.status === 'ASSIGNED'">
          <div class="text-sm font-semibold text-center text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
            กรุณาตอบรับภายใน {{ formatCountdown(remainingAcceptSeconds(job)) }} มิฉะนั้นงานจะถูกจัดให้คนขับคนอื่นอัตโนมัติ
          </div>
        </template>

        <!-- STEP 2: ACCEPTED — แสดงจำนวนน้ำมันที่ต้องรับ -->
        <template v-else-if="job.status === 'ACCEPTED'">
          <div class="text-sm text-text bg-white border border-border rounded-xl p-4">
            <span class="text-muted">ต้องรับน้ำมันทั้งหมด:</span> <span class="font-bold text-base">{{ job.fuelLiters || 0 }} ล.</span>
          </div>
        </template>

        <!-- STEP 3: FUEL_RECEIVED — ไม่มีข้อมูลเพิ่มเติม รอปุ่มด้านล่าง -->

        <!-- STEP 4: LOADING — แสดงจุดรับสินค้าถัดไปเพียงจุดเดียว ทีละจุดตามลำดับ (เหมือน Delivery step ด้านล่าง)
             ลำดับรับ = ลำดับที่ item ปรากฏใน booking.items[] ตรงๆ ไม่ต้องมี field ใหม่ — pickupJobItem เดิมยัง
             ทำงานเหมือนเดิมทุกอย่าง (บันทึก pickupSequence ตามลำดับที่กดจริง คำนวณ deliverySequence ย้อนกลับตอนรับครบ
             — ที่นี่แค่บังคับ UI ให้กดได้ทีละจุดตามลำดับ array เท่านั้น) -->
        <template v-else-if="job.status === 'LOADING'">
          <div class="text-sm text-muted">
            รับสินค้าทีละจุดตามลำดับ รับครบทุกรายการแล้วจะไปขั้นตอนถัดไปให้อัตโนมัติ
            <span class="text-teal-700 font-medium">· รับแล้ว {{ pickupProgress(job.items).completed }}/{{ pickupProgress(job.items).total }}</span>
          </div>
          <div v-if="nextPickup(job)" class="rounded-xl bg-white border border-border p-3.5 space-y-2">
            <div class="text-base font-semibold text-text">
              {{ nextPickup(job)!.product }} <span class="text-sm text-muted font-normal">{{ nextPickup(job)!.qty }} {{ nextPickup(job)!.unit }}</span>
            </div>
            <div class="text-sm text-muted">ต้นทาง: {{ nextPickup(job)!.pickupOriginName || job.origin || '-' }}</div>
            <div v-if="nextPickup(job)!.jobType" class="text-sm text-muted">ประเภทงาน: {{ nextPickup(job)!.jobType }}</div>
            <button
              @click="bookingStore.pickupJobItem(job.id, nextPickup(job)!.id, actingDriverName)"
              class="w-full h-12 rounded-lg bg-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-teal-700"
            >
              <span class="material-symbols-rounded text-base">local_shipping</span>
              รับสินค้าจุดนี้
            </button>
          </div>
        </template>

        <!-- STEP 5: LOADED — ไม่มีข้อมูลเพิ่มเติม รอปุ่มด้านล่าง -->

        <!-- STEP 6/7: IN_TRANSIT/DELIVERING — แสดงจุดส่งของถัดไปเพียงจุดเดียว จนกว่าจะส่งครบแล้วจึงแสดงปุ่มดำเนินการเสร็จสิ้น
             เปลี่ยนรถจริงระหว่างส่งของ (ดู dispatchBooking's vehicleChangedMidDelivery) ล้าง pickupStatus ของจุดที่ยัง
             ไม่ส่งไว้ — nextPickup ตรวจเจอจุดที่ต้องยืนยันย้ายขึ้นรถคันใหม่ก่อนเสมอ ก่อนจะกลับไปแสดง delivery card ตามปกติ
             (Phase E.1 Test 8: ห้ามส่ง C ทันทีถ้ายังไม่ได้ยืนยันว่าอยู่บนรถคันใหม่) -->
        <template v-else-if="job.status === 'IN_TRANSIT' || job.status === 'DELIVERING'">
          <template v-if="nextPickup(job)">
            <div class="text-sm font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
              มีการเปลี่ยนรถระหว่างทาง ต้องยืนยันว่าสินค้าที่เหลืออยู่บนรถคันนี้ก่อนจึงจะส่งของต่อได้
            </div>
            <div class="rounded-xl bg-white border border-border p-3.5 space-y-2">
              <div class="text-base font-semibold text-text">
                {{ nextPickup(job)!.siteName }} <span class="text-sm text-muted font-normal">— {{ nextPickup(job)!.product }} {{ nextPickup(job)!.qty }} {{ nextPickup(job)!.unit }}</span>
              </div>
              <button
                @click="bookingStore.confirmRemainingPickup(job.id, nextPickup(job)!.id)"
                class="w-full h-12 rounded-lg bg-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-teal-700"
              >
                <span class="material-symbols-rounded text-base">local_shipping</span>
                ยืนยันรับสินค้าขึ้นรถคันนี้
              </button>
            </div>
          </template>
          <template v-else-if="nextDelivery(job)">
            <div class="text-sm text-muted">
              ส่งสินค้าจุดที่ {{ (nextDelivery(job)!.deliverySequence ?? 0) + 1 }} จาก {{ job.items.length }}
              <span class="text-green-700 font-medium">· ส่งแล้ว {{ deliveryProgress(job.items).completed }}/{{ deliveryProgress(job.items).total }}</span>
            </div>
            <div class="rounded-xl bg-white border border-border p-3.5 space-y-2.5">
              <div class="text-base font-semibold text-text">
                {{ nextDelivery(job)!.siteName }} <span class="text-sm text-muted font-normal">({{ nextDelivery(job)!.province }} · {{ nextDelivery(job)!.district }})</span>
              </div>
              <div class="text-sm text-text"><span class="text-muted">สินค้า:</span> {{ nextDelivery(job)!.product }} {{ nextDelivery(job)!.qty }} {{ nextDelivery(job)!.unit }}</div>
              <div v-if="nextDelivery(job)!.jobType" class="text-sm text-text"><span class="text-muted">ประเภทงาน:</span> {{ nextDelivery(job)!.jobType }}</div>
              <div class="flex gap-3 pt-1">
                <a
                  :href="nextDelivery(job)!.sitePhone ? `tel:${nextDelivery(job)!.sitePhone}` : undefined"
                  :class="[
                    'flex-1 h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5',
                    nextDelivery(job)!.sitePhone ? 'bg-primary text-white active:bg-blue-800' : 'bg-surface-2 text-muted cursor-not-allowed pointer-events-none',
                  ]"
                >
                  <span class="material-symbols-rounded text-base">call</span>
                  {{ nextDelivery(job)!.sitePhone || 'ไม่มีเบอร์โทร' }}
                </a>
                <a
                  :href="navigateUrl(nextDelivery(job)!) || undefined"
                  target="_blank"
                  :class="[
                    'flex-1 h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border border-border',
                    navigateUrl(nextDelivery(job)!) ? 'text-text bg-white active:bg-surface-2' : 'text-muted bg-surface-2 cursor-not-allowed pointer-events-none',
                  ]"
                >
                  <span class="material-symbols-rounded text-base">near_me</span>
                  นำทาง
                </a>
              </div>
              <button
                @click="openDeliverItem(nextDelivery(job)!)"
                class="w-full h-12 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-green-700"
              >
                <span class="material-symbols-rounded text-base">task_alt</span>
                ส่งสินค้าจุดที่ {{ (nextDelivery(job)!.deliverySequence ?? 0) + 1 }}
              </button>
            </div>
          </template>
          <template v-else>
            <div class="text-sm text-center font-semibold text-green-700 bg-green-50 rounded-xl p-4">
              ส่งสินค้าครบทุกรายการแล้ว ({{ job.items.length }}/{{ job.items.length }})
            </div>
          </template>
        </template>

        <div v-else-if="job.status === 'DELIVERED'" class="text-center py-8 text-green-700 bg-green-50 rounded-xl">
          <span class="material-symbols-rounded text-3xl block mb-1">task_alt</span>
          ส่งของสำเร็จแล้ว
        </div>

        <!-- รายละเอียดงาน — จุดที่ deliveryStatus=DELIVERED แล้วต้องยังโชว์เป็น "ส่งแล้ว" ต่อไปเสมอ (แม้ Job ถูก Reset/
             เปลี่ยนคนขับ/เปลี่ยนรถในภายหลัง — ข้อมูลนี้มาจาก item ตรงๆ ไม่ใช่คำนวณจาก Job status จึงไม่มีทางหายเอง) -->
        <div class="border-t border-border pt-3 mt-1 space-y-2">
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-bold text-muted uppercase tracking-wide">รายละเอียดงาน</div>
            <div class="text-xs font-semibold text-muted">
              เสร็จแล้ว {{ deliveryProgress(job.items).completed }}/{{ deliveryProgress(job.items).total }} จุด
            </div>
          </div>
          <div v-for="item in job.items" :key="item.id" class="text-sm text-text flex items-center justify-between gap-2">
            <span class="text-muted truncate">{{ item.siteName }}</span>
            <span class="whitespace-nowrap flex items-center gap-1">
              {{ item.product }} {{ item.qty }} {{ item.unit }}
              <span v-if="item.deliveryStatus === 'DELIVERED'" class="inline-flex items-center gap-0.5 text-green-700 text-xs font-semibold">
                <span class="material-symbols-rounded text-sm">check_circle</span>
                ส่งแล้ว
              </span>
            </span>
          </div>
        </div>
      </template>
    </main>

    <!-- Sticky bottom action bar — ปุ่มหลักของแต่ละ step อยู่ตำแหน่งเดียวกันเสมอ thumb-reach ดีสุดสำหรับใช้มือเดียว
         (ที่ว่างสำรองไว้ตรงนี้ยังใช้เป็นฐานสำหรับ bottom navigation ในอนาคตได้โดยไม่ต้องรื้อ layout) -->
    <div
      v-if="job && showBottomActionBar"
      class="sticky bottom-0 bg-white border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-shrink-0"
    >
      <button
        v-if="job.status === 'ASSIGNED'"
        @click="bookingStore.acceptDispatch(job.id)"
        class="w-full h-12 rounded-lg bg-amber-500 text-white text-base font-semibold flex items-center justify-center gap-1.5 active:bg-amber-600"
      >
        <span class="material-symbols-rounded text-xl">how_to_reg</span>
        ตอบรับงาน
      </button>
      <button
        v-else-if="job.status === 'ACCEPTED'"
        @click="bookingStore.markFuelReceived(job.id)"
        class="w-full h-12 rounded-lg bg-orange-500 text-white text-base font-semibold flex items-center justify-center gap-1.5 active:bg-orange-600"
      >
        <span class="material-symbols-rounded text-xl">local_gas_station</span>
        รับน้ำมัน
      </button>
      <button
        v-else-if="job.status === 'FUEL_RECEIVED'"
        @click="bookingStore.startLoading(job.id)"
        class="w-full h-12 rounded-lg bg-teal-600 text-white text-base font-semibold flex items-center justify-center gap-1.5 active:bg-teal-700"
      >
        <span class="material-symbols-rounded text-xl">inventory_2</span>
        เริ่มรับสินค้า
      </button>
      <button
        v-else-if="job.status === 'LOADED'"
        @click="bookingStore.startTransit(job.id)"
        class="w-full h-12 rounded-lg bg-indigo-600 text-white text-base font-semibold flex items-center justify-center gap-1.5 active:bg-indigo-700"
      >
        <span class="material-symbols-rounded text-xl">directions</span>
        เริ่มขนส่ง
      </button>
      <button
        v-else-if="(job.status === 'IN_TRANSIT' || job.status === 'DELIVERING') && !nextDelivery(job)"
        @click="openFinishJob(job)"
        class="w-full h-12 rounded-lg bg-primary text-white text-base font-semibold flex items-center justify-center gap-1.5 active:bg-blue-800"
      >
        <span class="material-symbols-rounded text-xl">flag_circle</span>
        ดำเนินการเสร็จสิ้น
      </button>
    </div>

    <!-- Deliver Item with POD — bottom sheet -->
    <Teleport to="body" v-if="deliverTarget && job">
      <div @click="closeDeliverItem" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-end justify-center">
        <div @click.stop class="w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div class="w-10 h-1.5 bg-border rounded-full mx-auto mt-3 mb-1"></div>
          <div class="flex items-center justify-between px-5 py-3 border-b border-border">
            <div class="font-bold text-text text-lg truncate">ส่งของจุดนี้ {{ deliverTarget!.siteName }}</div>
            <button @click="closeDeliverItem" class="w-11 h-11 -mr-2 flex-shrink-0 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้รับสินค้า</label>
              <input v-model="deliveredByInput" placeholder="ชื่อผู้รับสินค้า" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
            </div>
            <div class="text-sm text-muted">
              ต้องแนบรูปหลักฐานการส่งมอบสินค้า (POD) ของจุดนี้ให้ถูกต้องก่อนจึงจะกดยืนยันได้
            </div>
            <label class="block border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer active:border-primary transition-colors">
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="onPodSelected" />
              <img v-if="podPreview" :src="podPreview" class="max-h-48 mx-auto rounded-lg object-contain" />
              <template v-else>
                <span class="material-symbols-rounded text-4xl text-muted block mb-1">add_a_photo</span>
                <div class="text-base text-muted">แตะเพื่อถ่ายรูป/แนบรูป POD</div>
              </template>
            </label>
            <div v-if="podError" class="text-sm text-red-600 flex items-center gap-1">
              <span class="material-symbols-rounded text-base">error</span>
              {{ podError }}
            </div>
          </div>
          <div class="flex gap-3 px-5 py-4 border-t border-border">
            <button @click="closeDeliverItem" class="flex-1 h-12 rounded-lg border border-border text-base font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmDeliverItem"
              :disabled="!podPreview || !deliveredByInput || podUploading"
              class="flex-[2] h-12 rounded-lg bg-green-600 text-white text-base font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-xl">task_alt</span>
              {{ podUploading ? 'กำลังอัปโหลด POD...' : 'ยืนยันส่งของจุดนี้' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Finish Driver Job — bottom sheet -->
    <Teleport to="body" v-if="finishTarget">
      <div @click="closeFinishJob" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-end justify-center">
        <div @click.stop class="w-full bg-white rounded-t-3xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
          <div class="w-10 h-1.5 bg-border rounded-full mx-auto mt-3 mb-1"></div>
          <div class="flex items-center justify-between px-5 py-3 border-b border-border">
            <div class="font-bold text-text text-lg truncate">ดำเนินการเสร็จสิ้น {{ finishTarget.docNo }}</div>
            <button @click="closeFinishJob" class="w-11 h-11 -mr-2 flex-shrink-0 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div class="text-sm text-muted">ส่งสินค้าครบทุกรายการแล้ว กรอกเลขไมล์สิ้นสุดแล้วกดยืนยันเพื่อจบงาน</div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขไมล์สิ้นสุด (กม.)</label>
              <input v-model.number="finishOdometerAfter" type="number" placeholder="0" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
            </div>
          </div>
          <div class="flex gap-3 px-5 py-4 border-t border-border">
            <button @click="closeFinishJob" class="flex-1 h-12 rounded-lg border border-border text-base font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmFinishJob"
              class="flex-[2] h-12 rounded-lg bg-primary text-white text-base font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-xl">flag_circle</span>
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
import { useDriversStore } from '@/stores/drivers'
import type { Booking, JobItem } from '@/types'
import { bookingStatusLabel } from '@/utils/bookingStatus'
import { matchesSelectedDriver, nextPickup as nextPickupItems, nextDelivery as nextDeliveryItems } from '@/utils/driverJobs'
import { deliveryProgress, pickupProgress } from '@/utils/deliveryProgress'
import podRepository from '@/repositories/podRepository'

const props = defineProps<{ id: string }>()

const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()
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

/** logic จริงอยู่ที่ utils/driverJobs.ts (แยกเป็น pure function ให้ unit test ได้ตรงๆ — ดู driverJobs.test.ts)
 *  ที่นี่แค่ wrap ให้ยังเรียกด้วย Booking ทั้งก้อนเหมือนเดิมทุกจุดในเทมเพลต ไม่ต้องแก้ template */
const nextDelivery = (b: Booking): JobItem | null => nextDeliveryItems(b.items)
const nextPickup = (b: Booking): JobItem | null => nextPickupItems(b.items)

/** true เมื่อ step ปัจจุบันมีปุ่ม action หลักที่ต้องแสดงในแถบล่างสุดแบบ sticky (UI-only, ไม่เปลี่ยนพฤติกรรม
 *  เดิม) — รวมเงื่อนไข "IN_TRANSIT/DELIVERING ที่ส่งครบทุกจุดแล้ว" ไว้ในนี้เพื่อไม่ให้ template ต้องเขียนนิพจน์ยาว */
const showBottomActionBar = computed(() => {
  if (!job.value) return false
  if (['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADED'].includes(job.value.status)) return true
  if ((job.value.status === 'IN_TRANSIT' || job.value.status === 'DELIVERING') && !nextDelivery(job.value)) return true
  return false
})

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
  /** ส่งของสำเร็จแล้ว -> เปลี่ยนสถานะเป็น DELIVERED + PENDING_REVIEW เท่านั้น ห้ามสร้างใบวางบิลจากฝั่งคนขับ
   *  ต้องรอออฟฟิศตรวจสอบ POD แล้วอนุมัติก่อน (ดู reviewPod ใน stores/booking.ts + CompletedJobsView.vue) */
  bookingStore.finishDriverJob(bookingId, finishOdometerAfter.value || undefined)
  closeFinishJob()
  router.push('/driver-app')
}
</script>
