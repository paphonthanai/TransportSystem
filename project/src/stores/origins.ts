import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { PickupOrigin } from '@/types'

const ORIGINS_KEY = 'tms_pickup_origins_v1'

function loadOrigins(): PickupOrigin[] {
  try {
    const raw = localStorage.getItem(ORIGINS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return [{ id: 'org1', name: 'โรงงานหลัก', province: '', district: '', address: '' }]
}

export const useOriginsStore = defineStore('origins', () => {
  const origins = ref<PickupOrigin[]>(loadOrigins())

  watch(origins, (val) => localStorage.setItem(ORIGINS_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === ORIGINS_KEY && e.newValue) {
      origins.value = JSON.parse(e.newValue)
    }
  })

  const originNames = computed(() => origins.value.map((o) => o.name))

  function addOrigin(data: Omit<PickupOrigin, 'id'>) {
    const origin: PickupOrigin = { ...data, id: `org${Date.now()}` }
    origins.value.unshift(origin)
    return origin
  }

  function updateOrigin(id: string, data: Partial<Omit<PickupOrigin, 'id'>>) {
    const origin = origins.value.find((o) => o.id === id)
    if (!origin) return
    Object.assign(origin, data)
  }

  function removeOrigin(id: string) {
    const idx = origins.value.findIndex((o) => o.id === id)
    if (idx !== -1) origins.value.splice(idx, 1)
  }

  return {
    origins,
    originNames,
    addOrigin,
    updateOrigin,
    removeOrigin,
  }
})
