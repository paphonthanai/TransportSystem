<template>
  <div class="page-gate">
    <!-- ระหว่างรอข้อมูลของหน้านี้: loading เต็มจอ (Teleport ไป body กันโดน layout/overflow ของหน้าบัง) — ไม่ใช้ Transition ตอนปิด
         เพราะต้องหายทันทีที่ข้อมูลมา และกัน animation ค้างถ้าแท็บอยู่เบื้องหลัง -->
    <Teleport to="body">
      <div v-if="gated" class="page-gate__overlay" role="status" aria-live="polite" aria-busy="true">
        <div class="page-gate__spinner" aria-hidden="true"></div>
        <div class="page-gate__text">กำลังโหลดข้อมูล...</div>
      </div>
    </Teleport>
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
 *  - ระหว่างรอ = loading เต็มจอ ค้างได้ไม่เกิน MAX_MS (เน็ตหลุด/Firestore ไม่ตอบ) หลังจากนั้นแสดงเนื้อหาเท่าที่มี ไม่บล็อกหน้าตลอดไป
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
/* เต็มจอ ทึบ ใช้สีพื้นตามธีม (สว่าง/มืด) — อยู่ใต้แถบความคืบหน้าด้านบน (9999) และหน้าจอเปิดแอป (9998) */
.page-gate__overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg, #f4f6fb);
  color: var(--muted, #64748b);
  font-size: 15px;
  animation: page-gate-fade-in 0.15s ease-out;
}
.page-gate__spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: page-gate-spin 0.8s linear infinite;
}
@keyframes page-gate-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes page-gate-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .page-gate__overlay {
    animation: none;
  }
  .page-gate__spinner {
    animation-duration: 2.4s;
  }
}
</style>
