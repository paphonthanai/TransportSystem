import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * สถานะ "กำลังโหลด" ระดับทั้งแอป — ใช้แสดงแถบความคืบหน้าด้านบน (components/shared/RouteProgressBar.vue)
 *  - routeLoading: กำลังเปลี่ยนหน้า (รอ guard + โหลดไฟล์ของหน้านั้นแบบ lazy)
 *  - pending: จำนวนงานโหลดข้อมูลที่ยังค้างอยู่ (เช่น โหลดรายการงานขนส่งจาก Firestore) เรียก begin()/end() เป็นคู่เสมอ
 */
export const useLoadingStore = defineStore('loading', () => {
  const routeLoading = ref(false)
  const pending = ref(0)

  const busy = computed(() => routeLoading.value || pending.value > 0)

  function begin() {
    pending.value++
  }

  function end() {
    pending.value = Math.max(0, pending.value - 1)
  }

  return { routeLoading, pending, busy, begin, end }
})
