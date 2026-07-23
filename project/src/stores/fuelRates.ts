import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const FUEL_KEY = 'tms_fuel_settings_v2'

export interface FuelRate {
  province: string
  district: string
  /** ลิตรมาตรฐานสำหรับเที่ยวไปอำเภอนี้ ใช้เป็นค่าตั้งต้นให้ดึงมากรอกในหน้าสร้างงาน แก้ไขเองได้ */
  liters: number
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

function loadSettings(): FuelSettings {
  try {
    const raw = localStorage.getItem(FUEL_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to defaults
  }
  return defaultSettings()
}

export const useFuelRateStore = defineStore('fuelRates', () => {
  const settings = ref<FuelSettings>(loadSettings())

  watch(settings, (val) => localStorage.setItem(FUEL_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === FUEL_KEY && e.newValue) {
      settings.value = JSON.parse(e.newValue)
    }
  })

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

  return { settings, findRate, provincesList, districtsForProvince }
})
