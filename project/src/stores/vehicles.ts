import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Vehicle } from '@/types'
import { vehicleRepository, sanitizeVehicle } from '@/repositories/vehicleRepository'

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref<Vehicle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** ไม่ auto-reseed ข้อมูลตัวอย่าง (mock) เข้า Firestore อีกต่อไป — ถ้า collection ว่าง แปลว่าว่างจริง (เช่น เพิ่งลบ
   *  mock data ทิ้งโดยตั้งใจ) ไม่ใช่ "ยังไม่เคย migrate" ต้องให้ผู้ใช้กรอกรถจริงเองผ่านหน้า ตั้งค่า > รถบรรทุก */
  async function fetchVehicles() {
    loading.value = true
    error.value = null
    try {
      vehicles.value = await vehicleRepository.getAll()
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
