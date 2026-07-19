import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const FUEL_KEY = 'tms_fuel_settings_v1'

export interface FuelRate {
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
      { district: 'เมืองนครสวรรค์', liters: 40 },
      { district: 'เมืองราชบุรี', liters: 35 },
      { district: 'ศรีราชา', liters: 30 },
      { district: 'บางปะอิน', liters: 25 },
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

  /** หาลิตรมาตรฐานตามอำเภอ (จับคู่แบบ exact หรือ substring กันกรณีพิมพ์ต่างกันเล็กน้อย) */
  const findRateByDistrict = (district: string): FuelRate | null => {
    const trimmed = district.trim()
    if (!trimmed) return null
    return (
      settings.value.rates.find(
        (r) => r.district === trimmed || r.district.includes(trimmed) || trimmed.includes(r.district)
      ) || null
    )
  }

  return { settings, findRateByDistrict }
})
