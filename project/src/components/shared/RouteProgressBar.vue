<template>
  <Transition name="route-progress">
    <div v-if="visible" class="route-progress" role="progressbar" aria-label="กำลังโหลด" aria-busy="true">
      <div class="route-progress__bar"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * แถบความคืบหน้าบางๆ ด้านบนจอ — ขึ้นเมื่อ active เกิน delayMs เท่านั้น (เปลี่ยนหน้าเร็วๆ ไม่กะพริบ) หายทันทีเมื่อเสร็จ
 */
const props = withDefaults(defineProps<{ active: boolean; delayMs?: number }>(), { delayMs: 150 })

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.active,
  (active) => {
    clearTimeout(timer)
    if (active) timer = setTimeout(() => (visible.value = true), props.delayMs)
    else visible.value = false
  },
  { immediate: true }
)

onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
  background: rgba(37, 99, 235, 0.15);
}
.route-progress__bar {
  height: 100%;
  width: 40%;
  background: #2563eb;
  border-radius: 0 3px 3px 0;
  animation: route-progress-slide 1.1s ease-in-out infinite;
}
.route-progress-enter-active,
.route-progress-leave-active {
  transition: opacity 0.15s;
}
.route-progress-enter-from,
.route-progress-leave-to {
  opacity: 0;
}
@keyframes route-progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(260%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .route-progress__bar {
    animation: none;
    width: 100%;
  }
}
</style>
