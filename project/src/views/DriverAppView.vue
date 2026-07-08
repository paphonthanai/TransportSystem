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
            <div class="text-sm font-semibold text-text">{{ job.siteName }}</div>
            <div class="grid grid-cols-2 gap-2 text-xs text-text">
              <div><span class="text-muted">อำเภอ:</span> {{ job.district }}</div>
              <div><span class="text-muted">น้ำมัน:</span> {{ job.fuelLiters || 0 }} ล.</div>
              <div class="col-span-2"><span class="text-muted">สินค้า:</span> {{ productLabel(job) }}</div>
              <div class="col-span-2"><span class="text-muted">ประเภทงาน:</span> {{ job.jobType || '-' }}</div>
            </div>
            <div class="flex gap-2 pt-2">
              <a
                :href="job.sitePhone ? `tel:${job.sitePhone}` : undefined"
                :class="[
                  'flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5',
                  job.sitePhone ? 'bg-primary text-white' : 'bg-surface-2 text-muted cursor-not-allowed pointer-events-none',
                ]"
              >
                <span class="material-symbols-rounded text-base">call</span>
                {{ job.sitePhone || 'ไม่มีเบอร์โทร' }}
              </a>
              <a
                :href="job.siteCoords ? mapsUrl(job.siteCoords) : undefined"
                target="_blank"
                :class="[
                  'flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-border',
                  job.siteCoords ? 'text-text' : 'text-muted cursor-not-allowed pointer-events-none',
                ]"
              >
                <span class="material-symbols-rounded text-base">near_me</span>
                นำทาง
              </a>
            </div>
            <button
              v-if="job.status === 'DISPATCHED'"
              @click="bookingStore.startTransit(job.id)"
              class="w-full h-9 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">directions</span>
              เริ่มขนส่ง
            </button>
            <button
              v-else-if="job.status === 'IN_TRANSIT'"
              @click="openComplete(job)"
              class="w-full h-9 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-rounded text-base">task_alt</span>
              จบงาน
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
              <div class="text-sm font-semibold text-text truncate">{{ job.docNo }} · {{ job.siteName }}</div>
              <div class="text-xs text-muted">{{ formatDate(job.completedAt) }}</div>
            </div>
            <div class="text-sm font-bold text-green-600 whitespace-nowrap">{{ formatBaht(job.finalAllowance ?? job.allowance) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Complete Job with POD Modal -->
    <Teleport to="body" v-if="completeTarget">
      <div @click="closeComplete" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-4">
        <div @click.stop class="w-full max-w-sm bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="font-bold text-text">จบงาน {{ completeTarget.docNo }}</div>
            <button @click="closeComplete" class="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center">
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>
          <div class="p-5 space-y-3">
            <div class="text-xs text-muted">
              ต้องแนบรูปหลักฐานการส่งมอบสินค้า (POD) ให้ถูกต้องก่อนจึงจะกดยืนยันจบงานได้
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
            <button @click="closeComplete" class="h-9 px-4 rounded-lg border border-border text-sm font-medium text-text">ยกเลิก</button>
            <button
              @click="confirmComplete"
              :disabled="!podPreview"
              class="h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">task_alt</span>
              ยืนยันจบงาน
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import type { Booking } from '@/types'
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

const activeJobs = computed(() =>
  bookingStore.bookings.filter(
    (b) => b.driverName === selectedDriver.value && (b.status === 'DISPATCHED' || b.status === 'IN_TRANSIT')
  )
)

const recentJobs = computed(() =>
  bookingStore.bookings
    .filter((b) => b.driverName === selectedDriver.value && b.status === 'DELIVERED')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 5)
)

const totalRecentIncome = computed(() =>
  recentJobs.value.reduce((sum, b) => sum + (b.finalAllowance ?? b.allowance ?? 0), 0)
)

const productLabel = (booking: Booking) => {
  if (booking.category === 'ceramics') return 'ปูนซีเมนต์'
  const types = (booking.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const mapsUrl = (coords: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

// --- Complete job with POD photo ---
const completeTarget = ref<Booking | null>(null)
const podPreview = ref<string | null>(null)
const podError = ref('')

const openComplete = (job: Booking) => {
  completeTarget.value = job
  podPreview.value = null
  podError.value = ''
}

const closeComplete = () => {
  completeTarget.value = null
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

const confirmComplete = () => {
  if (!completeTarget.value || !podPreview.value) return
  bookingStore.completeJobByDriver(completeTarget.value.id, podPreview.value)
  closeComplete()
}
</script>
