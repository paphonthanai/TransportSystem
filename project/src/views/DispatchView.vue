<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-3 items-center">
      <div class="text-sm text-muted">งานรอจัดรถ</div>
      <span class="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">{{ waitingBookings.length }} งาน</span>
      <div class="flex-1"></div>
      <button class="btn-secondary">
        <span class="material-symbols-rounded">filter_list</span>
        ตัวกรอง
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div class="card-lg">
        <div class="font-bold text-text mb-4">งานรอจัดรถ</div>
        <div class="space-y-3 max-h-[600px] overflow-y-auto">
          <button
            v-for="booking in waitingBookings"
            :key="booking.id"
            @click="selectBooking(booking.id)"
            :class="['w-full text-left rounded-2xl border transition p-4', selectedBooking === booking.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary']"
          >
            <div class="flex items-center justify-between gap-3 text-sm font-semibold text-text">
              <div>{{ booking.id }}</div>
              <div>{{ booking.price }}</div>
            </div>
            <div class="mt-2 text-sm font-medium text-text">{{ booking.customer }} · {{ booking.goods }}</div>
            <div class="mt-2 text-xs text-muted flex items-center gap-2">
              <span class="material-symbols-rounded text-base">route</span>
              {{ booking.origin }} → {{ booking.dest }}
            </div>
            <div v-if="booking.assignLabel" class="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              <span class="material-symbols-rounded text-sm">assignment_ind</span>
              ระบุจากงาน: {{ booking.assignLabel }}
            </div>
          </button>
        </div>
      </div>

      <div class="space-y-5">
        <div class="card-lg">
          <div class="font-bold text-text mb-4">เลือกรถ</div>
          <div class="grid gap-3 sm:grid-cols-2 max-h-[240px] overflow-y-auto">
            <button
              v-for="vehicle in vehicles"
              :key="vehicle.plate"
              @click="selectVehicle(vehicle.plate)"
              :disabled="vehicle.disabled"
              :class="['rounded-2xl p-4 text-left border transition', selectedVehicle === vehicle.plate ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary', vehicle.disabled ? 'opacity-50 cursor-not-allowed' : '']"
            >
              <div class="flex items-center justify-between gap-3 text-sm font-semibold text-text">
                <div>{{ vehicle.plate }}</div>
                <span :class="['text-[11px] font-semibold px-2 py-1 rounded-full', vehicle.statusClass]">{{ vehicle.status }}</span>
              </div>
              <div class="mt-2 text-xs text-muted">{{ vehicle.type }} · {{ vehicle.cap }}</div>
            </button>
          </div>
        </div>

        <div class="card-lg">
          <div class="font-bold text-text mb-4">เลือกคนขับ</div>
          <div class="grid gap-3 sm:grid-cols-2 max-h-[240px] overflow-y-auto">
            <button
              v-for="driver in drivers"
              :key="driver.name"
              @click="selectDriver(driver.name)"
              :disabled="driver.disabled"
              :class="['rounded-2xl p-4 text-left border transition', selectedDriver === driver.name ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary', driver.disabled ? 'opacity-50 cursor-not-allowed' : '']"
            >
              <div class="flex items-center gap-3">
                <div :style="{ background: driver.avatarColor }" class="w-9 h-9 rounded-xl text-white flex items-center justify-center text-sm font-bold">{{ driver.initial }}</div>
                <div class="min-w-0">
                  <div class="text-sm font-semibold truncate text-text">{{ driver.name }}</div>
                  <div :class="['text-xs font-semibold', driver.statusClass]">{{ driver.status }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div class="card-lg flex flex-col gap-4">
          <div class="text-sm text-muted">{{ assignSummary }}</div>
          <button
            @click="assignVehicle()"
            :disabled="assignDisabled"
            class="btn-primary w-full"
          >
            <span class="material-symbols-rounded">bolt</span>
            Assign จัดรถ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const waitingBookings = ref([
  { id: 'BK-2569-0002', customer: 'บริษัท XYZ จำกัด', goods: 'กระเบื้องดำ', origin: 'ชลบุรี', dest: 'นนทบุรี', price: '฿3,800', assignLabel: 'PO-1123' },
  { id: 'BK-2569-0004', customer: 'บริษัท GHI จำกัด', goods: 'ปูนถุง M402', origin: 'นนทบุรี', dest: 'กรุงเทพฯ', price: '฿4,200', assignLabel: '' },
  { id: 'BK-2569-0006', customer: 'บจก. แลนด์ดีเวลลอป', goods: 'หิน 6 ล้อ', origin: 'ราชบุรี', dest: 'ลำปาง', price: '฿5,900', assignLabel: 'จากงานก่อนหน้า' },
])

const vehicles = ref([
  { plate: '70-8821 สระบุรี', type: 'ดัมพ์ 10 ล้อ', cap: '18 ตัน', status: 'ว่าง', statusClass: 'bg-green-100 text-green-700', disabled: false },
  { plate: '82-4417 กรุงเทพ', type: 'พ่วง 18 ล้อ', cap: '32 ตัน', status: 'กำลังใช้งาน', statusClass: 'bg-blue-100 text-blue-700', disabled: true },
  { plate: '71-3390 ราชบุรี', type: 'ดัมพ์ 6 ล้อ', cap: '8 ตัน', status: 'กำลังใช้งาน', statusClass: 'bg-blue-100 text-blue-700', disabled: true },
  { plate: '83-1102 กรุงเทพ', type: 'พ่วง 22 ล้อ', cap: '40 ตัน', status: 'ซ่อม', statusClass: 'bg-amber-100 text-amber-700', disabled: true },
])

const drivers = ref([
  { name: 'สมชาย ทองดี', initial: 'ส', status: 'ว่าง', statusClass: 'text-blue-700', avatarColor: '#3b82f6', disabled: false },
  { name: 'ประเสริฐ มั่นคง', initial: 'ป', status: 'กำลังวิ่ง', statusClass: 'text-green-700', avatarColor: '#10b981', disabled: true },
  { name: 'วิรัตน์ ใจกล้า', initial: 'ว', status: 'กำลังวิ่ง', statusClass: 'text-green-700', avatarColor: '#2563eb', disabled: true },
  { name: 'อภิชาติ แสนดี', initial: 'อ', status: 'ลางาน', statusClass: 'text-amber-700', avatarColor: '#8b5cf6', disabled: true },
])

const selectedBooking = ref<string | null>(waitingBookings.value[0]?.id ?? null)
const selectedVehicle = ref<string | null>(null)
const selectedDriver = ref<string | null>(null)

const selectBooking = (id: string) => {
  selectedBooking.value = id
}

const selectVehicle = (plate: string) => {
  selectedVehicle.value = plate
}

const selectDriver = (name: string) => {
  selectedDriver.value = name
}

const assignDisabled = computed(() => !selectedBooking.value || !selectedVehicle.value || !selectedDriver.value)

const assignSummary = computed(() => {
  if (!selectedBooking.value && !selectedVehicle.value && !selectedDriver.value) {
    return 'เลือกงาน, รถ และคนขับ เพื่อจัดรถให้เสร็จสมบูรณ์'
  }
  const parts = []
  if (selectedBooking.value) parts.push(`งาน ${selectedBooking.value}`)
  if (selectedVehicle.value) parts.push(`รถ ${selectedVehicle.value}`)
  if (selectedDriver.value) parts.push(`คนขับ ${selectedDriver.value}`)
  return parts.join(' · ')
})

const assignVehicle = () => {
  if (assignDisabled.value) return
  alert(`จัดรถสำเร็จ: ${assignSummary.value}`)
}
</script>
