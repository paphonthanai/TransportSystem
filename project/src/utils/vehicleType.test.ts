import { describe, it, expect } from 'vitest'
import { vehicleGroupOf, isUnresolvedVehicleType } from './vehicleType'

describe('vehicleType', () => {
  it('แมปหมวดย่อยเข้าหมวดใหญ่ถูกต้อง', () => {
    expect(vehicleGroupOf('รถบริษัท')).toBe('ร่วมใน')
    expect(vehicleGroupOf('รถหุ้นส่วน')).toBe('ร่วมใน')
    expect(vehicleGroupOf('รถร่วม')).toBe('ร่วมนอก')
    expect(vehicleGroupOf('รถอู่เสริม')).toBe('ร่วมนอก')
  })
  it('ค่าเดิมที่เป็นหมวดใหญ่ยังบอกหมวดได้ และถูกตีว่ายังไม่ได้เลือกหมวดย่อย', () => {
    expect(vehicleGroupOf('รถร่วมใน')).toBe('ร่วมใน')
    expect(vehicleGroupOf('รถร่วมนอก')).toBe('ร่วมนอก')
    expect(isUnresolvedVehicleType('รถร่วมใน')).toBe(true)
    expect(isUnresolvedVehicleType('รถร่วม')).toBe(false)
  })
})
