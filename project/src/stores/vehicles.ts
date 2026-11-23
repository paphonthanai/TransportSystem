import { defineStore } from 'pinia'
import { trackLoading } from '@/stores/loading'
import { ref } from 'vue'
import type { Vehicle, BookingCategory } from '@/types'
import { vehicleRepository } from '@/repositories/vehicleRepository'
import { normalizePlateCode } from '@/utils/importReconciliation'
import { firstSnapshot } from '@/utils/firstSnapshot'

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
      // realtime — เดิมโหลดครั้งเดียว เครื่องที่เปิดหน้าค้างไว้ไม่เห็นการเปลี่ยนรถประจำของเครื่องอื่น แล้วจัดรถ/บันทึกจากข้อมูลเก่า
      // เขียนรถประจำเดิมกลับไป (คนขับ 0035: เปลี่ยนเป็น 72-3379 แล้วเด้งกลับเป็น 73-0388)
      await firstSnapshot((next, fail) =>
        vehicleRepository.subscribe(
          (list) => {
            vehicles.value = list
            next()
          },
          (err) => {
            error.value = err?.message || 'เชื่อมต่อ realtime ข้อมูลรถไม่สำเร็จ'
            fail(err)
          }
        )
      )
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลรถจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  trackLoading(fetchVehicles())

  /** ทะเบียนเต็ม (ทะเบียน+จังหวัด) เช่น "70-8821 สระบุรี" — ใช้แสดงผล/จับคู่ตอนกรอกทะเบียนในหน้าสร้างงาน/จัดรถ */
  const fullPlate = (v: Vehicle) => `${v.plate} ${v.plateProvince}`.trim()

  /** หารถจากข้อความทะเบียน (เต็มหรือแค่เลขทะเบียน) ที่พิมพ์/เลือกไว้ */
  const findByFullPlate = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return undefined
    return vehicles.value.find((v) => fullPlate(v) === trimmed || v.plate === trimmed)
  }

  /** หารถจากทะเบียนแบบหลวม — เหมือน findByFullPlate แต่รองรับทะเบียนที่ไม่ตรงรูปแบบเป๊ะ (มี/ไม่มีขีด, ต่อท้ายด้วยชื่อจังหวัดอื่น/สะกดจังหวัดต่าง)
   *  โดยเทียบเฉพาะเลขทะเบียน (ส่วนหน้าช่องว่างแรก) — ใช้เมื่อต้องหาคนขับประจำรถจากทะเบียนในงาน/ไฟล์นำเข้า */
  const findByPlateLoose = (text: string) => {
    const exact = findByFullPlate(text)
    if (exact) return exact
    const head = normalizePlateCode((text || '').trim().split(/\s+/)[0] || '')
    if (!head) return undefined
    return vehicles.value.find((v) => normalizePlateCode(v.plate) === head)
  }

  /** ทะเบียนมาตรฐานที่เก็บในงาน (Booking.plate) = เลขทะเบียนล้วนไม่มีจังหวัด ตามที่ผู้ใช้กำหนด — ข้อความที่ตรงกับรถในทะเบียน
   *  (มี/ไม่มีจังหวัด) ใช้ Vehicle.plate ถ้าไม่พบรถในทะเบียนเก็บตามที่พิมพ์ */
  const bookingPlate = (text: string | undefined) => {
    const trimmed = (text || '').trim()
    if (!trimmed) return ''
    return findByPlateLoose(trimmed)?.plate || trimmed
  }

  /** key เทียบทะเบียนของงาน — งานเก่าที่มีจังหวัดต่อท้ายกับงานใหม่ที่ไม่มี ถือเป็นรถคันเดียวกัน */
  const plateKey = (text: string | undefined) => normalizePlateCode((text || '').trim().split(/\s+/)[0] || '')

  /** รถที่มีคนขับรหัสนี้ประจำอยู่ (ถ้ามี) */
  const vehicleForDriver = (driverCode: string) => vehicles.value.find((v) => v.driverCode === driverCode)

  /** รถที่วิ่งงาน Feed นี้ได้ — ไม่มีค่า/array ว่างใน allowedCategories = ไม่จำกัด (วิ่งได้ทุก Feed) ใช้จุดเดียวนี้
   *  ทุกที่ที่ต้องเลือกรถให้ Booking กัน UI คนละหน้าแสดงรถไม่ตรงกัน (ดู types/index.ts's Vehicle.allowedCategories) */
  const availableFor = (category: BookingCategory) =>
    vehicles.value.filter((v) => !v.allowedCategories || v.allowedCategories.length === 0 || v.allowedCategories.includes(category))

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
    // เขียนเฉพาะช่องคนขับประจำ (ไม่เขียนข้อมูลรถทั้งคันจากสำเนาในเครื่องทับ) และถอดคนขับคนนี้ออกจากรถ "ทุก" คันอื่น
    // (เดิมถอดแค่คันแรกที่เจอ ถ้าข้อมูลเพี้ยนมี 2 คัน คันที่เหลือยังผูกอยู่ = รถประจำเด้งไปมา)
    const others = driverCode ? vehicles.value.filter((v) => v.driverCode === driverCode && v.id !== vehicleId) : []
    others.forEach((v) => (v.driverCode = undefined))
    vehicle.driverCode = driverCode || undefined
    await Promise.all([
      ...others.map((v) => vehicleRepository.setDriverCode(v.id, undefined)),
      vehicleRepository.setDriverCode(vehicle.id, driverCode),
    ])
  }

  async function createVehicle(data: Omit<Vehicle, 'id' | 'repairStatus' | 'repairDays' | 'driverCode'>): Promise<string> {
    const id = await vehicleRepository.create(data)
    // realtime snapshot อาจใส่คันนี้ให้แล้วก่อน addDoc คืนค่า — กันซ้ำ
    if (!vehicles.value.some((v) => v.id === id)) vehicles.value.unshift({ id, ...data })
    return id
  }

  /** merge กับ record เดิมก่อน sanitize เสมอ เพราะฟอร์มแก้ไขรถ (VehiclesView.vue) ไม่มีช่อง driverCode/repairStatus/
   *  repairDays อยู่แล้ว (แก้ผ่าน assignDriver()/ฟีเจอร์ซ่อมบำรุงในอนาคตแยกต่างหาก) ถ้าไม่ merge ค่าที่มีอยู่เดิมจะหาย
   *  เพราะทุก write ไปที่ Firestore เขียนทับทั้ง document (ไม่ใช่ partial diff) */
  async function updateVehicle(id: string, data: Omit<Vehicle, 'id' | 'repairStatus' | 'repairDays' | 'driverCode'>) {
    const existing = vehicles.value.find((v) => v.id === id)
    const merged: Vehicle = { ...(existing as Vehicle), ...data, id }
    // ไม่เขียนคนขับประจำ — สำเนาในเครื่องอาจเก่า (คนขับประจำแก้ผ่าน assignDriver() เท่านั้น)
    await vehicleRepository.updateDetails(id, merged)
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
    bookingPlate,
    plateKey,
    findByFullPlate,
    findByPlateLoose,
    vehicleForDriver,
    availableFor,
    assignDriver,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  }
})
