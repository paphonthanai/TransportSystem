import { defineStore } from 'pinia'
import { ref } from 'vue'
import { vehicleExpenseRepository } from '@/repositories/vehicleExpenseRepository'
import type { VehicleExpense } from '@/types'

/**
 * ค่าใช้จ่ายประจำรถ (ประกัน/GPS/ค่างวด/อื่นๆ) — ผูกกับ vehicleId เท่านั้น ตั้งใจแยก Store/Collection ออกจาก
 * payrollDeductions.ts (ผูกกับ driverName) เพราะเป็นคนละ Entity กัน: ค่าใช้จ่ายของ "รถ" ไม่ใช่ "คนขับ" —
 * ไม่ย้ายตามคนขับที่เปลี่ยนไปมา และห้ามถูกนำไปรวมกับ Driver Income ที่ไหนเลย
 */
export const useVehicleExpensesStore = defineStore('vehicleExpenses', () => {
  const expenses = ref<VehicleExpense[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      expenses.value = await vehicleExpenseRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดค่าใช้จ่ายประจำรถจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchAll()

  const expensesForVehicle = (vehicleId: string) => expenses.value.filter((e) => e.vehicleId === vehicleId)

  type ExpenseInput = { vehicleId: string; expenseType: VehicleExpense['expenseType']; description?: string; amount: number; date: Date }

  async function addExpense(data: ExpenseInput): Promise<VehicleExpense> {
    const now = new Date()
    const payload: Omit<VehicleExpense, 'id'> = { ...data, createdAt: now, updatedAt: now }
    const id = await vehicleExpenseRepository.create(payload)
    const record: VehicleExpense = { ...payload, id }
    expenses.value.unshift(record)
    return record
  }

  async function updateExpense(id: string, data: ExpenseInput): Promise<VehicleExpense | null> {
    const existing = expenses.value.find((e) => e.id === id)
    if (!existing) return null
    const updatedAt = new Date()
    const payload: Omit<VehicleExpense, 'id'> = { ...data, createdAt: existing.createdAt, updatedAt }
    await vehicleExpenseRepository.update(id, payload)
    const index = expenses.value.findIndex((e) => e.id === id)
    if (index !== -1) expenses.value[index] = { ...payload, id }
    return { ...payload, id }
  }

  async function deleteExpense(id: string) {
    await vehicleExpenseRepository.delete(id)
    expenses.value = expenses.value.filter((e) => e.id !== id)
  }

  return { expenses, loading, error, fetchAll, expensesForVehicle, addExpense, updateExpense, deleteExpense }
})
