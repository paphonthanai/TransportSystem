<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-bold text-text">{{ sourceBillingRef ? `ออกใบแจ้งหนี้จากใบวางบิล ${sourceBillingRef.number}` : 'เลือกงานขนส่งเพื่อออกใบแจ้งหนี้รวม' }}</h2>
        <div class="text-xs text-muted mt-0.5">
          {{ sourceBillingRef ? 'เลือกงานของใบวางบิลนี้ไว้ให้แล้ว เลือกงานเพิ่มหรือเอาออกได้ แล้วกดถัดไปเพื่อตรวจสอบก่อนสร้างใบแจ้งหนี้' : 'เลือกลูกค้าและงานขนส่ง แล้วนำข้อมูลไปแสดงในหน้าสร้างใบแจ้งหนี้' }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="router.push(sourceBillingRef ? '/billing-notes' : '/tax-invoices')" class="btn-secondary">ยกเลิก</button>
        <button @click="goToForm" :disabled="pickerSelectedIds.size === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">arrow_forward</span>
          ถัดไป ({{ pickerSelectedIds.size }})
        </button>
      </div>
    </div>

    <!-- หมายเหตุ: ทำไมออกใบแจ้งหนี้จากใบวางบิลนี้ไม่ได้ / งานไหนของใบวางบิลดึงมาไม่ได้ (ยอดไม่ครบ) -->
    <div v-if="billingBlockedNote" class="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">
      <div class="font-semibold flex items-center gap-1"><span class="material-symbols-rounded text-base">block</span>ออกใบแจ้งหนี้จากใบวางบิลนี้ไม่ได้</div>
      <div class="mt-1">{{ billingBlockedNote }}</div>
    </div>
    <div v-else-if="sourceBillingRef" class="rounded-lg border px-4 py-3 text-sm" :class="billingProblems.length || selectedDiffersFromBilling ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-border bg-surface text-text'">
      <div class="flex flex-wrap gap-x-6 gap-y-1">
        <span>ใบวางบิล {{ sourceBillingRef.number }}: <b>{{ sourceBillingRef.bookingIds.length }}</b> งาน ยอด <b>{{ formatBaht(billingTripTotal) }}</b></span>
        <span>เลือกไว้: <b>{{ pickerSelectedIds.size }}</b> งาน ยอด <b>{{ formatBaht(selectedTotal) }}</b> (ก่อน VAT/ส่วนลด)</span>
      </div>
      <div v-if="billingProblems.length" class="mt-2">
        <div class="font-semibold flex items-center gap-1"><span class="material-symbols-rounded text-base">warning</span>งานในใบวางบิลที่ดึงมาออกใบแจ้งหนี้ไม่ได้ {{ billingProblems.length }} งาน</div>
        <ul class="list-disc pl-6 mt-1 space-y-0.5">
          <li v-for="p in billingProblems.slice(0, 20)" :key="p.key">{{ p.text }}</li>
          <li v-if="billingProblems.length > 20">...และอีก {{ billingProblems.length - 20 }} งาน</li>
        </ul>
        <div v-if="orphanBookingIds.length" class="mt-3 rounded-lg border border-amber-400 bg-white/60 px-3 py-2">
          <div>
            มี <b>{{ orphanBookingIds.length }}</b> งานที่ระบบบันทึกว่า "ออกใบแจ้งหนี้แล้ว" แต่ใบแจ้งหนี้นั้น<b>ไม่มีอยู่ในระบบ</b>
            (ค้างจากการสร้างใบแจ้งหนี้ที่บันทึกไม่สำเร็จ หรือใบที่ถูกลบไป) — กดปลดเพื่อให้ดึงงานเหล่านี้มาออกใบแจ้งหนี้ได้
            ระบบจะตรวจกับเซิร์ฟเวอร์ก่อนว่าใบแจ้งหนี้ไม่มีอยู่จริง ใบที่ยังมีอยู่จะไม่ถูกแตะ
          </div>
          <button @click="releaseOrphans" :disabled="releasing" class="btn-primary mt-2 disabled:opacity-50">
            <span class="material-symbols-rounded text-base">lock_open</span>
            {{ releasing ? 'กำลังตรวจสอบ...' : `ปลดงานที่ค้าง ${orphanBookingIds.length} งาน` }}
          </button>
        </div>
      </div>
      <div v-else-if="selectedDiffersFromBilling" class="mt-2">มีงานของใบวางบิลที่ไม่ได้ติ๊กไว้ ยอดใบแจ้งหนี้จะไม่เท่าใบวางบิล</div>
    </div>

    <div class="card-lg space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
        <div>
          <label class="field-label">ลูกค้า</label>
          <select v-model="customerName" :disabled="!!sourceBillingRef" class="input-field w-full disabled:opacity-60">
            <option value="">เลือกลูกค้า...</option>
            <option v-for="c in eligibleCustomers" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">ประเภทงาน (Feed)</label>
          <select v-model="bookingCategory" :disabled="!customerName.trim() || !!sourceBillingRef" class="input-field w-full disabled:opacity-40">
            <option value="">เลือกประเภทงาน...</option>
            <option v-for="c in bookingCategories" :key="c" :value="c">{{ categoryFeedLabel[c] }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">เดือนที่ส่งของสำเร็จ</label>
          <select v-model="monthFilter" :disabled="!customerName.trim()" class="input-field w-full disabled:opacity-40">
            <option value="">ทุกเดือน</option>
            <option v-for="m in monthOptions" :key="m" :value="m">{{ billingMonthLabel(m) }}</option>
          </select>
        </div>
      </div>
      <div v-if="bookingCategories.length > 1" class="text-[11px] text-muted">ลูกค้ารายนี้มีงานมากกว่าหนึ่งประเภท ต้องออกใบแจ้งหนี้แยกทีละประเภท (Feed) เสมอ</div>
      <div class="text-[11px] text-muted leading-relaxed">
        หมายเหตุ: งานที่ไม่แสดงในรายการ (ออกใบแจ้งหนี้ไม่ได้) — ยังไม่จบงาน (สถานะยังไม่ใช่ "ส่งสำเร็จ"), ออกใบแจ้งหนี้ไปแล้ว,
        ต่างประเภทงาน (Feed) กับที่เลือก, หรือถ้าเลือกงานเพิ่มนอกใบวางบิล: อยู่ในใบวางบิลอื่นแล้ว / ยังไม่ได้ยืนยันการจบงาน — ตัวกรองเดือนที่เลือกไว้ก็ซ่อนงานเดือนอื่นด้วย
      </div>

      <!-- ค้นหางานในตารางตามคอลัมน์ที่แสดง (ดู matchesTableColumns)
           กรองแค่ที่แสดง งานที่ติ๊กไว้แล้วยังถูกเลือกอยู่แม้ค้นคำอื่น -->
      <div v-if="bookingCategory" class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border max-w-md">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchText"
          type="text"
          placeholder="ค้นหา รายละเอียด/หน้างาน, ทะเบียน, ชนิดปูน, เลขที่เอกสาร, เลขชิพเม้น, วันที่ส่งของสำเร็จ, ราคา, เลขชิพเม้น"
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>

      <div v-if="bookingCategory" class="border border-border rounded-lg overflow-x-auto bg-surface">
        <table class="w-full text-sm min-w-[1200px]">
          <thead class="bg-surface-2 text-xs text-muted">
            <tr>
              <th class="px-3 py-2 w-8"></th>
              <th class="text-left px-3 py-2 font-semibold w-10 cursor-pointer select-none" @click="toggleSort('index')">
                ลำดับ<span class="material-symbols-rounded text-sm align-text-bottom">{{ sortIcon('index') }}</span>
              </th>
              <th class="text-left px-3 py-2 font-semibold">ชื่อสินค้า/รายละเอียด</th>
              <th class="text-left px-3 py-2 font-semibold">ทะเบียน</th>
              <th class="text-left px-3 py-2 font-semibold">ชนิดปูน</th>
              <th class="text-left px-3 py-2 font-semibold cursor-pointer select-none" @click="toggleSort('po')">
                เลขที่เอกสาร<span class="material-symbols-rounded text-sm align-text-bottom">{{ sortIcon('po') }}</span>
              </th>
              <th class="text-left px-3 py-2 font-semibold cursor-pointer select-none" @click="toggleSort('shipDate')">
                วันที่ส่งของสำเร็จ<span class="material-symbols-rounded text-sm align-text-bottom">{{ sortIcon('shipDate') }}</span>
              </th>
              <th class="text-right px-3 py-2 font-semibold">จำนวน</th>
              <th class="text-left px-3 py-2 font-semibold">หน่วย</th>
              <th class="text-right px-3 py-2 font-semibold">ราคาต่อหน่วย</th>
              <th class="text-right px-3 py-2 font-semibold">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, idx) in sortedEligibleBookings" :key="b.id" class="border-t border-border">
              <td class="px-3 py-2">
                <input type="checkbox" :checked="pickerSelectedIds.has(b.id)" @change="toggleBooking(b.id)" class="w-4 h-4" />
              </td>
              <td class="px-3 py-2 text-muted whitespace-nowrap">
                {{ idx + 1 }}
                <span v-if="sourceBillingRef && b.billingNoteDocId === sourceBillingRef.id" class="ml-1 text-[10px] font-semibold text-primary">ในใบวางบิล</span>
              </td>
              <td class="px-3 py-2 text-text">{{ bookingDescription(b) }}</td>
              <td class="px-3 py-2 text-text">{{ b.plate || '-' }}</td>
              <td class="px-3 py-2 text-text">{{ bookingProducts(b) }}</td>
              <td class="px-3 py-2 text-text whitespace-pre-line">{{ billingDocNo(b) }}</td>
              <td class="px-3 py-2 text-text">{{ formatDateShort(billingDateOf(b)) }}</td>
              <td class="px-3 py-2 text-right text-text">1</td>
              <td class="px-3 py-2 text-text">เที่ยว</td>
              <td class="px-3 py-2 text-right text-text">{{ formatBaht(bookingTotal(b)) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(b)) }}</td>
            </tr>
            <tr v-if="eligibleBookings.length > 0 && sortedEligibleBookings.length === 0">
              <td colspan="11" class="px-3 py-6 text-center text-muted">ไม่พบงานที่ตรงกับ "{{ searchText }}"</td>
            </tr>
            <tr v-if="eligibleBookings.length === 0">
              <td colspan="11" class="px-3 py-6 text-center text-muted">ลูกค้ารายนี้ไม่มีงานประเภทนี้ที่รอออกใบแจ้งหนี้</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="bookingCategory" class="flex justify-end text-sm">
        <span class="text-muted">ยอดรวมที่เลือก:</span>
        <span class="font-bold text-primary ml-1">{{ formatBaht(selectedTotal) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { bookingProductsText } from '@/utils/bookingProducts'
import { billingDocNo } from '@/utils/customerShipment'
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentPrefillStore } from '@/stores/documentPrefill'
import { buildPrefillFromBilling, unclaimedBillingGroups } from '@/utils/billingPrefill'
import { categoryFeedLabel, billingDateOf, billingMonthKey, billingMonthLabel, bookingStatusLabel, isBookingConfirmedForBilling } from '@/utils/bookingStatus'
import { salesDocumentStatusLabel } from '@/utils/salesDocumentStatus'
import { matchesSearchFields } from '@/utils/searchFields'
import type { Booking, BookingCategory } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const documentSettingsStore = useDocumentSettingsStore()

const route = useRoute()
const salesDocumentsStore = useSalesDocumentsStore()
const documentPrefillStore = useDocumentPrefillStore()

/** มาจากปุ่มสถานะ "สร้างใบกำกับภาษี" ของใบวางบิล (?billingId=) — ลูกค้า/ประเภทงานล็อกตามใบวางบิล เลือกงานของใบวางบิลไว้ให้
 *  เลือกงานเพิ่มได้เฉพาะงานที่ยังไม่อยู่ในใบวางบิลอื่น และยืนยันการจบงานแล้ว (เงื่อนไขเดียวกับที่สโตร์เช็คตอนบันทึก) */
/** computed (ไม่ใช่ค่าที่จับไว้ครั้งเดียวตอนเปิดหน้า) — หน้านี้ถูกสร้างระหว่างที่ข้อมูลยังโหลดอยู่ (PageGate) และข้อมูลแรกที่ได้
 *  อาจมาจากแคชในเครื่องที่ยังไม่ครบ (งานที่เพิ่ง import/แก้จากเครื่องอื่น) ถ้าจับไว้ครั้งเดียว งานของใบวางบิลจะถูกเลือกไว้ไม่ครบ ยอดหาย */
const billingId = typeof route.query.billingId === 'string' ? route.query.billingId : ''
const sourceBillingDoc = computed(() => (billingId ? salesDocumentsStore.documents.find((d) => d.id === billingId && d.type === 'BILLING') : undefined))
const sourceBillingRef = computed(() => (sourceBillingDoc.value?.status === 'BILLING_PENDING' ? sourceBillingDoc.value : undefined))
const sourceGroup = computed(() => (sourceBillingRef.value ? unclaimedBillingGroups(sourceBillingRef.value, bookingStore.bookings)[0] : undefined))

/** เงื่อนไขเดียวกับ createTaxInvoiceFromBookings/createTaxInvoiceManual (claim ทางตรง) ทุกประการ */
const isBookingBillable = (b: Booking) => {
  if (b.status !== 'DELIVERED' || b.taxInvoiceDocId) return false
  const sourceBilling = sourceBillingRef.value
  if (!sourceBilling) return true
  if (b.billingNoteDocId === sourceBilling.id) return true
  return !b.billingNoteDocId && isBookingConfirmedForBilling(b)
}

const eligibleCustomers = computed(() => [...new Set(bookingStore.bookings.filter(isBookingBillable).map((b) => b.customer))].sort())

const customerName = ref('')
const bookingCategory = ref<BookingCategory | ''>('')
const pickerSelectedIds = ref<Set<string>>(new Set())
/** หมายเหตุว่าทำไมใช้ใบวางบิลนี้ไม่ได้ — มาจากลิงก์ ?billingId= แต่ใบวางบิลไม่อยู่ในสถานะที่ออกใบแจ้งหนี้ได้ */
const billingBlockedNote = computed(() => {
  if (!billingId || salesDocumentsStore.loading) return ''
  const doc = sourceBillingDoc.value
  if (!doc) return 'ไม่พบใบวางบิลนี้ (อาจถูกลบไปแล้ว) — เลือกลูกค้าและงานด้วยตนเองได้ด้านล่าง'
  if (doc.status !== 'BILLING_PENDING')
    return `ใบวางบิล ${doc.number} สถานะ "${salesDocumentStatusLabel('BILLING', doc.status)}" — ออกใบแจ้งหนี้จากใบวางบิลได้เฉพาะสถานะ "รอวางบิล" (ใบนี้อาจออกใบแจ้งหนี้ไปแล้ว หรือถูกยกเลิก)`
  return ''
})

const taxInvoiceNumberOf = (id?: string) => salesDocumentsStore.documents.find((d) => d.id === id)?.number || ''
/** งานของใบวางบิลที่ดึงมาไม่ได้ พร้อมเหตุผล — ยอดใบแจ้งหนี้จะขาดเท่ากับงานเหล่านี้ */
const billingProblems = computed(() => {
  const doc = sourceBillingRef.value
  if (!doc) return []
  const groupCategory = sourceGroup.value?.category
  const out: { key: string; text: string }[] = []
  doc.bookingIds.forEach((bid) => {
    const b = bookingStore.bookings.find((x) => x.id === bid)
    if (!b) {
      if (!bookingStore.bookingsLoading) out.push({ key: bid, text: 'ไม่พบงานในระบบ (อาจถูกลบ หรือข้อมูลยังโหลดไม่ครบ — ลองรีเฟรชหน้า)' })
      return
    }
    const name = `งาน ${billingDocNo(b)}`
    if (b.taxInvoiceDocId) {
      const number = taxInvoiceNumberOf(b.taxInvoiceDocId)
      out.push({
        key: bid,
        text: number
          ? `${name} ออกใบแจ้งหนี้ไปแล้ว (เลขที่ ${number}) — ต้องยกเลิก/ลบใบแจ้งหนี้นั้นก่อนถึงจะดึงมาออกใหม่ได้`
          : `${name} ค้างสถานะ "ออกใบแจ้งหนี้แล้ว" แต่ไม่พบใบแจ้งหนี้นั้นในระบบ — กดปุ่ม "ปลดงานที่ค้าง" ด้านล่าง`,
      })
    }
    else if (b.status !== 'DELIVERED') out.push({ key: bid, text: `${name} ยังไม่จบงาน (สถานะ "${bookingStatusLabel[b.status] || b.status}") — ต้องกดจบงานก่อน` })
    else if (groupCategory && b.category !== groupCategory) out.push({ key: bid, text: `${name} เป็นประเภทงาน ${categoryFeedLabel[b.category]} — ต้องออกใบแจ้งหนี้แยกอีกใบ` })
  })
  return out
})
/** งานของใบวางบิลที่ผูก taxInvoiceDocId กับเอกสารที่ไม่มีในเครื่อง (ยืนยันกับเซิร์ฟเวอร์อีกชั้นตอนกดปลด) */
const orphanBookingIds = computed(() => {
  const doc = sourceBillingRef.value
  if (!doc || salesDocumentsStore.loading) return []
  return doc.bookingIds.filter((bid) => {
    const b = bookingStore.bookings.find((x) => x.id === bid)
    return !!b?.taxInvoiceDocId && !taxInvoiceNumberOf(b.taxInvoiceDocId)
  })
})
const releasing = ref(false)
const releaseOrphans = async () => {
  if (!confirm(`ปลดงาน ${orphanBookingIds.value.length} งานที่ค้างผูกกับใบแจ้งหนี้ที่ไม่มีในระบบ ให้กลับมาออกใบแจ้งหนี้ได้?`)) return
  releasing.value = true
  try {
    const ids = [...orphanBookingIds.value]
    const { released, stillExists } = await salesDocumentsStore.releaseOrphanTaxInvoiceClaims(ids)
    // งานที่เพิ่งปลด เลือกไว้ให้เลย (ถ้าผู้ใช้ยังไม่ได้ติ๊กเอง ระบบเลือกตาม watcher ให้อยู่แล้ว)
    const freed = ids.filter((id) => !bookingStore.bookings.find((b) => b.id === id)?.taxInvoiceDocId)
    pickerSelectedIds.value = new Set([...pickerSelectedIds.value, ...freed])
    alert(
      `ปลดแล้ว ${released} งาน` +
        (stillExists ? `
อีก ${stillExists} งาน ใบแจ้งหนี้ยังมีอยู่บนเซิร์ฟเวอร์ (ไม่ได้ปลด) — ลองรีเฟรชหน้าแล้วตรวจที่หน้าใบแจ้งหนี้` : '')
    )
  } catch (err: any) {
    alert('ตรวจสอบกับเซิร์ฟเวอร์ไม่สำเร็จ (ต้องต่ออินเทอร์เน็ต) — ยังไม่ได้ปลดงานใด ๆ: ' + (err?.message || err))
  } finally {
    releasing.value = false
  }
}

const billingTripTotal = computed(() => {
  const doc = sourceBillingRef.value
  if (!doc) return 0
  return doc.bookingIds.reduce((sum, bid) => {
    const b = bookingStore.bookings.find((x) => x.id === bid)
    return sum + (b ? bookingTotal(b) : 0)
  }, 0)
})
const selectedDiffersFromBilling = computed(() => {
  const doc = sourceBillingRef.value
  if (!doc) return false
  return doc.bookingIds.some((bid) => !pickerSelectedIds.value.has(bid) && !billingProblems.value.some((p) => p.key === bid))
})

/** เลือกงานของใบวางบิลไว้ให้ — ตามข้อมูลที่โหลดเข้ามาเพิ่มจนกว่าผู้ใช้จะติ๊ก/เอาติ๊กออกเอง (ไม่ทับสิ่งที่ผู้ใช้เลือก) */
let userPicked = false

/** กรองตามเดือนที่ส่งของสำเร็จ (รองรับลูกค้าที่วางบิลรายเดือน) — ว่าง = ทุกเดือน เปลี่ยนเดือน/ลูกค้าแล้วล้างงานที่เลือกไว้นอกเดือนนั้นทิ้ง */
const searchText = ref('')
/** ค้นหาตามคอลัมน์ที่แสดงในตาราง (รายละเอียด/หน้างาน · ทะเบียน · ชนิดปูน · เลขที่ PO ลูกค้า · วันที่ส่งของสำเร็จ · ราคา) + เลขชิพเม้น */
const matchesTableColumns = (b: Booking) =>
  matchesSearchFields(searchText.value, [
    bookingDescription(b),
    b.plate,
    bookingProducts(b),
    billingDocNo(b),
    b.reference,
    formatDateShort(billingDateOf(b)),
    formatBaht(bookingTotal(b)),
    b.shipmentNo,
  ])
const monthFilter = ref('')
const monthOptions = computed(() =>
  [...new Set(bookingStore.bookings.filter((b) => b.customer === customerName.value && isBookingBillable(b)).map(billingMonthKey))].sort().reverse()
)
const inMonth = (b: Booking) => !monthFilter.value || billingMonthKey(b) === monthFilter.value
watch(customerName, () => {
  monthFilter.value = ''
  searchText.value = ''
})
watch(monthFilter, () => {
  const visible = new Set(eligibleBookings.value.map((b) => b.id))
  pickerSelectedIds.value = new Set([...pickerSelectedIds.value].filter((id) => visible.has(id)))
})

const bookingCategories = computed<BookingCategory[]>(() => {
  if (!customerName.value.trim()) return []
  const cats = new Set(bookingStore.bookings.filter((b) => b.customer === customerName.value && isBookingBillable(b)).map((b) => b.category))
  return [...cats].sort()
})

const eligibleBookings = computed<Booking[]>(() => {
  if (!bookingCategory.value) return []
  return bookingStore.bookings.filter((b) => inMonth(b) && b.customer === customerName.value && b.category === bookingCategory.value && isBookingBillable(b))
})

/** เรียงลำดับตารางตามคอลัมน์ที่คลิก (ลำดับ/เลขที่ PO/วันที่ส่งงาน) — 'ลำดับ' หมายถึงลำดับเดิมจากการ query เรียง
 *  ปกติ/ย้อนกลับ ไม่ใช่ field จริงในข้อมูล ค่าเริ่มต้น (sortKey ว่าง) = เรียงตามลำดับเดิมเสมอ */
type SortKey = 'index' | 'po' | 'shipDate'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const toggleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
const sortIcon = (key: SortKey) => (sortKey.value !== key ? 'unfold_more' : sortDir.value === 'asc' ? 'arrow_upward' : 'arrow_downward')
const sortedEligibleBookings = computed(() => {
  const list = eligibleBookings.value.filter((b) => matchesTableColumns(b))
  const dir = sortDir.value === 'asc' ? 1 : -1
  if (sortKey.value === 'po') list.sort((a, b) => billingDocNo(a).localeCompare(billingDocNo(b)) * dir)
  else if (sortKey.value === 'shipDate') list.sort((a, b) => ((billingDateOf(a)?.getTime() ?? 0) - (billingDateOf(b)?.getTime() ?? 0)) * dir)
  else if (sortKey.value === 'index' && dir === -1) list.reverse()
  return list
})
/** เปลี่ยนลูกค้า/ประเภทงาน = บริบทใหม่ทั้งหมด ล้างการเรียงเดิมทิ้งด้วย ไม่งั้นค้างเรียงข้ามลูกค้าดูสับสน */
watch([customerName, bookingCategory], () => {
  sortKey.value = null
  sortDir.value = 'asc'
})

watch(
  sourceGroup,
  (group) => {
    if (!group || userPicked) return
    customerName.value = sourceBillingRef.value!.customer
    bookingCategory.value = group.category
    const billable = group.bookingIds.filter((id) => {
      const b = bookingStore.bookings.find((x) => x.id === id)
      return !!b && isBookingBillable(b)
    })
    pickerSelectedIds.value = new Set([...pickerSelectedIds.value, ...billable])
  },
  { immediate: true }
)

const toggleBooking = (id: string) => {
  userPicked = true
  if (pickerSelectedIds.value.has(id)) pickerSelectedIds.value.delete(id)
  else pickerSelectedIds.value.add(id)
  pickerSelectedIds.value = new Set(pickerSelectedIds.value)
}

const bookingDestination = (b: Booking) => {
  if (!b.items.length) return '-'
  const first = b.items[0].siteName
  return b.items.length > 1 ? `${first} +${b.items.length - 1} ที่อื่น` : first
}
const bookingDescription = (b: Booking) => {
  const dest = bookingDestination(b)
  const products = bookingProductsText(b)
  return products ? `${dest} — ${products}` : dest
}
/** ชนิดปูน (เหมือน BillingBookingSelectView.vue) — ข้อมูลเดียวกับที่ผสมอยู่ใน bookingDescription ด้านบนอยู่แล้ว
 *  (b.items[].product) แค่แยกออกมาเป็นคอลัมน์ของตัวเอง ไม่มี field/schema ใหม่ */
const bookingProducts = (b: Booking) => {
  const products = bookingProductsText(b)
  return products || '-'
}
const bookingTotal = (b: Booking) => (b.tripFee || 0) + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
/** วันที่ส่งงาน แบบย่อ วว/ดด/ปป (พ.ศ. 2 หลัก) เช่น "14/08/69" — รูปแบบเดียวกับ formatDateShort ใน InvoiceDocumentView.vue
 *  (คอลัมน์วันที่ส่งในตารางรายเที่ยว) */
const formatDateShort = (date?: Date) => {
  if (!date) return '-'
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String((d.getFullYear() + 543) % 100).padStart(2, '0')
  return `${dd}/${mm}/${yy}`
}

const selectedTotal = computed(() => eligibleBookings.value.filter((b) => pickerSelectedIds.value.has(b.id)).reduce((sum, b) => sum + bookingTotal(b), 0))

const formatBaht = (value: number) => `${documentSettingsStore.settings.currency.symbol}${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const goToForm = () => {
  if (pickerSelectedIds.value.size === 0) return
  const sourceBilling = sourceBillingRef.value
  // งานที่ติ๊กไว้แล้วแต่สถานะเปลี่ยนจนออกใบแจ้งหนี้ไม่ได้ (เช่นถูกออกใบแจ้งหนี้จากอีกเครื่อง) ไม่ส่งต่อ — ดูเหตุผลในหมายเหตุด้านบน
  const selected = [...pickerSelectedIds.value].filter((id) => {
    const b = bookingStore.bookings.find((x) => x.id === id)
    return !!b && isBookingBillable(b)
  })
  if (selected.length === 0) return
  const fromBilling = sourceBilling ? selected.filter((id) => bookingStore.bookings.find((b) => b.id === id)?.billingNoteDocId === sourceBilling.id) : []
  // ไม่ได้เลือกงานของใบวางบิลเลยสักงาน = ไม่ผูกกับใบวางบิล ออกเป็นใบแจ้งหนี้จากงานขนส่งตามปกติ
  if (!sourceBilling || fromBilling.length === 0) {
    router.push({ path: '/tax-invoices/new', query: { bookingIds: selected.join(',') } })
    return
  }
  // รายการของงานในใบวางบิลใช้ของใบวางบิลเดิม (ราคา/คำอธิบายที่แก้ไว้) งานที่เลือกเพิ่มให้หน้าสร้างใบแจ้งหนี้สร้างแถวจากงานนั้นเอง
  const extra = selected.filter((id) => !fromBilling.includes(id))
  documentPrefillStore.setPrefill(buildPrefillFromBilling(sourceBilling, salesDocumentsStore.itemsForDocument(sourceBilling.id), bookingStore.bookings, fromBilling, selected))
  router.push({ path: '/tax-invoices/new', query: extra.length ? { extraBookingIds: extra.join(',') } : {} })
}
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
}

.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
