/** ชื่อไฟล์ที่ปลอดภัยสำหรับบันทึกลงเครื่อง — ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ (Windows) เก็บภาษาไทยไว้ และเติมนามสกุลถ้ายังไม่มี */
export function safeImageFilename(name: string, ext = 'jpg'): string {
  const base = name
    .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const clean = base || 'image'
  return /\.(jpe?g|png|webp|gif)$/i.test(clean) ? clean : `${clean}.${ext}`
}

const extensionOf = (blobType: string) => {
  if (blobType.includes('png')) return 'png'
  if (blobType.includes('webp')) return 'webp'
  if (blobType.includes('gif')) return 'gif'
  if (blobType.includes('svg')) return 'svg'
  return 'jpg'
}

const FETCH_TIMEOUT_MS = 15_000

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * ดาวน์โหลดรูปลงเครื่อง — คืน 'downloaded' เมื่อสั่งบันทึกไฟล์ได้ หรือ 'opened' เมื่อทำไม่ได้แล้วเปิดรูปในแท็บใหม่แทน
 *  - data: URL (รูปเก่าที่เก็บในเอกสาร) บันทึกได้ตรงๆ
 *  - รูปบน Firebase Storage เป็นคนละโดเมน (cross-origin) ดึงเป็นไฟล์ได้ก็ต่อเมื่อบัคเก็ตเปิด CORS ไว้ (ดู storage.cors.json)
 *    ถ้ายังไม่เปิดจะดึงไม่ได้ เปิดรูปในแท็บใหม่ให้ผู้ใช้บันทึกเอง (คลิกขวา/กดค้างที่รูป)
 */
export async function downloadImage(url: string, filename: string): Promise<'downloaded' | 'opened'> {
  if (url.startsWith('data:')) {
    const type = /^data:([^;,]+)/.exec(url)?.[1] || 'image/jpeg'
    triggerAnchorDownload(url, safeImageFilename(filename, extensionOf(type)))
    return 'downloaded'
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let blob: Blob
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      blob = await response.blob()
    } finally {
      clearTimeout(timer)
    }
    const objectUrl = URL.createObjectURL(blob)
    try {
      triggerAnchorDownload(objectUrl, safeImageFilename(filename, extensionOf(blob.type)))
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
    }
    return 'downloaded'
  } catch {
    window.open(url, '_blank', 'noopener')
    return 'opened'
  }
}
