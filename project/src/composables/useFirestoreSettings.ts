import { ref, watch, type Ref } from 'vue'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

const COLLECTION = 'settings'

/**
 * ตั้งค่าแบบ object เดียว (ไม่ใช่รายการ) ที่ต้องซิงก์ข้ามเครื่อง — เก็บเป็น 1 เอกสารต่อ 1 ตั้งค่าใน collection
 * 'settings' (doc id = key) ใช้ onSnapshot realtime + content-diff guard (เทียบ JSON string ก่อนเขียน/ก่อนรับค่า)
 * กันไม่ให้เกิด loop เขียน-อ่าน-เขียนไม่รู้จบตอนรับค่าจาก Firestore กลับมา (ต่างจาก customers/drivers/vehicles ที่เป็น
 * รายการหลายเอกสาร เพราะ setDoc เขียนทั้ง object ทุกครั้งที่ค่าเปลี่ยนแม้แค่ field เดียว)
 */
export function useFirestoreSettings<T extends Record<string, unknown>>(
  key: string,
  defaultValue: () => T,
  merge: (raw: any) => T = (raw) => ({ ...defaultValue(), ...raw })
) {
  const data = ref(defaultValue()) as Ref<T>
  const loading = ref(true)
  const error = ref<string | null>(null)
  let lastKnownJson = ''

  async function init() {
    try {
      const snap = await getDoc(doc(db, COLLECTION, key))
      if (snap.exists()) {
        data.value = merge(snap.data())
      } else {
        await setDoc(doc(db, COLLECTION, key), defaultValue())
      }
      lastKnownJson = JSON.stringify(data.value)
    } catch (err: any) {
      error.value = err?.message || `โหลดการตั้งค่า (${key}) จาก Firestore ไม่สำเร็จ`
    } finally {
      loading.value = false
    }

    onSnapshot(
      doc(db, COLLECTION, key),
      (snap) => {
        if (!snap.exists()) return
        const merged = merge(snap.data())
        const json = JSON.stringify(merged)
        if (json === lastKnownJson) return
        lastKnownJson = json
        data.value = merged
      },
      (err) => {
        error.value = err?.message || `เชื่อมต่อ realtime การตั้งค่า (${key}) ไม่สำเร็จ`
      }
    )
  }
  init()

  watch(
    data,
    (val) => {
      const json = JSON.stringify(val)
      if (json === lastKnownJson) return
      lastKnownJson = json
      setDoc(doc(db, COLLECTION, key), val).catch((err: any) => {
        error.value = err?.message || `บันทึกการตั้งค่า (${key}) ไป Firestore ไม่สำเร็จ`
      })
    },
    { deep: true }
  )

  return { data, loading, error }
}
