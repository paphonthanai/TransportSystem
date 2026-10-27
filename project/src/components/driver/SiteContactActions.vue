<template>
  <!-- ปุ่มโทรหน้างาน + นำทางของจุดส่งหนึ่งจุด ใช้ทั้งขั้นแรก (ACCEPTED — ให้คนขับโทร/เช็คเส้นทางล่วงหน้าได้ตั้งแต่ยังไม่ออกรถ)
       และขั้นส่งของ (IN_TRANSIT/DELIVERING) — มีหลายเบอร์ = ปุ่มโทรครบทุกเบอร์ (ดึงจากข้อความผู้ติดต่อด้วย ดู utils/phone.ts) -->
  <div class="space-y-2">
    <div v-if="phones.length > 1" class="grid grid-cols-2 gap-2">
      <a
        v-for="phone in phones"
        :key="phone"
        :href="`tel:${phone}`"
        class="h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-primary text-white active:bg-blue-800"
      >
        <span class="material-symbols-rounded text-base">call</span>
        {{ formatPhone(phone) }}
      </a>
    </div>
    <div class="flex gap-3">
      <a
        v-if="phones.length <= 1"
        :href="phones[0] ? `tel:${phones[0]}` : undefined"
        :class="[
          'flex-1 h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5',
          phones[0] ? 'bg-primary text-white active:bg-blue-800' : 'bg-surface-2 text-muted cursor-not-allowed pointer-events-none',
        ]"
      >
        <span class="material-symbols-rounded text-base">call</span>
        {{ phones[0] ? formatPhone(phones[0]) : 'ไม่มีเบอร์โทร' }}
      </a>
      <a
        :href="mapUrl || undefined"
        target="_blank"
        :class="[
          'flex-1 h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border border-border',
          mapUrl ? 'text-text bg-white active:bg-surface-2' : 'text-muted bg-surface-2 cursor-not-allowed pointer-events-none',
        ]"
      >
        <span class="material-symbols-rounded text-base">near_me</span>
        {{ mapUrl ? 'นำทาง' : 'ไม่มีพิกัด' }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JobItem } from '@/types'
import { phonesOfSite, formatPhone } from '@/utils/phone'

const props = defineProps<{ item: JobItem }>()

const phones = computed(() => phonesOfSite(props.item))

/** ลิงก์นำทาง: ใช้ลิงก์/พิกัดที่ออฟฟิศกรอกไว้ก่อน ถ้าไม่มีแต่มีพิกัดตัวเลข ให้สร้างลิงก์ค้นหาจากพิกัดนั้นแทน */
const mapUrl = computed(() => {
  const item = props.item
  if (item.mapUrl) return /^https?:\/\//.test(item.mapUrl) ? item.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapUrl)}`
  if (item.latitude !== undefined && item.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
  }
  return ''
})
</script>
