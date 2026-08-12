import { defineStore } from 'pinia'
import { ref } from 'vue'
import { contactRepository, sanitizeContact } from '@/repositories/contactRepository'

/**
 * ผู้ติดต่อของลูกค้า (Customer Contact) — Entity แยกต่างหากจาก CustomerRecord.contact/email/phone เดิม (ซึ่งเป็น
 * ผู้ติดต่อเดียวแบบ flat ต่อ 1 ลูกค้า ไม่รองรับหลายคน/ไม่มี Primary) และแยกจากบัญชีผู้ใช้งานระบบ (UserProfile) โดย
 * สิ้นเชิง — "ผู้ติดต่อของลูกค้า" กับ "ผู้ใช้งานที่ login เข้าระบบตอนออกเอกสาร" เป็นคนละแนวคิดกัน ห้ามใช้แทนกัน
 * (ดูสถาปัตยกรรมที่ตกลงไว้: Current User = ผู้ใช้ระบบ, Contact = ผู้ติดต่อของลูกค้า)
 */
export interface ContactRecord {
  id?: string
  customerId: string
  name: string
  position: string
  phone: string
  email: string
  isPrimary: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export const useContactStore = defineStore('contacts', () => {
  const contacts = ref<ContactRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchContacts() {
    loading.value = true
    error.value = null
    try {
      contacts.value = await contactRepository.getAll()
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลผู้ติดต่อจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchContacts()

  const contactsForCustomer = (customerId: string) => contacts.value.filter((c) => c.customerId === customerId)
  const primaryContactFor = (customerId: string) =>
    contacts.value.find((c) => c.customerId === customerId && c.isPrimary && c.active) ||
    contacts.value.find((c) => c.customerId === customerId && c.active) ||
    null

  type ContactInput = { customerId: string; name: string; position?: string; phone?: string; email?: string; isPrimary?: boolean; active?: boolean }

  /** ถ้าตั้งเป็น Primary ต้องปลด Primary ของผู้ติดต่ออื่นในลูกค้าเดียวกันออกก่อนเสมอ — ลูกค้า 1 รายมี Primary ได้แค่ 1 คน */
  async function clearOtherPrimaries(customerId: string, exceptId?: string) {
    const others = contacts.value.filter((c) => c.customerId === customerId && c.isPrimary && c.id !== exceptId)
    for (const other of others) {
      const { id, ...data } = other
      await contactRepository.update(id!, { ...data, isPrimary: false })
      const idx = contacts.value.findIndex((c) => c.id === id)
      if (idx !== -1) contacts.value[idx] = { ...data, isPrimary: false, id }
    }
  }

  async function createContact(data: ContactInput) {
    if (data.isPrimary) await clearOtherPrimaries(data.customerId)
    const now = new Date().toISOString()
    const clean = sanitizeContact({ ...data, createdAt: now, updatedAt: now })
    const id = await contactRepository.create(clean)
    contacts.value.unshift({ ...clean, id })
  }

  async function updateContact(id: string, data: ContactInput) {
    if (data.isPrimary) await clearOtherPrimaries(data.customerId, id)
    const existing = contacts.value.find((c) => c.id === id)
    const clean = sanitizeContact({ ...data, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() })
    await contactRepository.update(id, clean)
    const index = contacts.value.findIndex((c) => c.id === id)
    if (index !== -1) contacts.value[index] = { ...clean, id }
  }

  async function deleteContact(id: string) {
    await contactRepository.delete(id)
    contacts.value = contacts.value.filter((c) => c.id !== id)
  }

  return {
    contacts,
    loading,
    error,
    fetchContacts,
    contactsForCustomer,
    primaryContactFor,
    createContact,
    updateContact,
    deleteContact,
    sanitizeContact,
  }
})
