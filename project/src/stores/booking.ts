import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useOnboardingStore } from '@/stores/onboarding'
import { useInventoryStore } from '@/stores/inventory'
import { useBillingRuleStore } from '@/stores/billingRule'
import type { Booking, BookingCategory, DebtAdjustment, BillingBatch, LogEntry, JobItem, PricingMode } from '@/types'

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
const BOOKINGS_KEY = 'tms_bookings_v5'
const DOCUMENTS_KEY = 'tms_documents_v2'
const BATCHES_KEY = 'tms_batches_v3'
const LOGS_KEY = 'tms_logs_v1'

const BOOKING_DATE_FIELDS = ['createdAt', 'shipDate', 'dispatchedAt', 'transitStartedAt', 'completedAt', 'billedAt'] as const

function reviveBooking(raw: any): Booking {
  const booking = { ...raw }
  for (const field of BOOKING_DATE_FIELDS) {
    if (booking[field]) booking[field] = new Date(booking[field])
  }
  if (booking.goodsReceivedAt) booking.goodsReceivedAt = new Date(booking.goodsReceivedAt)
  booking.items = (booking.items || []).map((item: any) => ({
    ...item,
    pickedUpAt: item.pickedUpAt ? new Date(item.pickedUpAt) : undefined,
    deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : undefined,
  }))
  return booking as Booking
}

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

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    if (raw) return JSON.parse(raw).map(reviveBooking)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return seedBookings()
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

function seedBookings(): Booking[] {
  const now = new Date()
  return [
    {
      id: 'b1',
      category: 'cements',
      docNo: 'CM2569-0001',
      customer: 'ABC',
      items: [
        {
          id: 'b1-i1',
          product: 'ปูนซีเมนต์ M402',
          qty: 10,
          unit: 'ตัน',
          jobType: 'ลงมือ',
          siteName: 'ไซต์งาน นครสวรรค์',
          province: 'นครสวรรค์',
          district: 'เมืองนครสวรรค์',
          siteContactName: 'คุณสมชาย',
          sitePhone: '081-234-5678',
        },
      ],
      allowance: 350,
      tripFee: 4500,
      agreedPrice: 4500,
      fuelLiters: 40,
      fuelRate: 32,
      plate: '',
      status: 'WAITING_DISPATCH',
      billingStatus: 'UNBILLED',
      createdAt: now,
    },
    {
      id: 'b2',
      category: 'ceramics',
      docNo: 'CR2569-0002',
      customer: fixedCeramicsCustomer,
      items: [
        {
          id: 'b2-i1',
          product: 'ปูนซีเมนต์',
          qty: 1,
          unit: 'เที่ยว',
          siteName: 'ไซต์งาน ชลบุรี',
          province: 'ชลบุรี',
          district: 'ศรีราชา',
        },
      ],
      allowance: 0,
      tripFee: 3800,
      agreedPrice: 3800,
      fuelLiters: 35,
      fuelRate: 32,
      plate: '',
      status: 'WAITING_DISPATCH',
      billingStatus: 'UNBILLED',
      createdAt: now,
    },
    {
      id: 'b3',
      category: 'cements',
      docNo: 'CM2569-0002',
      customer: 'XYZ',
      // ตัวอย่างงานเดียวมีหลายรายการ/ปลายทางคนละที่ — ยังเป็น 1 งาน/1 ค่าเที่ยว/1 รถ/1 คนขับเหมือนเดิม
      items: [
        {
          id: 'b3-i1',
          product: 'ปูนซีเมนต์ M401',
          qty: 10,
          unit: 'ตัน',
          jobType: 'พาเลทโรงงาน',
          siteName: 'ไซต์งาน ราชบุรี',
          province: 'ราชบุรี',
          district: 'เมืองราชบุรี',
          siteContactName: 'คุณวิชัย',
          sitePhone: '089-111-2233',
        },
        {
          id: 'b3-i2',
          product: 'ปูนซีเมนต์ M402',
          qty: 5,
          unit: 'ตัน',
          jobType: 'พาเลทโรงงาน',
          siteName: 'ไซต์งาน เชียงใหม่',
          province: 'เชียงใหม่',
          district: 'เมืองเชียงใหม่',
          siteContactName: 'คุณประยูร',
          sitePhone: '086-222-9911',
        },
      ],
      allowance: 320,
      tripFee: 4200,
      agreedPrice: 4200,
      fuelLiters: 38,
      fuelRate: 32,
      plate: '71-3390 ราชบุรี',
      driverName: 'วิรัตน์ ใจกล้า',
      status: 'ACCEPTED',
      billingStatus: 'UNBILLED',
      createdAt: now,
      dispatchedAt: now,
    },
    {
      id: 'b3b',
      category: 'ceramics',
      docNo: 'CR2569-0003',
      customer: fixedCeramicsCustomer,
      items: [
        {
          id: 'b3b-i1',
          product: 'ปูนซีเมนต์',
          qty: 1,
          unit: 'เที่ยว',
          siteName: 'ไซต์งาน อยุธยา',
          province: 'พระนครศรีอยุธยา',
          district: 'บางปะอิน',
          siteContactName: 'คุณอนุชา',
          sitePhone: '082-555-1122',
          pickupStatus: 'PICKED_UP',
          pickupSequence: 0,
          pickedUpAt: now,
          deliverySequence: 0,
        },
      ],
      allowance: 0,
      tripFee: 4100,
      agreedPrice: 4100,
      fuelLiters: 33,
      fuelRate: 32,
      plate: '72-6628 อยุธยา',
      driverName: 'สมหมาย เพียรงาน',
      status: 'IN_TRANSIT',
      billingStatus: 'UNBILLED',
      createdAt: now,
      dispatchedAt: now,
      goodsReceivedAt: now,
      goodsReceivedBy: 'สมหมาย เพียรงาน',
      transitStartedAt: now,
    },
    {
      id: 'b4',
      category: 'ceramics',
      docNo: 'CR2569-0001',
      customer: fixedCeramicsCustomer,
      items: [
        {
          id: 'b4-i1',
          product: 'ปูนซีเมนต์',
          qty: 1,
          unit: 'เที่ยว',
          siteName: 'ไซต์งาน นครสวรรค์',
          province: 'นครสวรรค์',
          district: 'เมืองนครสวรรค์',
          siteContactName: 'คุณสมชาย',
          sitePhone: '081-234-5678',
          pickupStatus: 'PICKED_UP',
          pickupSequence: 0,
          pickedUpAt: now,
          deliverySequence: 0,
          deliveryStatus: 'DELIVERED',
          deliveredAt: now,
          deliveredBy: 'คุณสมชาย',
        },
      ],
      allowance: 1549,
      finalAllowance: 1449,
      debtAdjustments: [{ id: 'seed-adj-1', label: 'ค่าปรับความล่าช้า', amount: 100 }],
      tripFee: 4400,
      agreedPrice: 4400,
      fuelLiters: 36,
      fuelRate: 32,
      plate: '70-8821 สระบุรี',
      driverName: 'สมชาย ทองดี',
      status: 'DELIVERED',
      billingStatus: 'UNBILLED',
      createdAt: now,
      dispatchedAt: now,
      goodsReceivedAt: now,
      goodsReceivedBy: 'สมชาย ทองดี',
      transitStartedAt: now,
      completedAt: now,
    },
  ]
}

export const useBookingStore = defineStore('booking', () => {
  const authStore = useAuthStore()
  const documentSettingsStore = useDocumentSettingsStore()
  const onboardingStore = useOnboardingStore()
  const inventoryStore = useInventoryStore()
  const billingRuleStore = useBillingRuleStore()

  const bookings = ref<Booking[]>(loadBookings())
  const documents = ref<LegacySalesDocument[]>(loadDocuments())
  const batches = ref<BillingBatch[]>(loadBatches())
  const logs = ref<LogEntry[]>(loadLogs())

  watch(bookings, (val) => localStorage.setItem(BOOKINGS_KEY, JSON.stringify(val)), { deep: true })
  watch(documents, (val) => localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(val)), { deep: true })
  watch(batches, (val) => localStorage.setItem(BATCHES_KEY, JSON.stringify(val)), { deep: true })
  watch(logs, (val) => localStorage.setItem(LOGS_KEY, JSON.stringify(val)), { deep: true })

  // sync changes made by other browser tabs (e.g. admin dispatches a job while Driver App is open elsewhere)
  window.addEventListener('storage', (e) => {
    if (e.key === BOOKINGS_KEY && e.newValue) {
      bookings.value = JSON.parse(e.newValue).map(reviveBooking)
    }
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
      id: `b${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
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
    if (data.returnDate !== undefined) booking.returnDate = data.returnDate
    if (data.shipmentNo !== undefined) booking.shipmentNo = data.shipmentNo || undefined
    if (data.route !== undefined) booking.route = data.route || undefined
    if (data.origin !== undefined) booking.origin = data.origin || undefined
    if (data.tripFee !== undefined) booking.tripFee = data.tripFee
    if (data.agreedPrice !== undefined) booking.agreedPrice = data.agreedPrice
    if (data.allowance !== undefined) booking.allowance = data.allowance
    if (data.fuelLiters !== undefined) booking.fuelLiters = data.fuelLiters
    if (data.fuelRate !== undefined) booking.fuelRate = data.fuelRate
    if (data.pricingMode !== undefined) booking.pricingMode = data.pricingMode
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
      odometerBefore?: number
    }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    booking.plate = plate
    if (extra?.driverName) booking.driverName = extra.driverName
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
    booking.driverName = undefined
    booking.dispatchedAt = undefined
    addLog(`คนขับไม่รับงาน ${booking.docNo} รอจัดคนขับใหม่ (ถอนออกจากรอบบิล)`, { bookingId: booking.id })
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
    addLog(`จบงาน ${booking.docNo} (คนขับยืนยันดำเนินการเสร็จสิ้น)`, { bookingId: booking.id })
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
    updateBookingPrice,
    updateBookingOps,
    updateBookingFull,
    switchPricingMode,
    addJobItem,
    dispatchBooking,
    acceptDispatch,
    declineDispatch,
    markFuelReceived,
    startLoading,
    pickupJobItem,
    startTransit,
    completeJob,
    deliverJobItem,
    finishDriverJob,
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
