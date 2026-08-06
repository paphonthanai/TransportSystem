import { defineStore } from 'pinia'
import { ref } from 'vue'
import { vendorRepository, sanitizeVendor } from '@/repositories/vendorRepository'

export interface VendorRecord {
  id?: string
  name: string
  category: string
  contact: string
  phone: string
}

export const useVendorStore = defineStore('vendors', () => {
  const vendors = ref<VendorRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchVendors() {
    loading.value = true
    error.value = null
    try {
      vendors.value = await vendorRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลผู้จำหน่ายจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchVendors()

  async function createVendor(data: Omit<VendorRecord, 'id'>) {
    const clean = sanitizeVendor(data)
    const id = await vendorRepository.create(clean)
    vendors.value.unshift({ ...clean, id })
  }

  return { vendors, loading, error, createVendor }
})
