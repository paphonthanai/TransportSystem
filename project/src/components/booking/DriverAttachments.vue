<template>
  <div class="space-y-2">
    <div v-if="urls.length" class="grid grid-cols-3 gap-2">
      <div v-for="(url, i) in urls" :key="url" class="relative">
        <img
          :src="url"
          :alt="`รูปแนบ ${i + 1}`"
          class="w-full h-24 object-cover rounded-lg border border-border bg-white cursor-zoom-in"
          title="กดเพื่อขยาย"
          @click="lightbox = { src: url, title: `${booking.docNo} · รูปแนบ ${i + 1}`, filename: `${booking.docNo} รูปแนบ ${i + 1}` }"
        />
        <button
          v-if="editable"
          type="button"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600"
          title="เอารูปนี้ออก"
          @click="remove(url)"
        >
          <span class="material-symbols-rounded text-sm">close</span>
        </button>
      </div>
    </div>
    <div v-else-if="!editable" class="text-sm text-muted">-</div>

    <label v-if="editable" class="btn-sm cursor-pointer inline-flex">
      <span class="material-symbols-rounded text-base">add_a_photo</span>
      {{ busy ? 'กำลังอัปโหลด...' : 'แนบรูป' }}
      <input type="file" accept="image/*" multiple class="hidden" :disabled="busy" @change="onFiles" />
    </label>
    <div v-if="error" class="text-xs text-red-600">{{ error }}</div>

    <ImageLightbox :image="lightbox" @close="lightbox = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { uploadJobPhoto, photoPaths } from '@/utils/photoUpload'
import ImageLightbox from '@/components/shared/ImageLightbox.vue'
import type { Booking } from '@/types'

/** รูปที่ออฟฟิศแนบให้คนขับดู (Booking.driverAttachments) — editable = ออฟฟิศแนบ/เอาออกได้, ไม่ส่ง = ดูอย่างเดียว (แอปคนขับ) */
const props = defineProps<{ booking: Booking; editable?: boolean }>()

const bookingStore = useBookingStore()
const urls = computed(() => props.booking.driverAttachments || [])
const busy = ref(false)
const error = ref('')
const lightbox = ref<{ src: string; title: string; filename?: string } | null>(null)

/** อัปโหลดทีละรูปแล้วบันทึกลงงานทันที — รูปไหนพังก็ยังเก็บรูปที่ขึ้นสำเร็จไว้ */
const onFiles = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  busy.value = true
  error.value = ''
  try {
    for (const file of files) {
      const url = await uploadJobPhoto(photoPaths.driverAttachment(props.booking.id), file)
      bookingStore.addDriverAttachment(props.booking.id, url)
    }
  } catch (err: any) {
    error.value = err?.message || 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    busy.value = false
  }
}

const remove = (url: string) => {
  if (!confirm('เอารูปนี้ออกจากงาน? คนขับจะไม่เห็นรูปนี้อีก')) return
  bookingStore.removeDriverAttachment(props.booking.id, url)
}
</script>
