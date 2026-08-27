/**
 * แปลงรูป POD (หลักฐานส่งมอบสินค้า) เป็น Base64 Data URL ฝั่ง Frontend ล้วนๆ (Resize + Compress ด้วย Canvas API
 * ของเบราว์เซอร์ ไม่มี dependency เพิ่ม ไม่มี backend) แทนการอัปโหลดขึ้น Firebase Storage เดิม (ดู DriverJobDetailView.vue
 * ที่เคยเรียก podRepository.ts — ลบไปแล้ว) เก็บเฉพาะรูปที่ resize/compress แล้วเท่านั้นลง Firestore ไม่เก็บรูปต้นฉบับเลย
 */

/** ขนาดเอกสาร Firestore จำกัด 1 MiB/เอกสาร — Booking 1 ใบมีได้หลาย JobItem (multi-destination) แต่ละ item เก็บ POD
 * ของตัวเอง จึงต้องเผื่อพื้นที่ให้ field อื่นๆ ของ item/booking ทั้งก้อนด้วย ตั้งเพดานไว้แบบ conservative ต่อรูป 1 ใบ */
export const MAX_POD_BASE64_BYTES = 700_000

/** ด้านยาวสุดของรูปหลัง resize (px) — พอสำหรับอ่านเอกสาร/ลายเซ็นชัดเจน ไม่ต้องเก็บความละเอียดต้นฉบับจากกล้องมือถือ (มักเกิน 3000px) */
export const POD_MAX_DIMENSION = 1280

const DEFAULT_QUALITY = 0.7
const MIN_QUALITY = 0.3
const QUALITY_STEP = 0.1

/** ประเมินขนาดไฟล์จริง (bytes) ของ Base64 Data URL จากความยาวสตริง (base64: ทุก 4 ตัวอักษร = 3 ไบต์จริง) */
export function estimateBase64Bytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.floor((base64.length * 3) / 4)
}

/** คำนวณขนาดใหม่ให้ด้านยาวสุดไม่เกิน maxDimension โดยรักษาสัดส่วนเดิม — ไม่ขยายรูปที่เล็กกว่าเพดานอยู่แล้ว */
export function fitDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height }
  const scale = maxDimension / Math.max(width, height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่'))
    }
    img.src = url
  })
}

/**
 * เลือกรูป POD → Resize ให้ไม่เกิน POD_MAX_DIMENSION → Compress เป็น JPEG ลดคุณภาพทีละขั้นจนกว่าขนาด Base64 จะอยู่
 * ในเพดาน MAX_POD_BASE64_BYTES → คืน Data URL พร้อมบันทึกลง Firestore ตรงๆ (ไม่มี Storage/network call ใดๆ)
 */
export async function compressImageToDataUrl(file: File, options?: { maxDimension?: number; maxBytes?: number }): Promise<string> {
  const maxDimension = options?.maxDimension ?? POD_MAX_DIMENSION
  const maxBytes = options?.maxBytes ?? MAX_POD_BASE64_BYTES

  const img = await loadImage(file)
  const { width, height } = fitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDimension)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์นี้ไม่รองรับการประมวลผลรูปภาพ')
  ctx.drawImage(img, 0, 0, width, height)

  let quality = DEFAULT_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (estimateBase64Bytes(dataUrl) > maxBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP)
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  if (estimateBase64Bytes(dataUrl) > maxBytes) {
    throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไปแม้บีบอัดแล้ว กรุณาถ่ายรูปใหม่ในความละเอียดที่ต่ำลง')
  }
  return dataUrl
}
