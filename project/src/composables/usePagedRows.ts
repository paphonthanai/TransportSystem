import { computed, ref, watch, type Ref } from 'vue'
import { useRememberedState } from './useRememberedState'

export const PER_PAGE_OPTIONS = [20, 50, 100]

/** แบ่งแถวตารางเป็นหน้าๆ — แถวลดลงจนหน้าปัจจุบันไม่มีแล้ว (กรอง/ลบ) ถอยมาหน้าสุดท้ายที่มี เปลี่ยนจำนวนแถวต่อหน้ากลับหน้าแรก
 *  rememberKey = จำหน้าที่เปิดอยู่/จำนวนแถวต่อหน้า (กลับมาจากหน้าแก้ไขแล้วยังอยู่หน้าเดิม) ดู useRememberedState */
export function usePagedRows<T>(rows: Ref<T[]>, rememberKey?: string) {
  const page = ref(1)
  const perPage = ref(PER_PAGE_OPTIONS[0])
  if (rememberKey) useRememberedState(`${rememberKey}:paging`, { page, perPage })
  const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / perPage.value)))
  const pagedRows = computed(() => rows.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))
  watch(totalPages, (max) => {
    if (page.value > max) page.value = max
  })
  watch(perPage, () => (page.value = 1))
  return { page, perPage, pagedRows }
}
