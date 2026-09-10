<template>
  <!-- Full-bleed mobile shell — ไม่มีการ์ดลอยกลางจอแบบเดิม (max-w-sm+rounded+shadow) ใช้พื้นที่จอเต็มเหมือนแอปมือถือจริง
       เผื่อพื้นที่ safe-area บน/ล่างไว้ตั้งแต่ตอนนี้ (env(safe-area-inset-*)) แม้ยังไม่ได้ติดตั้ง PWA manifest จริง
       เพื่อให้พร้อมต่อยอดเป็น PWA/bottom navigation ได้ทันทีในอนาคตโดยไม่ต้องรื้อ layout ซ้ำ -->
  <div class="driver-app-scale min-h-screen bg-surface-2 flex flex-col">
    <!-- Header: sticky เต็มความกว้าง ไม่ใช่การ์ดลอย -->
    <header class="sticky top-0 z-10 bg-gradient-to-r from-primary to-blue-700 text-white shadow-md flex-shrink-0">
      <div class="px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-2xl">local_shipping</span>
            <div class="font-bold text-lg">Driver App</div>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="isDriverRole"
              @click="openAccountSettings"
              title="ตั้งค่าบัญชี (เปลี่ยนอีเมล/PIN)"
              class="w-11 h-11 rounded-lg hover:bg-white/10 active:bg-white/20 flex items-center justify-center"
            >
              <span class="material-symbols-rounded text-xl">manage_accounts</span>
            </button>
            <button @click="logout" title="ออกจากระบบ" class="w-11 h-11 rounded-lg hover:bg-white/10 active:bg-white/20 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">logout</span>
            </button>
          </div>
        </div>
        <div class="text-xs opacity-90 mb-3">ระบบสำหรับพนักงานขับรถ · มิตรกาญจน์</div>
        <!-- บัญชีคนขับ (role DRIVER) อ่าน /drivers ได้แค่ record ตัวเอง (get) ไม่ใช่ทั้ง collection (list — ดู
             firestore.rules) driverOptions/select จึงว่างเสมอสำหรับคนขับ โชว์เป็นข้อความชื่อตัวเองตรงๆ แทน (ค่า
             selectedDriver เอง resolve ถูกต้องอยู่แล้วจาก authStore.userName ไม่ต้องพึ่ง drivers collection เลย)
             ส่วน select แบบเลือกได้เก็บไว้ให้เฉพาะ ADMIN/DISPATCHER ที่สลับดูมุมมองคนขับต่างๆ (มีสิทธิ์ list ครบ) -->
        <div v-if="isDriverRole" class="w-full h-12 px-3 rounded-lg text-base font-semibold text-text bg-white/95 flex items-center">
          {{ selectedDriver }}
        </div>
        <select v-else v-model="selectedDriver" class="w-full h-12 px-3 rounded-lg text-base font-semibold text-text bg-white/95 border-0 outline-none">
          <option v-for="name in driverOptions" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
    </header>

    <!-- Body: เต็มความกว้างจอ scroll อิสระจาก header -->
    <main class="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <!-- Phase F: PWA update available — ไม่ auto-reload เอง ให้ Driver กดยืนยันเองเท่านั้น (กัน reload กลางคัน
           ระหว่างทำงานอยู่ ดู composables/usePwa.ts's applyUpdate) -->
      <div v-if="updateAvailable" class="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-3">
        <div class="text-sm text-blue-900">มีแอปเวอร์ชันใหม่</div>
        <button @click="applyUpdate" class="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold flex-shrink-0">อัปเดต</button>
      </div>

      <!-- Phase F: Install prompt — ไม่บังคับ, ไม่ modal ใหญ่, จำการปิดไว้ไม่ให้ขึ้นซ้ำ (ดู usePwa.ts) -->
      <div v-if="showInstallBanner" class="flex items-center justify-between gap-3 bg-white border border-border rounded-xl px-3.5 py-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-text">ติดตั้งแอป Driver</div>
          <div class="text-xs text-muted">ใช้งานสะดวกจากหน้าจอมือถือ</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button @click="dismissInstall" class="h-9 px-3 rounded-lg text-sm font-medium text-muted">ไว้ทีหลัง</button>
          <button @click="promptInstall" class="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold">ติดตั้ง</button>
        </div>
      </div>

      <!-- iOS (ทุก browser — Chrome/Firefox บน iOS ก็ใช้ WebKit เหมือน Safari) ไม่มี beforeinstallprompt ให้กดปุ่ม
           ติดตั้งตรงๆ ได้ ต้องแนะนำขั้นตอน manual แทน (ดู usePwa.ts) -->
      <div v-else-if="showIosInstallHint" class="flex items-center justify-between gap-3 bg-white border border-border rounded-xl px-3.5 py-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-text">ติดตั้งแอป Driver</div>
          <div class="text-xs text-muted">แตะปุ่มแชร์ <span class="material-symbols-rounded text-sm align-middle">ios_share</span> แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" เพื่อติดตั้ง</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button @click="dismissInstall" class="h-9 px-3 rounded-lg text-sm font-medium text-muted">ไว้ทีหลัง</button>
        </div>
      </div>

      <!-- My Jobs -->
      <div>
        <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">งานที่ได้รับมอบหมาย</div>

        <div v-if="activeJobs.length === 0" class="text-center py-8 text-muted text-sm">
          <span class="material-symbols-rounded text-3xl block mb-2">inbox</span>
          ไม่มีงานที่ได้รับมอบหมายในขณะนี้
        </div>

        <button
          v-for="job in activeJobs"
          :key="job.id"
          @click="router.push(`/driver-app/job/${job.id}`)"
          class="w-full text-left bg-white border border-border rounded-2xl p-4 mb-3 last:mb-0 active:bg-surface-2 transition-colors"
        >
          <div class="flex items-center justify-between mb-2 gap-2">
            <div class="font-bold text-primary text-base truncate">{{ bookingTitle(job) }}</div>
            <span class="material-symbols-rounded text-muted text-xl flex-shrink-0">chevron_right</span>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
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
          <!-- ก่อนตอบรับงาน (ASSIGNED) ยังไม่เปิดเผยรายละเอียดปลายทาง — คนขับเห็นแค่ "มีงานใหม่" จนกว่าจะกดรับงาน
               (Phase E: Driver Sequential Delivery Workflow — Booking เดิมยังเป็น Source of Truth เดียว ไม่มีข้อมูลใหม่
               ถูกสร้าง แค่ควบคุมว่าตอนนี้คนขับ "ควรเห็น" อะไรเท่านั้น) -->
          <div v-if="job.status === 'ASSIGNED'" class="text-sm text-muted">มีงานใหม่รอตอบรับ</div>
          <div v-else-if="job.status === 'IN_TRANSIT' || job.status === 'DELIVERING'" class="text-sm text-muted">
            ส่งแล้ว {{ deliveryProgress(job.items).completed }}/{{ deliveryProgress(job.items).total }} จุด
          </div>
          <div v-else class="text-sm text-muted">{{ destinationLabel(job) }}</div>
          <div v-if="job.status === 'ASSIGNED'" class="text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
            กรุณาตอบรับภายใน {{ formatCountdown(remainingAcceptSeconds(job)) }}
          </div>
        </button>
      </div>

      <!-- Recent Trips / Income -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-bold text-muted uppercase tracking-wide">เที่ยวล่าสุด</div>
          <div class="text-sm font-bold text-primary">รวม {{ formatBaht(totalRecentIncome) }}</div>
        </div>
        <div v-if="recentJobs.length === 0" class="text-center py-6 text-muted text-sm">ยังไม่มีประวัติเที่ยวงาน</div>
        <div v-for="job in recentJobs" :key="job.id" class="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div class="min-w-0">
            <div class="text-base font-semibold text-text truncate">{{ bookingTitle(job) }}</div>
            <div class="text-xs text-muted">{{ formatDate(job.completedAt) }}</div>
          </div>
          <div class="text-base font-bold text-green-600 whitespace-nowrap">{{ formatBaht(job.finalAllowance ?? job.allowance) }}</div>
        </div>
      </div>
    </main>

    <!-- Account Settings — bottom sheet (mobile-native) แทน card ลอยกลางจอ -->
    <Teleport to="body" v-if="showAccountSettings">
      <div @click="closeAccountSettings" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-end justify-center">
        <div @click.stop class="w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div class="w-10 h-1.5 bg-border rounded-full mx-auto mt-3 mb-1"></div>
          <div class="flex items-center justify-between px-5 py-3 border-b border-border">
            <div class="font-bold text-text text-lg">ตั้งค่าบัญชี</div>
            <button @click="closeAccountSettings" class="w-11 h-11 -mr-2 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>

          <!-- Tabs: บัญชี (ข้อมูลติดต่อ + อีเมล/PIN) / ตั้งค่า UI (ธีม + ขนาดตัวอักษร) -->
          <div class="flex px-5 pt-3 gap-4 border-b border-border">
            <button
              @click="settingsTab = 'account'"
              :class="['pb-2 text-sm font-semibold border-b-2 -mb-px', settingsTab === 'account' ? 'text-primary border-primary' : 'text-muted border-transparent']"
            >
              บัญชี
            </button>
            <button
              @click="settingsTab = 'ui'"
              :class="['pb-2 text-sm font-semibold border-b-2 -mb-px', settingsTab === 'ui' ? 'text-primary border-primary' : 'text-muted border-transparent']"
            >
              ตั้งค่า UI
            </button>
          </div>

          <div v-if="settingsTab === 'account'" class="p-5 space-y-6">
            <div class="space-y-3">
              <div class="text-xs font-bold text-muted uppercase tracking-wide">ข้อมูลติดต่อ</div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรศัพท์มือถือ</label>
                <input v-model="contactForm.phone" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ไอดี Line</label>
                <input v-model="contactForm.lineId" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ผู้ติดต่อกรณีฉุกเฉิน</label>
                <input v-model="contactForm.emergencyContact" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ความสัมพันธ์</label>
                <input v-model="contactForm.emergencyRelation" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div v-if="contactError" class="text-sm text-red-600 flex items-center gap-1">
                <span class="material-symbols-rounded text-base">error</span>
                {{ contactError }}
              </div>
              <div v-if="contactSuccess" class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                บันทึกสำเร็จ
              </div>
              <button
                @click="saveContactInfo"
                :disabled="contactSaving"
                class="w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ contactSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลติดต่อ' }}
              </button>
            </div>

            <div class="space-y-3 pt-4 border-t border-border">
              <div class="text-xs font-bold text-muted uppercase tracking-wide">อีเมล / PIN เข้าสู่ระบบ</div>
              <div class="text-sm text-muted">
                เพิ่ม/เปลี่ยนอีเมลจริงแทนอีเมลภายในที่ระบบตั้งให้อัตโนมัติ หรือเปลี่ยน PIN — เว้นว่างช่องไหนไว้ถ้าไม่ต้องการเปลี่ยน ต้องกรอก PIN ปัจจุบันเพื่อยืนยันตัวตนก่อนเสมอ
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">PIN ปัจจุบัน (ยืนยันตัวตน)</label>
                <input v-model="accountForm.currentPassword" type="password" placeholder="PIN/รหัสผ่านปัจจุบัน" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">อีเมลใหม่ (ไม่บังคับ)</label>
                <input v-model="accountForm.newEmail" type="email" placeholder="เช่น somchai@gmail.com" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">PIN ใหม่ (ไม่บังคับ)</label>
                <input v-model="accountForm.newPassword" type="password" placeholder="อย่างน้อย 6 ตัวอักษร" class="w-full h-12 px-3 rounded-lg border border-border text-base" />
              </div>
              <div v-if="accountError" class="text-sm text-red-600 flex items-center gap-1">
                <span class="material-symbols-rounded text-base">error</span>
                {{ accountError }}
              </div>
              <div v-if="accountSuccess" class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                บันทึกสำเร็จ
              </div>
              <button
                @click="saveAccountSettings"
                :disabled="!accountForm.currentPassword || accountSaving"
                class="w-full h-11 rounded-lg border border-primary text-primary text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ accountSaving ? 'กำลังบันทึก...' : 'บันทึกอีเมล/PIN' }}
              </button>
            </div>
          </div>

          <div v-else class="p-5 space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold text-text">โหมดกลางคืน</div>
                <div class="text-xs text-muted">ปรับสีพื้นหลัง/ตัวหนังสือให้เข้ากับแสงรอบตัว</div>
              </div>
              <button
                @click="appStore.toggleDarkMode()"
                :class="['w-14 h-8 rounded-full flex items-center px-1 transition-colors flex-shrink-0', appStore.isDarkMode ? 'bg-primary justify-end' : 'bg-border justify-start']"
              >
                <span class="w-6 h-6 rounded-full bg-white shadow"></span>
              </button>
            </div>
            <div>
              <div class="text-sm font-semibold text-text mb-2">ขนาดตัวอักษร</div>
              <div class="flex gap-2">
                <button
                  v-for="opt in textScaleOptions"
                  :key="opt.value"
                  @click="appStore.setTextScale(opt.value)"
                  :class="[
                    'flex-1 h-11 rounded-lg text-sm font-semibold border',
                    appStore.textScale === opt.value ? 'bg-primary text-white border-primary' : 'bg-white text-text border-border',
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useAppStore } from '@/stores/app'
import type { Booking } from '@/types'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import { isDriverVisibleBooking } from '@/utils/driverJobs'
import { deliveryProgress } from '@/utils/deliveryProgress'
import { bookingTitle } from '@/utils/bookingTitle'
import { usePwaInstall, usePwaUpdate } from '@/composables/usePwa'

const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()
const driversStore = useDriversStore()
const appStore = useAppStore()

// Phase F — PWA install prompt + update-available banners (ดู composables/usePwa.ts)
const { showInstallBanner, showIosInstallHint, promptInstall, dismissInstall } = usePwaInstall()
const { updateAvailable, applyUpdate } = usePwaUpdate()

/** รายชื่อคนขับ ดึงจากสมุดรายชื่อจริง (Settings > พนักงานขับรถ) แทนรายชื่อตัวอย่างเดิม */
const driverOptions = computed(() => driversStore.drivers.map((d) => driversStore.fullName(d)))

// เข้าสู่ระบบด้วยบัญชีคนขับ (role: driver) ให้ล็อกชื่อตามผู้ใช้ที่ล็อกอิน แยกจากมุมมองแอดมิน
const isDriverRole = computed(() => authStore.role === 'DRIVER')
const selectedDriver = ref(authStore.userName)
watch(
  driverOptions,
  (opts) => {
    // ถ้าบัญชีคนขับผูก driverId ไว้แล้ว (ดู UserManagementView.vue) ให้โชว์ชื่อจากสมุดรายชื่อคนขับตัวจริงเสมอ
    // แม่นยำกว่าชื่อบัญชี login ที่ admin พิมพ์เอง ไม่ต้องพึ่งชื่อบัญชีตรงกับสมุดรายชื่อเป๊ะ
    if (isDriverRole.value && authStore.profile?.driverId) {
      const linked = driversStore.drivers.find((d) => d.id === authStore.profile?.driverId)
      if (linked) {
        selectedDriver.value = driversStore.fullName(linked)
        return
      }
    }
    if (opts.length && !opts.includes(selectedDriver.value)) {
      selectedDriver.value = isDriverRole.value && opts.includes(authStore.userName) ? authStore.userName : opts[0]
    }
  },
  { immediate: true }
)

/** id คนขับที่กำลังเลือกอยู่ตอนนี้ — ใช้ authStore.profile.driverId ตรงๆ ถ้าเป็นบัญชีคนขับที่ผูกไว้แล้ว (แม่นยำสุด
 *  ไม่ต้องพึ่งชื่อ) ไม่งั้น fallback เป็นหาโดยเทียบชื่อจาก dropdown เหมือนเดิม (สำหรับ admin ที่สลับดูมุมมองคนขับต่างๆ) */
const selectedDriverId = computed(() => {
  if (isDriverRole.value && authStore.profile?.driverId) return authStore.profile.driverId
  return driversStore.drivers.find((d) => driversStore.fullName(d) === selectedDriver.value)?.id
})

// รวม items>0 ไว้ในนี้แล้ว (ดู isDriverVisibleBooking ใน utils/driverJobs.ts) — Driver App ไม่แสดงงาน items=[]
const matchesSelectedDriver = (b: Booking) => isDriverVisibleBooking(b, selectedDriverId.value, selectedDriver.value)

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'DELIVERING'] as const

const activeJobs = computed(() =>
  bookingStore.bookings.filter((b) => matchesSelectedDriver(b) && (ACTIVE_STATUSES as readonly string[]).includes(b.status))
)

// นาฬิกาสำหรับนับถอยหลังเวลาที่เหลือให้ตอบรับงาน (โชว์แค่ตัวเลขในรายการ กดเข้า Job Detail เพื่อตอบรับจริง)
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

const recentJobs = computed(() =>
  bookingStore.bookings
    .filter((b) => matchesSelectedDriver(b) && b.status === 'DELIVERED')
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

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

// --- Account Settings: บัญชี (ข้อมูลติดต่อ + เปลี่ยนอีเมล/PIN) และ ตั้งค่า UI (ธีม/ขนาดตัวอักษร) ---
const showAccountSettings = ref(false)
const settingsTab = ref<'account' | 'ui'>('account')
const textScaleOptions: { value: 'sm' | 'base' | 'lg'; label: string }[] = [
  { value: 'sm', label: 'เล็ก' },
  { value: 'base', label: 'ปกติ' },
  { value: 'lg', label: 'ใหญ่' },
]

const accountForm = ref({ currentPassword: '', newEmail: '', newPassword: '' })
const accountError = ref('')
const accountSuccess = ref(false)
const accountSaving = ref(false)

// ข้อมูลติดต่อของตัวเอง (เบอร์โทร/LINE/ผู้ติดต่อฉุกเฉิน) — ฟิลด์ allowlist เดียวกับ firestore.rules เป๊ะ (ดู
// driversStore.updateOwnDriverContact) ไม่มี PIN gate เพราะไม่ใช่ข้อมูล auth
const contactForm = ref({ phone: '', lineId: '', emergencyContact: '', emergencyRelation: '' })
const contactError = ref('')
const contactSuccess = ref(false)
const contactSaving = ref(false)

const openAccountSettings = async () => {
  settingsTab.value = 'account'
  accountForm.value = { currentPassword: '', newEmail: '', newPassword: '' }
  accountError.value = ''
  accountSuccess.value = false
  contactError.value = ''
  contactSuccess.value = false
  showAccountSettings.value = true

  const driverId = authStore.profile?.driverId
  if (driverId) {
    const driver = await driversStore.fetchOwnDriver(driverId)
    if (driver) {
      contactForm.value = {
        phone: driver.phone,
        lineId: driver.lineId,
        emergencyContact: driver.emergencyContact,
        emergencyRelation: driver.emergencyRelation,
      }
    }
  }
}

const saveContactInfo = async () => {
  contactError.value = ''
  contactSuccess.value = false
  const driverId = authStore.profile?.driverId
  if (!driverId) {
    contactError.value = 'ไม่พบบัญชีคนขับที่ผูกไว้ — กรุณาติดต่อแอดมิน'
    return
  }
  contactSaving.value = true
  try {
    await driversStore.updateOwnDriverContact(driverId, { ...contactForm.value })
    contactSuccess.value = true
  } catch (err: any) {
    contactError.value = err?.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  } finally {
    contactSaving.value = false
  }
}

const closeAccountSettings = () => {
  showAccountSettings.value = false
}

const saveAccountSettings = async () => {
  accountError.value = ''
  accountSuccess.value = false
  if (!accountForm.value.currentPassword) return
  accountSaving.value = true
  try {
    await authStore.updateOwnCredentials({
      currentPassword: accountForm.value.currentPassword,
      newEmail: accountForm.value.newEmail || undefined,
      newPassword: accountForm.value.newPassword || undefined,
    })
    // ผูก driverId ไว้แล้ว + เปลี่ยนอีเมลสำเร็จ -> อัปเดต driverAuthEmails index ให้หน้า Login resolve ตัวใหม่ได้ตั้งแต่ครั้งถัดไป
    if (accountForm.value.newEmail && authStore.profile?.driverId) {
      await driversStore.setAuthEmail(authStore.profile.driverId, accountForm.value.newEmail.trim())
    }
    accountSuccess.value = true
    accountForm.value = { currentPassword: '', newEmail: '', newPassword: '' }
  } catch (err: any) {
    const code = err?.code as string | undefined
    accountError.value =
      code === 'auth/wrong-password' || code === 'auth/invalid-credential'
        ? 'PIN ปัจจุบันไม่ถูกต้อง'
        : code === 'auth/email-already-in-use'
          ? 'อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว'
          : code === 'auth/requires-recent-login'
            ? 'กรุณาล็อกอินใหม่อีกครั้งก่อนเปลี่ยนอีเมล/PIN'
            : err?.message || 'บันทึกไม่สำเร็จ'
  } finally {
    accountSaving.value = false
  }
}
</script>
