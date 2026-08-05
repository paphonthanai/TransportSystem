import { defineStore } from 'pinia'
import { ref } from 'vue'
import { customerRepository, sanitizeCustomer } from '@/repositories/customerRepository'

export type ContactEntityType = 'corporate' | 'individual'
export type ContactOffice = 'hq' | 'branch'
export type BankAccountType = 'savings' | 'current'

export interface CustomerRecord {
  /** id เอกสารใน Firestore — เพิ่มเข้ามาเป็น Phase 1 ของการย้ายจาก localStorage ไป Firestore (ดู repositories/customerRepository.ts)
   *  ไม่มีค่าตอนที่ยังไม่ได้บันทึกจริง (เช่น record ว่างจาก emptyCustomer) */
  id?: string
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

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<CustomerRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** ไม่ auto-reseed ข้อมูลตัวอย่าง (mock) เข้า Firestore อีกต่อไป — ถ้า collection ว่าง แปลว่าว่างจริง (ล้าง mock
   *  data ทิ้งโดยตั้งใจ) ไม่ใช่ "ยังไม่เคย migrate" ต้องให้ผู้ใช้กรอกลูกค้าจริงเองผ่านหน้า สมุดรายชื่อ > ลูกค้า/คู่ค้า */
  async function fetchCustomers() {
    loading.value = true
    error.value = null
    try {
      customers.value = await customerRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลลูกค้าจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchCustomers()

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

  async function createCustomer(data: Omit<CustomerRecord, 'id'>) {
    const clean = sanitizeCustomer(data)
    const id = await customerRepository.create(clean)
    customers.value.unshift({ ...clean, id })
  }

  async function updateCustomer(id: string, data: Omit<CustomerRecord, 'id'>) {
    const clean = sanitizeCustomer(data)
    await customerRepository.update(id, clean)
    const index = customers.value.findIndex((c) => c.id === id)
    if (index !== -1) customers.value[index] = { ...clean, id }
  }

  async function deleteCustomer(id: string) {
    await customerRepository.delete(id)
    customers.value = customers.value.filter((c) => c.id !== id)
  }

  return { customers, loading, error, lookupCustomer, suggestPoNumber, createCustomer, updateCustomer, deleteCustomer, sanitizeCustomer }
})
