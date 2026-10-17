/**
 * ไฟล์ของหน้าแบบ lazy (hash ในชื่อไฟล์) จะหายไปหลัง deploy เวอร์ชันใหม่ — ผู้ใช้ที่เปิดแอปค้างไว้แล้วกดไปหน้าอื่นจะเจอ
 * "Failed to fetch dynamically imported module" และหน้าไม่เปลี่ยน แก้โดยโหลดหน้าใหม่ 1 ครั้งเพื่อดึงเวอร์ชันล่าสุด
 */
export const isChunkLoadError = (err: unknown): boolean => {
  const message = String((err as { message?: unknown } | null)?.message ?? err ?? '')
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|Unable to preload CSS/i.test(message)
}

const RELOAD_KEY = 'chunk-reload-at'
/** กันโหลดซ้ำวนไม่รู้จบ (เช่น ไฟล์หายจริงๆ/ออฟไลน์) — โหลดหน้าใหม่ซ้ำภายในเวลานี้จะไม่ทำ */
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000

/** โหลดหน้าใหม่ตามที่อยู่ปลายทาง ถ้าไม่ได้โหลดไปเมื่อไม่นานมานี้ — คืน true ถ้าสั่งโหลดแล้ว */
export function reloadOnceForChunkError(
  targetUrl: string,
  now = Date.now(),
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
  reload: (url: string) => void = (url) => window.location.assign(url)
): boolean {
  try {
    const last = Number(storage?.getItem(RELOAD_KEY) || 0)
    if (last && now - last < CHUNK_RELOAD_COOLDOWN_MS) return false
    storage?.setItem(RELOAD_KEY, String(now))
  } catch {
    // sessionStorage ใช้ไม่ได้ (โหมดส่วนตัว ฯลฯ) — ยังโหลดใหม่ได้ แต่ไม่มีตัวกันวน
  }
  reload(targetUrl)
  return true
}
