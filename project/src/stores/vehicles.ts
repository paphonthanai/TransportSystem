import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Vehicle } from '@/types'
import { vehicleRepository, sanitizeVehicle } from '@/repositories/vehicleRepository'

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

/** ข้อมูล local เดิม (ก่อนย้ายไป Firestore) — ใช้เป็น "แหล่งข้อมูลตั้งต้น" ตอน import ครั้งแรกเข้า Firestore เท่านั้น
 *  ไม่ใช่แหล่งข้อมูลหลักอีกต่อไปหลังย้าย (ดู importFromLocalStorage ด้านล่าง) */
function loadLocalVehicles(): Vehicle[] {
  try {
    const raw = localStorage.getItem(VEHICLES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return seedVehicles()
}

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref<Vehicle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Import ครั้งเดียว: ถ้า Firestore ยังไม่มีข้อมูลเลย ให้ดึงจาก localStorage (หรือ seed ถ้า localStorage ก็ว่าง
   *  เหมือนกัน) เข้า Firestore ก่อน — id เดิม ('v1'..'v4') จะถูกแทนที่ด้วย document id จริงของ Firestore เหมือนที่
   *  customers/drivers ทำ (ไม่มีที่ไหนใน business logic อ้างอิง id เดิมแบบ hardcode ตรวจสอบแล้ว) */
  async function importFromLocalStorage() {
    const localData = loadLocalVehicles()
    for (const { id, ...data } of localData) {
      await vehicleRepository.create(data)
    }
  }

  async function fetchVehicles() {
    loading.value = true
    error.value = null
    try {
      let result = await vehicleRepository.getAll()
      if (result.length === 0) {
        await importFromLocalStorage()
        result = await vehicleRepository.getAll()
      }
      vehicles.value = result
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลรถจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchVehicles()

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
   * เรียกจาก BookingView.vue/BookingCreateView.vue/DriversView.vue/VehiclesView.vue แบบไม่ await (fire-and-forget)
   * เหมือนเดิมทุกที่ — ฟังก์ชันนี้เปลี่ยนเป็น async ภายในเพื่อ persist ไปที่ Firestore ด้วย แต่ signature การเรียกใช้
   * จากภายนอกเหมือนเดิมทุกประการ ไม่ต้องแก้ไฟล์อื่นนอกเหนือจาก vehicles.ts
   */
  async function assignDriver(vehicleId: string, driverCode: string | undefined) {
    const vehicle = vehicles.value.find((v) => v.id === vehicleId)
    if (!vehicle) return
    if (driverCode) {
      const prev = vehicles.value.find((v) => v.driverCode === driverCode && v.id !== vehicleId)
      if (prev) {
        prev.driverCode = undefined
        await vehicleRepository.update(prev.id, sanitizeVehicle(prev))
      }
    }
    vehicle.driverCode = driverCode || undefined
    await vehicleRepository.update(vehicle.id, sanitizeVehicle(vehicle))
  }

  async function createVehicle(data: Omit<Vehicle, 'id' | 'repairStatus' | 'repairDays' | 'driverCode'>): Promise<string> {
    const id = await vehicleRepository.create(data)
    vehicles.value.unshift({ id, ...data })
    return id
  }

  /** merge กับ record เดิมก่อน sanitize เสมอ เพราะฟอร์มแก้ไขรถ (VehiclesView.vue) ไม่มีช่อง driverCode/repairStatus/
   *  repairDays อยู่แล้ว (แก้ผ่าน assignDriver()/ฟีเจอร์ซ่อมบำรุงในอนาคตแยกต่างหาก) ถ้าไม่ merge ค่าที่มีอยู่เดิมจะหาย
   *  เพราะทุก write ไปที่ Firestore เขียนทับทั้ง document (ไม่ใช่ partial diff) */
  async function updateVehicle(id: string, data: Omit<Vehicle, 'id' | 'repairStatus' | 'repairDays' | 'driverCode'>) {
    const existing = vehicles.value.find((v) => v.id === id)
    const merged: Vehicle = { ...(existing as Vehicle), ...data, id }
    await vehicleRepository.update(id, sanitizeVehicle(merged))
    const index = vehicles.value.findIndex((v) => v.id === id)
    if (index !== -1) vehicles.value[index] = merged
  }

  async function deleteVehicle(id: string) {
    await vehicleRepository.delete(id)
    vehicles.value = vehicles.value.filter((v) => v.id !== id)
  }

  return {
    vehicles,
    loading,
    error,
    fullPlate,
    findByFullPlate,
    vehicleForDriver,
    assignDriver,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  }
})
