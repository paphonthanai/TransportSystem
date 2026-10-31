<template>
  <div class="space-y-1 min-w-[150px]">
    <div v-if="booking.driverName" class="text-text">
      {{ booking.driverName }}
      <span v-if="driverNickname" class="text-xs font-semibold text-indigo-700">({{ driverNickname }})</span>
    </div>
    <!-- มีคนขับต้องรู้ทะเบียน: งานที่มีคนขับแต่ไม่มีทะเบียน เสนอทะเบียนรถประจำของคนขับคนนี้ -->
    <div v-if="booking.driverName && !booking.plate" class="space-y-1">
      <div class="text-[11px] font-semibold text-amber-700">ไม่มีทะเบียนรถ</div>
      <button
        v-if="driverVehiclePlate"
        type="button"
        @click="bookingStore.assignPlateToBooking(booking.id, driverVehiclePlate)"
        class="h-7 px-2 rounded-lg border border-border bg-surface font-medium text-xs text-green-700 hover:bg-surface-2"
      >
        อัปเดตทะเบียน: {{ driverVehiclePlate }}
      </button>
    </div>
    <!-- งานไม่มีชื่อคนขับ: แสดงสาเหตุ/หมายเหตุ + ปุ่มอัปเดต (ใช้คนขับประจำรถ) + เลือกคนขับเอง -->
    <template v-if="!booking.driverName">
      <div class="text-[11px] font-semibold text-amber-700">ไม่มีชื่อคนขับ</div>
      <div v-if="driverNote" class="text-[11px] text-muted leading-snug">{{ driverNote }}</div>
      <div class="flex gap-1 flex-wrap items-center">
        <button
          v-if="suggested"
          type="button"
          @click="apply(suggested)"
          class="h-7 px-2 rounded-lg border border-border bg-surface font-medium text-xs text-green-700 hover:bg-surface-2"
          :title="'ใช้คนขับประจำรถ ' + fullName(suggested)"
        >
          อัปเดต: {{ fullName(suggested) }}
        </button>
        <select
          class="h-7 px-1 rounded-lg border border-border bg-surface text-xs text-text max-w-[150px]"
          :value="''"
          @change="onPick(($event.target as HTMLSelectElement).value)"
          title="เลือกคนขับเอง"
        >
          <option value="">แก้ไข: เลือกคนขับ...</option>
          <option v-for="d in activeDrivers" :key="d.code" :value="d.id">{{ fullName(d) }}{{ d.nickname ? ` (${d.nickname})` : '' }}</option>
        </select>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Booking } from '@/types'
import { useBookingStore } from '@/stores/booking'
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { looseNickname } from '@/utils/importRowParser'

/**
 * ช่อง "คนขับ" ของตารางงาน — มีชื่อ = แสดงชื่อ, ไม่มีชื่อ = แสดงหมายเหตุที่เกี่ยวกับคนขับ + ปุ่มอัปเดต/แก้ไข
 * ตั้งเฉพาะข้อมูลคนขับ (bookingStore.assignDriverToBooking) ไม่เปลี่ยนสถานะ/ทะเบียนของงาน
 */
const props = defineProps<{ booking: Booking }>()

const bookingStore = useBookingStore()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()

const fullName = (d: { firstName: string; lastName: string }) => `${d.firstName} ${d.lastName}`.trim()

const vehicle = computed(() => {
  const plate = props.booking.plate
  if (!plate) return undefined
  return vehiclesStore.findByPlateLoose(plate)
})

/** ชื่อเล่นที่ Excel ระบุไว้ตอนนำเข้า (หมายเหตุ 'ชื่อเล่นคนขับ "X" …') ที่จับคู่ไม่ได้ในตอนนั้น */
const noteNickname = computed(() => /ชื่อเล่นคนขับ "([^"]+)"/.exec(props.booking.note || '')?.[1])

/** คนขับที่ชื่อเล่นตรงกับในหมายเหตุ (เฉพาะกรณีมีคนเดียว) — เสนอก่อนคนขับประจำรถ เพราะออฟฟิศเขียนชื่อเล่นคือบอกว่าใครขับ */
const byNoteNickname = computed(() => {
  const nick = looseNickname(noteNickname.value)
  if (!nick) return undefined
  const matches = driversStore.drivers.filter((d) => looseNickname(d.nickname) === nick)
  return matches.length === 1 ? matches[0] : undefined
})

/** คนขับที่เสนอให้ "อัปเดต": ตามชื่อเล่นในหมายเหตุก่อน ไม่มีค่อยใช้คนขับประจำรถของทะเบียนที่งานใช้ */
const suggested = computed(() => {
  if (byNoteNickname.value) return byNoteNickname.value
  const code = vehicle.value?.driverCode
  return code ? driversStore.drivers.find((d) => d.code === code) : undefined
})

/** ทะเบียนรถประจำของคนขับในงานนี้ (จากรหัสคนขับ) — ใช้เสนอทะเบียนให้งานที่มีคนขับแต่ไม่มีทะเบียน */
const driverVehiclePlate = computed(() => {
  const driver = props.booking.driverId ? driversStore.drivers.find((d) => d.id === props.booking.driverId) : undefined
  const v = driver ? vehiclesStore.vehicleForDriver(driver.code) : undefined
  return v?.plate || ''
})

const driverNote = computed(() =>
  (props.booking.note || '')
    .split(' | ')
    .filter((part) => part.startsWith('ชื่อเล่นคนขับ'))
    .join(' | ')
)

/** ชื่อเล่นของคนขับในงานนี้ (หาจากรหัสคนขับก่อน ไม่มีค่อยเทียบชื่อ-นามสกุล) */
const driverNickname = computed(() => {
  const b = props.booking
  const driver =
    (b.driverId ? driversStore.drivers.find((d) => d.id === b.driverId) : undefined) ??
    driversStore.drivers.find((d) => fullName(d) === (b.driverName || '').trim())
  return (driver?.nickname || '').trim()
})

const activeDrivers = computed(() => driversStore.drivers.filter((d) => d.employmentStatus === 'active'))

const apply = (d: { id?: string; firstName: string; lastName: string }) => {
  bookingStore.assignDriverToBooking(props.booking.id, {
    driverName: fullName(d),
    driverId: d.id,
    driverFirstName: d.firstName,
    driverLastName: d.lastName,
  })
}

const onPick = (id: string) => {
  const d = driversStore.drivers.find((x) => x.id === id)
  if (d) apply(d)
}
</script>
