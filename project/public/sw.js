// Service Worker ขั้นต่ำสุด — มีไว้แค่ให้ผ่านเงื่อนไข "Installable Web App" (Add to Home Screen) ของเบราว์เซอร์
// เท่านั้น ยังไม่ทำ caching/offline strategy ใดๆ ทั้งสิ้น (ตั้งใจ — ตามสโคปรอบนี้ยังไม่ต้องทำ Offline-first เต็มระบบ)
// ทุก request วิ่งผ่านเครือข่ายตามปกติเหมือนไม่มี Service Worker เลย

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // ไม่ intercept/cache อะไรเลย — ปล่อยผ่านเครือข่ายตามปกติ (fetch handler ต้องมีไว้เฉยๆ เพื่อผ่าน installability check)
})
