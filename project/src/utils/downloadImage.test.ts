import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadImage, safeImageFilename } from './downloadImage'

describe('safeImageFilename', () => {
  it('ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ เก็บภาษาไทย และเติมนามสกุล', () => {
    expect(safeImageFilename('CM202609230001: POD / สระบุรี?')).toBe('CM202609230001 POD สระบุรี.jpg')
    expect(safeImageFilename('abc.png')).toBe('abc.png')
    expect(safeImageFilename('', 'png')).toBe('image.png')
  })
})

describe('downloadImage', () => {
  let clicked: { href: string; download: string }[]

  beforeEach(() => {
    clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download })
    })
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('data: URL บันทึกได้ตรงๆ ไม่ต้องดึงไฟล์', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await downloadImage('data:image/png;base64,AAAA', 'รูปทดสอบ')

    expect(result).toBe('downloaded')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(clicked[0].download).toBe('รูปทดสอบ.png')
  })

  it('ดึงไฟล์ได้ (เปิด CORS แล้ว) = บันทึกด้วยชื่อที่ตั้ง', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x'], { type: 'image/jpeg' }) })))

    const result = await downloadImage('https://example.com/a.jpg', 'งาน-POD')

    expect(result).toBe('downloaded')
    expect(clicked[0]).toMatchObject({ download: 'งาน-POD.jpg' })
    expect(clicked[0].href).toContain('blob:fake')
  })

  it('ดึงไฟล์ไม่ได้ (ติด CORS) = เปิดรูปในแท็บใหม่แทน', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const open = vi.fn()
    vi.stubGlobal('open', open)

    const result = await downloadImage('https://example.com/a.jpg', 'x')

    expect(result).toBe('opened')
    expect(open).toHaveBeenCalledWith('https://example.com/a.jpg', '_blank', 'noopener')
    expect(clicked).toHaveLength(0)
  })

  it('เซิร์ฟเวอร์ตอบ error = เปิดแท็บใหม่แทน', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, blob: async () => new Blob() })))
    const open = vi.fn()
    vi.stubGlobal('open', open)

    expect(await downloadImage('https://example.com/a.jpg', 'x')).toBe('opened')
    expect(open).toHaveBeenCalled()
  })
})
