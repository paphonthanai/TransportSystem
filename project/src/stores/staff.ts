import { defineStore } from 'pinia'
import { ref } from 'vue'
import { staffRepository, sanitizeStaff } from '@/repositories/staffRepository'

export interface StaffRecord {
  id?: string
  name: string
  position: string
  phone: string
}

export const useStaffStore = defineStore('staff', () => {
  const staffList = ref<StaffRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStaff() {
    loading.value = true
    error.value = null
    try {
      staffList.value = await staffRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลเสมียนจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchStaff()

  async function createStaff(data: Omit<StaffRecord, 'id'>) {
    const clean = sanitizeStaff(data)
    const id = await staffRepository.create(clean)
    staffList.value.unshift({ ...clean, id })
  }

  async function updateStaff(id: string, data: Omit<StaffRecord, 'id'>) {
    const clean = sanitizeStaff(data)
    await staffRepository.update(id, clean)
    const index = staffList.value.findIndex((s) => s.id === id)
    if (index !== -1) staffList.value[index] = { ...clean, id }
  }

  return { staffList, loading, error, createStaff, updateStaff }
})
