<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="image"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="image.title"
        tabindex="-1"
        ref="rootEl"
        @click.self="close"
        @keydown.esc.stop="close"
        @keydown.plus.prevent="zoomBy(0.5)"
        @keydown.equal.prevent="zoomBy(0.5)"
        @keydown.minus.prevent="zoomBy(-0.5)"
      >
        <div class="lightbox__bar" @click.self="close">
          <div class="lightbox__title" :title="image.title">{{ image.title }}</div>
          <div class="lightbox__actions">
            <button type="button" class="lightbox__btn" title="ย่อ" :disabled="scale <= MIN_SCALE" @click="zoomBy(-0.5)">
              <span class="material-symbols-rounded">zoom_out</span>
            </button>
            <button type="button" class="lightbox__btn lightbox__btn--text" title="ขนาดพอดีจอ" @click="scale = 1">{{ Math.round(scale * 100) }}%</button>
            <button type="button" class="lightbox__btn" title="ขยาย" :disabled="scale >= MAX_SCALE" @click="zoomBy(0.5)">
              <span class="material-symbols-rounded">zoom_in</span>
            </button>
            <button type="button" class="lightbox__btn lightbox__btn--text" :disabled="downloading" title="ดาวน์โหลดรูปลงเครื่อง" @click="download">
              <span class="material-symbols-rounded">download</span>
              {{ downloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด' }}
            </button>
            <button type="button" class="lightbox__btn" title="ปิด (Esc)" @click="close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>
        <div v-if="notice" class="lightbox__notice" role="status">{{ notice }}</div>
        <!-- พื้นที่ดูรูป: เลื่อนดูได้เมื่อขยายเกินจอ — คลิกที่ว่างปิด, ดับเบิลคลิกที่รูปสลับขยาย/พอดีจอ -->
        <div class="lightbox__stage" @click.self="close" @wheel.ctrl.prevent="onWheel">
          <img
            :src="image.src"
            :alt="image.title"
            class="lightbox__img"
            :class="{ 'lightbox__img--zoomed': scale > 1 }"
            :style="scale > 1 ? { width: scale * 100 + '%' } : undefined"
            draggable="false"
            @dblclick="scale = scale > 1 ? 1 : 2.5"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { downloadImage } from '@/utils/downloadImage'

/**
 * ดูรูปแบบเต็มจอ: ขยาย/ย่อ (ปุ่ม, ปุ่ม + - ,Ctrl+ล้อเมาส์, ดับเบิลคลิก), ดาวน์โหลด, ปิดด้วย Esc/คลิกที่ว่าง
 * ใช้กับรูป POD/ใบส่งของ/ขึ้นสินค้า ในหน้ารายละเอียดงาน
 */
interface LightboxImage {
  src: string
  title: string
  /** ชื่อไฟล์ตอนดาวน์โหลด (ไม่ต้องมีนามสกุล) */
  filename?: string
}

const props = defineProps<{ image: LightboxImage | null }>()
const emit = defineEmits<{ close: [] }>()

const MIN_SCALE = 1
const MAX_SCALE = 5

const scale = ref(1)
const downloading = ref(false)
const notice = ref('')
const rootEl = ref<HTMLElement | null>(null)
let previousOverflow = ''

const close = () => emit('close')
const zoomBy = (delta: number) => {
  scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((scale.value + delta) * 100) / 100))
}
const onWheel = (e: WheelEvent) => zoomBy(e.deltaY < 0 ? 0.25 : -0.25)

const download = async () => {
  if (!props.image || downloading.value) return
  downloading.value = true
  notice.value = ''
  try {
    const result = await downloadImage(props.image.src, props.image.filename || props.image.title)
    if (result === 'opened') notice.value = 'ดาวน์โหลดตรงไม่ได้ จึงเปิดรูปในแท็บใหม่ให้แล้ว — คลิกขวา (มือถือ: กดค้างที่รูป) แล้วเลือกบันทึกรูป'
  } finally {
    downloading.value = false
  }
}

watch(
  () => props.image,
  async (image) => {
    scale.value = 1
    notice.value = ''
    if (image) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden' // กันหน้าหลังเลื่อนตามตอนดูรูป
      await nextTick()
      rootEl.value?.focus() // ให้ปุ่มคีย์บอร์ด (Esc/+/-) ทำงานทันที
    } else {
      document.body.style.overflow = previousOverflow
    }
  }
)

onBeforeUnmount(() => {
  if (props.image) document.body.style.overflow = previousOverflow
})
</script>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.88);
  outline: none;
}
.lightbox__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  color: #fff;
}
.lightbox__title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}
.lightbox__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.lightbox__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 38px;
  height: 38px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.lightbox__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
}
.lightbox__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lightbox__btn:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}
.lightbox__btn--text {
  padding: 0 12px;
}
.lightbox__notice {
  margin: 0 14px 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  font-size: 13px;
}
.lightbox__stage {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 8px 14px 18px;
}
.lightbox__img {
  margin: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
  cursor: zoom-in;
  user-select: none;
}
.lightbox__img--zoomed {
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.15s;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
