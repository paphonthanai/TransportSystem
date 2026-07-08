<template>
  <div class="space-y-6">
    <div class="card-lg">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่ใบวางบิล</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">จำนวนเที่ยว</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">ยอดรวม</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in documents" :key="doc.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ doc.number }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ doc.customer }}</td>
              <td class="px-4 py-3 text-muted">{{ formatDate(doc.date) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ doc.bookingIds.length }}</td>
              <td class="px-4 py-3 text-right font-semibold text-text">{{ formatBaht(doc.amount) }}</td>
              <td class="px-4 py-3">
                <span class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">{{ statusLabel(doc.status) }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openView(doc)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button @click="router.push(`/documents/${doc.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">description</span>
                    พิมพ์เอกสาร
                  </button>
                  <button v-if="doc.status === 'draft'" @click="bookingStore.markInvoiceSent(doc.id)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">send</span>
                    ส่งให้ลูกค้า
                  </button>
                  <button v-else-if="doc.status === 'sent'" @click="bookingStore.markInvoicePaid(doc.id)" class="btn-sm text-green-700">
                    <span class="material-symbols-rounded text-base">paid</span>
                    บันทึกรับชำระ
                  </button>
                  <button
                    v-else
                    :disabled="!canEdit"
                    :title="canEdit ? 'แก้ไขเอกสาร' : 'ต้องมีสิทธิ์ Admin ในการแก้ไข'"
                    class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="documents.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-muted">ยังไม่มีเอกสารขาย</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="text-xs text-muted">
      หมายเหตุ: เอกสารขายสามารถแก้ไขได้ แต่จำกัดสิทธิ์การแก้ไขเฉพาะผู้ดูแลระบบ (Admin) เท่านั้น
    </div>

    <!-- View Details Modal -->
    <Teleport to="body" v-if="viewTarget">
      <div @click="viewTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div>
              <div class="font-bold text-text">รายละเอียดเอกสารขาย {{ viewTarget.number }}</div>
              <div class="text-xs text-muted">{{ viewTarget.customer }} · {{ formatDate(viewTarget.date) }}</div>
            </div>
            <button @click="viewTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">เลขที่เอกสาร</div>
                <div class="font-bold text-text">{{ viewTarget.number }}</div>
              </div>
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">ลูกค้า</div>
                <div class="font-bold text-text">{{ viewTarget.customer }}</div>
              </div>
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">จำนวนเที่ยว</div>
                <div class="font-bold text-text">{{ viewTarget.bookingIds.length }}</div>
              </div>
              <div class="bg-primary text-white rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">ยอดรวม</div>
                <div class="font-bold">{{ formatBaht(viewTarget.amount) }}</div>
              </div>
            </div>

            <div>
              <div class="font-semibold text-text mb-2">รายการเที่ยวที่รวมอยู่ในเอกสารนี้</div>
              <div class="overflow-x-auto rounded-lg border border-border">
                <table class="w-full text-sm">
                  <thead class="bg-surface-2 border-b border-border">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold text-muted">เลขที่เอกสาร</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">หน้างาน</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">อำเภอ</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ทะเบียนรถ / คนขับ</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">วันที่จบงาน</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ค่า extra</th>
                      <th class="text-right px-3 py-2 font-semibold text-muted">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="booking in viewTargetBookings" :key="booking.id" class="border-b border-border last:border-0 align-top">
                      <td class="px-3 py-2 font-bold text-primary">{{ booking.docNo }}</td>
                      <td class="px-3 py-2 font-semibold text-text">{{ booking.siteName }}</td>
                      <td class="px-3 py-2 text-muted">{{ booking.district }}</td>
                      <td class="px-3 py-2 text-text">
                        <div>{{ booking.plate || '-' }}</div>
                        <div class="text-xs text-muted">{{ booking.driverName || '-' }}</div>
                      </td>
                      <td class="px-3 py-2 text-muted">{{ formatDate(booking.completedAt) }}</td>
                      <td class="px-3 py-2 text-xs">
                        <div v-if="!booking.extraCharges?.length" class="text-muted">-</div>
                        <div v-for="extra in booking.extraCharges" :key="extra.id" class="flex justify-between gap-2">
                          <span class="text-muted">{{ extra.label }}</span>
                          <span class="text-text">{{ formatBaht(extra.amount) }}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-right text-text">{{ formatBaht(bookingTotal(booking)) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="viewTarget = null" class="btn-secondary">ปิด</button>
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
import { useAppStore } from '@/stores/app'
import type { SalesDocument } from '@/stores/booking'
import type { Booking } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const appStore = useAppStore()

const documents = computed(() => bookingStore.documents)
const canEdit = computed(() => appStore.currentRole === 'admin')

const statusLabel = (status: string) => ({ draft: 'ร่าง', sent: 'ส่งแล้ว', paid: 'ชำระแล้ว' })[status] || status

const bookingTotal = (booking: Booking) => {
  const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
  return (booking.tripFee || 0) + extras
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

const viewTarget = ref<SalesDocument | null>(null)

const viewTargetBookings = computed(() => {
  if (!viewTarget.value) return []
  const ids = viewTarget.value.bookingIds
  return bookingStore.bookings.filter((b) => ids.includes(b.id))
})

const openView = (doc: SalesDocument) => {
  viewTarget.value = doc
}
</script>

<style scoped>
.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.animate-fade {
  animation: tmsfade 0.2s ease both;
}

.animate-slide {
  animation: tmsslide 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

@keyframes tmsfade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes tmsslide {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
