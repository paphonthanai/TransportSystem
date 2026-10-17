<template>
  <div class="page-gate">
    <!-- ระหว่างรอข้อมูลของหน้านี้: แสดงสถานะ loading แทนเนื้อหา -->
    <div v-if="gated" class="page-gate__loading" role="status" aria-live="polite">
      <div class="page-gate__head">
        <div class="page-gate__spinner" aria-hidden="true"></div>
        <div class="page-gate__text">กำลังโหลดข้อมูล...</div>
      </div>
      <div class="page-gate__skeleton" aria-hidden="true">
        <div class="page-gate__bar page-gate__bar--title"></div>
        <div class="page-gate__bar"></div>
        <div class="page-gate__bar"></div>
        <div class="page-gate__bar page-gate__bar--short"></div>
      </div>
    </div>
    <!-- เนื้อหาถูกสร้างไว้แล้วแต่ซ่อน (ไม่ใช้ display:none เพื่อให้กราฟ/ตารางวัดขนาดได้ถูกต้อง และไม่สร้างหน้าใหม่ซ้ำตอนแสดง) -->
    <div class="page-gate__content" :class="{ 'page-gate__content--hidden': gated }" :aria-busy="gated">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLoadingStore } from '@/stores/loading'

/**
 * แสดงเนื้อหาของหน้าหลังข้อมูลที่หน้านั้นเรียกใช้โหลดเสร็จ (ดู trackLoading/pagePending ใน stores/loading.ts)
 *  - ไม่มีงานโหลดค้าง (เช่น store โหลดไปแล้วจากหน้าก่อนหน้า) = แสดงเนื้อหาทันที ไม่มีช่วง loading
 *  - ค้างได้ไม่เกิน MAX_MS (เน็ตหลุด/Firestore ไม่ตอบ) หลังจากนั้นแสดงเนื้อหาเท่าที่มี ไม่บล็อกหน้าตลอดไป
 */
const MAX_MS = 10_000

const loading = useLoadingStore()
const timedOut = ref(false)
const gated = computed(() => loading.pagePending > 0 && !timedOut.value)

let capTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [loading.pageSeq, loading.pagePending > 0] as const,
  ([seq, busy], prev) => {
    clearTimeout(capTimer)
    if (seq !== prev?.[0]) timedOut.value = false
    if (busy) capTimer = setTimeout(() => (timedOut.value = true), MAX_MS)
  },
  { immediate: true }
)

onBeforeUnmount(() => clearTimeout(capTimer))
</script>

<style scoped>
.page-gate {
  position: relative;
}
.page-gate__content--hidden {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  visibility: hidden;
  pointer-events: none;
}
.page-gate__loading {
  padding-top: 4px;
}
.page-gate__head {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted, #64748b);
  font-size: 14px;
  margin-bottom: 20px;
}
.page-gate__spinner {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: page-gate-spin 0.8s linear infinite;
}
.page-gate__skeleton {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 960px;
}
.page-gate__bar {
  height: 18px;
  border-radius: 8px;
  background: var(--border, #e6e9f2);
  animation: page-gate-pulse 1.4s ease-in-out infinite;
}
.page-gate__bar--title {
  height: 28px;
  width: 38%;
}
.page-gate__bar--short {
  width: 62%;
}
@keyframes page-gate-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes page-gate-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@media (prefers-reduced-motion: reduce) {
  .page-gate__spinner {
    animation-duration: 2.4s;
  }
  .page-gate__bar {
    animation: none;
  }
}
</style>
