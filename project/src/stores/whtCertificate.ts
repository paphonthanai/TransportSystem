import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { whtCertificateRepository } from '@/repositories/whtCertificateRepository'
import type { WHTCertificate } from '@/types'

export const useWHTCertificateStore = defineStore('whtCertificate', () => {
  const bookingStore = useBookingStore()
  const documentSettingsStore = useDocumentSettingsStore()

  const certificates = ref<WHTCertificate[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchCertificates() {
    loading.value = true
    error.value = null
    try {
      certificates.value = await whtCertificateRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดหนังสือรับรองหัก ณ ที่จ่ายจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
    whtCertificateRepository.subscribe(
      (remote) => {
        certificates.value = remote
      },
      (err) => {
        error.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ'
      }
    )
  }

  fetchCertificates()

  function nextNumber() {
    const numbering = documentSettingsStore.settings.numbering.wht
    return `${numbering.prefix}${new Date().getFullYear() + 543}-${documentSettingsStore.padNumber(certificates.value.length + 1, numbering.padding)}`
  }

  async function addCertificate(data: Omit<WHTCertificate, 'id' | 'number' | 'createdAt'>) {
    const payload = { ...data, number: nextNumber(), createdAt: new Date() }
    const tempId = `wht${Date.now()}`
    const cert: WHTCertificate = { ...payload, id: tempId }
    certificates.value.unshift(cert)
    whtCertificateRepository
      .create(payload)
      .then((id) => {
        cert.id = id
      })
      .catch((err: any) => {
        error.value = err?.message || 'บันทึกหนังสือรับรองหัก ณ ที่จ่ายไป Firestore ไม่สำเร็จ'
      })
    bookingStore.addLog(`ออกหนังสือรับรองหัก ณ ที่จ่าย ${cert.number} ให้ ${cert.payeeName} (${cert.grossAmount} บาท)`)
    return cert
  }

  return {
    certificates,
    loading,
    error,
    addCertificate,
  }
})
