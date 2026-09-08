import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * iOS (ทุก browser — Chrome/Firefox บน iOS ก็ใช้ WebKit ของ Apple เหมือน Safari ทั้งหมด) ไม่มีทางยิง event
 * 'beforeinstallprompt' ได้เลย ต้องมี hint แนะนำ "แตะปุ่มแชร์ > เพิ่มไปยังหน้าจอโฮม" แบบ manual แทนปุ่มติดตั้ง
 * ที่กดไม่ได้จริงบน iOS — ทดสอบเฉพาะ logic ตรวจจับ device/แสดง-ซ่อน hint ไม่ทดสอบ service worker (jsdom ไม่มี)
 */

const setUserAgent = (ua: string) => {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

const setStandalone = (value: boolean | undefined) => {
  Object.defineProperty(navigator, 'standalone', { value, configurable: true })
}

const IPHONE_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1'
const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  setStandalone(undefined)
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
})

describe('usePwa — iOS manual install hint', () => {
  it('1. shows the manual hint on iPhone Chrome (CriOS UA) — beforeinstallprompt never fires there', async () => {
    setUserAgent(IPHONE_CHROME_UA)
    const { usePwaInstall, initPwa } = await import('./usePwa')
    initPwa()
    const { showIosInstallHint, showInstallBanner } = usePwaInstall()
    expect(showIosInstallHint.value).toBe(true)
    expect(showInstallBanner.value).toBe(false)
  })

  it('2. shows the manual hint on iPhone Safari too', async () => {
    setUserAgent(IPHONE_SAFARI_UA)
    const { usePwaInstall, initPwa } = await import('./usePwa')
    initPwa()
    expect(usePwaInstall().showIosInstallHint.value).toBe(true)
  })

  it('3. does not show the iOS hint on Android Chrome (beforeinstallprompt works there)', async () => {
    setUserAgent(ANDROID_CHROME_UA)
    const { usePwaInstall, initPwa } = await import('./usePwa')
    initPwa()
    expect(usePwaInstall().showIosInstallHint.value).toBe(false)
  })

  it('4. does not show the iOS hint when already installed (standalone display)', async () => {
    setUserAgent(IPHONE_SAFARI_UA)
    setStandalone(true)
    const { usePwaInstall, initPwa } = await import('./usePwa')
    initPwa()
    expect(usePwaInstall().showIosInstallHint.value).toBe(false)
  })

  it('5. does not show the iOS hint again after the driver already dismissed it', async () => {
    localStorage.setItem('pwa_install_dismissed', '1')
    setUserAgent(IPHONE_SAFARI_UA)
    const { usePwaInstall, initPwa } = await import('./usePwa')
    initPwa()
    expect(usePwaInstall().showIosInstallHint.value).toBe(false)
  })

  it('6. dismissInstall() hides the iOS hint and persists the dismissal', async () => {
    setUserAgent(IPHONE_SAFARI_UA)
    const { usePwaInstall, initPwa } = await import('./usePwa')
    initPwa()
    const { showIosInstallHint, dismissInstall } = usePwaInstall()
    expect(showIosInstallHint.value).toBe(true)

    dismissInstall()

    expect(showIosInstallHint.value).toBe(false)
    expect(localStorage.getItem('pwa_install_dismissed')).toBe('1')
  })
})
