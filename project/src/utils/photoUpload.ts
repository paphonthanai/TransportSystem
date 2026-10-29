import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'
import { compressImageToDataUrl } from '@/utils/podImage'

/** รูปที่ขึ้น Storage ไม่ติดเพดาน 1 MiB ของเอกสาร Firestore แล้ว (เก็บแค่ URL) แต่ยังย่อ/บีบก่อนอัปโหลดเสมอ
 *  เพื่อประหยัดโควตาฟรี (เก็บ 5 GB, ดาวน์โหลด 1 GB/วัน) และให้อัปโหลดผ่านเน็ตมือถือไว */
const MAX_UPLOAD_BYTES = 350_000

/** ผู้อัปโหลด: 'driver' = คนขับถ่ายจากแอป (เขียนได้เฉพาะ driver-uploads/) 'office' = ออฟฟิศแนบแทน (office-uploads/)
 *  ดูตารางสิทธิ์ที่หัวไฟล์ storage.rules — path ต้องตรงกับกฎเสมอ ห้ามเปลี่ยนโดยไม่แก้กฎตามไปด้วย */
export type PhotoActor = 'driver' | 'office'

/** จำนวนรูปสูงสุดต่อชุด (รูปแนบให้คนขับ / รูปเพิ่มเติมของคนขับ / รูปเพิ่มเติมต่อจุดส่ง) — กันโควตา Storage ฟรีหมดเร็ว */
export const MAX_PHOTOS_PER_LIST = 10

export const photoPaths = {
  loading: (bookingId: string, actor: PhotoActor) => `${actor}-uploads/${bookingId}/loading-${Date.now()}.jpg`,
  delivery: (bookingId: string, itemId: string, actor: PhotoActor) => `${actor}-uploads/${bookingId}/goods-${itemId}-${Date.now()}.jpg`,
  deliveryNote: (bookingId: string, itemId: string, actor: PhotoActor) => `${actor}-uploads/${bookingId}/note-${itemId}-${Date.now()}.jpg`,
  /** รูปที่ออฟฟิศแนบให้คนขับดู — ออฟฟิศเท่านั้นที่แนบ จึงอยู่โซน office-uploads/ เสมอ (คนขับอ่านงานของตัวเองได้) */
  /** รูปเพิ่มเติมของงาน (คนขับแนบเอง) */
  extra: (bookingId: string, actor: PhotoActor) => `${actor}-uploads/${bookingId}/extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
  /** รูปเพิ่มเติมตอนส่งของจุดนี้ */
  deliveryExtra: (bookingId: string, itemId: string, actor: PhotoActor) => `${actor}-uploads/${bookingId}/goods-${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
  driverAttachment: (bookingId: string) => `office-uploads/${bookingId}/attach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
}

/** ย่อ+บีบรูป แล้วอัปโหลดขึ้น Firebase Storage คืน download URL ที่เก็บลง Firestore ได้เลย */
export async function uploadJobPhoto(path: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ กรุณาถ่าย/เลือกรูปใหม่')
  const dataUrl = await compressImageToDataUrl(file, { maxBytes: MAX_UPLOAD_BYTES })
  const blob = await (await fetch(dataUrl)).blob()
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(fileRef)
}
