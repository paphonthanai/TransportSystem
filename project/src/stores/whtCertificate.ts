import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useBookingStore } from '@/stores/booking'
import type { WHTCertificate } from '@/types'

const CERTIFICATES_KEY = 'tms_wht_certificates_v1'

function reviveCertificate(raw: any): WHTCertificate {
  return { ...raw, payDate: new Date(raw.payDate), createdAt: new Date(raw.createdAt) }
}

function loadCertificates(): WHTCertificate[] {
  try {
    const raw = localStorage.getItem(CERTIFICATES_KEY)
    if (raw) return JSON.parse(raw).map(reviveCertificate)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

export const useWHTCertificateStore = defineStore('whtCertificate', () => {
  const bookingStore = useBookingStore()

  const certificates = ref<WHTCertificate[]>(loadCertificates())

  watch(certificates, (val) => localStorage.setItem(CERTIFICATES_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === CERTIFICATES_KEY && e.newValue) {
      certificates.value = JSON.parse(e.newValue).map(reviveCertificate)
    }
  })

  function nextNumber() {
    return `WHT${new Date().getFullYear() + 543}-${String(certificates.value.length + 1).padStart(4, '0')}`
  }

  function addCertificate(data: Omit<WHTCertificate, 'id' | 'number' | 'createdAt'>) {
    const cert: WHTCertificate = {
      ...data,
      id: `wht${Date.now()}`,
      number: nextNumber(),
      createdAt: new Date(),
    }
    certificates.value.unshift(cert)
    bookingStore.addLog(`ออกหนังสือรับรองหัก ณ ที่จ่าย ${cert.number} ให้ ${cert.payeeName} (${cert.grossAmount} บาท)`)
    return cert
  }

  return {
    certificates,
    addCertificate,
  }
})
