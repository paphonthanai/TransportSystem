import { describe, it, expect, vi, afterEach } from 'vitest'
import { estimateBase64Bytes, fitDimensions, compressImageToDataUrl, MAX_POD_BASE64_BYTES } from './podImage'

describe('estimateBase64Bytes', () => {
  it('estimates real byte size from a base64 data URL (4 base64 chars = 3 bytes)', () => {
    // "QUJD" คือ base64 ของ "ABC" (3 ตัวอักษร = 3 ไบต์)
    expect(estimateBase64Bytes('data:image/jpeg;base64,QUJD')).toBe(3)
  })

  it('returns 0 for a data URL with no payload', () => {
    expect(estimateBase64Bytes('data:image/jpeg;base64,')).toBe(0)
  })
})

describe('fitDimensions', () => {
  it('leaves already-small images untouched (never upscales)', () => {
    expect(fitDimensions(400, 300, 1280)).toEqual({ width: 400, height: 300 })
  })

  it('scales down the longest side to the cap while keeping aspect ratio', () => {
    expect(fitDimensions(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
  })

  it('handles portrait orientation (height is the longest side)', () => {
    expect(fitDimensions(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 })
  })
})

describe('compressImageToDataUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** jsdom ไม่มี Canvas 2D renderer จริง — toDataURL()/Image loading ต้อง mock เอง เพื่อทดสอบ "ตรรกะ" ของฟังก์ชัน
   *  (resize มาก่อน compress, ลด quality วนจนกว่าจะพอ, โยน error ถ้าบีบแล้วยังเกิน) ไม่ใช่ผลลัพธ์ภาพจริง */
  const realCreateElement = document.createElement.bind(document)

  const mockCanvas = (dataUrlByCallIndex: string[]) => {
    let call = 0
    const toDataURL = vi.fn(() => dataUrlByCallIndex[Math.min(call++, dataUrlByCallIndex.length - 1)])
    const drawImage = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => ({ drawImage }), toDataURL } as unknown as HTMLCanvasElement
      }
      return realCreateElement(tag)
    })
    return { toDataURL, drawImage }
  }

  const mockImageLoad = (naturalWidth: number, naturalHeight: number) => {
    vi.spyOn(globalThis, 'Image').mockImplementation(function (this: HTMLImageElement) {
      Object.assign(this, { naturalWidth, naturalHeight, width: naturalWidth, height: naturalHeight })
      queueMicrotask(() => this.onload?.(new Event('load')))
      return this
    } as unknown as typeof Image)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  }

  const fakeFile = () => new File(['fake-image-bytes'], 'pod.jpg', { type: 'image/jpeg' })

  it('resolves with a data URL under the byte limit on the first pass when the image is already small', async () => {
    mockImageLoad(800, 600)
    mockCanvas(['data:image/jpeg;base64,' + 'A'.repeat(100)])

    const result = await compressImageToDataUrl(fakeFile())
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
    expect(estimateBase64Bytes(result)).toBeLessThan(MAX_POD_BASE64_BYTES)
  })

  it('keeps lowering quality (re-calling toDataURL) until the result fits under maxBytes', async () => {
    mockImageLoad(4000, 3000)
    const tooBig = 'data:image/jpeg;base64,' + 'A'.repeat(2000)
    const fits = 'data:image/jpeg;base64,' + 'A'.repeat(50)
    const { toDataURL } = mockCanvas([tooBig, tooBig, fits])

    const result = await compressImageToDataUrl(fakeFile(), { maxBytes: 100 })
    expect(result).toBe(fits)
    expect(toDataURL.mock.calls.length).toBeGreaterThan(1)
  })

  it('throws instead of returning an oversized payload when compression cannot fit the limit', async () => {
    mockImageLoad(4000, 3000)
    mockCanvas(['data:image/jpeg;base64,' + 'A'.repeat(2000)])

    await expect(compressImageToDataUrl(fakeFile(), { maxBytes: 100 })).rejects.toThrow(/ขนาดใหญ่เกินไป/)
  })
})
