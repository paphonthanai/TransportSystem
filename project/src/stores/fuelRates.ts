import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useFirestoreSettings } from '@/composables/useFirestoreSettings'
import type { JobItem, PricingMode } from '@/types'

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
  /** ราคาน้ำมัน ณ วันนี้ (บาท/ลิตร) ใช้เป็นค่าตั้งต้นในทุกอำเภอ อัปเดตเองทุกวันที่ราคาเปลี่ยน */
  todayPricePerLiter: number
}

function defaultSettings(): FuelSettings {
  return {
    rates: [
      { province: 'นครสวรรค์', district: 'เมืองนครสวรรค์', liters: 40 },
      { province: 'ราชบุรี', district: 'เมืองราชบุรี', liters: 35 },
      { province: 'ชลบุรี', district: 'ศรีราชา', liters: 30 },
      { province: 'พระนครศรีอยุธยา', district: 'บางปะอิน', liters: 25 },
    ],
    todayPricePerLiter: 32,
  }
}

export const useFuelRateStore = defineStore('fuelRates', () => {
  const { data: settings, loading, error } = useFirestoreSettings<FuelSettings>('fuelRates', defaultSettings)

  const matchText = (a: string, b: string) => a === b || a.includes(b) || b.includes(a)

  /** หาลิตรมาตรฐานตามจังหวัด+อำเภอ (จับคู่จังหวัดก่อน แล้วค่อยจับคู่อำเภอภายในจังหวัดนั้น กันชื่ออำเภอซ้ำกันคนละจังหวัด) */
  const findRate = (province: string, district: string): FuelRate | null => {
    const p = province.trim()
    const d = district.trim()
    if (!p || !d) return null
    return (
      settings.value.rates.find((r) => matchText(r.province, p) && matchText(r.district, d)) || null
    )
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

  return { settings, loading, error, findRate, provincesList, districtsForProvince, standardFuelLiters, isDifferentCorridor }
})
