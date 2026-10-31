<template>
  <div class="p-5 space-y-3">
    <div class="rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 text-base font-bold">
      เที่ยวที่ {{ tripNumber }}
    </div>
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div class="bg-surface-2 rounded-lg p-3">
        <div class="text-xs text-muted mb-0.5">ลูกค้า</div>
        <div class="font-semibold text-text truncate">{{ booking.customer || '-' }}</div>
      </div>
      <div class="bg-surface-2 rounded-lg p-3">
        <div class="text-xs text-muted mb-0.5">น้ำมันที่ต้องรับ</div>
        <div class="font-semibold text-text">{{ booking.fuelLiters || 0 }} ล.</div>
      </div>
      <div class="bg-surface-2 rounded-lg p-3 col-span-2">
        <div class="text-xs text-muted mb-0.5">เวลาลงสินค้า</div>
        <div class="font-semibold text-text">{{ loadingTimeOf(booking) || '-' }}</div>
      </div>
      <div class="bg-surface-2 rounded-lg p-3 col-span-2">
        <div class="text-xs text-muted mb-0.5">เลขที่ PO ลูกค้า</div>
        <div class="font-semibold text-text break-all">{{ booking.reference || '-' }}</div>
      </div>
    </div>
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <div class="text-xs font-bold text-amber-800 mb-1">เงื่อนไขลูกค้า</div>
      <div v-if="customerConditionsFor(booking).length" class="space-y-0.5 text-amber-900">
        <div v-for="(c, i) in customerConditionsFor(booking)" :key="i" class="whitespace-pre-wrap">• {{ c }}</div>
      </div>
      <div v-else class="text-amber-900/70">-</div>
    </div>
    <div v-if="booking.driverAttachments?.length" class="rounded-lg border border-border p-3">
      <div class="text-xs font-bold text-muted mb-2">รูปแนบจากออฟฟิศ</div>
      <BookingPhotoList :booking="booking" />
    </div>
    <div class="text-xs font-bold text-muted uppercase tracking-wide pt-1">รายการสินค้า ({{ booking.items.length }})</div>
    <div v-for="item in booking.items" :key="item.id" class="rounded-lg border border-border p-3 space-y-1">
      <div class="font-semibold text-text">{{ item.product }} <span class="font-normal text-muted">{{ item.qty }} {{ item.unit }}</span></div>
      <div v-for="(ep, epIdx) in item.extraProducts || []" :key="epIdx" class="font-semibold text-text">
        {{ ep.product }} <span class="font-normal text-muted">{{ ep.qty }} {{ ep.unit }}</span>
      </div>
      <div class="text-sm text-muted">{{ item.siteName }} ({{ item.province }} · {{ item.district }})</div>
      <div class="text-sm text-muted">ประเภท: <span class="font-bold text-text">{{ jobTypeCode(item.jobType) || '-' }}</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { customerConditionsFor } from '@/utils/bookingNote'
import { jobTypeCode } from '@/utils/jobType'
import { loadingTimeOf } from '@/utils/loadingTime'
import BookingPhotoList from '@/components/booking/BookingPhotoList.vue'
import type { Booking } from '@/types'

/** เนื้อหา "รายละเอียดงาน" ในแอปคนขับ — ใช้ทั้งหน้าต่างรายละเอียดของคนขับจริง และหน้าตรวจสอบก่อนส่งงานฝั่งออฟฟิศ (เห็นเหมือนกันเป๊ะ) */
defineProps<{ booking: Booking; tripNumber: number }>()
</script>
