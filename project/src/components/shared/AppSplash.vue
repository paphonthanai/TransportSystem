<template>
  <div class="app-splash" role="status" aria-live="polite">
    <div class="app-splash__spinner" aria-hidden="true"></div>
    <div class="app-splash__text">กำลังโหลด...</div>
  </div>
</template>

<style scoped>
/* หน้าจอเต็มระหว่างรอหน้าแรกพร้อม (ตรวจสิทธิ์ + โหลดไฟล์ของหน้านั้น) — ใช้สีจาก theme ตามโหมดสว่าง/มืด */
.app-splash {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--bg, #f4f6fb);
  color: var(--muted, #64748b);
  font-size: 14px;
}
.app-splash__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: app-splash-spin 0.8s linear infinite;
}
@keyframes app-splash-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-splash__spinner {
    animation-duration: 2.4s;
  }
}
</style>
