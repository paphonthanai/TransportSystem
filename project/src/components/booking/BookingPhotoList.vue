<template>
  <div class="space-y-2">
    <div v-if="urls.length" class="grid grid-cols-3 gap-2">
      <div v-for="(url, i) in urls" :key="url" class="relative">
        <img
          :src="url"
          :alt="`รูป ${i + 1}`"
          class="w-full h-24 object-cover rounded-lg border border-border bg-white cursor-zoom-in"
          title="กดเพื่อขยาย"
          @click="lightbox = { src: url, title: `${booking.docNo} · ${title} ${i + 1}`, filename: `${booking.docNo} ${title} ${i + 1}` }"
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

    <template v-if="editable">
      <label v-if="urls.length < MAX_PHOTOS_PER_LIST" class="btn-sm cursor-pointer inline-flex">
        <span class="material-symbols-rounded text-base">add_a_photo</span>
        {{ busy ? 'กำลังอัปโหลด...' : `แนบรูป (${urls.length}/${MAX_PHOTOS_PER_LIST})` }}
        <input type="file" accept="image/*" multiple class="hidden" :disabled="busy" @change="onFiles" />
      </label>
      <div v-else class="text-xs text-muted">แนบครบ {{ MAX_PHOTOS_PER_LIST }} รูปแล้ว — เอารูปเดิมออกก่อนถึงจะแนบเพิ่มได้</div>
    </template>
    <div v-if="error" class="text-xs text-red-600">{{ error }}</div>

    <ImageLightbox :image="lightbox" @close="lightbox = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { uploadJobPhoto, photoPaths, MAX_PHOTOS_PER_LIST, type PhotoActor } from '@/utils/photoUpload'
import ImageLightbox from '@/components/shared/ImageLightbox.vue'
import type { Booking, BookingPhotoListField } from '@/types'

/**
 * ชุดรูปหลายรูปของงาน — field: driverAttachments = ออฟฟิศแนบให้คนขับดู, driverPhotos = คนขับแนบเพิ่มเอง
 * editable = แนบ/เอาออกได้, ไม่ส่ง = ดูอย่างเดียว; actor = โซน Storage ของผู้อัปโหลด (ดู storage.rules)
 */
const props = withDefaults(defineProps<{ booking: Booking; field?: BookingPhotoListField; editable?: boolean; actor?: PhotoActor }>(), {
  field: 'driverAttachments',
  actor: 'office',
})

const bookingStore = useBookingStore()
const urls = computed(() => props.booking[props.field] || [])
const title = computed(() => (props.field === 'driverPhotos' ? 'รูปจากคนขับ' : 'รูปแนบ'))
const busy = ref(false)
const error = ref('')
const lightbox = ref<{ src: string; title: string; filename?: string } | null>(null)

const pathFor = () => (props.field === 'driverPhotos' ? photoPaths.extra(props.booking.id, props.actor) : photoPaths.driverAttachment(props.booking.id))

/** อัปโหลดทีละรูปแล้วบันทึกลงงานทันที — รูปไหนพังก็ยังเก็บรูปที่ขึ้นสำเร็จไว้; เกินจำนวนสูงสุดตัดส่วนเกินทิ้งพร้อมแจ้ง */
const onFiles = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files || [])
  input.value = ''
  if (!picked.length) return
  const room = MAX_PHOTOS_PER_LIST - urls.value.length
  const files = picked.slice(0, Math.max(0, room))
  busy.value = true
  error.value = picked.length > files.length ? `แนบได้สูงสุด ${MAX_PHOTOS_PER_LIST} รูป — อัปโหลดเฉพาะ ${files.length} รูปแรก` : ''
  try {
    for (const file of files) {
      const url = await uploadJobPhoto(pathFor(), file)
      bookingStore.addBookingPhoto(props.booking.id, props.field, url)
    }
  } catch (err: any) {
    error.value = err?.message || 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    busy.value = false
  }
}

const remove = (url: string) => {
  if (!confirm('เอารูปนี้ออกจากงาน?')) return
  bookingStore.removeBookingPhoto(props.booking.id, props.field, url)
}
</script>
