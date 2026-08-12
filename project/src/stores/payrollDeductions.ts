import { defineStore } from 'pinia'
import { ref } from 'vue'
import { payrollDeductionRepository } from '@/repositories/payrollDeductionRepository'
import type { PayrollDeduction } from '@/types'

export const usePayrollDeductionsStore = defineStore('payrollDeductions', () => {
  const deductions = ref<PayrollDeduction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDeductions() {
    loading.value = true
    error.value = null
    try {
      deductions.value = await payrollDeductionRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดรายการหักเงินเดือนจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchDeductions()

  async function addDeduction(data: Omit<PayrollDeduction, 'id' | 'createdAt'>) {
    const payload = { ...data, createdAt: new Date() }
    const tempId = `pd${Date.now()}`
    const deduction: PayrollDeduction = { ...payload, id: tempId }
    deductions.value.unshift(deduction)
    payrollDeductionRepository
      .create(payload)
      .then((id) => {
        deduction.id = id
      })
      .catch((err: any) => {
        error.value = err?.message || 'บันทึกรายการหักเงินเดือนไป Firestore ไม่สำเร็จ'
      })
    return deduction
  }

  async function updateDeduction(id: string, data: Partial<Pick<PayrollDeduction, 'type' | 'label' | 'amount' | 'date'>>) {
    await payrollDeductionRepository.update(id, data)
    const existing = deductions.value.find((d) => d.id === id)
    if (existing) Object.assign(existing, data)
  }

  async function deleteDeduction(id: string) {
    const idx = deductions.value.findIndex((d) => d.id === id)
    if (idx !== -1) deductions.value.splice(idx, 1)
    await payrollDeductionRepository.delete(id)
  }

  const deductionsFor = (driverName: string, periodLabel: string) =>
    deductions.value.filter((d) => d.driverName === driverName && d.periodLabel === periodLabel)

  return {
    deductions,
    loading,
    error,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    deductionsFor,
  }
})
