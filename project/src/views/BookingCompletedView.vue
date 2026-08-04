<template>
  <div class="space-y-6">
    <!-- Search -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
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
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะวางบิล</th>
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
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[booking.billingStatus || 'UNBILLED']]">
                    {{ billingStatusLabel[booking.billingStatus || 'UNBILLED'] }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <BookingActionMenu :booking="booking" @view="router.push(`/job/${booking.id}`)" />
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import type { Booking, BookingCategory } from '@/types'
import { billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import BookingActionMenu from '@/components/booking/BookingActionMenu.vue'

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const bookingStore = useBookingStore()

const isCements = computed(() => props.fleet === 'cements')
const searchQuery = ref('')

const fleetBookings = computed(() => bookingStore.bookings.filter((b) => b.category === props.fleet && b.status === 'DELIVERED'))

const matchesSearch = (b: Booking, q: string) =>
  b.docNo.toLowerCase().includes(q) ||
  (b.po || '').toLowerCase().includes(q) ||
  b.customer.toLowerCase().includes(q) ||
  (b.plate || '').toLowerCase().includes(q)

const completedBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter((b) => !q || matchesSearch(b, q))
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
})

const productLabel = (booking: Booking) => {
  const names = [...new Set(booking.items.map((i) => i.product).filter(Boolean))]
  return names.length ? names.join(', ') : '-'
}

const destinationLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const weightQtyLabel = (booking: Booking) => booking.items.map((i) => `${i.qty} ${i.unit}`).join(', ') || '-'

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatShortDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
</script>
