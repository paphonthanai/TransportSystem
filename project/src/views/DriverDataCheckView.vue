<template>
  <div class="space-y-6 pb-16">
    <div>
      <h2 class="text-lg font-bold text-text">ตั้งค่า · ตรวจข้อมูลคนขับในงาน</h2>
      <div class="text-xs text-muted mt-0.5 max-w-3xl">
        รวมงานที่ข้อมูลคนขับยังไม่ตรง/ไม่ครบ พร้อมลิงก์เข้าไปดูหรือแก้ไขแต่ละงาน และปุ่มซิงก์ชื่อ-นามสกุลจากทะเบียนคนขับ
        (ผูกด้วยรหัสคนขับ ไม่เปลี่ยนสถานะ/ทะเบียนของงาน)
      </div>
    </div>

    <!-- เลือกดูทีละกลุ่ม (ลิงก์จาก Dashboard "ต้องดำเนินการ" ตั้งกลุ่มมาให้ผ่าน ?group=) -->
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-sm" :class="activeGroup === '' ? '!bg-primary !text-white !border-primary' : ''" @click="activeGroup = ''">
        ทั้งหมด
      </button>
      <button
        v-for="g in groups"
        :key="g.key"
        type="button"
        class="btn-sm"
        :class="activeGroup === g.key ? '!bg-primary !text-white !border-primary' : ''"
        @click="activeGroup = g.key"
      >
        {{ g.chip }} ({{ g.rows.length }})
      </button>
    </div>

    <section v-for="group in visibleGroups" :key="group.key" class="card-lg">
      <div class="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div class="font-bold text-text">
          {{ group.title }}
          <span class="text-sm font-semibold" :class="group.rows.length ? 'text-amber-700' : 'text-green-700'">({{ group.rows.length }} งาน)</span>
        </div>
        <button
          v-if="group.canSync && group.rows.length"
          class="btn-secondary"
          :disabled="busy"
          @click="syncAll(group)"
          title="ตั้งชื่อ/นามสกุลของทุกงานในกลุ่มนี้ให้ตรงกับทะเบียนคนขับ และลบหมายเหตุ 'ชื่อเล่นไม่ตรง' ที่ค้าง"
        >
          <span class="material-symbols-rounded text-base">sync</span>
          ซิงก์ทั้งกลุ่ม
        </button>
      </div>
      <div class="text-xs text-muted mb-3">{{ group.hint }}</div>

      <div v-if="!group.rows.length" class="text-sm text-green-700 flex items-center gap-1">
        <span class="material-symbols-rounded text-base">check_circle</span>
        ไม่มีรายการ
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm min-w-[720px]">
          <thead class="text-xs text-muted text-left bg-surface-2">
            <tr>
              <th class="px-3 py-2 font-semibold">เลขที่งาน</th>
              <th class="px-3 py-2 font-semibold">ลูกค้า / ทะเบียน</th>
              <th class="px-3 py-2 font-semibold">ชื่อคนขับในงาน</th>
              <th class="px-3 py-2 font-semibold">ที่ควรเป็น (ทะเบียนคนขับ)</th>
              <th class="px-3 py-2 font-semibold text-right">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in group.rows.slice(0, limit[group.key] || PAGE)" :key="row.booking.id" class="border-t border-border">
              <td class="px-3 py-2 font-semibold text-text whitespace-nowrap">{{ row.booking.docNo }}</td>
              <td class="px-3 py-2 text-text">
                <div>{{ row.booking.customer }}</div>
                <div class="text-xs text-muted">{{ row.booking.plate || 'ไม่มีทะเบียน' }}</div>
              </td>
              <td class="px-3 py-2">
                <template v-if="group.key === 'noDriver' || group.key === 'noPlate'"><BookingDriverFixCell :booking="row.booking" /></template>
                <template v-else>
                  <div class="text-text">{{ row.booking.driverName }}</div>
                  <div v-if="group.key === 'staleNote'" class="text-[11px] text-amber-700">{{ row.note }}</div>
                  <div v-if="group.key === 'noSnapshot'" class="text-[11px] text-amber-700">ยังไม่มีชื่อ/นามสกุลแยก (snapshot)</div>
                </template>
              </td>
              <td class="px-3 py-2 text-text">{{ row.expected || '-' }}</td>
              <td class="px-3 py-2">
                <div class="flex justify-end gap-2 flex-wrap">
                  <RouterLink :to="`/job/${row.booking.id}`" class="btn-sm">ดูงาน</RouterLink>
                  <RouterLink :to="`/booking/${row.booking.category}/${row.booking.id}/edit`" class="btn-sm">แก้ไขงาน</RouterLink>
                  <button v-if="group.canSync && row.driver" class="btn-sm text-green-700" :disabled="busy" @click="syncOne(row)">ซิงก์จากทะเบียนคนขับ</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <button
          v-if="group.rows.length > (limit[group.key] || PAGE)"
          class="btn-sm mt-3"
          @click="limit[group.key] = (limit[group.key] || PAGE) + PAGE"
        >
          แสดงเพิ่ม ({{ group.rows.length - (limit[group.key] || PAGE) }} งาน)
        </button>
      </div>
    </section>

    <div v-if="message" class="text-xs font-semibold text-green-700 flex items-center gap-1">
      <span class="material-symbols-rounded text-base">check_circle</span>
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Booking } from '@/types'
import { useBookingStore } from '@/stores/booking'
import { useDriversStore } from '@/stores/drivers'
import BookingDriverFixCell from '@/components/booking/BookingDriverFixCell.vue'

/**
 * ตรวจข้อมูลคนขับในงาน — 4 กลุ่ม: (1) ไม่มีชื่อคนขับ (2) ชื่อ/นามสกุลแยก (snapshot) ยังไม่มีในงานนำเข้าเก่า
 * (3) ชื่อในงานไม่ตรงกับทะเบียนคนขับ (เช่น สะกดผิด/นามสกุลซ้ำ) (4) หมายเหตุ "ชื่อเล่นไม่ตรง" ที่ค้างทั้งที่จัดคนขับแล้ว
 * ซิงก์ = ตั้งข้อมูลคนขับของงานให้ตรงกับทะเบียนคนขับตามรหัสคนขับ (bookingStore.assignDriverToBooking) และลบหมายเหตุที่ค้าง
 */
const bookingStore = useBookingStore()
const driversStore = useDriversStore()

const PAGE = 30
const limit = reactive<Record<string, number>>({})
const busy = ref(false)
const message = ref('')

type DriverRec = (typeof driversStore.drivers)[number]
interface Row {
  booking: Booking
  driver?: DriverRec
  expected?: string
  note?: string
}
interface Group {
  key: 'noDriver' | 'noPlate' | 'noSnapshot' | 'mismatch' | 'staleNote'
  /** ชื่อสั้นบนปุ่มเลือกกลุ่ม */
  chip: string
  title: string
  hint: string
  canSync: boolean
  rows: Row[]
}

const fullName = (d: { firstName: string; lastName: string }) => `${d.firstName} ${d.lastName}`.replace(/\s+/g, ' ').trim()
const squish = (s: string | undefined) => (s || '').replace(/\s+/g, ' ').trim()
const driverNoteOf = (b: Booking) =>
  (b.note || '')
    .split(' | ')
    .filter((p) => p.startsWith('ชื่อเล่นคนขับ'))
    .join(' | ')

/** หาคนขับของงานจากรหัสคนขับ (ไม่เดาจากชื่อ — ถ้าไม่มี driverId จะไม่เสนอซิงก์) */
const driverOf = (b: Booking): DriverRec | undefined => (b.driverId ? driversStore.drivers.find((d) => d.id === b.driverId) : undefined)

const groups = computed<Group[]>(() => {
  const noDriver: Row[] = []
  const noPlate: Row[] = []
  const noSnapshot: Row[] = []
  const mismatch: Row[] = []
  const staleNote: Row[] = []
  for (const b of bookingStore.bookings) {
    if (!b.plate) noPlate.push({ booking: b })
    if (!b.driverName) {
      noDriver.push({ booking: b, note: driverNoteOf(b) })
      continue
    }
    const d = driverOf(b)
    const expected = d ? fullName(d) : undefined
    if (d && squish(b.driverName) !== expected) mismatch.push({ booking: b, driver: d, expected })
    else if (d && (!b.driverFirstName || !b.driverLastName)) noSnapshot.push({ booking: b, driver: d, expected })
    const note = driverNoteOf(b)
    if (note) staleNote.push({ booking: b, driver: d, expected, note })
  }
  return [
    {
      key: 'noDriver',
      chip: 'ไม่มีชื่อคนขับ',
      title: 'งานที่ไม่มีชื่อคนขับ',
      hint: 'ใช้ปุ่ม "อัปเดต" (คนขับประจำรถ) หรือเลือกคนขับเอง — ไม่เปลี่ยนสถานะ/ทะเบียนของงาน',
      canSync: false,
      rows: noDriver,
    },
    {
      key: 'noPlate',
      chip: 'ไม่มีทะเบียน',
      title: 'งานที่ไม่มีทะเบียนรถ',
      hint: 'ถ้ามีชื่อคนขับ ใช้ปุ่ม "อัปเดตทะเบียน" (รถประจำของคนขับ) — หรือเข้าไปแก้ไขงานเพื่อเลือกทะเบียนเอง ไม่เปลี่ยนสถานะของงาน',
      canSync: false,
      rows: noPlate,
    },
    {
      key: 'mismatch',
      chip: 'ชื่อไม่ตรงทะเบียนคนขับ',
      title: 'ชื่อคนขับในงานไม่ตรงกับทะเบียนคนขับ',
      hint: 'เช่น สะกดผิด หรือนามสกุลซ้ำ — ซิงก์เพื่อใช้ชื่อ-นามสกุลตามทะเบียนคนขับ',
      canSync: true,
      rows: mismatch,
    },
    {
      key: 'noSnapshot',
      chip: 'ไม่มีชื่อ/นามสกุลแยก',
      title: 'งานนำเข้าเก่าที่ยังไม่มีชื่อ/นามสกุลแยก (snapshot)',
      hint: 'เงินเดือนคนขับใช้ชื่อ/นามสกุลแยกนี้ — ซิงก์เพื่อเติมให้ตรงกับทะเบียนคนขับ',
      canSync: true,
      rows: noSnapshot,
    },
    {
      key: 'staleNote',
      chip: 'หมายเหตุชื่อเล่นค้าง',
      title: 'หมายเหตุ "ชื่อเล่นไม่ตรง" ที่ค้างอยู่',
      hint: 'ข้อความถูกแปะตอนนำเข้า ทั้งที่ตอนนี้จัดคนขับแล้ว — ซิงก์เพื่อลบหมายเหตุที่ค้าง (หรือเข้าไปแก้ไขงานเอง)',
      canSync: true,
      rows: staleNote,
    },
  ]
})

/** กลุ่มที่กำลังดู ('' = ทั้งหมด) — ตั้งจาก ?group= ของลิงก์ (ดู Dashboard "ต้องดำเนินการ") */
const route = useRoute()
const activeGroup = ref<'' | Group['key']>('')
watch(
  () => route.query.group,
  (g) => {
    activeGroup.value = ['noDriver', 'noPlate', 'noSnapshot', 'mismatch', 'staleNote'].includes(String(g)) ? (g as Group['key']) : ''
  },
  { immediate: true }
)
const visibleGroups = computed(() => (activeGroup.value ? groups.value.filter((g) => g.key === activeGroup.value) : groups.value))

const applyRow = (row: Row) => {
  const d = row.driver
  if (!d) return
  bookingStore.assignDriverToBooking(row.booking.id, {
    driverName: fullName(d),
    driverId: d.id,
    driverFirstName: d.firstName,
    driverLastName: d.lastName,
  })
}

const syncOne = (row: Row) => {
  applyRow(row)
  message.value = `ซิงก์งาน ${row.booking.docNo} แล้ว`
}

const syncAll = async (group: Group) => {
  const rows = group.rows.filter((r) => r.driver)
  if (!rows.length) return
  if (!confirm(`ซิงก์ ${rows.length} งานในกลุ่ม "${group.title}" ให้ตรงกับทะเบียนคนขับ?`)) return
  busy.value = true
  rows.forEach(applyRow)
  busy.value = false
  message.value = `ซิงก์ ${rows.length} งานแล้ว (การบันทึกหลายงานใช้เวลาสักครู่ — อย่าปิดหน้านี้จนกว่าจะครบ)`
}
</script>

<style scoped>
.btn-secondary {
  @apply h-9 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}
.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2 inline-flex items-center disabled:opacity-40;
}
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
