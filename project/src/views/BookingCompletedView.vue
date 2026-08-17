<template>
  <div class="space-y-6">
    <!-- Search -->
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
    </div>

    <!-- Completed Table -->
    <div>
      <div class="font-bold text-text mb-3">งานที่เสร็จสิ้น ({{ completedBookings.length }})</div>
      <div class="card-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">{{ isCements ? 'ชนิดปูน' : 'สินค้า' }}</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">น้ำหนัก/จำนวน</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">รถ / คนขับ</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ส่งของสำเร็จ</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">ราคา</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะเอกสาร</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in completedBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
                <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
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
                  <div class="flex flex-wrap gap-1">
                    <span v-for="badge in documentClaimBadges(booking)" :key="badge.label" :class="['text-xs font-semibold px-2 py-1 rounded-full', badge.class]">
                      {{ badge.label }}
                    </span>
                    <span v-if="documentClaimBadges(booking).length === 0" class="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">ยังไม่ดำเนินการ</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <BookingActionMenu :booking="booking" @view="router.push(`/job/${booking.id}`)" />
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
                <td colspan="10" class="px-4 py-8 text-center text-muted">ยังไม่มีงานที่เสร็จสิ้น</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { BookingCategory } from '@/types'
import { documentClaimBadges } from '@/utils/bookingStatus'
import { useCompletedJobs, useCompletedJobsFilters } from '@/composables/useCompletedJobs'
import BookingActionMenu from '@/components/booking/BookingActionMenu.vue'

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()

const isCements = computed(() => props.fleet === 'cements')
const filters = useCompletedJobsFilters(props.fleet)

const { completedBookings, productLabel, destinationLabel, weightQtyLabel, documentsForBooking, formatBaht, formatShortDate } = useCompletedJobs(filters)
</script>

<style scoped>
.btn-sm {
  @apply h-8 px-2.5 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1 cursor-pointer hover:bg-surface-2;
}
</style>
