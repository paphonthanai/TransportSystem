import { collection, deleteDoc, deleteField, doc, getDocs, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Booking } from '@/types'

/**
 * Booking Firestore migration — คุยกับ Firestore ตรงๆ ผ่านไฟล์นี้ไฟล์เดียว (เหมือน customerRepository.ts)
 * ต่างจากลูกค้า/คนขับ/รถตรงที่ Booking มี Date field เยอะและซ้อนอยู่ใน items[] จึงต้องแปลง Date <-> ISO string เอง
 * ก่อนเขียน/หลังอ่าน Firestore (Firestore เก็บ Date เป็น Timestamp ซึ่งไม่ตรงกับที่โค้ดเดิมคาดหวัง เลยเลือกเก็บเป็น
 * ISO string แทนเพื่อให้ reviveBooking's `new Date(value)` ทำงานเหมือนเดิมทุกที่ที่เคยใช้กับ localStorage)
 * ใช้ realtime listener (onSnapshot) ตั้งแต่แรก — ต่างจาก customer/driver/vehicle ที่ยัง one-shot — เพราะ Requirement
 * ของ Booking คือหลายเบราว์เซอร์/แท็บต้องเห็นข้อมูลตรงกันแบบ real-time (จ่ายงาน/อัปเดตสถานะจากมือถือคนขับ)
 */
const COLLECTION = 'bookings'

const BOOKING_DATE_FIELDS = ['shipDate', 'returnDate', 'createdAt', 'dispatchedAt', 'fuelReceivedAt', 'transitStartedAt', 'goodsReceivedAt', 'completedAt', 'billedAt'] as const
const JOB_ITEM_DATE_FIELDS = ['pickedUpAt', 'deliveredAt'] as const

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeValue)
  return value
}

/**
 * แปลง Date fields ทั้งหมด (ระดับงาน + ระดับ items[]) เป็น ISO string ก่อนเขียน Firestore
 * field ระดับบนสุดที่เป็น undefined (เช่น booking.driverName ตอน declineDispatch เคลียร์ทิ้ง) ต้องแปลงเป็น
 * deleteField() ไม่ใช่แค่ตัดออกจาก payload เฉยๆ — เพราะ update() ใช้ setDoc(...,{merge:true}) เสมอ การไม่ส่ง key
 * นั้นไปเลยแปลว่า "ไม่แตะ field นี้" ค่าเก่าใน Firestore จะยังค้างอยู่ ไม่ได้ถูกล้างจริงตามที่โค้ดฝั่ง store ตั้งใจ
 * (ระดับ items[] ไม่ใช้ deleteField() เพราะ Firestore ไม่รองรับ sentinel นี้ในสมาชิกของ array — แต่ items ทั้งก้อน
 * ถูกเขียนทับใหม่ทั้ง array อยู่แล้วทุกครั้ง การตัด key ที่ undefined ออกจากแต่ละ item จึงถูกต้องอยู่แล้วโดยธรรมชาติ)
 */
export function sanitizeBooking(data: Partial<Booking> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      out[key] = deleteField()
      continue
    }
    if (key === 'items' && Array.isArray(value)) {
      out.items = value.map((item: any) => {
        const cleanItem: Record<string, unknown> = {}
        for (const [ik, iv] of Object.entries(item)) {
          if (iv === undefined) continue
          cleanItem[ik] = (JOB_ITEM_DATE_FIELDS as readonly string[]).includes(ik) ? serializeValue(iv) : iv
        }
        return cleanItem
      })
      continue
    }
    out[key] = (BOOKING_DATE_FIELDS as readonly string[]).includes(key) ? serializeValue(value) : value
  }
  return out
}

function reviveBooking(raw: any): Booking {
  const booking = { ...raw }
  for (const field of BOOKING_DATE_FIELDS) {
    if (booking[field]) booking[field] = new Date(booking[field])
  }
  booking.items = (booking.items || []).map((item: any) => ({
    ...item,
    pickedUpAt: item.pickedUpAt ? new Date(item.pickedUpAt) : undefined,
    deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : undefined,
  }))
  return booking as Booking
}

export const bookingRepository = {
  async getAll(): Promise<Booking[]> {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map((d) => reviveBooking({ id: d.id, ...d.data() }))
  },

  /** สร้าง id ฝั่ง client ล่วงหน้าโดยไม่ต้องรอ network — เพื่อให้ store คืนค่างานใหม่แบบ synchronous ได้เหมือนโค้ดเดิม (ก่อนหน้านี้ใช้ `b${Date.now()}...`) */
  newId(): string {
    return doc(collection(db, COLLECTION)).id
  },

  /** ใช้ setDoc({merge:true}) แทน updateDoc ทุกกรณี ทั้งตอนสร้างและแก้ไข เพราะ id ถูกสร้างไว้ล่วงหน้าฝั่ง client แล้ว
   *  (เอกสารอาจยังไม่มีอยู่จริงใน Firestore ตอนเรียกครั้งแรก — updateDoc จะ error ถ้าเอกสารยังไม่มี ส่วน setDoc+merge สร้างให้อัตโนมัติ) */
  async update(id: string, data: Partial<Omit<Booking, 'id'>>): Promise<void> {
    await setDoc(doc(db, COLLECTION, id), sanitizeBooking(data), { merge: true })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },

  /** subscribe realtime — คืนฟังก์ชัน unsubscribe ให้เรียกตอน store ถูกทำลาย (ปกติ store นี้อยู่ตลอดอายุแอปจึงไม่ค่อยได้เรียก) */
  subscribe(onChange: (bookings: Booking[]) => void, onError?: (err: Error) => void): Unsubscribe {
    return onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => onChange(snapshot.docs.map((d) => reviveBooking({ id: d.id, ...d.data() }))),
      (err) => onError?.(err)
    )
  },
}
