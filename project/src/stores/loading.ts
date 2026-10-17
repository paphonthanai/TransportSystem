import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * สถานะ "กำลังโหลด" ระดับทั้งแอป
 *  - routeLoading: กำลังเปลี่ยนหน้า (รอ guard + โหลดไฟล์ของหน้านั้นแบบ lazy) → แถบด้านบน (RouteProgressBar)
 *  - pageSeq: ลำดับ "หน้าปัจจุบัน" เพิ่มทุกครั้งที่เปลี่ยนหน้าสำเร็จ (ดู router.afterEach)
 *  - งานโหลดข้อมูล (begin/end) ผูกกับหน้าที่เริ่มงานนั้น → pagePending คือจำนวนงานโหลดข้อมูลของ "หน้านี้" ที่ยังค้างอยู่
 *    ใช้ใน PageGate: หน้าแสดง loading จนข้อมูลของหน้านั้นมาครบ แล้วค่อยแสดงเนื้อหา (งานโหลดของหน้าก่อนหน้าไม่ทำให้หน้านี้ค้าง)
 */
export const useLoadingStore = defineStore('loading', () => {
  const routeLoading = ref(false)
  const pageSeq = ref(0)
  const pendingBySeq = reactive<Record<number, number>>({})

  /** จำนวนงานโหลดข้อมูลที่ค้างอยู่ทั้งหมด (ทุกหน้า) */
  const pending = computed(() => Object.values(pendingBySeq).reduce((sum, n) => sum + n, 0))
  /** จำนวนงานโหลดข้อมูลที่ค้างอยู่ของหน้าปัจจุบัน */
  const pagePending = computed(() => pendingBySeq[pageSeq.value] || 0)
  const busy = computed(() => routeLoading.value || pending.value > 0)

  /** เริ่มงานโหลดข้อมูล — คืน token (ลำดับหน้าที่เริ่มงานนี้) ต้องส่งคืนให้ end() */
  function begin(): number {
    const seq = pageSeq.value
    pendingBySeq[seq] = (pendingBySeq[seq] || 0) + 1
    return seq
  }

  function end(seq: number = pageSeq.value) {
    const left = Math.max(0, (pendingBySeq[seq] || 0) - 1)
    if (left === 0) delete pendingBySeq[seq]
    else pendingBySeq[seq] = left
  }

  /** เปลี่ยนหน้าสำเร็จ — งานโหลดที่เริ่มหลังจากนี้เป็นของหน้าใหม่ (เรียกจาก router.afterEach ก่อนหน้าใหม่ถูกสร้าง) */
  function nextPage() {
    pageSeq.value++
  }

  return { routeLoading, pageSeq, pending, pagePending, busy, begin, end, nextPage }
})

/**
 * ครอบการโหลดข้อมูลตอนเริ่มของ store (เรียกครั้งเดียวตอน store ถูกสร้างตอนที่หน้าหนึ่งกำลังถูกสร้าง) ให้นับเป็น "กำลังโหลด" ของหน้านั้น
 * ผลลัพธ์/error ของ promise เดิมไม่เปลี่ยน (ส่งต่อเหมือนเดิม)
 */
export function trackLoading<T>(task: Promise<T>): Promise<T> {
  const loading = useLoadingStore()
  const seq = loading.begin()
  return task.finally(() => loading.end(seq))
}
