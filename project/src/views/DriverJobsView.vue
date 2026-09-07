<template>
  <!-- Full-bleed mobile shell — ไม่มีการ์ดลอยกลางจอแบบเดิม (max-w-sm+rounded+shadow) ใช้พื้นที่จอเต็มเหมือนแอปมือถือจริง
       เผื่อพื้นที่ safe-area บน/ล่างไว้ตั้งแต่ตอนนี้ (env(safe-area-inset-*)) แม้ยังไม่ได้ติดตั้ง PWA manifest จริง
       เพื่อให้พร้อมต่อยอดเป็น PWA/bottom navigation ได้ทันทีในอนาคตโดยไม่ต้องรื้อ layout ซ้ำ -->
  <div class="min-h-screen bg-surface-2 flex flex-col">
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
        <select
          v-model="selectedDriver"
          :disabled="isDriverRole"
          class="w-full h-12 px-3 rounded-lg text-base font-semibold text-text bg-white/95 border-0 outline-none disabled:opacity-80"
        >
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
            <div class="font-bold text-primary text-base truncate">{{ job.docNo }}</div>
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
            <div class="text-base font-semibold text-text truncate">{{ job.docNo }} · {{ destinationLabel(job) }}</div>
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
          <div class="p-5 space-y-4">
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
          </div>
          <div class="flex gap-3 px-5 py-4 border-t border-border">
            <button @click="closeAccountSettings" class="flex-1 h-12 rounded-lg border border-border text-base font-medium text-text">ปิด</button>
            <button
              @click="saveAccountSettings"
              :disabled="!accountForm.currentPassword || accountSaving"
              class="flex-1 h-12 rounded-lg bg-primary text-white text-base font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {{ accountSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
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
import type { Booking } from '@/types'
import { bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import { isDriverVisibleBooking } from '@/utils/driverJobs'
import { deliveryProgress } from '@/utils/deliveryProgress'
import { usePwaInstall, usePwaUpdate } from '@/composables/usePwa'

const router = useRouter()
const bookingStore = useBookingStore()
const authStore = useAuthStore()
const driversStore = useDriversStore()

// Phase F — PWA install prompt + update-available banners (ดู composables/usePwa.ts)
const { showInstallBanner, promptInstall, dismissInstall } = usePwaInstall()
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

// --- Account Settings: self-service เปลี่ยนอีเมล/PIN ของบัญชีตัวเอง (D1 — ดู authStore.updateOwnCredentials) ---
const showAccountSettings = ref(false)
const accountForm = ref({ currentPassword: '', newEmail: '', newPassword: '' })
const accountError = ref('')
const accountSuccess = ref(false)
const accountSaving = ref(false)

const openAccountSettings = () => {
  accountForm.value = { currentPassword: '', newEmail: '', newPassword: '' }
  accountError.value = ''
  accountSuccess.value = false
  showAccountSettings.value = true
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
