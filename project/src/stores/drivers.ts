import { defineStore } from 'pinia'
import { ref } from 'vue'
import { driverRepository, sanitizeDriver } from '@/repositories/driverRepository'

const DRIVERS_KEY = 'tms_drivers_v1'

export type EmploymentStatus = 'active' | 'resigned'
export type IncomeType = 'daily' | 'monthly' | 'trip'
export type LicenseType = 'ท.1' | 'ท.2'

export interface DriverRecord {
  /** id เอกสารใน Firestore — เพิ่มเข้ามาเป็น Phase 2 ของการย้ายจาก localStorage ไป Firestore (ดู repositories/driverRepository.ts)
   *  ไม่มีค่าตอนที่ยังไม่ได้บันทึกจริง (เช่น record ว่างจาก emptyForm ใน DriversView.vue) */
  id?: string
  code: string
  prefix: string
  firstName: string
  lastName: string
  idCard: string
  licenseNo: string
  licenseType: LicenseType
  licenseExpiry: string
  address: string
  subDistrict: string
  district: string
  province: string
  zipCode: string
  phone: string
  lineId: string
  emergencyContact: string
  emergencyRelation: string
  startDate: string
  employmentStatus: EmploymentStatus
  resignDate: string
  incomeType: IncomeType
  incomeAmount: number
  commission: number
  phoneAllowance: number
  bankAccount: string
  photo: string | null
  avatarBg: string
}

function seedDrivers(): DriverRecord[] {
  return [
    {
      code: '0001',
      prefix: 'นาย',
      firstName: 'สมชาย',
      lastName: 'ทองดี',
      idCard: '1-2345-67890-12-3',
      licenseNo: '',
      licenseType: 'ท.2',
      licenseExpiry: '',
      address: '12/4',
      subDistrict: 'ปากน้ำ',
      district: 'เมือง',
      province: 'สระบุรี',
      zipCode: '',
      phone: '081-234-5678',
      lineId: 'somchai_td',
      emergencyContact: '',
      emergencyRelation: '',
      startDate: '',
      employmentStatus: 'active',
      resignDate: '',
      incomeType: 'trip',
      incomeAmount: 0,
      commission: 0,
      phoneAllowance: 0,
      bankAccount: '123-4-56789-0',
      photo: null,
      avatarBg: '#3b82f6',
    },
    {
      code: '0002',
      prefix: 'นาย',
      firstName: 'ประเสริฐ',
      lastName: 'มั่นคง',
      idCard: '1-2345-67891-23-4',
      licenseNo: '',
      licenseType: 'ท.2',
      licenseExpiry: '',
      address: '45',
      subDistrict: 'บางพลี',
      district: 'บางพลี',
      province: 'สมุทรปราการ',
      zipCode: '',
      phone: '089-555-1212',
      lineId: 'prasert_mk',
      emergencyContact: '',
      emergencyRelation: '',
      startDate: '',
      employmentStatus: 'active',
      resignDate: '',
      incomeType: 'trip',
      incomeAmount: 0,
      commission: 0,
      phoneAllowance: 0,
      bankAccount: '234-5-67890-1',
      photo: null,
      avatarBg: '#10b981',
    },
    {
      code: '0003',
      prefix: 'นาย',
      firstName: 'วิรัตน์',
      lastName: 'ใจกล้า',
      idCard: '1-2345-67892-34-5',
      licenseNo: '',
      licenseType: 'ท.2',
      licenseExpiry: '',
      address: '78',
      subDistrict: 'หน้าเมือง',
      district: 'เมือง',
      province: 'ราชบุรี',
      zipCode: '',
      phone: '086-777-9090',
      lineId: 'wirat_jk',
      emergencyContact: '',
      emergencyRelation: '',
      startDate: '',
      employmentStatus: 'active',
      resignDate: '',
      incomeType: 'trip',
      incomeAmount: 0,
      commission: 0,
      phoneAllowance: 0,
      bankAccount: '345-6-78901-2',
      photo: null,
      avatarBg: '#2563eb',
    },
    {
      code: '0004',
      prefix: 'นาย',
      firstName: 'สมหมาย',
      lastName: 'เพียรงาน',
      idCard: '1-2345-67893-45-6',
      licenseNo: '',
      licenseType: 'ท.2',
      licenseExpiry: '',
      address: '90',
      subDistrict: 'หัวรอ',
      province: 'พระนครศรีอยุธยา',
      district: 'พระนครศรีอยุธยา',
      zipCode: '',
      phone: '087-345-6767',
      lineId: 'sommai_pn',
      emergencyContact: '',
      emergencyRelation: '',
      startDate: '',
      employmentStatus: 'active',
      resignDate: '',
      incomeType: 'trip',
      incomeAmount: 0,
      commission: 0,
      phoneAllowance: 0,
      bankAccount: '456-7-89012-3',
      photo: null,
      avatarBg: '#ec4899',
    },
  ]
}

/** ข้อมูล local เดิม (ก่อนย้ายไป Firestore) — ใช้เป็น "แหล่งข้อมูลตั้งต้น" ตอน import ครั้งแรกเข้า Firestore เท่านั้น
 *  ไม่ใช่แหล่งข้อมูลหลักอีกต่อไปหลังย้าย (ดู importFromLocalStorage ด้านล่าง) */
function loadLocalDrivers(): DriverRecord[] {
  try {
    const raw = localStorage.getItem(DRIVERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return seedDrivers()
}

export const useDriversStore = defineStore('drivers', () => {
  const drivers = ref<DriverRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Import ครั้งเดียว: ถ้า Firestore ยังไม่มีข้อมูลเลย ให้ดึงจาก localStorage (หรือ seed ถ้า localStorage ก็ว่าง
   *  เหมือนกัน) เข้า Firestore ก่อน — เพื่อให้พฤติกรรมตอนเปิดแอปครั้งแรกเหมือนของเดิม หลังจากนี้ Firestore คือแหล่ง
   *  ข้อมูลจริงเพียงที่เดียว ไม่อ่าน/เขียน localStorage อีก (เหมือน stores/customers.ts) */
  async function importFromLocalStorage() {
    const localData = loadLocalDrivers()
    for (const { id, ...data } of localData) {
      await driverRepository.create(data)
    }
  }

  async function fetchDrivers() {
    loading.value = true
    error.value = null
    try {
      let result = await driverRepository.getAll()
      if (result.length === 0) {
        await importFromLocalStorage()
        result = await driverRepository.getAll()
      }
      drivers.value = result
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลคนขับจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchDrivers()

  const fullName = (driver: DriverRecord) => `${driver.prefix}${driver.firstName} ${driver.lastName}`.trim()

  async function createDriver(data: Omit<DriverRecord, 'id'>) {
    const clean = sanitizeDriver(data)
    const id = await driverRepository.create(clean)
    drivers.value.unshift({ ...clean, id })
  }

  async function updateDriver(id: string, data: Omit<DriverRecord, 'id'>) {
    const clean = sanitizeDriver(data)
    await driverRepository.update(id, clean)
    const index = drivers.value.findIndex((d) => d.id === id)
    if (index !== -1) drivers.value[index] = { ...clean, id }
  }

  return { drivers, loading, error, fullName, createDriver, updateDriver, sanitizeDriver }
})
