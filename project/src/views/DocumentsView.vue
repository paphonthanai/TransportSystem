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
                  <button @click="router.push(`/documents/${doc.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button v-if="doc.status === 'draft'" @click="bookingStore.markInvoiceSent(doc.id)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">send</span>
                    ส่งให้ลูกค้า
                  </button>
                  <button v-else-if="doc.status === 'sent'" @click="openRecordPayment(doc)" class="btn-sm text-green-700">
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

    <!-- Record Payment Modal (บังคับแนบ POD ก่อนบันทึกรับชำระ) -->
    <Teleport to="body" v-if="paymentTarget">
      <div @click="closeRecordPayment" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">บันทึกรับชำระ {{ paymentTarget.number }}</div>
            <button @click="closeRecordPayment" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="text-xs text-muted">
              ต้องแนบเอกสาร POD ประกอบก่อนจึงจะบันทึกรับชำระได้ (ยอด {{ formatBaht(paymentTarget.amount) }})
            </div>
            <label class="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all">
              <input type="file" accept="image/*" class="hidden" @change="onPaymentPodSelected" />
              <img v-if="paymentPodPreview" :src="paymentPodPreview" class="max-h-48 mx-auto rounded-lg object-contain" />
              <template v-else>
                <span class="material-symbols-rounded text-3xl text-muted block mb-1">upload_file</span>
                <div class="text-sm text-muted">แตะเพื่อแนบเอกสาร POD</div>
              </template>
            </label>
            <div v-if="paymentPodError" class="text-xs text-red-600 flex items-center gap-1">
              <span class="material-symbols-rounded text-sm">error</span>
              {{ paymentPodError }}
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="closeRecordPayment" class="btn-secondary">ยกเลิก</button>
            <button
              @click="confirmRecordPayment"
              :disabled="!paymentPodPreview"
              class="h-10 px-4 rounded-lg border-0 bg-green-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">paid</span>
              ยืนยันบันทึกรับชำระ
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import type { SalesDocument } from '@/stores/booking'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const bookingStore = useBookingStore()
const appStore = useAppStore()

const documents = computed(() => bookingStore.documents)
const canEdit = computed(() => appStore.currentRole === 'admin')

const statusLabel = (status: string) => ({ draft: 'ร่าง', sent: 'ส่งแล้ว', paid: 'ชำระแล้ว' })[status] || status

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

// --- Record payment (บังคับแนบ POD ก่อนบันทึกรับชำระ) ---
const paymentTarget = ref<SalesDocument | null>(null)
const paymentPodPreview = ref<string | null>(null)
const paymentPodError = ref('')

const openRecordPayment = (doc: SalesDocument) => {
  paymentTarget.value = doc
  paymentPodPreview.value = null
  paymentPodError.value = ''
}

const closeRecordPayment = () => {
  paymentTarget.value = null
}

const onPaymentPodSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  paymentPodError.value = ''
  paymentPodPreview.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) {
    paymentPodError.value = 'ไฟล์ที่แนบไม่ใช่รูปภาพ กรุณาแนบเอกสาร POD ที่ถูกต้อง'
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    paymentPodPreview.value = reader.result as string
  }
  reader.onerror = () => {
    paymentPodError.value = 'ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่'
  }
  reader.readAsDataURL(file)
}

const confirmRecordPayment = () => {
  if (!paymentTarget.value || !paymentPodPreview.value) return
  bookingStore.markInvoicePaid(paymentTarget.value.id, paymentPodPreview.value)
  closeRecordPayment()
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
</style>
