/** แปลง error จาก getUserMedia เป็นข้อความที่คนขับรู้ว่าต้องทำอะไรต่อ (ชื่อ error ตามมาตรฐาน DOMException) */
export function cameraErrorMessage(err: unknown): string {
  switch ((err as { name?: string } | null)?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'ยังไม่ได้อนุญาตให้ใช้กล้อง — กดอนุญาตกล้องในการตั้งค่าของเบราว์เซอร์แล้วลองใหม่ หรือใช้กล้องของเครื่องแทน'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'ไม่พบกล้องในเครื่องนี้ — ใช้กล้องของเครื่องแทน หรือปิดแล้วเลือกจากคลังรูป'
    case 'NotReadableError':
    case 'AbortError':
      return 'แอปอื่นกำลังใช้กล้องอยู่ — ปิดแอปนั้นแล้วลองใหม่ หรือใช้กล้องของเครื่องแทน'
    default:
      return 'เปิดกล้องไม่สำเร็จ — ลองใหม่ หรือใช้กล้องของเครื่องแทน'
  }
}
