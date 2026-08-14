import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'

/**
 * อัปโหลดรูป POD (หลักฐานส่งมอบสินค้า) ขึ้น Firebase Storage ที่ตั้งค่าไว้แล้วในโปรเจกต์อยู่แล้ว (ดู config/firebase.ts
 * — เดิม export ไว้เฉยๆ ไม่เคยมีใครใช้จริง) แทนที่จะฝัง base64 ตรงลง Firestore เหมือนเดิม (เสี่ยงชนขีดจำกัด 1 MiB/
 * เอกสารเวลามีหลายปลายทาง) — path ผูกกับ bookingId/jobItemId เสมอกันไฟล์ชนกัน (ดู storage.rules)
 */
const podRepository = {
  async upload(bookingId: string, jobItemId: string, dataUrl: string): Promise<string> {
    const fileName = `${Date.now()}.jpg`
    const ref = storageRef(storage, `pod/${bookingId}/${jobItemId}/${fileName}`)
    await uploadString(ref, dataUrl, 'data_url')
    return getDownloadURL(ref)
  },
}

export default podRepository
