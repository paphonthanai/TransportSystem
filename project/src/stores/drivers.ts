import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const DRIVERS_KEY = 'tms_drivers_v1'

export type EmploymentStatus = 'active' | 'resigned'
export type IncomeType = 'daily' | 'monthly' | 'trip'
export type LicenseType = 'ท.1' | 'ท.2'

export interface DriverRecord {
  code: string
  prefix: string
  firstName: string
  lastName: string
  idCard: string
  licenseNo: string
  licenseType: LicenseType
  licenseExpiry: string
  /** ทะเบียนรถประจำ ใช้ผูกคนขับกับรถ เพื่อดึงอัตโนมัติตอนจัดรถ/คำนวณรายได้ */
  vehicle: string
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
      vehicle: '70-8821 สระบุรี',
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
      vehicle: '82-4417 กรุงเทพ',
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
      vehicle: '71-3390 ราชบุรี',
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
      vehicle: '72-6628 อยุธยา',
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

function loadDrivers(): DriverRecord[] {
  try {
    const raw = localStorage.getItem(DRIVERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return seedDrivers()
}

export const useDriversStore = defineStore('drivers', () => {
  const drivers = ref<DriverRecord[]>(loadDrivers())

  watch(drivers, (val) => localStorage.setItem(DRIVERS_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === DRIVERS_KEY && e.newValue) {
      drivers.value = JSON.parse(e.newValue)
    }
  })

  const fullName = (driver: DriverRecord) => `${driver.prefix}${driver.firstName} ${driver.lastName}`.trim()

  /** หาทะเบียนรถประจำของคนขับ จากชื่อเต็ม (เช่น 'สมชาย ทองดี' หรือ 'นายสมชาย ทองดี') */
  const findVehicleByDriverName = (name: string) => {
    const driver = drivers.value.find((d) => fullName(d) === name || `${d.firstName} ${d.lastName}` === name)
    return driver?.vehicle || ''
  }

  /** หาคนขับจากทะเบียนรถ (จับคู่แบบ exact หรือ substring กันกรณีพิมพ์จังหวัดต่อท้ายไม่ตรงเป๊ะ) */
  const findDriverByVehicle = (plate: string) => {
    const trimmed = plate.trim()
    if (!trimmed) return null
    const driver = drivers.value.find((d) => d.vehicle && (d.vehicle === trimmed || d.vehicle.includes(trimmed) || trimmed.includes(d.vehicle)))
    return driver || null
  }

  return {
    drivers,
    fullName,
    findVehicleByDriverName,
    findDriverByVehicle,
  }
})
