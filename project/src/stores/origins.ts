import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { originRepository } from '@/repositories/originRepository'
import type { PickupOrigin } from '@/types'

export const useOriginsStore = defineStore('origins', () => {
  const origins = ref<PickupOrigin[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOrigins() {
    loading.value = true
    error.value = null
    try {
      origins.value = await originRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลต้นทาง/จุดรับสินค้าจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchOrigins()

  const originNames = computed(() => origins.value.map((o) => o.name))

  async function addOrigin(data: Omit<PickupOrigin, 'id'>) {
    const id = await originRepository.create(data)
    const origin: PickupOrigin = { ...data, id }
    origins.value.unshift(origin)
    return origin
  }

  async function updateOrigin(id: string, data: Partial<Omit<PickupOrigin, 'id'>>) {
    const origin = origins.value.find((o) => o.id === id)
    if (!origin) return
    Object.assign(origin, data)
    await originRepository.update(id, data)
  }

  async function removeOrigin(id: string) {
    const idx = origins.value.findIndex((o) => o.id === id)
    if (idx !== -1) origins.value.splice(idx, 1)
    await originRepository.delete(id)
  }

  return {
    origins,
    loading,
    error,
    originNames,
    addOrigin,
    updateOrigin,
    removeOrigin,
  }
})
