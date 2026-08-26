// Service Worker — Phase F: installability + conservative static-asset caching (ยังไม่ทำ Offline-first เต็มระบบ)
// อัปเดต CACHE_VERSION ทุกครั้งที่แก้ไฟล์นี้ เพื่อให้ activate() ล้าง cache รุ่นเก่าทิ้งถูกต้อง
const CACHE_VERSION = 'driver-app-v2'

// เฉพาะไฟล์ static asset ที่ Vite build ออกมาเป็น path มี content hash ในชื่อ (เช่น /assets/index-XXXXXXXX.js)
// จึง cache-first ได้อย่างปลอดภัย 100% (hash เปลี่ยน = URL เปลี่ยน ไม่มีทาง serve เนื้อหาเก่าผิดๆ ได้เลย) — ไม่รวม
// index.html/navigation request หรือ API ใดๆ ทั้งสิ้น (ดูเหตุผลใน fetch handler ด้านล่าง)
const CACHEABLE_EXTENSIONS = /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/

self.addEventListener('install', () => {
  // ไม่เรียก skipWaiting() ที่นี่โดยเจตนา — ปล่อยให้ Service Worker ใหม่ค้างสถานะ "waiting" จนกว่า Driver จะกด
  // รีเฟรชเอง (ดู src/composables/usePwa.ts's applyUpdate) กัน "กำลังส่งของอยู่ ↓ SW update ↓ บังคับ reload ↓
  // ข้อมูลในหน้าหาย" ตามที่ต้องระวัง — SKIP_WAITING message handler ด้านล่างเป็นทางเดียวที่ทำให้ SW ใหม่ activate
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

// Driver กดปุ่ม "อัปเดต" (ดู usePwa.ts) ส่ง message มาที่นี่ให้ SW ใหม่ที่ค้าง waiting อยู่ activate ทันที
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // เฉพาะ GET ของ origin เดียวกันเท่านั้น — ข้าม POST/PUT/DELETE, ข้าม cross-origin ทั้งหมด (Firestore/Firebase Auth/
  // Firebase Storage/Google Fonts ฯลฯ ล้วนเป็น cross-origin หรือ non-GET อยู่แล้วโดยธรรมชาติของการเรียก แต่เขียนเช็ค
  // ไว้ตรงๆ อีกชั้นกันพลาด) ข้อมูล live เช่น booking/POD/สถานะส่งของต้องวิ่ง network จริงเสมอ ห้าม cache เด็ดขาด
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (!CACHEABLE_EXTENSIONS.test(url.pathname)) return // navigation (HTML)/อื่นๆ ที่เหลือ ปล่อยผ่าน network ตามปกติ

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)
      const cached = await cache.match(req)
      if (cached) return cached
      const response = await fetch(req)
      if (response.ok) cache.put(req, response.clone())
      return response
    })()
  )
})
