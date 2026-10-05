import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useFirestoreSettings } from '@/composables/useFirestoreSettings'
import type { JobItem, PricingMode, VehicleType } from '@/types'

export interface FuelRate {
  province: string
  district: string
  /** ลิตรมาตรฐานสำหรับเที่ยวไปอำเภอนี้ ใช้เป็นค่าตั้งต้นให้ดึงมากรอกในหน้าสร้างงาน แก้ไขเองได้ */
  liters: number
  /** แท็กสาย/เส้นทาง (เช่น "สายเหนือ", "สายอีสาน") ไม่บังคับ — ใช้เตือนเมื่อรวมปลายทางคนละสายในงานเดียวกัน และใช้เลือกค่าน้ำมันสูงสุดของสายนั้นแทนการรวมทุกจุด (ไปสายเดียวกันหลายจุด = ขับผ่านจุดใกล้ระหว่างทาง ไม่ต้องนับซ้ำ) */
  corridor?: string
}

export interface FuelSettings {
  rates: FuelRate[]
  /** ราคาน้ำมันแยกตามประเภทรถ (บาท/ลิตร) — เป็นเรทเดียวที่ระบบใช้ (เลิกใช้ "ราคา ณ วันนี้" เรทกลางแล้ว) ประเภทไหนไม่ได้ตั้ง
   *  (หรือตั้งเป็น 0) = ยังไม่มีเรท ดู fuelRateFor */
  pricePerLiterByVehicleType?: Partial<Record<VehicleType, number>>
}

function defaultSettings(): FuelSettings {
  return {
    rates: [
      { province: 'นครสวรรค์', district: 'เมืองนครสวรรค์', liters: 40 },
      { province: 'ราชบุรี', district: 'เมืองราชบุรี', liters: 35 },
      { province: 'ชลบุรี', district: 'ศรีราชา', liters: 30 },
      { province: 'พระนครศรีอยุธยา', district: 'บางปะอิน', liters: 25 },
    ],
  }
}

export const useFuelRateStore = defineStore('fuelRates', () => {
  const { data: settings, loading, error } = useFirestoreSettings<FuelSettings>('fuelRates', defaultSettings)

  const matchText = (a: string, b: string) => a === b || a.includes(b) || b.includes(a)
  /** เทียบชื่ออำเภอแบบตรงตัวเท่านั้น (ตัดช่องว่างหัวท้าย/ยุบช่องว่างซ้ำ/ไม่สนตัวพิมพ์เล็ก-ใหญ่) — ห้ามใช้ includes เหมือนจังหวัด
   *  เพราะลูกค้าตั้งอำเภอเดียวกันไว้หลายพิกัดคนละเรท เช่น "บางพลี" (43 ล.) กับ "AP บางพลี" (40 ล.) การจับคู่แบบมีข้อความอยู่
   *  ในกันทำให้หยิบรายการแรกที่เจอผิดตัว (ดู findRate) */
  const normalizeDistrict = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

  /** หาลิตรมาตรฐานตามจังหวัด+อำเภอ (จับคู่จังหวัดแบบหลวมก่อน แล้วค่อยจับคู่อำเภอภายในจังหวัดนั้นแบบตรงตัว — ไม่ตรงตัว = ไม่เจอ
   *  ไม่เดา กันหยิบเรทของพิกัดอื่นที่ชื่อมีคำนี้อยู่ข้างใน) */
  const findRate = (province: string, district: string): FuelRate | null => {
    const p = province.trim()
    const d = normalizeDistrict(district)
    if (!p || !d) return null
    return (
      settings.value.rates.find((r) => matchText(r.province, p) && normalizeDistrict(r.district) === d) || null
    )
  }

  /** เรทน้ำมัน (บาท/ลิตร) ของรถประเภทนี้ — ไม่มี fallback เรทกลาง: ไม่รู้ประเภทรถ/ไม่ได้ตั้งเรทของประเภทนั้น = เรท 0 พร้อม
   *  reason บอกสาเหตุ (ผู้เรียกเอาไปแปะที่หมายเหตุของงาน ดู applyFuelRate ใน stores/booking.ts) */
  const fuelRateFor = (vehicleType?: VehicleType): { rate: number; reason?: string } => {
    if (!vehicleType) return { rate: 0, reason: 'ยังไม่ทราบประเภทรถ (ยังไม่ได้จัดรถ/ไม่พบรถในทะเบียนรถ) จึงยังไม่มีเรทน้ำมัน' }
    const specific = settings.value.pricePerLiterByVehicleType?.[vehicleType]
    if (specific && specific > 0) return { rate: specific }
    return { rate: 0, reason: `ยังไม่ได้ตั้งเรทน้ำมันของ${vehicleType} ในหน้าตั้งค่าน้ำมัน` }
  }

  /** รายชื่อจังหวัดทั้งหมดที่ตั้งค่าไว้ (ไม่ซ้ำ) ใช้เป็น datalist ตอนสร้างงาน */
  const provincesList = computed(() => [...new Set(settings.value.rates.map((r) => r.province))].sort())

  /** รายชื่ออำเภอที่อยู่ในจังหวัดที่เลือก ใช้ filter ตัวเลือกอำเภอตอนสร้างงาน */
  const districtsForProvince = (province: string) => {
    const p = province.trim()
    if (!p) return [...new Set(settings.value.rates.map((r) => r.district))].sort()
    return [...new Set(settings.value.rates.filter((r) => matchText(r.province, p)).map((r) => r.district))].sort()
  }

  /**
   * รวมลิตรน้ำมันมาตรฐานของงาน ตาม pricingMode:
   * SINGLE_DESTINATION - หลาย JobItem แชร์ปลายทางเดียวกัน (รายการแรก/รายการหลัก) จึงคำนวณครั้งเดียว ไม่คูณตามจำนวนรายการ
   * MULTI_DESTINATION - แต่ละรายการปลายทางต่างกันได้ กลุ่มตามแท็กสาย (corridor) แล้วใช้ค่าสูงสุดของแต่ละสาย (ไปสายเดียวกันหลายจุด = ขับผ่านจุดใกล้ระหว่างทาง ไม่ต้องนับซ้ำ)
   * แล้วรวมยอดสูงสุดของทุกสายเข้าด้วยกัน — รายการที่ไม่มีแท็กสายถือเป็นสายของตัวเอง จึงรวมกันตรงๆ เหมือน Logic เดิมทุกประการถ้ายังไม่ได้ตั้งค่าสาย
   */
  const standardFuelLiters = (items: JobItem[], pricingMode?: PricingMode): number => {
    if (items.length === 0) return 0
    const isMulti = (pricingMode ?? 'SINGLE_DESTINATION') === 'MULTI_DESTINATION'
    if (!isMulti) return findRate(items[0].province, items[0].district)?.liters || 0
    const byGroup = new Map<string, number>()
    items.forEach((item, idx) => {
      const rate = findRate(item.province, item.district)
      if (!rate) return
      const key = rate.corridor || `__item_${idx}`
      byGroup.set(key, Math.max(byGroup.get(key) || 0, rate.liters))
    })
    return [...byGroup.values()].reduce((sum, v) => sum + v, 0)
  }

  /** true = ปลายทางนี้อยู่คนละสายกับปลายทางอื่นที่มีแท็กสายแล้วในงานเดียวกัน (ใช้เตือนเท่านั้น ไม่บล็อกการเพิ่มรายการ) */
  const isDifferentCorridor = (province: string, district: string, otherItems: { province: string; district: string }[]): boolean => {
    const rate = findRate(province, district)
    if (!rate?.corridor) return false
    return otherItems.some((i) => {
      const other = findRate(i.province, i.district)
      return !!other?.corridor && other.corridor !== rate.corridor
    })
  }

  return { settings, loading, error, findRate, fuelRateFor, provincesList, districtsForProvince, standardFuelLiters, isDifferentCorridor }
})
