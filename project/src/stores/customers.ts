import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const CUSTOMERS_KEY = 'tms_customers_v1'

export type ContactEntityType = 'corporate' | 'individual'
export type ContactOffice = 'hq' | 'branch'
export type BankAccountType = 'savings' | 'current'

export interface CustomerRecord {
  /** รหัสผู้ติดต่อ ใช้แสดงในสมุดรายชื่อ และใช้เป็นส่วนหนึ่งของเลข PO ที่ระบบแนะนำอัตโนมัติตอนสร้างงาน */
  code: string
  entityType: ContactEntityType
  isCustomer: boolean
  isVendor: boolean
  /** เครดิต (วัน) สำหรับติดตามการวางบิล/ครบกำหนดชำระ */
  creditDays: number
  name: string
  taxId: string
  office: ContactOffice
  branchName: string
  address: string
  zipCode: string
  contact: string
  email: string
  phone: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  note: string
}

function seedCustomers(): CustomerRecord[] {
  return [
    {
      code: 'SCC',
      entityType: 'corporate',
      isCustomer: true,
      isVendor: false,
      creditDays: 30,
      name: 'บจก. ศรีไทยคอนกรีต',
      taxId: '0105536001221',
      office: 'hq',
      branchName: '',
      address: '145 ถ.สุขุมวิท ต.บางปูใหม่ อ.เมือง จ.สมุทรปราการ 10280',
      zipCode: '10280',
      contact: 'คุณวิชัย',
      email: '',
      phone: '02-555-0100',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      note: '',
    },
    {
      code: 'PSA',
      entityType: 'corporate',
      isCustomer: true,
      isVendor: false,
      creditDays: 30,
      name: 'บมจ. พฤกษา',
      taxId: '0107536000451',
      office: 'hq',
      branchName: '',
      address: '1177 อาคารเพิร์ล แบงก์ค็อก ถ.พหลโยธิน แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400',
      zipCode: '10400',
      contact: 'คุณนภา',
      email: '',
      phone: '02-555-0200',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      note: '',
    },
    {
      code: 'RRW',
      entityType: 'corporate',
      isCustomer: true,
      isVendor: false,
      creditDays: 15,
      name: 'หจก. รุ่งเรืองวัสดุ',
      taxId: '0303536002233',
      office: 'hq',
      branchName: '',
      address: '88/2 ถ.มิตรภาพ ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา 30130',
      zipCode: '30130',
      contact: 'คุณสมพร',
      email: '',
      phone: '035-221-330',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      note: '',
    },
    {
      code: 'LDD',
      entityType: 'corporate',
      isCustomer: true,
      isVendor: false,
      creditDays: 30,
      name: 'บจก. แลนด์ดีเวลลอป',
      taxId: '0105536003344',
      office: 'hq',
      branchName: '',
      address: '55 ถ.รัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
      zipCode: '10310',
      contact: 'คุณกานต์',
      email: '',
      phone: '02-555-0400',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      note: '',
    },
    {
      code: 'MGH',
      entityType: 'corporate',
      isCustomer: true,
      isVendor: false,
      creditDays: 30,
      name: 'บจก. เมกาโฮม',
      taxId: '0105536004455',
      office: 'hq',
      branchName: '',
      address: '333 ถ.บางนา-ตราด ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540',
      zipCode: '10540',
      contact: 'คุณปิติ',
      email: '',
      phone: '02-555-0500',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      note: '',
    },
    {
      code: 'TWS',
      entityType: 'corporate',
      isCustomer: true,
      isVendor: false,
      creditDays: 15,
      name: 'หจก. ทวีทรัพย์',
      taxId: '0303536005566',
      office: 'hq',
      branchName: '',
      address: '21 ถ.เพชรมาตุคลา ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000',
      zipCode: '30000',
      contact: 'คุณมานะ',
      email: '',
      phone: '035-441-220',
      bankName: '',
      bankAccountName: '',
      bankAccountNumber: '',
      note: '',
    },
  ]
}

function loadCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return seedCustomers()
}

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<CustomerRecord[]>(loadCustomers())

  watch(customers, (val) => localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === CUSTOMERS_KEY && e.newValue) {
      customers.value = JSON.parse(e.newValue)
    }
  })

  const emptyCustomer = (name: string): CustomerRecord => ({
    code: '',
    entityType: 'corporate',
    isCustomer: true,
    isVendor: false,
    creditDays: 0,
    name,
    taxId: '-',
    office: 'hq',
    branchName: '',
    address: '-',
    zipCode: '',
    contact: '',
    email: '',
    phone: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    note: '',
  })

  /** หาข้อมูลลูกค้าจากชื่อ ใช้แสดงที่อยู่/เลขผู้เสียภาษีบนเอกสาร ถ้าไม่พบในสมุดรายชื่อจะคืนค่าว่างแทน */
  const lookupCustomer = (name: string): CustomerRecord =>
    customers.value.find((c) => c.name === name) || emptyCustomer(name)

  /**
   * แนะนำเลขที่ PO จากรหัสลูกค้าในสมุดรายชื่อ: PO-{รหัสลูกค้า}-{วันที่ พ.ศ.}-{ลำดับงานของลูกค้านั้นในวันนี้}
   * คืนค่าว่างถ้าไม่พบลูกค้า หรือลูกค้ายังไม่ได้ตั้งรหัสผู้ติดต่อไว้
   */
  const suggestPoNumber = (customerName: string, todaysJobCountForCustomer: number): string => {
    const customer = customers.value.find((c) => c.name === customerName)
    if (!customer || !customer.code) return ''
    const now = new Date()
    const buddhistYear = now.getFullYear() + 543
    const dateStr = `${buddhistYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const seq = String(todaysJobCountForCustomer + 1).padStart(2, '0')
    return `PO-${customer.code}-${dateStr}-${seq}`
  }

  return { customers, lookupCustomer, suggestPoNumber }
})
