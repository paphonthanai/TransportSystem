import { defineStore } from 'pinia'
import { ref } from 'vue'
import { driverPaymentRepository } from '@/repositories/driverPaymentRepository'
import type { DriverPaymentRecord, DriverPaymentStatusValue } from '@/types'

/**
 * สถานะการจ่ายรายได้คนขับต่อรอบ — Store แยกต่างหาก ไม่ปนกับ payrollDeductions.ts (คนละความหมาย: นี่คือ "จ่ายรึยัง"
 * ไม่ใช่ "หักเท่าไหร่") และไม่แตะ booking.ts เลย เพื่อรักษา Payment Status ≠ Operational Status ตามสเปก
 */
export const useDriverPaymentsStore = defineStore('driverPayments', () => {
  const payments = ref<DriverPaymentRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      payments.value = await driverPaymentRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดสถานะการจ่ายเงินคนขับจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchAll()

  /** ไม่มีระเบียน = ถือว่ายังไม่จ่าย (ค่าเริ่มต้น) ไม่ต้องสร้างระเบียนล่วงหน้าให้ทุกคนขับ/ทุกรอบ */
  const statusFor = (driverName: string, periodLabel: string): DriverPaymentStatusValue =>
    payments.value.find((p) => p.driverName === driverName && p.periodLabel === periodLabel)?.status ?? 'UNPAID'

  /** Upsert: มีระเบียนของคนขับ+รอบนี้อยู่แล้วก็แก้สถานะ ไม่มีก็สร้างใหม่ — 1 คนขับ 1 รอบ มีได้ระเบียนเดียวเสมอ */
  async function setStatus(driverName: string, periodLabel: string, status: DriverPaymentStatusValue) {
    const existing = payments.value.find((p) => p.driverName === driverName && p.periodLabel === periodLabel)
    const updatedAt = new Date()
    if (existing) {
      const payload = { driverName, periodLabel, status, updatedAt }
      await driverPaymentRepository.update(existing.id, payload)
      const index = payments.value.findIndex((p) => p.id === existing.id)
      if (index !== -1) payments.value[index] = { ...payload, id: existing.id }
    } else {
      const payload = { driverName, periodLabel, status, updatedAt }
      const id = await driverPaymentRepository.create(payload)
      payments.value.unshift({ ...payload, id })
    }
  }

  return { payments, loading, error, fetchAll, statusFor, setStatus }
})
