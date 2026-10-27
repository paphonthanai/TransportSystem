import { defineStore } from 'pinia'
import { trackLoading } from '@/stores/loading'
import { ref } from 'vue'
import { driverPaymentRepository } from '@/repositories/driverPaymentRepository'
import type { DriverPaymentRecord, DriverPaymentStatusValue } from '@/types'
import { normalizeDriverName } from '@/utils/driverIdentity'
import { useAuthStore } from './auth'
import { useBookingStore } from './booking'

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

  trackLoading(fetchAll())

  const recordsForPeriod = (periodLabel: string) => payments.value.filter((p) => p.periodLabel === periodLabel)

  /**
   * ระเบียนของคนขับ+รอบนี้ — ยึด driverId เป็นหลัก ระเบียน/การเรียกที่ไม่มี driverId (ข้อมูลเก่า) จับคู่ด้วยชื่อแบบไม่สนคำนำหน้า
   * (normalizeDriverName) เพราะหน้ารายละเอียดคนขับใช้ชื่อตามทะเบียน (มีคำนำหน้า) แต่หน้าเงินเดือนคนขับใช้ชื่อ Snapshot ในงาน
   * (ไม่มีคำนำหน้า) — ระเบียนที่ชื่อตรงแต่ driverId เป็นคนอื่นไม่นับ (ข้อมูลขัดกัน ดู monthlyPaidCheck ใน utils/driverPaid.ts)
   * เรียงล่าสุดก่อน
   */
  const recordsFor = (driverName: string, periodLabel: string, driverId?: string) =>
    recordsForPeriod(periodLabel)
      .filter((p) =>
        driverId && p.driverId
          ? p.driverId === driverId
          : normalizeDriverName(p.driverName) === normalizeDriverName(driverName)
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  /** ไม่มีระเบียน = ถือว่ายังไม่จ่าย (ค่าเริ่มต้น) ไม่ต้องสร้างระเบียนล่วงหน้าให้ทุกคนขับ/ทุกรอบ */
  const statusFor = (driverName: string, periodLabel: string, driverId?: string): DriverPaymentStatusValue =>
    recordsFor(driverName, periodLabel, driverId)[0]?.status ?? 'UNPAID'

  /** ตั้งสถานะจ่ายรายเดือนได้เฉพาะ ADMIN — ตรงกับ Firestore Rules ของ driverPayments (ACCOUNTING/DISPATCHER อ่านอย่างเดียว) */
  const canEdit = () => useAuthStore().role === 'ADMIN'

  /**
   * Upsert: มีระเบียนของคนขับ+รอบนี้อยู่แล้วก็แก้สถานะ (ทุกระเบียนที่จับคู่ได้ให้สถานะตรงกันหมด คงชื่อเดิมที่บันทึกไว้ และเติม
   * driverId ให้ระเบียนเก่าที่ยังไม่มี) ไม่มีก็สร้างใหม่ — เขียน log ทุกครั้ง
   */
  async function setStatus(driverName: string, periodLabel: string, status: DriverPaymentStatusValue, driverId?: string): Promise<{ ok: boolean; message?: string }> {
    if (!canEdit()) return { ok: false, message: 'ตั้งสถานะจ่ายรายเดือนได้เฉพาะผู้ดูแลระบบ' }
    const existing = recordsFor(driverName, periodLabel, driverId)
    const updatedAt = new Date()
    try {
      if (existing.length) {
        for (const record of existing) {
          const payload = { driverName: record.driverName, driverId: record.driverId || driverId, periodLabel, status, updatedAt }
          await driverPaymentRepository.update(record.id, payload)
          const index = payments.value.findIndex((p) => p.id === record.id)
          if (index !== -1) payments.value[index] = { ...payload, id: record.id }
        }
      } else {
        const payload = { driverName, driverId, periodLabel, status, updatedAt }
        const id = await driverPaymentRepository.create(payload)
        payments.value.unshift({ ...payload, id })
      }
    } catch (err: any) {
      return { ok: false, message: `บันทึกสถานะจ่ายไม่สำเร็จ (${err?.message || 'Firestore ปฏิเสธ'})` }
    }
    useBookingStore().addLog(`ตั้งสถานะจ่ายรายเดือน ${driverName} รอบ ${periodLabel}: ${status === 'PAID' ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}`)
    return { ok: true }
  }

  return { payments, loading, error, fetchAll, recordsForPeriod, statusFor, setStatus, canEdit }
})
