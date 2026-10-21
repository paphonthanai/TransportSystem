<template>
  <Teleport to="body" v-if="booking">
    <div @click="$emit('close')" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
      <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl animate-slide max-h-full overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div class="font-bold text-text">แก้ไขรายได้คนขับ {{ booking.docNo }}</div>
            <div class="text-xs text-muted">งานที่จบแล้ว — แก้เบี้ยเลี้ยง และเพิ่ม/ลดหนี้ของเที่ยวนี้</div>
          </div>
          <button @click="$emit('close')" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="px-6 py-5 space-y-3">
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยง (บาท)</label>
            <input v-model.number="allowance" type="number" min="0" placeholder="0" class="input-field w-full" />
          </div>
          <div class="space-y-2">
            <div v-for="(adj, i) in debtAdjustments" :key="adj.id" class="flex items-center gap-2">
              <input v-model="adj.label" placeholder="รายการ เช่น ค่าปรับ, คืนเงิน" class="input-field flex-1" />
              <input v-model.number="adj.amount" type="number" placeholder="0" class="input-field w-28" />
              <button @click="debtAdjustments.splice(i, 1)" class="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-red-600 hover:bg-red-50">
                <span class="material-symbols-rounded text-base">delete</span>
              </button>
            </div>
          </div>
          <button @click="addAdjustmentRow" class="btn-secondary w-full justify-center">
            <span class="material-symbols-rounded text-base">add</span>
            เพิ่มรายการเพิ่ม/ลดหนี้
          </button>
          <div class="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span class="text-muted">รายได้คนขับเดิม</span>
            <span class="font-bold text-text">{{ formatBaht(booking.finalAllowance ?? booking.allowance) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-text">เบี้ยเลี้ยงสุทธิ (ใหม่)</span>
            <span class="text-xl font-bold text-primary">{{ formatBaht(finalAllowance) }}</span>
          </div>
          <div class="text-[11px] text-muted">
            หมายเหตุ: จำนวนเป็นบวก = เพิ่มหนี้ (หักจากเบี้ยเลี้ยง), จำนวนเป็นลบ = ลดหนี้ (คืนให้เบี้ยเลี้ยง)
          </div>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button @click="$emit('close')" class="btn-secondary">ยกเลิก</button>
          <button @click="confirm" class="btn-primary">
            <span class="material-symbols-rounded">save</span>
            บันทึกรายได้คนขับ
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBookingStore } from '@/stores/booking'
import type { Booking, DebtAdjustment } from '@/types'

/**
 * ไดอะล็อกแก้รายได้คนขับของงานที่จบแล้ว (bookingStore.updateDriverIncome) — ใช้กับงานที่คนขับกดจบงานจากแอป ซึ่งไม่ผ่าน
 * ไดอะล็อกจบงานฝั่งออฟฟิศ (BookingCompleteDialog) ที่ใส่เพิ่ม/ลดหนี้ ส่ง booking เข้ามา (null = ปิด)
 */
const props = defineProps<{ booking: Booking | null }>()
const emit = defineEmits<{ close: [] }>()

const bookingStore = useBookingStore()

const allowance = ref(0)
const debtAdjustments = ref<DebtAdjustment[]>([])

watch(
  () => props.booking,
  (booking) => {
    allowance.value = booking?.allowance || 0
    debtAdjustments.value = (booking?.debtAdjustments || []).map((d) => ({ ...d }))
  },
  { immediate: true }
)

const formatBaht = (value: number | undefined) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const addAdjustmentRow = () => {
  debtAdjustments.value.push({ id: `adj${Date.now()}${debtAdjustments.value.length}`, label: '', amount: 0 })
}

const finalAllowance = computed(() => {
  const net = debtAdjustments.value.reduce((sum, d) => sum + (d.amount || 0), 0)
  return Math.round(((Number(allowance.value) || 0) - net) * 100) / 100
})

const confirm = () => {
  const booking = props.booking
  if (!booking) return
  const result = bookingStore.updateDriverIncome(
    booking.id,
    Number(allowance.value) || 0,
    debtAdjustments.value.filter((d) => d.label || d.amount)
  )
  if (!result.ok) {
    alert(`แก้รายได้คนขับไม่ได้: ${result.message}`)
    return
  }
  emit('close')
}
</script>
