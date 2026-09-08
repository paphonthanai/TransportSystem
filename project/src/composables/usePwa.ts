import { ref } from 'vue'

/**
 * Phase F — PWA install prompt + update-available state ทั้งแอปใช้ instance เดียวกัน (module-level ref ไม่ใช่
 * factory function ใหม่ทุกครั้งที่เรียก) เพราะ event 'beforeinstallprompt'/service worker registration เกิดครั้งเดียว
 * ตอน initPwa() ทำงานใน main.ts แต่ต้องอ่านค่าได้จากหลาย component (เช่น DriverJobsView.vue)
 */
const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null)
const showInstallBanner = ref(false)
/** iOS (ทุก browser — Chrome/Firefox/Edge บน iOS ก็ใช้ WebKit ของ Apple เหมือนกันหมด) ไม่มีทางยิง
 *  'beforeinstallprompt' ได้เลย ต้องแนะนำ "แตะปุ่มแชร์ > เพิ่มไปยังหน้าจอโฮม" แบบ manual แทนปุ่มติดตั้งที่กดไม่ได้จริง */
const showIosInstallHint = ref(false)
const updateAvailable = ref(false)
let waitingWorker: ServiceWorker | null = null
/** true เฉพาะตอนอัปเดตถูกสั่งจาก user gesture จริง (Driver กด applyUpdate) — คุม controllerchange listener ด้านล่าง
 *  ว่าจะ reload หน้าทันทีไหม ฝั่งแอดมินที่ auto-skipWaiting เงียบๆ (ดู initPwa) ต้องไม่ตั้ง flag นี้ กัน reload
 *  กลางคันขณะแอดมินกำลังกรอกฟอร์มอยู่ — ปล่อยให้ SW ใหม่ทำงานแทนเฉยๆ รอ reload/เข้าเว็บครั้งถัดไปตามธรรมชาติ */
let pendingReloadAllowed = false

const DISMISS_KEY = 'pwa_install_dismissed'

/** true เฉพาะหน้า Driver App (/driver-app, /driver-app/job/:id) — ใช้แยกว่าตอนนี้ควรระวัง reload กลางคันหรือไม่
 *  (อ่านจาก path ปัจจุบันสด ๆ ทุกครั้ง ไม่ cache ตอน bootstrap เพราะ SPA เปลี่ยนหน้าได้โดยไม่ reload) */
const isDriverAppRoute = () => window.location.pathname.startsWith('/driver-app')

const isIosDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandaloneDisplay = () =>
  (navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
const isInstallDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  return {
    showInstallBanner,
    showIosInstallHint,
    /** เรียกจากปุ่ม "ติดตั้ง" — ต้องเรียกตรงจาก user gesture เท่านั้น (ข้อจำกัดของ browser API เอง ไม่ใช่ของเรา) */
    async promptInstall() {
      if (!deferredInstallPrompt.value) return
      await deferredInstallPrompt.value.prompt()
      await deferredInstallPrompt.value.userChoice
      deferredInstallPrompt.value = null
      showInstallBanner.value = false
    },
    /** "ไว้ทีหลัง" — จำไว้ใน localStorage กันไม่ให้ banner โผล่ซ้ำทุกครั้งที่เปิดแอป (ตามที่ต้องไม่รบกวน Driver) */
    dismissInstall() {
      showInstallBanner.value = false
      showIosInstallHint.value = false
      try {
        localStorage.setItem(DISMISS_KEY, '1')
      } catch {
        // localStorage ใช้ไม่ได้ (private mode ฯลฯ) ก็แค่โผล่ banner อีกครั้งรอบหน้า ไม่ใช่ปัญหาคอขวด
      }
    },
  }
}

export function usePwaUpdate() {
  return {
    updateAvailable,
    /** สั่งให้ Service Worker รุ่นใหม่ (ที่ค้าง waiting อยู่แล้ว ดู sw.js's install handler) activate ทันที —
     *  ต้องเรียกตอน Driver กดยืนยันเองเท่านั้น (ไม่ auto-apply) กัน reload กลางคันขณะกำลังทำงานอยู่ — ฝั่งนี้ต่างจาก
     *  auto-update ฝั่งแอดมิน (ดู initPwa) ตรงที่ reload ทันทีเพราะ Driver กดยืนยันเองแล้วว่าพร้อม */
    applyUpdate() {
      pendingReloadAllowed = true
      waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
    },
  }
}

/** เรียกครั้งเดียวตอนแอป bootstrap (ดู main.ts) — ผูก listener ระดับ window/service worker ทั้งหมดของ Phase F ไว้ที่นี่ที่เดียว */
export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    if (isInstallDismissed()) return
    deferredInstallPrompt.value = e as BeforeInstallPromptEvent
    showInstallBanner.value = true
  })

  // iOS (ทุก browser) ไม่มีทางยิง 'beforeinstallprompt' — เช็คตรงนี้ครั้งเดียวตอน bootstrap แทน
  if (isIosDevice() && !isStandaloneDisplay() && !isInstallDismissed()) {
    showIosInstallHint.value = true
  }

  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            // 'installed' + มี controller อยู่แล้ว = นี่คือ SW รุ่นใหม่ที่มาแทนรุ่นเดิม (ไม่ใช่การติดตั้งครั้งแรก)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = newWorker
              updateAvailable.value = true
              // ฝั่งแอดมิน/เดสก์ท็อป (ไม่ใช่ /driver-app): auto-apply เงียบๆ ทันที ไม่ต้องรอกดปุ่ม เพราะไม่มีความเสี่ยง
              // "reload กลางคันตอนกำลังส่งของ" แบบ Driver — แต่ไม่ตั้ง pendingReloadAllowed ด้วย เพื่อไม่ให้ reload
              // หน้าทันที (กันข้อมูลฟอร์มที่แอดมินกำลังกรอกอยู่หาย) SW ใหม่จะ activate ไปคุม asset ถัดๆ ไปเงียบๆ แทน
              // แล้วมีผลเต็มที่ตอน reload/เข้าเว็บครั้งถัดไปตามธรรมชาติ (ไม่ต้องเจอ bundle ค้างเก่าข้ามหลาย deploy อีก)
              if (!isDriverAppRoute()) newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      })
      .catch(() => {
        // ติดตั้ง PWA ไม่ได้ก็ไม่กระทบการใช้งานหลัก ปล่อยผ่านเงียบๆ
      })

    // controllerchange เกิดตอน SW ใหม่ activate สำเร็จ ไม่ว่าจะจาก Driver กด applyUpdate หรือแอดมิน auto-skipWaiting
    // เงียบๆ ก็ตาม — reload หน้าจริงเฉพาะกรณี Driver กดยืนยันเอง (pendingReloadAllowed) เท่านั้น ฝั่งแอดมินปล่อยให้ SW
    // ใหม่ activate เฉยๆ ไม่ reload ทันที (กันข้อมูลฟอร์มหาย) — กันเกิด reload วนซ้ำด้วย flag เดียวตามรูปแบบมาตรฐาน
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || !pendingReloadAllowed) return
      refreshing = true
      window.location.reload()
    })
  })
}
