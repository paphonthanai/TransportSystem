import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Vehicle } from '@/types'

const VEHICLES_KEY = 'tms_vehicles_v1'

function seedVehicles(): Vehicle[] {
  return [
    {
      id: 'v1',
      plate: '70-8821',
      plateProvince: 'สระบุรี',
      vehicleNo: 'T-001',
      trailerPlate: '',
      brand: 'HINO',
      bodyType: 'รถบรรทุก 10 ล้อ',
      chassisNo: 'MPBUR2CE0M1012345',
      engineNo: 'J08E-10234',
      department: 'รถบริษัท',
      mileage: 152340,
      driverCode: '0001',
    },
    {
      id: 'v2',
      plate: '82-4417',
      plateProvince: 'กรุงเทพมหานคร',
      vehicleNo: 'T-002',
      trailerPlate: '',
      brand: 'ISUZU',
      bodyType: 'รถบรรทุก 6 ล้อ',
      chassisNo: 'MPBUR2CE0K1054321',
      engineNo: '6HK1-55123',
      department: 'รถบริษัท',
      mileage: 98210,
      driverCode: '0002',
    },
    {
      id: 'v3',
      plate: '71-3390',
      plateProvince: 'ราชบุรี',
      vehicleNo: 'T-003',
      trailerPlate: 'ห-1204 ราชบุรี',
      brand: 'FUSO',
      bodyType: 'รถหัวลาก',
      chassisNo: 'MPBUR2CE0L1067788',
      engineNo: '6M70-67788',
      department: 'รถหุ้นส่วน',
      mileage: 210875,
      driverCode: '0003',
    },
    {
      id: 'v4',
      plate: '72-6628',
      plateProvince: 'พระนครศรีอยุธยา',
      vehicleNo: 'T-004',
      trailerPlate: 'ห-3387 อยุธยา',
      brand: 'HINO',
      bodyType: 'รถกึ่งพ่วง',
      chassisNo: 'MPBUR2CE0J1099001',
      engineNo: 'J08E-99001',
      department: 'รถร่วม',
      mileage: 176420,
      driverCode: '0004',
    },
  ]
}

function loadVehicles(): Vehicle[] {
  try {
    const raw = localStorage.getItem(VEHICLES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return seedVehicles()
}

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref<Vehicle[]>(loadVehicles())

  watch(vehicles, (val) => localStorage.setItem(VEHICLES_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === VEHICLES_KEY && e.newValue) {
      vehicles.value = JSON.parse(e.newValue)
    }
  })

  /** ทะเบียนเต็ม (ทะเบียน+จังหวัด) เช่น "70-8821 สระบุรี" — ใช้แสดงผล/จับคู่ตอนกรอกทะเบียนในหน้าสร้างงาน/จัดรถ */
  const fullPlate = (v: Vehicle) => `${v.plate} ${v.plateProvince}`.trim()

  /** หารถจากข้อความทะเบียน (เต็มหรือแค่เลขทะเบียน) ที่พิมพ์/เลือกไว้ */
  const findByFullPlate = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return undefined
    return vehicles.value.find((v) => fullPlate(v) === trimmed || v.plate === trimmed)
  }

  /** รถที่มีคนขับรหัสนี้ประจำอยู่ (ถ้ามี) */
  const vehicleForDriver = (driverCode: string) => vehicles.value.find((v) => v.driverCode === driverCode)

  /**
   * กำหนด/เปลี่ยนคนขับประจำของรถคันนี้ — จุดเดียวที่แก้ไขความสัมพันธ์รถ-คนขับ เพื่อให้ทุกหน้าเห็นข้อมูลเดียวกันเสมอ
   * คนขับ 1 คนประจำรถได้ทีละ 1 คันเท่านั้น ถ้าคนขับคนนี้ประจำรถคันอื่นอยู่แล้ว จะถอดออกจากคันเดิมให้อัตโนมัติ
   */
  function assignDriver(vehicleId: string, driverCode: string | undefined) {
    const vehicle = vehicles.value.find((v) => v.id === vehicleId)
    if (!vehicle) return
    if (driverCode) {
      const prev = vehicles.value.find((v) => v.driverCode === driverCode && v.id !== vehicleId)
      if (prev) prev.driverCode = undefined
    }
    vehicle.driverCode = driverCode || undefined
  }

  return {
    vehicles,
    fullPlate,
    findByFullPlate,
    vehicleForDriver,
    assignDriver,
  }
})
