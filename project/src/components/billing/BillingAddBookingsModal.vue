<template>
  <Teleport to="body">
    <div @click="emit('close')" class="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div @click.stop class="w-full max-w-5xl max-h-[85vh] bg-surface rounded-xl shadow-default flex flex-col">
        <div class="flex items-center justify-between gap-3 p-4 border-b border-border">
          <div>
            <h3 class="font-bold text-text">เพิ่มงานขนส่งเข้าใบวางบิล</h3>
            <div class="text-xs text-muted mt-0.5">{{ customer }}{{ category ? ` · ${categoryFeedLabel[category]}` : '' }}</div>
          </div>
          <button @click="emit('close')" class="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-surface-2" title="ปิด">
            <span class="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        <div class="p-4 flex items-center gap-3 flex-wrap">
          <select v-if="!category" v-model="pickedCategory" class="input-field">
            <option value="">เลือกประเภทงาน...</option>
            <option v-for="c in categories" :key="c" :value="c">{{ categoryFeedLabel[c] }}</option>
          </select>
          <select v-model="monthFilter" class="input-field">
            <option value="">ทุกเดือน</option>
            <option v-for="m in monthOptions" :key="m" :value="m">{{ billingMonthLabel(m) }}</option>
          </select>
          <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 min-w-[220px]">
            <span class="material-symbols-rounded text-muted">search</span>
            <input v-model="searchText" type="text" placeholder="ค้นหา รายละเอียด/หน้างาน, ทะเบียน, เลขที่ PO ลูกค้า, วันที่, ราคา" class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted" />
          </div>
        </div>

        <div class="flex-1 overflow-auto px-4">
          <table class="w-full text-sm min-w-[820px]">
            <thead class="bg-surface-2 text-xs text-muted sticky top-0">
              <tr>
                <th class="px-3 py-2 w-8"><input type="checkbox" :checked="allVisibleSelected" :disabled="visibleBookings.length === 0" @change="toggleAll" class="w-4 h-4" /></th>
                <th class="text-left px-3 py-2 font-semibold">ชื่อสินค้า/รายละเอียด</th>
                <th class="text-left px-3 py-2 font-semibold">ทะเบียน</th>
                <th class="text-left px-3 py-2 font-semibold">เลขที่ PO ลูกค้า</th>
                <th class="text-left px-3 py-2 font-semibold">วันที่ส่งของสำเร็จ</th>
                <th class="text-right px-3 py-2 font-semibold">ราคารวม</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in visibleBookings" :key="b.id" class="border-t border-border">
                <td class="px-3 py-2"><input type="checkbox" :checked="selectedIds.has(b.id)" @change="toggle(b.id)" class="w-4 h-4" /></td>
                <td class="px-3 py-2 text-text">{{ describe(b) }}</td>
                <td class="px-3 py-2 text-text">{{ b.plate || '-' }}</td>
                <td class="px-3 py-2 text-text">{{ b.reference || '-' }}</td>
                <td class="px-3 py-2 text-text">{{ dateText(b) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(totalOf(b)) }}</td>
              </tr>
              <tr v-if="visibleBookings.length === 0">
                <td colspan="6" class="px-3 py-6 text-center text-muted">
                  {{ !activeCategory ? 'เลือกประเภทงานก่อน' : searchText ? `ไม่พบงานที่ตรงกับ "${searchText}"` : 'ไม่มีงานของลูกค้ารายนี้ที่รอวางบิล' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between gap-3 flex-wrap p-4 border-t border-border">
          <div class="text-sm">
            <span class="text-muted">เลือก {{ selectedBookings.length }} งาน · ยอดรวม</span>
            <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="emit('close')" class="btn-secondary">ยกเลิก</button>
            <button @click="emit('add', selectedBookings)" :disabled="selectedBookings.length === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded text-base">add</span>
              เพิ่มเข้าใบวางบิล ({{ selectedBookings.length }})
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { bookingProductsText } from '@/utils/bookingProducts'
import { computed, ref, watch } from 'vue'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { billingDateOf, billingMonthKey, billingMonthLabel, categoryFeedLabel } from '@/utils/bookingStatus'
import { matchesSearchFields } from '@/utils/searchFields'
import type { Booking, BookingCategory } from '@/types'

/** bookings = งานของลูกค้ารายนี้ที่วางบิลได้ (หน้าฟอร์มกรองเงื่อนไขแล้ว), category = ประเภทงานของใบวางบิลนี้ — ว่าง = ใบยังไม่มีงาน ให้เลือกก่อน */
const props = defineProps<{ customer: string; category?: BookingCategory; bookings: Booking[] }>()
const emit = defineEmits<{ add: [bookings: Booking[]]; close: [] }>()

const documentSettingsStore = useDocumentSettingsStore()

const pickedCategory = ref<BookingCategory | ''>('')
const activeCategory = computed(() => props.category || pickedCategory.value)
const categories = computed(() => [...new Set(props.bookings.map((b) => b.category))].sort())

const monthFilter = ref('')
const searchText = ref('')
const selectedIds = ref<Set<string>>(new Set())

const totalOf = (b: Booking) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const describe = (b: Booking) => {
  if (!b.items.length) return '-'
  const destination = b.items.length > 1 ? `${b.items[0].siteName} +${b.items.length - 1} ที่อื่น` : b.items[0].siteName
  const products = bookingProductsText(b)
  return products ? `${destination} — ${products}` : destination
}
const dateText = (b: Booking) => {
  const date = billingDateOf(b)
  return date ? new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'
}

const categoryBookings = computed(() => props.bookings.filter((b) => b.category === activeCategory.value))
const monthOptions = computed(() => [...new Set(categoryBookings.value.map(billingMonthKey))].sort().reverse())
const visibleBookings = computed(() =>
  categoryBookings.value
    .filter((b) => !monthFilter.value || billingMonthKey(b) === monthFilter.value)
    .filter((b) => matchesSearchFields(searchText.value, [describe(b), b.plate, b.reference, dateText(b), formatBaht(totalOf(b)), b.shipmentNo]))
)
/** งานที่ติ๊กไว้ยังอยู่แม้ค้นคำอื่น/เปลี่ยนเดือน เหมือนหน้าเลือกงานตอนสร้างใบวางบิล */
const selectedBookings = computed(() => categoryBookings.value.filter((b) => selectedIds.value.has(b.id)))
const selectedTotal = computed(() => selectedBookings.value.reduce((sum, b) => sum + totalOf(b), 0))
const allVisibleSelected = computed(() => visibleBookings.value.length > 0 && visibleBookings.value.every((b) => selectedIds.value.has(b.id)))

const toggle = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
const toggleAll = () => {
  const next = new Set(selectedIds.value)
  const select = !allVisibleSelected.value
  visibleBookings.value.forEach((b) => (select ? next.add(b.id) : next.delete(b.id)))
  selectedIds.value = next
}

watch(pickedCategory, () => {
  selectedIds.value = new Set()
  monthFilter.value = ''
})
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}
</style>
