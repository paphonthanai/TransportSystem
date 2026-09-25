import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'
import { compressImageToDataUrl } from '@/utils/podImage'

/** รูปที่ขึ้น Storage ไม่ติดเพดาน 1 MiB ของเอกสาร Firestore แล้ว (เก็บแค่ URL) แต่ยังย่อ/บีบก่อนอัปโหลดเสมอ
 *  เพื่อประหยัดโควตาฟรี (เก็บ 5 GB, ดาวน์โหลด 1 GB/วัน) และให้อัปโหลดผ่านเน็ตมือถือไว */
const MAX_UPLOAD_BYTES = 350_000

/** path ต้องตรงกับ storage.rules — ห้ามเปลี่ยนโดยไม่แก้ rules ตามไปด้วย */
export const photoPaths = {
  loading: (bookingId: string) => `loading/${bookingId}/${Date.now()}.jpg`,
  delivery: (bookingId: string, itemId: string) => `pod/${bookingId}/${itemId}/goods-${Date.now()}.jpg`,
  deliveryNote: (bookingId: string, itemId: string) => `pod/${bookingId}/${itemId}/note-${Date.now()}.jpg`,
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
