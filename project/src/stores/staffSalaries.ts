import { defineStore } from 'pinia'
import { ref } from 'vue'
import { staffSalaryRepository } from '@/repositories/staffSalaryRepository'

/** รายการเพิ่ม/หักย่อยในรอบเงินเดือนหนึ่งใบ — ใช้โครงสร้างเดียวกับ PayrollDeduction (label+amount) เพื่อให้แสดงรายละเอียดได้ */
export interface SalaryLineItem {
  id: string
  label: string
  amount: number
}

/** สถานะการจ่ายเงินเดือน (Payment Status) — คนละเรื่องกับ documentStatus (สถานะเอกสาร) โดยเจตนา ดูหัวข้อ Document Status ≠ Payment Status ในสเปก */
export type StaffSalaryStatus = 'DRAFT' | 'PAID'

/** สถานะเอกสารใบจ่ายเงินเดือน (Document Status) — แยกจาก status (payment) ข้างต้นโดยเจตนา เปลี่ยนค่านี้ไม่กระทบ status เลย */
export type StaffSalaryDocumentStatus = 'DRAFT' | 'ISSUED'

/**
 * บันทึกเงินเดือนพนักงาน 1 รอบ — staffId อ้างอิงกลับไปที่ StaffRecord (stores/staff.ts, collection "staff") ไม่ใช่
 * บัญชีผู้ใช้งาน (UserProfile/Firebase Auth) เพราะพนักงานออฟฟิศไม่จำเป็นต้องมีบัญชี login เข้าระบบเสมอไป — Staff
 * เป็น Entity ทะเบียนประวัติพนักงานแยกต่างหาก ไม่ปนกับ Driver Income (PayrollDeduction ของคนขับ) และไม่ใช่
 * Payroll Engine คำนวณภาษี/ประกันสังคมอัตโนมัติ — netAmount คำนวณตรงไปตรงมา (baseSalary + additions - deductions)
 * แล้วเก็บค่าไว้ ณ ตอนบันทึก (ไม่คำนวณสดใหม่ทุกครั้งที่อ่าน) เหมือนรูปแบบ SalesDocument.amount ที่ใช้ทั่วทั้งระบบ
 *
 * documentNumber/documentDate/documentStatus เป็น field เสริมสำหรับให้ใบนี้ทำหน้าที่เป็น "เอกสารการจ่ายเงินเดือน"
 * ได้ (ผู้ใช้กำหนดเลขที่เอกสารเอง ไม่ใช่เลขรันอัตโนมัติแบบ SalesDocument) — เพิ่มเข้ามาแบบ optional ทั้งหมด ไม่กระทบ
 * ข้อมูลเดิมที่ยังไม่มีค่าพวกนี้
 */
export interface StaffSalaryRecord {
  id: string
  staffId: string
  /** รอบเงินเดือน รูปแบบ "YYYY-MM" (พ.ศ.) เช่น "2569-08" — ใช้ธรรมเนียมเดียวกับ PayrollDeduction.periodLabel */
  period: string
  baseSalary: number
  additions: SalaryLineItem[]
  deductions: SalaryLineItem[]
  netAmount: number
  status: StaffSalaryStatus
  note?: string
  /** เลขที่เอกสาร กำหนดเองโดยผู้ใช้ (ไม่บังคับ) — ต้องไม่ซ้ำกับใบอื่น ดู documentNumberExistsFor() */
  documentNumber?: string
  documentDate?: Date
  documentStatus?: StaffSalaryDocumentStatus
  createdAt: Date
  updatedAt: Date
}

export const useStaffSalaryStore = defineStore('staffSalaries', () => {
  const records = ref<StaffSalaryRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      records.value = await staffSalaryRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลเงินเดือนจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchAll()

  const computeNet = (baseSalary: number, additions: SalaryLineItem[], deductions: SalaryLineItem[]) =>
    baseSalary + additions.reduce((sum, a) => sum + a.amount, 0) - deductions.reduce((sum, d) => sum + d.amount, 0)

  type SalaryInput = {
    staffId: string
    period: string
    baseSalary: number
    additions: SalaryLineItem[]
    deductions: SalaryLineItem[]
    status: StaffSalaryStatus
    note?: string
    documentNumber?: string
    documentDate?: Date
    documentStatus?: StaffSalaryDocumentStatus
  }

  /** กันสร้างซ้ำ — พนักงานคนเดียวกัน รอบเดียวกัน มีได้แค่ 1 ใบ (แก้ไขใบเดิมแทนถ้าต้องการเปลี่ยน) คืน null ถ้าซ้ำ */
  function recordExistsFor(staffId: string, period: string, excludeId?: string) {
    return records.value.some((r) => r.staffId === staffId && r.period === period && r.id !== excludeId)
  }

  /** ตรวจเลขที่เอกสารซ้ำ — ผู้ใช้กำหนดเอง จึงต้องเช็คเองตอนบันทึก (ต่างจากเลขที่ SalesDocument ที่รันอัตโนมัติไม่มีทางซ้ำ) */
  function documentNumberExistsFor(documentNumber: string, excludeId?: string) {
    if (!documentNumber.trim()) return false
    return records.value.some((r) => r.documentNumber === documentNumber.trim() && r.id !== excludeId)
  }

  async function createSalary(data: SalaryInput): Promise<StaffSalaryRecord | null> {
    if (recordExistsFor(data.staffId, data.period)) return null
    const now = new Date()
    const netAmount = computeNet(data.baseSalary, data.additions, data.deductions)
    const payload: Omit<StaffSalaryRecord, 'id'> = { ...data, netAmount, createdAt: now, updatedAt: now }
    const id = await staffSalaryRepository.create(payload)
    const record = { ...payload, id }
    records.value.unshift(record)
    return record
  }

  async function updateSalary(id: string, data: SalaryInput): Promise<StaffSalaryRecord | null> {
    const existing = records.value.find((r) => r.id === id)
    if (!existing) return null
    if (recordExistsFor(data.staffId, data.period, id)) return null
    const netAmount = computeNet(data.baseSalary, data.additions, data.deductions)
    const updatedAt = new Date()
    const payload: Omit<StaffSalaryRecord, 'id'> = { ...data, netAmount, createdAt: existing.createdAt, updatedAt }
    await staffSalaryRepository.update(id, payload)
    const index = records.value.findIndex((r) => r.id === id)
    if (index !== -1) records.value[index] = { ...payload, id }
    return { ...payload, id }
  }

  async function deleteSalary(id: string) {
    await staffSalaryRepository.delete(id)
    records.value = records.value.filter((r) => r.id !== id)
  }

  return { records, loading, error, fetchAll, computeNet, createSalary, updateSalary, deleteSalary, recordExistsFor, documentNumberExistsFor }
})
