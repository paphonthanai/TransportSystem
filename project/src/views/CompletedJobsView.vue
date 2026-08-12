<template>
  <div class="space-y-6">
    <!-- Filters -->
    <div class="card-lg space-y-3">
      <div class="flex gap-3 flex-wrap items-center">
        <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
          <span class="material-symbols-rounded text-muted">search</span>
          <input
            v-model="filters.search"
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, PO, ลูกค้า, ทะเบียนรถ..."
            class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
          />
        </div>
        <select v-model="filters.fleet" class="input-field w-40">
          <option :value="undefined">ทุกกองรถ</option>
          <option value="cements">Fleet Cements</option>
          <option value="ceramics">Fleet Ceramics</option>
        </select>
        <select v-model="filters.customer" class="input-field w-48">
          <option value="">ทุกลูกค้า</option>
          <option v-for="c in distinctCustomers" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="filters.driverName" class="input-field w-40">
          <option value="">ทุกคนขับ</option>
          <option v-for="d in distinctDrivers" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filters.billingStatus" class="input-field w-40">
          <option value="">ทุกสถานะวางบิล</option>
          <option v-for="s in billingStatusOptions" :key="s" :value="s">{{ billingStatusLabel[s] }}</option>
        </select>
        <input v-model="filters.site" type="text" placeholder="ค้นหาหน้างาน..." class="input-field w-40" />
        <select v-model="filters.district" class="input-field w-40">
          <option value="">ทุกเขตอำเภอ</option>
          <option v-for="d in distinctDistricts" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="flex gap-3 flex-wrap items-center">
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted">วันที่ส่งของสำเร็จ</span>
          <input v-model="filters.dateFrom" type="date" class="input-field" />
          <span class="text-xs text-muted">ถึง</span>
          <input v-model="filters.dateTo" type="date" class="input-field" />
        </div>
        <button v-if="hasActiveDateOrPicks" @click="clearFilters" class="btn-sm">
          <span class="material-symbols-rounded text-base">close</span>
          ล้างตัวกรอง
        </button>
      </div>
    </div>

    <!-- Table -->
    <div>
      <div class="font-bold text-text mb-3">งานที่เสร็จสิ้นทั้งหมด ({{ completedBookings.length }})</div>
      <div class="card-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">กองรถ</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สินค้า</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">น้ำหนัก/จำนวน</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">รถ / คนขับ</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ส่งของสำเร็จ</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">ราคา</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะวางบิล</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะการจัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in completedBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
                <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
                <td class="px-4 py-3">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', booking.category === 'cements' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700']">
                    {{ booking.category === 'cements' ? 'Cements' : 'Ceramics' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-text">{{ booking.customer }}</td>
                <td class="px-4 py-3 font-semibold text-text">
                  {{ destinationLabel(booking) }}
                  <span class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-2 text-muted">{{ booking.items.length }} เที่ยว</span>
                </td>
                <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
                <td class="px-4 py-3 text-right text-text">{{ weightQtyLabel(booking) }}</td>
                <td class="px-4 py-3 text-text">
                  <div class="font-semibold">{{ booking.plate || '-' }}</div>
                  <div class="text-xs text-muted">{{ booking.driverName || '-' }}</div>
                </td>
                <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.completedAt) }}</td>
                <td class="px-4 py-3 text-right text-text font-semibold">{{ formatBaht(booking.agreedPrice || booking.tripFee) }}</td>
                <td class="px-4 py-3">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[booking.billingStatus || 'UNBILLED']]">
                    {{ billingStatusLabel[booking.billingStatus || 'UNBILLED'] }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <button @click="router.push(`/job/${booking.id}`)" class="btn-sm" title="รายละเอียดงาน">
                      <span class="material-symbols-rounded text-base">visibility</span>
                    </button>
                    <button v-if="firstPodImage(booking)" @click="openPod(booking)" class="btn-sm" title="ดู POD">
                      <span class="material-symbols-rounded text-base">photo_camera</span>
                      POD
                    </button>
                    <button v-if="documentsForBooking(booking).billing" @click="router.push(`/documents/${documentsForBooking(booking).billing!.id}`)" class="btn-sm" title="ใบวางบิล">
                      <span class="material-symbols-rounded text-base">receipt_long</span>
                    </button>
                    <button v-if="documentsForBooking(booking).taxInvoice" @click="router.push(`/documents/${documentsForBooking(booking).taxInvoice!.id}`)" class="btn-sm" title="ใบแจ้งหนี้/ใบกำกับภาษี">
                      <span class="material-symbols-rounded text-base">description</span>
                    </button>
                    <button v-if="documentsForBooking(booking).receipt" @click="router.push(`/documents/${documentsForBooking(booking).receipt!.id}`)" class="btn-sm" title="ใบเสร็จรับเงิน">
                      <span class="material-symbols-rounded text-base">receipt</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="completedBookings.length === 0">
                <td colspan="11" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับตัวกรอง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- POD Preview -->
    <Teleport to="body">
      <div v-if="podPreviewImage" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-6" @click="podPreviewImage = null">
        <img :src="podPreviewImage" class="max-w-full max-h-full rounded-xl shadow-2xl" @click.stop />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCompletedJobs, useCompletedJobsFilters } from '@/composables/useCompletedJobs'
import { billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import type { Booking, BillingStatus } from '@/types'

const router = useRouter()

const filters = useCompletedJobsFilters()
const billingStatusOptions: BillingStatus[] = ['UNBILLED', 'IN_BATCH', 'HOLD', 'INVOICED', 'PAID']

const {
  completedBookings,
  productLabel,
  destinationLabel,
  weightQtyLabel,
  firstPodImage,
  documentsForBooking,
  distinctCustomers,
  distinctDrivers,
  distinctDistricts,
  formatBaht,
  formatShortDate,
} = useCompletedJobs(filters)

const hasActiveDateOrPicks = computed(
  () =>
    !!(
      filters.value.dateFrom ||
      filters.value.dateTo ||
      filters.value.customer ||
      filters.value.driverName ||
      filters.value.billingStatus ||
      filters.value.fleet ||
      filters.value.site ||
      filters.value.district
    )
)

const clearFilters = () => {
  filters.value = { fleet: undefined, search: filters.value.search, dateFrom: '', dateTo: '', customer: '', driverName: '', billingStatus: '', site: '', district: '' }
}

const podPreviewImage = ref<string | null>(null)
const openPod = (booking: Booking) => {
  podPreviewImage.value = firstPodImage(booking) || null
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-sm {
  @apply h-8 px-2.5 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
