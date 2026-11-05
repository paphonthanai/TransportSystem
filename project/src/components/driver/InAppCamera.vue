<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] bg-black flex flex-col text-white">
      <div class="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] flex-shrink-0">
        <div class="text-sm font-semibold truncate">{{ label }}</div>
        <button @click="$emit('close')" aria-label="ปิดกล้อง" class="w-11 h-11 -mr-2 flex-shrink-0 rounded-lg flex items-center justify-center">
          <span class="material-symbols-rounded text-2xl">close</span>
        </button>
      </div>

      <div class="flex-1 min-h-0 relative">
        <video v-show="!previewUrl && !error" ref="videoEl" autoplay playsinline muted class="absolute inset-0 w-full h-full object-contain"></video>
        <img v-if="previewUrl" :src="previewUrl" alt="รูปที่ถ่าย" class="absolute inset-0 w-full h-full object-contain" />
        <div v-if="error" class="absolute inset-0 flex items-center justify-center p-6 text-center text-base">{{ error }}</div>
        <div v-else-if="!ready && !previewUrl" class="absolute inset-0 flex items-center justify-center text-sm">กำลังเปิดกล้อง...</div>
      </div>

      <div class="flex-shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <!-- เปิดกล้องในแอปไม่ได้ (ไม่อนุญาต/ไม่พบกล้อง/เครื่องไม่รองรับ) = ลองใหม่ หรือใช้แอปกล้องของเครื่องแทน ไม่ติดอยู่ขั้นตอนนี้ -->
        <div v-if="error" class="grid grid-cols-2 gap-3">
          <button @click="startCamera" class="h-12 rounded-lg border border-white/40 text-base font-semibold">ลองใหม่</button>
          <label class="h-12 rounded-lg bg-white text-black text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
            <span class="material-symbols-rounded text-xl">photo_camera</span>
            ใช้กล้องของเครื่อง
            <input type="file" accept="image/*" capture="environment" class="hidden" @change="onNativeFile" />
          </label>
        </div>
        <div v-else-if="previewUrl" class="grid grid-cols-2 gap-3">
          <button @click="retake" class="h-12 rounded-lg border border-white/40 text-base font-semibold">ถ่ายใหม่</button>
          <button @click="usePhoto" class="h-12 rounded-lg bg-green-600 text-base font-semibold flex items-center justify-center gap-1.5">
            <span class="material-symbols-rounded text-xl">check</span>
            ใช้รูปนี้
          </button>
        </div>
        <div v-else class="flex justify-center">
          <button @click="capture" :disabled="!ready" aria-label="ถ่ายรูป" class="w-[4.5rem] h-[4.5rem] rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40">
            <span class="w-14 h-14 rounded-full bg-white block"></span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { cameraErrorMessage } from '@/utils/cameraError'
import { fitDimensions, POD_MAX_DIMENSION } from '@/utils/podImage'

/**
 * กล้องในหน้าแอป (getUserMedia) — แทนการเปิดแอปกล้องของเครื่อง ซึ่งทำให้หน้าเว็บไปอยู่เบื้องหลังจนมือถือสเปกต่ำปิดทิ้ง
 * (ดู utils/deliveryDraft.ts) หน้าเว็บอยู่หน้าจอตลอดจึงไม่ถูกปิด เปิดเฉพาะตอนใช้ (PhotoPicker สร้าง/ทำลาย component นี้)
 */
defineProps<{ label: string }>()
const emit = defineEmits<{ close: []; file: [file: File] }>()

const videoEl = ref<HTMLVideoElement | null>(null)
const ready = ref(false)
const error = ref('')
const previewUrl = ref('')
let stream: MediaStream | null = null
let photo: File | null = null
let startSeq = 0

const stopCamera = () => {
  startSeq++
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  ready.value = false
}

const startCamera = async () => {
  stopCamera()
  const seq = startSeq
  error.value = ''
  try {
    const next = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    })
    // ปิดกล้อง/กดลองใหม่ระหว่างรออนุญาต — ทิ้ง stream นี้ทันที ไม่งั้นไฟกล้องค้าง
    if (seq !== startSeq) {
      next.getTracks().forEach((t) => t.stop())
      return
    }
    stream = next
    const video = videoEl.value!
    video.srcObject = next
    await video.play()
    if (seq === startSeq) ready.value = video.videoWidth > 0
    if (seq === startSeq && !ready.value) video.onloadedmetadata = () => (ready.value = seq === startSeq)
  } catch (err) {
    if (seq === startSeq) error.value = cameraErrorMessage(err)
  }
}

const capture = async () => {
  const video = videoEl.value
  if (!video || !ready.value) return
  const { width, height } = fitDimensions(video.videoWidth, video.videoHeight, POD_MAX_DIMENSION)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  canvas.width = 0
  canvas.height = 0
  if (!blob) {
    error.value = 'ถ่ายรูปไม่สำเร็จ กรุณาลองใหม่'
    return
  }
  photo = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
  previewUrl.value = URL.createObjectURL(blob)
  stopCamera() // ปิดกล้องระหว่างดูรูป คืนหน่วยความจำ/แบตเตอรี่
}

const clearPreview = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  photo = null
}

const retake = () => {
  clearPreview()
  startCamera()
}

const usePhoto = () => {
  if (photo) emit('file', photo)
  emit('close')
}

const onNativeFile = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  emit('file', file)
  emit('close')
}

/** บางเครื่องตัดกล้องเมื่อสลับแอป/ปิดจอ — กลับมาแล้วเปิดกล้องให้ใหม่ (ถ้ากำลังดูรูปหรือมี error อยู่ไม่ต้องทำอะไร) */
const onVisibilityChange = () => {
  if (document.visibilityState !== 'visible' || previewUrl.value || error.value) return
  if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live')) return
  startCamera()
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  startCamera()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopCamera()
  clearPreview()
})
</script>
