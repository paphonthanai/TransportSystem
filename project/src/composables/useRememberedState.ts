import { watch, type Ref } from 'vue'

/**
 * จำตัวกรอง/คำค้น/หน้าที่เปิดอยู่ของหน้ารายการ — กด "แก้ไข" ไปหน้าอื่นแล้วกลับมา ตัวกรองยังอยู่เหมือนเดิม ไม่ต้องกรองใหม่
 * เก็บใน memory ของแอป + sessionStorage (รีเฟรชหน้าแล้วยังอยู่ ปิดแท็บแล้วหาย) — sessionStorage ใช้ไม่ได้ (โหมดส่วนตัว) ก็ยังจำใน memory
 *
 * เรียกตอน setup "ก่อน" สร้าง watcher ที่รีเซ็ตหน้า (เช่น watch(filters, () => page = 1)) เพื่อให้ค่าที่คืนมาไม่ไปกระตุ้นการรีเซ็ต
 */
const memory = new Map<string, Record<string, unknown>>()
const STORAGE_PREFIX = 'tms:view:'

const load = (key: string): Record<string, unknown> | undefined => {
  if (memory.has(key)) return memory.get(key)
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (raw) return JSON.parse(raw)
  } catch {
    // sessionStorage ใช้ไม่ได้/ข้อมูลเสีย — เริ่มจากค่าเริ่มต้น
  }
  return undefined
}

const save = (key: string, value: Record<string, unknown>) => {
  memory.set(key, value)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // จำใน memory อย่างเดียว
  }
}

/** ค่าที่เก็บไว้ต้องเป็นชนิดเดียวกับค่าเริ่มต้น (กันข้อมูลเก่ารูปแบบผิดทำให้หน้าพัง) — object รวมกับค่าเริ่มต้น เผื่อเพิ่ม field ใหม่ภายหลัง */
const sameShape = (current: unknown, saved: unknown) => {
  if (current === null || current === undefined || saved === null || saved === undefined) return true
  if (Array.isArray(current) || Array.isArray(saved)) return Array.isArray(current) && Array.isArray(saved)
  // ค่าแบบ union เช่น number | '' ต้องรับได้ — ตรวจแค่ว่าเป็น object ด้วยกัน หรือค่าธรรมดาด้วยกัน
  return (typeof current === 'object') === (typeof saved === 'object')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- รับ ref ได้ทุกชนิด (string/number/object/union)
export function useRememberedState(key: string, refs: Record<string, Ref<any>>) {
  const saved = load(key)
  if (saved) {
    for (const [name, r] of Object.entries(refs)) {
      if (!(name in saved) || !sameShape(r.value, saved[name])) continue
      const value = saved[name]
      r.value =
        value && typeof value === 'object' && !Array.isArray(value) && r.value && typeof r.value === 'object' && !Array.isArray(r.value)
          ? { ...(r.value as object), ...(value as object) }
          : value
    }
  }
  watch(
    () => Object.fromEntries(Object.entries(refs).map(([name, r]) => [name, r.value])),
    (snapshot) => save(key, JSON.parse(JSON.stringify(snapshot))),
    { deep: true }
  )
}

/** สำหรับเทสต์ */
export const __clearRememberedState = () => {
  memory.clear()
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {
    // ignore
  }
}
