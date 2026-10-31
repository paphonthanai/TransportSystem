/**
 * รอ snapshot แรกของ realtime listener — ใช้แทนการ getDocs ทั้ง collection แล้วค่อยเปิด onSnapshot ซ้ำ (อ่าน 2 รอบ)
 * start รับ next (เรียกทุกครั้งที่ได้ snapshot) กับ fail (error) — resolve ครั้งแรกที่ได้ข้อมูล, reject ถ้า error ก่อนได้ข้อมูล
 * error หลังจากนั้นผู้เรียกจัดการเองใน callback (Promise ที่ settle แล้วไม่เปลี่ยนสถานะอีก)
 */
export function firstSnapshot(start: (next: () => void, fail: (err: unknown) => void) => unknown): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    start(
      () => resolve(),
      (err) => reject(err)
    )
  })
}
