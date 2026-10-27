import { defineStore } from 'pinia'
import { trackLoading } from '@/stores/loading'
import { ref } from 'vue'
import { staffSalaryRepository } from '@/repositories/staffSalaryRepository'
import { useAuthStore } from './auth'
import { useBookingStore } from './booking'

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

  trackLoading(fetchAll())

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

  /**
   * ใบที่จ่ายแล้ว (status PAID) ล็อกยอดเงิน (เงินเดือนฐาน/รายการเพิ่ม/หัก) และเลขที่/วันที่/สถานะเอกสาร — ต้องเปลี่ยนสถานะ
   * กลับเป็นรอจ่ายก่อนจึงจะแก้ได้ ส่วนหมายเหตุและสถานะจ่ายแก้ได้เสมอ ว่าง = ไม่ล็อก
   */
  function paidLockReason(record: Pick<StaffSalaryRecord, 'status'>): string {
    return record.status === 'PAID' ? 'จ่ายแล้ว — เปลี่ยนสถานะเป็นรอจ่ายก่อนจึงจะแก้ได้' : ''
  }

  const sameItems = (a: SalaryLineItem[], b: SalaryLineItem[]) =>
    a.length === b.length && a.every((x, i) => x.label === b[i].label && x.amount === b[i].amount)
  const dateKey = (d?: Date) => (d ? new Date(d).toISOString().slice(0, 10) : '')

  /** field ที่ล็อกตอนจ่ายแล้ว เปลี่ยนไปจากเดิมไหม (ใช้กันฟอร์มแก้ไขเต็มแบบเดิมเขียนทับยอดของใบที่จ่ายแล้ว) */
  function lockedFieldsChanged(existing: StaffSalaryRecord, data: SalaryInput) {
    return (
      existing.baseSalary !== data.baseSalary ||
      !sameItems(existing.additions, data.additions) ||
      !sameItems(existing.deductions, data.deductions) ||
      (existing.documentNumber || '') !== (data.documentNumber || '') ||
      dateKey(existing.documentDate) !== dateKey(data.documentDate) ||
      (existing.documentStatus || 'DRAFT') !== (data.documentStatus || 'DRAFT')
    )
  }

  async function updateSalary(id: string, data: SalaryInput): Promise<StaffSalaryRecord | null> {
    const existing = records.value.find((r) => r.id === id)
    if (!existing) return null
    if (recordExistsFor(data.staffId, data.period, id)) return null
    if (paidLockReason(existing) && lockedFieldsChanged(existing, data)) return null
    const netAmount = computeNet(data.baseSalary, data.additions, data.deductions)
    const updatedAt = new Date()
    const payload: Omit<StaffSalaryRecord, 'id'> = { ...data, netAmount, createdAt: existing.createdAt, updatedAt }
    await staffSalaryRepository.update(id, payload)
    const index = records.value.findIndex((r) => r.id === id)
    if (index !== -1) records.value[index] = { ...payload, id }
    return { ...payload, id }
  }

  type InlinePatch = Partial<Pick<StaffSalaryRecord, 'status' | 'note' | 'documentNumber' | 'documentDate' | 'documentStatus'>>

  /**
   * แก้ทีละ field จากหน้ารายละเอียด (inline "แก้") — เฉพาะ ADMIN, เลขที่/วันที่/สถานะเอกสารล็อกเมื่อจ่ายแล้ว (paidLockReason)
   * เลขที่เอกสารห้ามซ้ำ วันที่ห้ามล่วงหน้า ค่าว่าง = ล้างค่า เขียน log ทุกครั้งที่บันทึกสำเร็จ
   */
  async function updateSalaryFields(id: string, patch: InlinePatch): Promise<{ ok: boolean; message?: string }> {
    if (useAuthStore().role !== 'ADMIN') return { ok: false, message: 'แก้ข้อมูลเงินเดือนได้เฉพาะผู้ดูแลระบบ' }
    const existing = records.value.find((r) => r.id === id)
    if (!existing) return { ok: false, message: 'ไม่พบข้อมูลเงินเดือน' }
    const touchesLocked = 'documentNumber' in patch || 'documentDate' in patch || 'documentStatus' in patch
    const locked = paidLockReason(existing)
    if (touchesLocked && locked) return { ok: false, message: locked }
    const clean: InlinePatch = { ...patch }
    if ('note' in patch) clean.note = patch.note?.trim() || undefined
    if ('documentNumber' in patch) {
      clean.documentNumber = patch.documentNumber?.trim() || undefined
      if (clean.documentNumber && documentNumberExistsFor(clean.documentNumber, id)) return { ok: false, message: `เลขที่เอกสาร ${clean.documentNumber} ซ้ำกับใบอื่น` }
    }
    if (patch.documentDate) {
      if (Number.isNaN(patch.documentDate.getTime())) return { ok: false, message: 'วันที่ไม่ถูกต้อง' }
      if (patch.documentDate.getTime() > Date.now()) return { ok: false, message: 'ห้ามเลือกวันที่ล่วงหน้า' }
    }
    const updatedAt = new Date()
    try {
      await staffSalaryRepository.patch(id, { ...clean, updatedAt })
    } catch (err: any) {
      return { ok: false, message: `บันทึกไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'})` }
    }
    Object.assign(existing, clean, { updatedAt })
    const labels: Record<keyof InlinePatch, string> = {
      status: 'สถานะจ่าย',
      note: 'หมายเหตุ',
      documentNumber: 'เลขที่เอกสาร',
      documentDate: 'วันที่ออกเอกสาร',
      documentStatus: 'สถานะเอกสาร',
    }
    const fields = (Object.keys(clean) as (keyof InlinePatch)[]).map((k) => labels[k]).join(', ')
    useBookingStore().addLog(`แก้ไขเงินเดือน ${existing.period} (${fields})`, { docId: id })
    return { ok: true }
  }

  async function deleteSalary(id: string) {
    await staffSalaryRepository.delete(id)
    records.value = records.value.filter((r) => r.id !== id)
  }

  return {
    records,
    loading,
    error,
    fetchAll,
    computeNet,
    createSalary,
    updateSalary,
    updateSalaryFields,
    paidLockReason,
    deleteSalary,
    recordExistsFor,
    documentNumberExistsFor,
  }
})
