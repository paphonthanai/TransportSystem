import { describe, it, expect, vi } from 'vitest'
import { isChunkLoadError, reloadOnceForChunkError, CHUNK_RELOAD_COOLDOWN_MS } from './chunkError'

const memoryStorage = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('isChunkLoadError', () => {
  it('จับข้อความ error ของไฟล์ lazy ที่โหลดไม่ได้ (Chrome/Safari/Firefox/Vite)', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/assets/A-1.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 12 failed.'))).toBe(true)
    expect(isChunkLoadError('Unable to preload CSS for /assets/x.css')).toBe(true)
  })

  it('error อื่นไม่ใช่', () => {
    expect(isChunkLoadError(new Error('permission-denied'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

describe('reloadOnceForChunkError', () => {
  it('โหลดหน้าใหม่ครั้งแรก แต่ไม่โหลดซ้ำภายในช่วงกันวน แล้วโหลดได้อีกเมื่อพ้นช่วง', () => {
    const storage = memoryStorage()
    const reload = vi.fn()
    const t0 = 1_000_000

    expect(reloadOnceForChunkError('/booking/cements', t0, storage, reload)).toBe(true)
    expect(reload).toHaveBeenCalledWith('/booking/cements')

    expect(reloadOnceForChunkError('/booking/cements', t0 + 1000, storage, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)

    expect(reloadOnceForChunkError('/dashboard', t0 + CHUNK_RELOAD_COOLDOWN_MS + 1, storage, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('ใช้ storage ไม่ได้ ก็ยังโหลดใหม่ได้', () => {
    const reload = vi.fn()
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(reloadOnceForChunkError('/x', 5, broken, reload)).toBe(true)
    expect(reload).toHaveBeenCalledWith('/x')
  })
})
