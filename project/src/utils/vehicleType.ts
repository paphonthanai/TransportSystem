import type { VehicleType } from '@/types'

export type VehicleGroup = 'ร่วมใน' | 'ร่วมนอก'

/** หมวดใหญ่ → หมวดย่อย (ประเภทรถ) ที่เลือกได้ในหน้ารถ */
export const VEHICLE_GROUPS: { group: VehicleGroup; types: VehicleType[] }[] = [
  { group: 'ร่วมใน', types: ['รถบริษัท', 'รถหุ้นส่วน'] },
  { group: 'ร่วมนอก', types: ['รถร่วม', 'รถอู่เสริม'] },
]

/** หมวดใหญ่ของรถ — ค่าเดิม 'รถร่วมใน'/'รถร่วมนอก' (ยังไม่ได้เลือกหมวดย่อย) ก็ยังบอกหมวดใหญ่ได้อยู่ */
export const vehicleGroupOf = (type: VehicleType): VehicleGroup =>
  type === 'รถบริษัท' || type === 'รถหุ้นส่วน' || type === 'รถร่วมใน' ? 'ร่วมใน' : 'ร่วมนอก'

/** ค่าเดิมที่ยังไม่ได้เลือกหมวดย่อย (รู้แค่หมวดใหญ่) */
export const isUnresolvedVehicleType = (type: VehicleType) => type === 'รถร่วมใน' || type === 'รถร่วมนอก'
