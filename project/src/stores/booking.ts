import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useOnboardingStore } from '@/stores/onboarding'
import { useInventoryStore } from '@/stores/inventory'
import { useBillingRuleStore } from '@/stores/billingRule'
import { useFuelRateStore } from '@/stores/fuelRates'
import { bookingRepository } from '@/repositories/bookingRepository'
import type { Booking, BookingCategory, BookingStatus, DebtAdjustment, BillingBatch, LogEntry, JobItem, PricingMode } from '@/types'

/** งาน MULTI_DESTINATION = แต่ละรายการมีค่าเที่ยวเป็นของตัวเอง, ไม่มีค่า pricingMode (ข้อมูลเก่า) ถือเป็น SINGLE_DESTINATION เสมอ */
export function isMultiPricing(booking: Booking) {
  return (booking.pricingMode ?? 'SINGLE_DESTINATION') === 'MULTI_DESTINATION'
}

export interface LegacySalesDocument {
  id: string
  number: string
  customer: string
  bookingIds: string[]
  amount: number
  date: Date
  status: 'draft' | 'sent' | 'paid'
  batchId?: string
  /** เครดิต (วัน) ตอนออกใบแจ้งหนี้/ใบกำกับภาษี */
  creditDays: number
  /** วันครบกำหนด = date + creditDays */
  dueDate: Date
  /** วันที่ลูกค้าชำระ (มีค่าเมื่อ status เป็น paid) */
  paidDate?: Date
  /** เลขที่ใบเสร็จรับเงิน ออกเมื่อบันทึกรับชำระ */
  receiptNumber?: string
  /** เลขที่อ้างอิง (เช่น เลขที่เอกสารงานที่รวมอยู่ในบิลนี้) */
  reference?: string
  /** หลักฐานการชำระเงินที่แนบตอนบันทึกรับชำระ (บังคับแนบ) — คนละอย่างกับ POD ส่งของ (ดู Booking.podImage) */
  paymentProofImage?: string
  /** อัตรา/จำนวนภาษีมูลค่าเพิ่ม คำนวณจากตั้งค่าเอกสาร ณ วันที่ออกใบแจ้งหนี้ */
  vatRate?: number
  vatAmount?: number
  /** อัตรา/จำนวนภาษีหัก ณ ที่จ่าย ที่ลูกค้าจะหักตอนจ่ายเงิน (ถ้าเปิดใช้งานในตั้งค่าเอกสาร) */
  whtRate?: number
  whtAmount?: number
}

const fixedCeramicsCustomer = 'บจก. ศรีไทยคอนกรีต'

/** ระยะเวลาที่ให้คนขับตอบรับงานหลังถูกจัดรถ ก่อนยกเลิกและกลับไปรอจัดคนขับใหม่อัตโนมัติ */
const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000

/**
 * ไม่มี backend จริง จึงใช้ localStorage เป็นตัวกลางเก็บข้อมูล
 * เพื่อให้หน้า Admin (สั่งงาน/จบงาน/วางบิล) กับหน้า Driver App ที่เปิดคนละแท็บ
 * เห็นข้อมูลชุดเดียวกันและอัปเดตหากันแบบเรียลไทม์ผ่าน storage event
 * (v2: เปลี่ยนโครงสร้างสถานะงาน/บิล จึงขึ้น key ใหม่เพื่อไม่ให้ข้อมูลรูปแบบเก่าปนกัน)
 * (v3: ย้ายหน้างาน/สินค้า/น้ำหนัก/ผู้ติดต่อจาก flat field เป็น items: JobItem[] เพื่อให้ 1 งานมีหลายปลายทาง/สินค้าได้)
 * (v4: แยกปลายทางออกเป็น destinations: Destination[] โดยแต่ละปลายทางมี items: JobItem[] ของตัวเอง — ปลายทางเดียวกันมีสินค้าหลายรายการได้โดยไม่ต้องกรอกที่อยู่ซ้ำ
 *      + ขยายสถานะงานเป็น 9 ขั้นตอน (เพิ่ม ASSIGNED/ACCEPTED/FUEL_RECEIVED/LOADING/LOADED/DELIVERING) + ตัดสต๊อกตอนรับสินค้า (LOADED) แทนตอนส่งของ)
 * (v5: ยกเลิก Destination wrapper กลับไปเป็น items: JobItem[] แบบเดิม (1 รายการ = 1 ปลายทาง+1 สินค้า) ตามที่ผู้ใช้ต้องการ
 *      + เพิ่มการรับสินค้าทีละรายการ (pickupJobItem) แทนการยืนยันรับครบทั้งงานทีเดียว — คนขับเลือกลำดับรับสินค้าเองได้ต่อรายการ (คนละต้นทางได้)
 *      ตัดสต๊อกทันทีตอนรับแต่ละรายการ ลำดับส่งของ (deliverySequence) คำนวณอัตโนมัติเป็นลำดับย้อนกลับของลำดับรับสินค้า)
 * (batches v3: เปลี่ยน BillingBatch.status จาก 'draft'/'invoiced'/'paid' เป็น 5 สถานะใหม่ + เพิ่ม number จึงขึ้น key ใหม่)
 */
const DOCUMENTS_KEY = 'tms_documents_v2'
const BATCHES_KEY = 'tms_batches_v3'
const LOGS_KEY = 'tms_logs_v1'

function reviveDocument(raw: any): LegacySalesDocument {
  return {
    ...raw,
    date: new Date(raw.date),
    dueDate: new Date(raw.dueDate),
    paidDate: raw.paidDate ? new Date(raw.paidDate) : undefined,
  }
}

function reviveBatch(raw: any): BillingBatch {
  return { ...raw, dateFrom: new Date(raw.dateFrom), dateTo: new Date(raw.dateTo), createdAt: new Date(raw.createdAt) }
}

function reviveLog(raw: any): LogEntry {
  return { ...raw, timestamp: new Date(raw.timestamp) }
}

function loadDocuments(): LegacySalesDocument[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY)
    if (raw) return JSON.parse(raw).map(reviveDocument)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

function loadBatches(): BillingBatch[] {
  try {
    const raw = localStorage.getItem(BATCHES_KEY)
    if (raw) return JSON.parse(raw).map(reviveBatch)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY)
    if (raw) return JSON.parse(raw).map(reviveLog)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

export const useBookingStore = defineStore('booking', () => {
  const authStore = useAuthStore()
  const documentSettingsStore = useDocumentSettingsStore()
  const onboardingStore = useOnboardingStore()
  const inventoryStore = useInventoryStore()
  const billingRuleStore = useBillingRuleStore()
  const fuelRateStore = useFuelRateStore()

  /**
   * ป้องกันในชั้น Business Logic (ไม่ใช่แค่ UI) — ถ้าปลายทางของงานนี้มี Configuration ลิตรมาตรฐานครบทุกจุด ค่าที่บันทึกได้
   * ต้องเป็นค่าตาม Configuration เท่านั้น (เพิกเฉยค่าที่ส่งมาจาก client แม้พยายามส่งค่าอื่นมาก็ตาม) ถ้ามีปลายทางที่ยังไม่มี
   * Configuration ตั้งไว้ อนุญาตให้ใช้ค่าที่ส่งมาได้เฉพาะบัญชีที่มีสิทธิ์ canOverrideFuelRate เท่านั้น บัญชีอื่นถูกบังคับกลับ
   * เป็นค่ามาตรฐานที่คำนวณได้ (0 ถ้าไม่มี Configuration เลยสักปลายทาง) เสมอ — Override เป็นค่าเฉพาะ Booking นี้ ไม่มีจุดใดเขียน
   * กลับไปที่ fuelRateStore (Configuration กลาง) เลย
   */
  function resolveFuelLiters(requested: number | undefined, items: JobItem[], pricingMode: PricingMode | undefined): number {
    const standard = fuelRateStore.standardFuelLiters(items, pricingMode)
    const hasUnconfiguredDistrict = items.some((li) => li.siteName && !fuelRateStore.findRate(li.province, li.district))
    if (!hasUnconfiguredDistrict) return standard
    if (authStore.currentUser?.canOverrideFuelRate) return requested ?? standard
    return standard
  }

  const bookings = ref<Booking[]>([])
  const bookingsLoading = ref(false)
  const bookingsError = ref<string | null>(null)
  const documents = ref<LegacySalesDocument[]>(loadDocuments())
  const batches = ref<BillingBatch[]>(loadBatches())
  const logs = ref<LogEntry[]>(loadLogs())

  watch(documents, (val) => localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(val)), { deep: true })
  watch(batches, (val) => localStorage.setItem(BATCHES_KEY, JSON.stringify(val)), { deep: true })
  watch(logs, (val) => localStorage.setItem(LOGS_KEY, JSON.stringify(val)), { deep: true })

  // sync changes made by other browser tabs (e.g. admin dispatches a job while Driver App is open elsewhere)
  // bookings ไม่ต้องพึ่ง storage event อีกต่อไป เพราะ Firestore onSnapshot ให้ realtime sync ข้ามเบราว์เซอร์/อุปกรณ์ได้จริงอยู่แล้ว (ดู bookingRepository.subscribe ด้านล่าง)
  window.addEventListener('storage', (e) => {
    if (e.key === DOCUMENTS_KEY && e.newValue) {
      documents.value = JSON.parse(e.newValue).map(reviveDocument)
    }
    if (e.key === BATCHES_KEY && e.newValue) {
      batches.value = JSON.parse(e.newValue).map(reviveBatch)
    }
    if (e.key === LOGS_KEY && e.newValue) {
      logs.value = JSON.parse(e.newValue).map(reviveLog)
    }
  })

  /**
   * Booking data source: Firestore (แทน localStorage เดิม) — โครง CRUD/repository pattern เดียวกับ customers/drivers/vehicles
   * ต่างตรงที่ booking.ts มีฟังก์ชันแก้ไขข้อมูลกระจายอยู่เกือบ 20 จุด (ในไฟล์นี้ + salesDocuments.ts ที่ mutate
   * `booking` object ตรงๆ ผ่าน reference ที่ได้จาก bookings.value) จึงไม่คุ้มและเสี่ยงเกินไปที่จะรื้อทุกจุดให้เรียก
   * repository เอง — ใช้ deep watcher เปรียบเทียบเนื้อหาต่อ booking (เหมือน watch(bookings,...,{deep:true}) ที่เคย
   * เขียนทั้งก้อนลง localStorage ทุกครั้งที่มีการแก้ไข) แล้ว persist เฉพาะรายการที่เนื้อหาเปลี่ยนจริงไปที่ Firestore แทน
   * วิธีนี้ทำให้ฟังก์ชัน mutate เดิมทั้งหมดไม่ต้องแก้โค้ดแม้แต่บรรทัดเดียว
   */
  const lastKnownBookingJson = new Map<string, string>()

  function applyRemoteBookings(remote: Booking[]) {
    bookings.value = remote
    lastKnownBookingJson.clear()
    remote.forEach((b) => lastKnownBookingJson.set(b.id, JSON.stringify(b)))
  }

  watch(
    bookings,
    (val) => {
      val.forEach((b) => {
        const json = JSON.stringify(b)
        if (lastKnownBookingJson.get(b.id) === json) return
        lastKnownBookingJson.set(b.id, json)
        const { id, ...rest } = b
        bookingRepository.update(id, rest).catch((err) => {
          bookingsError.value = err?.message || 'บันทึกข้อมูลงานขนส่งไป Firestore ไม่สำเร็จ'
        })
      })
    },
    { deep: true }
  )

  /** ไม่ auto-reseed ข้อมูลตัวอย่าง (mock) เข้า Firestore อีกต่อไป — ถ้า collection ว่าง แปลว่าว่างจริง (ล้าง mock
   *  data ทิ้งโดยตั้งใจ) ไม่ใช่ "ยังไม่เคย migrate" ต้องให้ผู้ใช้ลงงานขนส่งจริงเองผ่านหน้าสร้างงาน */
  async function fetchBookings() {
    bookingsLoading.value = true
    bookingsError.value = null
    try {
      applyRemoteBookings(await bookingRepository.getAll())
    } catch (err: any) {
      bookingsError.value = err?.message || 'โหลดข้อมูลงานขนส่งจาก Firestore ไม่สำเร็จ'
    } finally {
      bookingsLoading.value = false
    }
    bookingRepository.subscribe(applyRemoteBookings, (err) => {
      bookingsError.value = err?.message || 'เชื่อมต่อ realtime กับ Firestore ไม่สำเร็จ'
    })
  }

  fetchBookings()

  /** บันทึกประวัติการทำรายการ ใช้ผู้ใช้ที่ล็อกอินอยู่เป็นผู้ทำรายการ — refs ไม่บังคับ ใช้กรองดูประวัติเฉพาะงาน/รายการวางบิล/เอกสารนั้นๆ ได้ */
  function addLog(action: string, refs?: { bookingId?: string; batchId?: string; docId?: string }) {
    logs.value.unshift({
      id: `log${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      actor: authStore.userName || 'ระบบ',
      action,
      ...refs,
    })
  }

  const fixedCustomer = fixedCeramicsCustomer

  const byFleet = (category: BookingCategory) => computed(() => bookings.value.filter((b) => b.category === category))

  const pendingBookings = (category: BookingCategory) =>
    computed(() => bookings.value.filter((b) => b.category === category && b.status === 'WAITING_DISPATCH'))

  function nextDocNo(category: BookingCategory) {
    const prefix = category === 'cements' ? 'CM' : 'CR'
    const maxSeq = bookings.value
      .filter((b) => b.category === category)
      .reduce((max, b) => {
        const seq = Number(b.docNo.replace(prefix, '').replace('2569-', ''))
        return Number.isFinite(seq) && seq > max ? seq : max
      }, 0)
    return `${prefix}2569-${String(maxSeq + 1).padStart(4, '0')}`
  }

  /** เลขรันรายวัน รูปแบบ {prefix}{YYYYMMDD}{เลข 5 หลัก} — ใช้ร่วมกันโดย nextReleaseNo/nextPoNo
   *  ค่าเก่าที่ไม่ตรงรูปแบบใหม่ (เช่น RL2569-XXXX) จะไม่ถูกนับ เพราะ regex ไม่แมตช์ — เริ่มนับใหม่จาก 00001
   *  ในแต่ละวันแทน ปลอดภัยเพราะความไม่ซ้ำมาจากส่วนวันที่ ไม่ใช่ตัวนับต่อเนื่อง */
  function nextDailyRunningNo(prefix: string, existingValues: (string | undefined)[]) {
    const now = new Date()
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const re = new RegExp(`^${prefix}${datePart}(\\d{5})$`)
    const maxSeq = existingValues.reduce((max, v) => {
      const m = v?.match(re)
      const seq = m ? Number(m[1]) : 0
      return seq > max ? seq : max
    }, 0)
    return `${prefix}${datePart}${String(maxSeq + 1).padStart(5, '0')}`
  }

  /** เลขที่ใบปล่อยรถ ออกทีละงานเหมือน docNo แต่ใช้เลขรันร่วมกันทั้ง 2 fleet (ใบปล่อยรถออกจากอู่เดียวกัน) */
  function nextReleaseNo() {
    return nextDailyRunningNo('RL', bookings.value.map((b) => b.releaseNo))
  }

  /** เลขที่ใบสั่งงาน (PO) ที่ระบบออกให้อัตโนมัติ — ผู้ใช้ยังแก้ไขเองได้หลังจากนี้ */
  function nextPoNo() {
    return nextDailyRunningNo('PO', bookings.value.map((b) => b.po))
  }

  function addBooking(data: Omit<Booking, 'id' | 'status' | 'createdAt'> & { createdAt?: Date }) {
    const { createdAt, ...rest } = data
    const booking: Booking = {
      ...rest,
      fuelLiters: resolveFuelLiters(rest.fuelLiters, rest.items, rest.pricingMode),
      id: bookingRepository.newId(),
      status: 'WAITING_DISPATCH',
      createdAt: createdAt || new Date(),
      billingStatus: 'UNBILLED',
    }
    bookings.value.unshift(booking)
    addLog(`ลงงานใหม่ ${booking.docNo} (${booking.customer})`, { bookingId: booking.id })
    onboardingStore.markDone('createdFirstBooking')
    return booking
  }

  /**
   * แก้ไขราคา (ค่าเที่ยว/ราคาที่ตกลง)
   * อนุญาตอิสระตอน WAITING_DISPATCH เท่านั้น หลังจากนั้นต้องเป็น admin (เช็คสิทธิ์ที่ชั้น UI ก่อนเรียกฟังก์ชันนี้)
   */
  function updateBookingPrice(id: string, data: { tripFee?: number; agreedPrice?: number }) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    if (data.tripFee !== undefined) booking.tripFee = data.tripFee
    if (data.agreedPrice !== undefined) booking.agreedPrice = data.agreedPrice
    addLog(`แก้ไขราคา ${booking.docNo}: ค่าเที่ยว ${booking.tripFee} บาท, ราคาที่ตกลง ${booking.agreedPrice} บาท`, { bookingId: booking.id })
  }

  /**
   * แก้ไขข้อมูลปฏิบัติงาน (น้ำมัน/ข้อมูลหน้างาน) ได้ทุกสถานะงาน
   * เพราะบางครั้งข้อมูลน้ำมันหรือเบอร์โทร/พิกัดหน้างานมาทีหลัง ไม่ต้องรอให้งานอยู่สถานะใดสถานะหนึ่ง
   */
  function updateBookingOps(
    id: string,
    data: {
      fuelLiters?: number
      fuelRate?: number
      returnDate?: Date
    }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    if (data.fuelLiters !== undefined) booking.fuelLiters = data.fuelLiters
    if (data.fuelRate !== undefined) booking.fuelRate = data.fuelRate
    if (data.returnDate !== undefined) booking.returnDate = data.returnDate
    addLog(`แก้ไขข้อมูลปฏิบัติงาน ${booking.docNo} (น้ำมัน/วันที่กลับ)`, { bookingId: booking.id })
  }

  /**
   * แก้ไขข้อมูลงานแบบเต็ม (หน้างาน/สินค้า/ราคา/น้ำมัน/ข้อมูลติดต่อ) ได้ทุกสถานะงาน ไม่จำกัดสิทธิ์
   * ใช้ฟอร์มเดียวกับตอนสร้างงาน เพื่อให้แก้ไขได้อิสระเมื่อข้อมูลหน้างานเปลี่ยนหลังจ่ายงานไปแล้ว
   */
  function updateBookingFull(
    id: string,
    data: {
      items?: JobItem[]
      po?: string
      shipDate?: Date
      loadingDate?: Date
      loadingTime?: string
      returnDate?: Date
      shipmentNo?: string
      route?: string
      origin?: string
      tripFee?: number
      agreedPrice?: number
      allowance?: number
      fuelLiters?: number
      fuelRate?: number
      /** ค่านี้เป็นแค่ passthrough setter สำหรับกรณีบันทึกแบบปกติ (โหมดไม่เปลี่ยน) — การ "เปลี่ยนโหมด" จริงต้องผ่าน switchPricingMode เท่านั้น เพื่อให้มี confirmation/reset ตามกฎ */
      pricingMode?: PricingMode
    }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    if (data.items !== undefined) booking.items = data.items
    if (data.po !== undefined) booking.po = data.po || undefined
    if (data.shipDate !== undefined) booking.shipDate = data.shipDate
    if (data.loadingDate !== undefined) booking.loadingDate = data.loadingDate
    if (data.loadingTime !== undefined) booking.loadingTime = data.loadingTime || undefined
    if (data.returnDate !== undefined) booking.returnDate = data.returnDate
    if (data.shipmentNo !== undefined) booking.shipmentNo = data.shipmentNo || undefined
    if (data.route !== undefined) booking.route = data.route || undefined
    if (data.origin !== undefined) booking.origin = data.origin || undefined
    if (data.tripFee !== undefined) booking.tripFee = data.tripFee
    if (data.agreedPrice !== undefined) booking.agreedPrice = data.agreedPrice
    if (data.allowance !== undefined) booking.allowance = data.allowance
    if (data.pricingMode !== undefined) booking.pricingMode = data.pricingMode
    if (data.fuelLiters !== undefined) booking.fuelLiters = resolveFuelLiters(data.fuelLiters, booking.items, booking.pricingMode)
    if (data.fuelRate !== undefined) booking.fuelRate = data.fuelRate
    addLog(`แก้ไขข้อมูลงาน ${booking.docNo} (แก้ไขแบบเต็ม)`, { bookingId: booking.id })
  }

  /**
   * เปลี่ยนโหมดคิดราคาของงาน (SINGLE_DESTINATION <-> MULTI_DESTINATION)
   * resolvedItems/resolvedTripFee ต้องผ่านการตรวจสอบ/ยืนยันจากผู้ใช้ที่ชั้น UI มาแล้วเสมอ (ฟังก์ชันนี้แค่เขียนค่าที่ resolve แล้ว ไม่คำนวณหรือ validate ซ้ำ)
   * เป็นจุดเดียวที่เขียนค่า pricingMode + tripFee (ระดับงาน) + items (ระดับรายการ) พร้อมกัน เพื่อไม่ให้ 3 ค่านี้ไม่ตรงกัน
   */
  function switchPricingMode(bookingId: string, newMode: PricingMode, resolvedItems: JobItem[], resolvedTripFee: number) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking) return
    const oldMode = booking.pricingMode ?? 'SINGLE_DESTINATION'
    if (oldMode === newMode) return
    booking.pricingMode = newMode
    booking.items = resolvedItems
    booking.tripFee = resolvedTripFee
    addLog(
      `เปลี่ยนโหมดคิดราคา ${booking.docNo}: ${oldMode === 'SINGLE_DESTINATION' ? 'รวมทั้งเที่ยว' : 'แยกตามปลายทาง'} → ${
        newMode === 'SINGLE_DESTINATION' ? 'รวมทั้งเที่ยว' : 'แยกตามปลายทาง'
      } (ค่าเที่ยวรวมใหม่: ${resolvedTripFee} บาท)`,
      { bookingId: booking.id }
    )
  }

  /** ลบงานขนส่งทิ้งถาวร (CRUD ครบตาม repository pattern) — ปัจจุบันยังไม่มีปุ่มเรียกใช้จาก UI เพราะ workflow ปัจจุบันใช้การยกเลิก/ถอนออกจากรอบบิลแทน */
  function deleteBooking(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    bookings.value = bookings.value.filter((b) => b.id !== id)
    lastKnownBookingJson.delete(id)
    bookingRepository.delete(id).catch((err) => {
      bookingsError.value = err?.message || 'ลบงานขนส่งจาก Firestore ไม่สำเร็จ'
    })
    addLog(`ลบงาน ${booking.docNo}`, { bookingId: id })
  }

  /** เพิ่มรายการสินค้า/ปลายทางใหม่เข้าไปในงานที่มีอยู่แล้ว (ใช้ตอนจัดรถแล้วมีรายการเพิ่มทีหลัง) ไม่สร้างงาน/เลขที่เอกสารใหม่ */
  function addJobItem(id: string, item: Omit<JobItem, 'id'>) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    const newItem: JobItem = { ...item, id: `item${Date.now()}${Math.random().toString(36).slice(2, 6)}` }
    booking.items.push(newItem)
    addLog(`เพิ่มรายการ ${booking.docNo}: ${newItem.siteName} - ${newItem.product} ${newItem.qty} ${newItem.unit}`, { bookingId: booking.id })
    return newItem
  }

  /**
   * จ่ายงานให้คนขับ: WAITING_DISPATCH -> ASSIGNED (รอคนขับตอบรับใน Driver App ภายใน 15 นาที)
   * เรียกซ้ำได้ทุกสถานะก่อนส่งของสำเร็จเพื่อ "เปลี่ยนรถ/คนขับ" — ถ้างานถูกตอบรับไปแล้ว (ACCEPTED ขึ้นไป)
   * จะแค่แก้ไขทะเบียนรถ/คนขับ โดยไม่รีเซ็ตสถานะ/ความคืบหน้าของงานที่ทำไปแล้วกลับไปเป็น ASSIGNED
   */
  function dispatchBooking(
    id: string,
    plate: string,
    extra?: {
      driverName?: string
      driverId?: string
      driverFirstName?: string
      driverLastName?: string
      odometerBefore?: number
    }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    booking.plate = plate
    if (extra?.driverName) {
      booking.driverName = extra.driverName
      // อัปเดต driverId/driverFirstName/driverLastName คู่กันเสมอเมื่อเปลี่ยนชื่อคนขับ (แม้จะเป็น undefined เพราะจับคู่ไม่ได้)
      // กันไม่ให้ข้อมูลคนขับเก่าค้างชี้ไปคนละคนกับ driverName ปัจจุบัน — driverFirstName/driverLastName คือ snapshot
      // ที่ Payroll ต้องใช้จริง (ดู Booking.driverFirstName ใน types/index.ts) ไม่ใช่แค่ตัวช่วยจับคู่บัญชี login
      booking.driverId = extra.driverId
      booking.driverFirstName = extra.driverFirstName
      booking.driverLastName = extra.driverLastName
    }
    if (extra?.odometerBefore !== undefined) booking.odometerBefore = extra.odometerBefore
    // น้ำมันคำนวณและล็อกไว้ตั้งแต่ตอนสร้างงานแล้ว (จากจังหวัด/อำเภอของแต่ละปลายทาง) ตอนจัดรถจึงไม่ต้องกรอก/คำนวณซ้ำ
    // การวางบิลแยกอิสระจากการจัดรถโดยเจตนา — booking.billingStatus ยังคง UNBILLED จนกว่าจะถูกดึงเข้ารอบบิลเองที่หน้าใบวางบิล (ดู addBookingsToBatch)
    const alreadyAccepted = booking.status !== 'WAITING_DISPATCH' && booking.status !== 'ASSIGNED'
    if (alreadyAccepted) {
      addLog(`เปลี่ยนรถ/คนขับ ${booking.docNo} เป็นทะเบียน ${plate}${booking.driverName ? ' คนขับ ' + booking.driverName : ''}`, { bookingId: booking.id })
      return
    }
    booking.status = 'ASSIGNED'
    booking.dispatchedAt = new Date()
    addLog(`จ่ายงาน ${booking.docNo} ทะเบียน ${plate}${booking.driverName ? ' คนขับ ' + booking.driverName : ''} (รอคนขับตอบรับ)`, { bookingId: booking.id })
  }

  /**
   * ดึงงานที่ยังไม่วางบิล (UNBILLED) ของลูกค้าเดียวกันเข้ารอบบิลเดียวกัน (สร้างรอบ draft ใหม่ให้ลูกค้านั้นถ้ายังไม่มี)
   * เรียกจากหน้าใบวางบิลเมื่อผู้ใช้เลือกงานเองแล้วกด "รวมเข้ารอบบิล" — ไม่ใช่ automatic ตอนจัดรถอีกต่อไป
   * คืนค่า null ถ้าไม่มีงาน UNBILLED ที่ตรงเงื่อนไข หรือรายการที่เลือกไม่ได้เป็นลูกค้าเดียวกันทั้งหมด
   */
  function addBookingsToBatch(bookingIds: string[]) {
    const targets = bookings.value.filter(
      (b) => bookingIds.includes(b.id) && (b.billingStatus ?? 'UNBILLED') === 'UNBILLED' && billingRuleStore.isEligible(b)
    )
    if (targets.length === 0) return null
    const customer = targets[0].customer
    if (!targets.every((b) => b.customer === customer)) return null
    let batch = batches.value.find((b) => b.customer === customer && b.status === 'BILLING_PENDING')
    if (!batch) {
      const billingListNumbering = documentSettingsStore.settings.numbering.billingList
      const number = `${billingListNumbering.prefix}${new Date().getFullYear() + 543}-${documentSettingsStore.padNumber(
        batches.value.length + 1,
        billingListNumbering.padding
      )}`
      batch = {
        id: `batch${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        number,
        label: `รายการวางบิล ${customer}`,
        customer,
        dateFrom: targets[0].dispatchedAt || targets[0].createdAt,
        dateTo: targets[0].dispatchedAt || targets[0].createdAt,
        bookingIds: [],
        createdAt: new Date(),
        status: 'BILLING_PENDING',
      }
      batches.value.unshift(batch)
    }
    targets.forEach((booking) => {
      if (!batch!.bookingIds.includes(booking.id)) batch!.bookingIds.push(booking.id)
      booking.batchId = batch!.id
      booking.billingStatus = 'IN_BATCH'
      const d = booking.dispatchedAt || booking.createdAt
      if (d < batch!.dateFrom) batch!.dateFrom = d
      if (d > batch!.dateTo) batch!.dateTo = d
    })
    addLog(`เพิ่ม ${targets.length} งานเข้ารายการวางบิล "${batch.number}"`, { batchId: batch.id })
    return batch
  }

  /** ถอนงานออกจากรอบบิล (ใช้ตอนยกเลิกการจ่ายงานอัตโนมัติ เพราะคนขับไม่ตอบรับ) กลับไปเป็นยังไม่วางบิล */
  function removeFromBatch(booking: Booking) {
    if (!booking.batchId) return
    const batch = batches.value.find((b) => b.id === booking.batchId)
    if (batch) batch.bookingIds = batch.bookingIds.filter((id) => id !== booking.id)
    booking.batchId = undefined
    booking.billingStatus = 'UNBILLED'
  }

  /** คนขับกดตอบรับงานใน Driver App: ASSIGNED -> ACCEPTED */
  function acceptDispatch(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'ASSIGNED') return
    booking.status = 'ACCEPTED'
    addLog(`คนขับตอบรับงาน ${booking.docNo}`, { bookingId: booking.id })
  }

  /** คนขับกดไม่รับงานใน Driver App: ยกเลิกการจ่ายงาน กลับไปรอจัดคนขับใหม่ทันที (เหมือน checkExpiredDispatches แต่ตั้งใจกดเอง) */
  function declineDispatch(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'ASSIGNED') return
    removeFromBatch(booking)
    booking.status = 'WAITING_DISPATCH'
    booking.plate = ''
    // sanitizeBooking() แปลง field ที่เป็น undefined เป็น deleteField() ให้แล้ว (ดู bookingRepository.ts) จึงเคลียร์ด้วย undefined ตรงๆ ได้จริง ไม่ค้างค่าเดิมใน Firestore
    booking.driverName = undefined
    booking.driverId = undefined
    booking.driverFirstName = undefined
    booking.driverLastName = undefined
    booking.dispatchedAt = undefined
    addLog(`คนขับไม่รับงาน ${booking.docNo} รอจัดคนขับใหม่ (ถอนออกจากรอบบิล)`, { bookingId: booking.id })
  }

  const BOOKING_STATUS_SEQUENCE: BookingStatus[] = [
    'WAITING_DISPATCH',
    'ASSIGNED',
    'ACCEPTED',
    'FUEL_RECEIVED',
    'LOADING',
    'LOADED',
    'IN_TRANSIT',
    'DELIVERING',
    'DELIVERED',
  ]

  const LOADING_INDEX = BOOKING_STATUS_SEQUENCE.indexOf('LOADING')

  /**
   * Reset สถานะงานกลับไปขั้นก่อนหน้า 1 ขั้น — จัดการเฉพาะข้อมูลฝั่งงานขนส่งเท่านั้น ไม่แตะเอกสารขาย (booking.ts
   * ห้าม import salesDocuments.ts เพราะจะเกิด circular import — เหมือน createBillingFromBookings ที่ต้องเรียกจาก
   * view แทน) ฝั่งที่เรียกใช้ต้องตรวจสอบ/จัดการความสัมพันธ์กับใบวางบิลเองก่อนเรียกฟังก์ชันนี้เมื่อ Reset จาก DELIVERED
   *
   * ถ้าขั้นที่ Reset จะพาไป (prevStatus) อยู่ที่ LOADING หรือก่อนหน้า (เช่น LOADED -> LOADING หรือ LOADING ->
   * FUEL_RECEIVED) แปลว่างานกำลังถอยกลับไปก่อน/ระหว่างขั้น "รับสินค้าที่ต้นทาง" ต้องคืนสต๊อกที่ตัดไปแล้วให้ทุกรายการ
   * ที่มีสถานะ PICKED_UP อยู่ พร้อมเคลียร์สถานะรับสินค้าของทุกรายการทิ้ง (ให้กลับไปรับใหม่ได้สะอาดจาก LOADING) —
   * เช็คจาก item.pickupStatus จริงเสมอ (ไม่ใช่ครั้งเดียวจากสถานะงาน) จึงกด Reset ซ้ำได้โดยไม่คืนสต๊อกซ้ำ เพราะหลังคืน
   * ครั้งแรก pickupStatus ของทุกรายการถูกเคลียร์ไปแล้ว ไม่มีอะไรให้คืนซ้ำอีก
   */
  function resetBookingStatus(id: string): { ok: boolean; message?: string } {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return { ok: false, message: 'ไม่พบงาน' }
    const idx = BOOKING_STATUS_SEQUENCE.indexOf(booking.status)
    if (idx <= 0) return { ok: false, message: 'งานนี้อยู่สถานะแรกแล้ว ไม่สามารถ Reset ย้อนกลับได้อีก' }

    if (booking.status === 'ASSIGNED') {
      declineDispatch(id)
      return { ok: true }
    }

    const prevIdx = idx - 1
    const prevStatus = BOOKING_STATUS_SEQUENCE[prevIdx]

    if (prevIdx <= LOADING_INDEX) {
      const pickedItems = booking.items.filter((i) => i.pickupStatus === 'PICKED_UP')
      if (pickedItems.length) {
        const result = inventoryStore.reverseDeliveryMovement(booking, pickedItems)
        result.matched.forEach((m) => addLog(`คืนสต๊อก ${m} จากการ Reset สถานะงาน ${booking.docNo}`, { bookingId: id }))
        result.unmatched.forEach((name) =>
          addLog(`ไม่พบสินค้า "${name}" ในตั้งค่าสินค้า ข้ามการคืนสต๊อกสำหรับ ${booking.docNo}`, { bookingId: id })
        )
      }
      booking.items.forEach((item) => {
        item.pickupStatus = undefined
        item.pickupSequence = undefined
        item.pickedUpAt = undefined
        item.deliverySequence = undefined
      })
      booking.goodsReceivedAt = undefined
      booking.goodsReceivedBy = undefined
    }

    if (booking.status === 'DELIVERED') {
      booking.items.forEach((item) => {
        item.deliveryStatus = 'PENDING'
        item.deliveredAt = undefined
        item.podImage = undefined
        item.deliveredBy = undefined
      })
      booking.completedAt = undefined
    }

    addLog(`Reset สถานะงาน ${booking.docNo} กลับไปขั้นก่อนหน้า`, { bookingId: booking.id })
    booking.status = prevStatus
    return { ok: true }
  }

  /** คนขับกดรับน้ำมันใน Driver App ระหว่างสถานะ ACCEPTED: ACCEPTED -> FUEL_RECEIVED */
  function markFuelReceived(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'ACCEPTED') return
    booking.status = 'FUEL_RECEIVED'
    booking.fuelReceivedAt = new Date()
    addLog(`คนขับรับน้ำมัน ${booking.docNo}`, { bookingId: booking.id })
  }

  /** คนขับกดเริ่มรับสินค้าที่ต้นทาง: FUEL_RECEIVED -> LOADING */
  function startLoading(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'FUEL_RECEIVED') return
    booking.status = 'LOADING'
    addLog(`เริ่มรับสินค้าที่ต้นทาง ${booking.docNo}`, { bookingId: booking.id })
  }

  /**
   * คนขับกดรับสินค้าทีละรายการที่ต้นทาง (สถานะ LOADING) — คนขับเลือกลำดับรับเองได้ต่อรายการ (คนละต้นทางได้)
   * ตัดสต๊อกทันทีตอนรับรายการนี้ (ไม่รอครบทั้งงาน) เมื่อรับครบทุกรายการแล้วจะคำนวณลำดับส่งของอัตโนมัติ (ย้อนกลับลำดับรับ) แล้วเลื่อนสถานะเป็น LOADED
   */
  function pickupJobItem(bookingId: string, itemId: string, receivedBy?: string) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking || booking.status !== 'LOADING') return
    const item = booking.items.find((i) => i.id === itemId)
    if (!item || item.pickupStatus === 'PICKED_UP') return

    const pickedCount = booking.items.filter((i) => i.pickupStatus === 'PICKED_UP').length
    item.pickupSequence = pickedCount
    item.pickedUpAt = new Date()
    item.pickupStatus = 'PICKED_UP'
    addLog(`รับสินค้า ${booking.docNo}: ${item.product} (${item.siteName}) ลำดับที่ ${pickedCount + 1}`, { bookingId: booking.id })

    const stock = inventoryStore.recordDeliveryMovement(booking, [item])
    stock.matched.forEach((m) => addLog(`ตัดสต๊อก ${m} จากงาน ${booking.docNo}`, { bookingId: booking.id }))
    stock.unmatched.forEach((name) => addLog(`ไม่พบสินค้า "${name}" ในตั้งค่าสินค้า ข้ามการตัดสต๊อกสำหรับ ${booking.docNo}`, { bookingId: booking.id }))

    const allPickedUp = booking.items.every((i) => i.pickupStatus === 'PICKED_UP')
    if (allPickedUp) {
      const maxSeq = Math.max(...booking.items.map((i) => i.pickupSequence ?? 0))
      booking.items.forEach((i) => {
        i.deliverySequence = maxSeq - (i.pickupSequence ?? 0)
      })
      booking.status = 'LOADED'
      booking.goodsReceivedAt = new Date()
      booking.goodsReceivedBy = receivedBy || authStore.userName || booking.driverName
      addLog(`รับสินค้าครบที่ต้นทาง ${booking.docNo} (โดย ${booking.goodsReceivedBy})`, { bookingId: booking.id })
    }
  }

  /** ตรวจงานที่รอคนขับตอบรับเกิน 15 นาที ยกเลิกการจ่ายงานและกลับไปรอจัดคนขับใหม่อัตโนมัติ */
  function checkExpiredDispatches() {
    const now = Date.now()
    bookings.value.forEach((booking) => {
      if (booking.status !== 'ASSIGNED' || !booking.dispatchedAt) return
      if (now - new Date(booking.dispatchedAt).getTime() < ACCEPT_TIMEOUT_MS) return
      removeFromBatch(booking)
      booking.status = 'WAITING_DISPATCH'
      booking.plate = ''
      booking.driverName = undefined
      booking.driverId = undefined
      booking.driverFirstName = undefined
      booking.driverLastName = undefined
      booking.dispatchedAt = undefined
      addLog(`ยกเลิกการจ่ายงาน ${booking.docNo} (คนขับไม่ตอบรับภายใน 15 นาที) รอจัดคนขับใหม่ (ถอนออกจากรอบบิล)`, { bookingId: booking.id })
    })
  }

  checkExpiredDispatches()
  setInterval(checkExpiredDispatches, 30_000)

  /** คนขับกดเริ่มขนส่ง: LOADED -> IN_TRANSIT */
  function startTransit(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'LOADED') return
    booking.status = 'IN_TRANSIT'
    booking.transitStartedAt = new Date()
    addLog(`เริ่มขนส่ง ${booking.docNo}`, { bookingId: booking.id })
  }

  /**
   * จบงานฝั่งออฟฟิศ (มีเพิ่ม/ลดหนี้ แต่ไม่บังคับ POD) — ปิดงานทั้งหมดทีเดียว รวมถึงรายการที่ยังไม่ได้กดส่งของทีละรายการ
   * ไม่ตัดสต๊อกซ้ำที่นี่ เพราะสต๊อกถูกตัดไปแล้วตอนรับสินค้าแต่ละรายการ (ดู pickupJobItem)
   */
  function completeJob(id: string, debtAdjustments: DebtAdjustment[], odometerAfter?: number) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    booking.items.forEach((item) => {
      if (item.deliveryStatus !== 'DELIVERED') {
        item.deliveryStatus = 'DELIVERED'
        item.deliveredAt = item.deliveredAt || new Date()
      }
    })
    const netAdjustment = debtAdjustments.reduce((sum, d) => sum + d.amount, 0)
    booking.debtAdjustments = debtAdjustments
    booking.finalAllowance = Math.round((booking.allowance || 0) - netAdjustment)
    if (odometerAfter !== undefined) booking.odometerAfter = odometerAfter
    booking.status = 'DELIVERED'
    // billingStatus ไม่เกี่ยวกับสถานะงานเลย ปล่อยไว้ตามเดิม (UNBILLED จนกว่าจะถูกดึงเข้ารอบบิลเองที่หน้าใบวางบิล)
    booking.completedAt = new Date()
    addLog(`จบงาน ${booking.docNo}${booking.podImage ? ' (แนบ POD จากคนขับ)' : ' (ปิดงานโดยออฟฟิศ)'}`, { bookingId: booking.id })
  }

  /**
   * คนขับกดส่งของสำเร็จทีละรายการ (JobItem) แนบ POD + ชื่อผู้รับของรายการนั้นโดยเฉพาะ
   * ไม่ตัดสต๊อกที่นี่ (ตัดไปแล้วตอนรับสินค้าที่ต้นทาง — ดู pickupJobItem)
   * ไม่ปิดงานอัตโนมัติที่นี่แม้ส่งครบทุกรายการแล้ว — ต้องรอคนขับกดยืนยัน "ดำเนินการเสร็จสิ้น" เอง (ดู finishDriverJob)
   */
  function deliverJobItem(bookingId: string, itemId: string, podImage: string, deliveredBy: string) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    const item = booking?.items.find((i) => i.id === itemId)
    if (!booking || !item || item.deliveryStatus === 'DELIVERED') return
    item.deliveryStatus = 'DELIVERED'
    item.podImage = podImage
    item.deliveredBy = deliveredBy
    item.deliveredAt = new Date()
    addLog(`ส่งของสำเร็จ ${booking.docNo}: ${item.siteName} - ${item.product} (ผู้รับ: ${deliveredBy})`, { bookingId: booking.id })

    if (booking.status === 'IN_TRANSIT') booking.status = 'DELIVERING'
  }

  /**
   * คนขับกดยืนยัน "ดำเนินการเสร็จสิ้น" หลังส่งของครบทุกรายการแล้ว — จบงานฝั่งคนขับ (DELIVERING -> DELIVERED)
   * เป็นจุดที่บันทึกเลขไมล์สิ้นสุด (ย้ายมาจากที่เคยถามในโมดัลส่งของจุดสุดท้าย)
   */
  function finishDriverJob(bookingId: string, odometerAfter?: number) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking) return
    const allDelivered = booking.items.every((i) => i.deliveryStatus === 'DELIVERED')
    if (!allDelivered) return
    if (odometerAfter !== undefined) booking.odometerAfter = odometerAfter
    const lastDelivered = [...booking.items].sort(
      (a, b) => (b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0) - (a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0)
    )[0]
    if (lastDelivered?.podImage) booking.podImage = lastDelivered.podImage
    booking.finalAllowance = booking.finalAllowance ?? booking.allowance
    booking.status = 'DELIVERED'
    booking.completedAt = new Date()
    // งานที่จบผ่านแอปคนขับต้องรอออฟฟิศตรวจสอบ POD ก่อนเสมอ ห้ามสร้างใบวางบิลจนกว่าจะ APPROVED (ดู reviewPod ด้านล่าง + createBillingFromBookings)
    booking.podReviewStatus = 'PENDING_REVIEW'
    booking.podReviewNote = undefined
    addLog(`จบงาน ${booking.docNo} (คนขับยืนยันดำเนินการเสร็จสิ้น) — รอออฟฟิศตรวจสอบ POD`, { bookingId: booking.id })
  }

  /**
   * ออฟฟิศตรวจสอบ POD ของงานที่คนขับจบงานผ่านแอป (PENDING_REVIEW) แล้วอนุมัติ/ตีกลับ
   * ต้อง APPROVED ก่อนถึงจะสร้างใบวางบิลได้ (ดู createBillingFromBookings ใน salesDocuments.ts)
   */
  function reviewPod(bookingId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking || booking.podReviewStatus !== 'PENDING_REVIEW') return
    booking.podReviewStatus = decision
    booking.podReviewNote = note || undefined
    addLog(`${decision === 'APPROVED' ? 'อนุมัติ' : 'ตีกลับ'} POD งาน ${booking.docNo}${note ? `: ${note}` : ''}`, { bookingId: booking.id })
  }

  /**
   * ซ่อมข้อมูลเก่า: ตัดวันที่/เวลาที่ปนอยู่ท้ายชื่อหน้างาน (siteName) ออก — เกิดจากข้อมูลทดสอบ Regression ยุคแรกๆ ที่พิมพ์
   * วันที่/เวลากำกับต่อท้ายชื่อไว้ตรงๆ เช่น "Site A (14/08 08:00)" หรือ "Site D (20/08)" ทำให้เอกสารที่พิมพ์ชื่อหน้างาน
   * (ใบสั่งสินค้า/ใบวางบิล/ใบแจ้งหนี้) มีวันที่ปนอยู่ในข้อความรายการทั้งที่ Requirement ปัจจุบันไม่ต้องการให้มี
   * ตัด Pattern เฉพาะ "(D/M)" หรือ "(D/M H:mm)" ท้ายชื่อเท่านั้น (regex เจาะจง ไม่ตัดวงเล็บอื่นที่ไม่ใช่รูปแบบวันที่ เช่น
   * "คลังสินค้า (สาขา 2)" จะไม่โดนตัด) — ไม่แตะชื่อหน้างานที่ไม่มี pattern นี้เลย ไม่เดา ไม่สร้างชื่อใหม่
   * หลังรันควรตามด้วย salesDocumentsStore.backfillBookingItemDescriptions() เพื่อให้เอกสารที่เคยพิมพ์ชื่อนี้ไปแล้ว
   * (ก่อนรอบซ่อมนี้) อัปเดตข้อความให้ตรงกับชื่อหน้างานที่สะอาดแล้วด้วย — Idempotent รันซ้ำได้ปลอดภัย
   */
  function stripDateSuffixFromSiteNames(): { checkedBookings: number; updatedItems: number } {
    const dateSuffixPattern = /\s*\(\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{2})?\)\s*$/
    let updatedItems = 0
    bookings.value.forEach((booking) => {
      booking.items.forEach((item) => {
        if (dateSuffixPattern.test(item.siteName)) {
          item.siteName = item.siteName.replace(dateSuffixPattern, '').trim()
          updatedItems++
        }
      })
    })
    if (updatedItems) addLog(`ซ่อมชื่อหน้างานที่มีวันที่/เวลาปนอยู่ ${updatedItems} รายการ`)
    return { checkedBookings: bookings.value.length, updatedItems }
  }

  // --- Billing batch flow ---
  // หมายเหตุ: รอบบิลไม่ถูกสร้าง/เติมงานอัตโนมัติอีกต่อไป — ผู้ใช้ต้องเลือกงาน UNBILLED เองที่หน้าใบวางบิลแล้วกด "รวมเข้ารอบบิล" (ดู addBookingsToBatch)

  const bookingsInBatch = (batchId: string) => computed(() => bookings.value.filter((b) => b.batchId === batchId))

  /** แก้ไขชื่อ/ลูกค้า/ช่วงวันที่ของรอบบิล (ไม่กระทบรายการงานที่มีอยู่ในรอบบิลแล้ว) */
  function updateBatch(batchId: string, data: { label?: string; customer?: string; dateFrom?: Date; dateTo?: Date }) {
    const batch = batches.value.find((b) => b.id === batchId)
    if (!batch) return
    if (data.label !== undefined) batch.label = data.label
    if (data.customer !== undefined) batch.customer = data.customer || undefined
    if (data.dateFrom !== undefined) batch.dateFrom = data.dateFrom
    if (data.dateTo !== undefined) batch.dateTo = data.dateTo
    addLog(`แก้ไขรายการวางบิล "${batch.number}"`, { batchId: batch.id })
  }

  /** ลบรายการวางบิล ได้เฉพาะรายการที่ยังไม่มีการออกใบแจ้งหนี้ (ปลดงานทั้งหมดกลับไปเป็นยังไม่วางบิล) */
  function deleteBatch(batchId: string) {
    const batch = batches.value.find((b) => b.id === batchId)
    if (!batch) return false
    const hasInvoice = documents.value.some((d) => d.batchId === batchId)
    if (hasInvoice) return false
    bookings.value.forEach((b) => {
      if (b.batchId === batchId) {
        b.billingStatus = 'UNBILLED'
        b.batchId = undefined
      }
    })
    batches.value = batches.value.filter((b) => b.id !== batchId)
    addLog(`ลบรายการวางบิล "${batch.number}"`, { batchId: batch.id })
    return true
  }

  /** พัก/ปลดพักงานในรอบบิล ตอนตรวจสอบก่อนออกใบแจ้งหนี้ */
  function setBookingHold(bookingId: string, hold: boolean) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking) return
    booking.billingStatus = hold ? 'HOLD' : 'IN_BATCH'
    addLog(`${hold ? 'พักบิล' : 'ปลดพักบิล'} ${booking.docNo}`, { bookingId: booking.id, batchId: booking.batchId })
  }

  function addExtraCharge(bookingId: string, charge: { label: string; amount: number }) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking) return
    if (!booking.extraCharges) booking.extraCharges = []
    booking.extraCharges.push({ id: `extra${Date.now()}`, ...charge })
    addLog(`เพิ่มค่า extra ${booking.docNo}: ${charge.label} ${charge.amount} บาท`, { bookingId: booking.id })
  }

  function removeExtraCharge(bookingId: string, chargeId: string) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking?.extraCharges) return
    booking.extraCharges = booking.extraCharges.filter((c) => c.id !== chargeId)
  }

  /** ออกใบแจ้งหนี้จากงานที่ผู้ใช้เลือก (ติ๊กถูก) ในรอบบิลนี้ ต้องผ่านการตรวจสอบแล้ว (IN_BATCH ไม่ติด HOLD) */
  function issueInvoiceFromBatch(
    batchId: string,
    bookingIds: string[],
    options?: { customer?: string; creditDays?: number; reference?: string }
  ) {
    const batch = batches.value.find((b) => b.id === batchId)
    if (!batch) return null
    const readyBookings = bookings.value.filter(
      (b) => bookingIds.includes(b.id) && b.batchId === batchId && b.billingStatus === 'IN_BATCH'
    )
    if (readyBookings.length === 0) return null
    const customer = options?.customer || batch.customer || readyBookings[0].customer
    const amount = readyBookings.reduce((sum, b) => {
      const extras = (b.extraCharges || []).reduce((s, c) => s + c.amount, 0)
      return sum + (b.tripFee || 0) + extras
    }, 0)
    const creditDays = options?.creditDays ?? 30
    const issueDate = new Date()
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + creditDays)
    const invoiceNumbering = documentSettingsStore.settings.numbering.invoice
    const salesCalcMode = documentSettingsStore.settings.calcMode.sales
    const vatRate = salesCalcMode.vat === 'included' ? 0 : documentSettingsStore.settings.vatRate
    const vatAmount = Math.round((amount * vatRate) / 100)
    const whtRate = salesCalcMode.wht === 'included' ? 0 : documentSettingsStore.settings.whtRate
    const whtAmount = Math.round((amount * whtRate) / 100)
    const doc: LegacySalesDocument = {
      id: `doc${Date.now()}`,
      number: `${invoiceNumbering.prefix}${new Date().getFullYear() + 543}-${documentSettingsStore.padNumber(documents.value.length + 1, invoiceNumbering.padding)}`,
      customer,
      bookingIds: readyBookings.map((b) => b.id),
      amount,
      date: issueDate,
      status: 'draft',
      batchId,
      creditDays,
      dueDate,
      reference: options?.reference || readyBookings.map((b) => b.docNo).join(', '),
      vatRate,
      vatAmount,
      whtRate,
      whtAmount,
    }
    documents.value.unshift(doc)
    readyBookings.forEach((b) => {
      b.billingStatus = 'INVOICED'
    })
    const stillPending = bookings.value.some((b) => b.batchId === batchId && b.billingStatus === 'IN_BATCH')
    if (!stillPending) batch.status = 'BILLED'
    addLog(`ออกใบแจ้งหนี้ ${doc.number} (${readyBookings.length} งาน, ${amount} บาท)`, { docId: doc.id, batchId })
    onboardingStore.markDone('issuedFirstInvoice')
    return doc
  }

  function markInvoiceSent(docId: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc) return
    doc.status = 'sent'
    addLog(`ส่งใบแจ้งหนี้ ${doc.number} ให้ลูกค้า`, { docId: doc.id, batchId: doc.batchId })
    if (doc.batchId) {
      const batch = batches.value.find((b) => b.id === doc.batchId)
      if (batch && batch.status === 'BILLED') {
        const allSent = documents.value.filter((d) => d.batchId === batch.id).every((d) => d.status !== 'draft')
        if (allSent) batch.status = 'WAITING_PAYMENT'
      }
    }
  }

  /**
   * บันทึกรับชำระ ต้องแนบหลักฐานการชำระเงินประกอบเสมอ
   * ไม่ออกใบเสร็จอัตโนมัติที่นี่ — การชำระเงินกับการออกใบเสร็จเป็นคนละขั้นตอน คนละสถานะ (ดู issueReceipt)
   */
  function markInvoicePaid(docId: string, paymentProofImage: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc || !paymentProofImage) return
    doc.status = 'paid'
    doc.paymentProofImage = paymentProofImage
    doc.paidDate = new Date()
    bookings.value.forEach((b) => {
      if (doc.bookingIds.includes(b.id)) b.billingStatus = 'PAID'
    })
    if (doc.batchId) {
      const batch = batches.value.find((bt) => bt.id === doc.batchId)
      if (batch) {
        const settled = bookings.value
          .filter((b) => b.batchId === batch.id)
          .every((b) => b.billingStatus === 'PAID' || b.billingStatus === 'HOLD')
        if (settled) batch.status = 'PAID'
      }
    }
    addLog(`บันทึกรับชำระใบแจ้งหนี้ ${doc.number} (${doc.amount} บาท)`, { docId: doc.id, batchId: doc.batchId })
  }

  /** ปิดรายการวางบิลด้วยตนเอง หลังชำระครบแล้ว (ขั้นตอนสุดท้ายของ workflow) */
  function closeBatch(batchId: string) {
    const batch = batches.value.find((b) => b.id === batchId)
    if (!batch || batch.status !== 'PAID') return
    batch.status = 'CLOSED'
    addLog(`ปิดรายการวางบิล "${batch.number}"`, { batchId: batch.id })
  }

  /** ออกใบเสร็จรับเงิน เป็นการกระทำแยกต่างหากจากการบันทึกรับชำระ ต้องชำระแล้วเท่านั้นจึงออกใบเสร็จได้ */
  function issueReceipt(docId: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc || doc.status !== 'paid' || doc.receiptNumber) return
    const receiptNumbering = documentSettingsStore.settings.numbering.receipt
    doc.receiptNumber = `${receiptNumbering.prefix}${new Date().getFullYear() + 543}-${documentSettingsStore.padNumber(
      documents.value.filter((d) => d.receiptNumber).length + 1,
      receiptNumbering.padding
    )}`
    addLog(`ออกใบเสร็จรับเงิน ${doc.receiptNumber} สำหรับใบแจ้งหนี้ ${doc.number}`, { docId: doc.id, batchId: doc.batchId })
    return doc.receiptNumber
  }

  return {
    bookings,
    bookingsLoading,
    bookingsError,
    documents,
    batches,
    logs,
    fixedCustomer,
    addLog,
    byFleet,
    pendingBookings,
    nextDocNo,
    nextReleaseNo,
    nextPoNo,
    addBooking,
    deleteBooking,
    updateBookingPrice,
    updateBookingOps,
    updateBookingFull,
    switchPricingMode,
    addJobItem,
    dispatchBooking,
    acceptDispatch,
    declineDispatch,
    resetBookingStatus,
    markFuelReceived,
    startLoading,
    pickupJobItem,
    startTransit,
    completeJob,
    deliverJobItem,
    finishDriverJob,
    stripDateSuffixFromSiteNames,
    reviewPod,
    bookingsInBatch,
    addBookingsToBatch,
    updateBatch,
    deleteBatch,
    closeBatch,
    setBookingHold,
    addExtraCharge,
    removeExtraCharge,
    issueInvoiceFromBatch,
    markInvoiceSent,
    markInvoicePaid,
    issueReceipt,
  }
})
