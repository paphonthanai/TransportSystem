import type { Booking } from '@/types'

/**
 * จับคู่งานกับคนขับที่เลือกอยู่ — ถ้างานมี driverId และรู้ id คนขับที่เลือกอยู่ ให้เทียบด้วย id (แม่นยำ ไม่พังเพราะรูปแบบ
 * ชื่อไม่ตรงกัน) งานเก่าก่อนมี driverId (หรือยังไม่รู้ id คนขับที่เลือก) fallback ไปเทียบชื่อแบบเดิม — Booking.driverId
 * คือ canonical identity เสมอ, driverName เป็นแค่ snapshot/fallback (ห้ามใช้ Vehicle.driverCode หา historical jobs)
 * ใช้ร่วมกันทั้ง DriverJobsView.vue (list) และ DriverJobDetailView.vue (detail) กันตรรกะสองที่ไม่ตรงกัน
 */
export function matchesSelectedDriver(booking: Booking, selectedDriverId: string | undefined, selectedDriverName: string): boolean {
  if (booking.driverId && selectedDriverId) return booking.driverId === selectedDriverId
  return booking.driverName === selectedDriverName
}
