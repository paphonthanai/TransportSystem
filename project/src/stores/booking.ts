import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useOnboardingStore } from '@/stores/onboarding'
import { useInventoryStore } from '@/stores/inventory'
import type { Booking, BookingCategory, DebtAdjustment, BillingBatch, LogEntry, JobItem, Destination } from '@/types'

export interface SalesDocument {
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
  /** เอกสาร POD ที่แนบตอนบันทึกรับชำระ (บังคับแนบ เพราะใบแจ้งหนี้ออกได้ก่อนงานส่งของสำเร็จ) */
  podImage?: string
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
 */
const BOOKINGS_KEY = 'tms_bookings_v4'
const DOCUMENTS_KEY = 'tms_documents_v2'
const BATCHES_KEY = 'tms_batches_v2'
const LOGS_KEY = 'tms_logs_v1'

const BOOKING_DATE_FIELDS = ['createdAt', 'shipDate', 'dispatchedAt', 'transitStartedAt', 'completedAt', 'billedAt'] as const

function reviveBooking(raw: any): Booking {
  const booking = { ...raw }
  for (const field of BOOKING_DATE_FIELDS) {
    if (booking[field]) booking[field] = new Date(booking[field])
  }
  if (booking.goodsReceivedAt) booking.goodsReceivedAt = new Date(booking.goodsReceivedAt)
  booking.destinations = (booking.destinations || []).map((dest: any) =>
    dest.deliveredAt ? { ...dest, deliveredAt: new Date(dest.deliveredAt) } : dest
  )
  return booking as Booking
}

function reviveDocument(raw: any): SalesDocument {
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

function loadDocuments(): SalesDocument[] {
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
      destinations: [
        {
          id: 'b1-d1',
          name: 'ไซต์งาน นครสวรรค์',
          province: 'นครสวรรค์',
          district: 'เมืองนครสวรรค์',
          contactName: 'คุณสมชาย',
          contactPhone: '081-234-5678',
          sequence: 0,
          deliveryStatus: 'PENDING',
          items: [{ id: 'b1-i1', product: 'ปูนซีเมนต์ M402', qty: 10, unit: 'ตัน', jobType: 'ลงมือ' }],
        },
      ],
      allowance: 350,
      tripFee: 4500,
      agreedPrice: 4500,
      fuelLiters: 40,
      fuelRate: 32,
      plate: '',
      status: 'WAITING_DISPATCH',
      createdAt: now,
    },
    {
      id: 'b2',
      category: 'ceramics',
      docNo: 'CR2569-0002',
      customer: fixedCeramicsCustomer,
      destinations: [
        {
          id: 'b2-d1',
          name: 'ไซต์งาน ชลบุรี',
          province: 'ชลบุรี',
          district: 'ศรีราชา',
          sequence: 0,
          deliveryStatus: 'PENDING',
          items: [{ id: 'b2-i1', product: 'ปูนซีเมนต์', qty: 1, unit: 'เที่ยว' }],
        },
      ],
      allowance: 0,
      tripFee: 3800,
      agreedPrice: 3800,
      fuelLiters: 35,
      fuelRate: 32,
      plate: '',
      status: 'WAITING_DISPATCH',
      createdAt: now,
    },
    {
      id: 'b3',
      category: 'cements',
      docNo: 'CM2569-0002',
      customer: 'XYZ',
      // ตัวอย่างงานเดียวมีหลายปลายทาง/สินค้าคนละชนิด — ยังเป็น 1 งาน/1 ค่าเที่ยว/1 รถ/1 คนขับเหมือนเดิม
      destinations: [
        {
          id: 'b3-d1',
          name: 'ไซต์งาน ราชบุรี',
          province: 'ราชบุรี',
          district: 'เมืองราชบุรี',
          contactName: 'คุณวิชัย',
          contactPhone: '089-111-2233',
          sequence: 0,
          deliveryStatus: 'PENDING',
          items: [{ id: 'b3-i1', product: 'ปูนซีเมนต์ M401', qty: 10, unit: 'ตัน', jobType: 'พาเลทโรงงาน' }],
        },
        {
          id: 'b3-d2',
          name: 'ไซต์งาน เชียงใหม่',
          province: 'เชียงใหม่',
          district: 'เมืองเชียงใหม่',
          contactName: 'คุณประยูร',
          contactPhone: '086-222-9911',
          sequence: 1,
          deliveryStatus: 'PENDING',
          items: [{ id: 'b3-i2', product: 'ปูนซีเมนต์ M402', qty: 5, unit: 'ตัน', jobType: 'พาเลทโรงงาน' }],
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
      createdAt: now,
      dispatchedAt: now,
    },
    {
      id: 'b3b',
      category: 'ceramics',
      docNo: 'CR2569-0003',
      customer: fixedCeramicsCustomer,
      destinations: [
        {
          id: 'b3b-d1',
          name: 'ไซต์งาน อยุธยา',
          province: 'พระนครศรีอยุธยา',
          district: 'บางปะอิน',
          contactName: 'คุณอนุชา',
          contactPhone: '082-555-1122',
          sequence: 0,
          deliveryStatus: 'PENDING',
          items: [{ id: 'b3b-i1', product: 'ปูนซีเมนต์', qty: 1, unit: 'เที่ยว' }],
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
      destinations: [
        {
          id: 'b4-d1',
          name: 'ไซต์งาน นครสวรรค์',
          province: 'นครสวรรค์',
          district: 'เมืองนครสวรรค์',
          contactName: 'คุณสมชาย',
          contactPhone: '081-234-5678',
          sequence: 0,
          deliveryStatus: 'DELIVERED',
          deliveredAt: now,
          deliveredBy: 'คุณสมชาย',
          items: [{ id: 'b4-i1', product: 'ปูนซีเมนต์', qty: 1, unit: 'เที่ยว' }],
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

  const bookings = ref<Booking[]>(loadBookings())
  const documents = ref<SalesDocument[]>(loadDocuments())
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

  /** บันทึกประวัติการทำรายการ ใช้ผู้ใช้ที่ล็อกอินอยู่เป็นผู้ทำรายการ */
  function addLog(action: string) {
    logs.value.unshift({
      id: `log${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      actor: authStore.userName || 'ระบบ',
      action,
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

  /** เลขที่ใบปล่อยรถ ออกทีละงานเหมือน docNo แต่ใช้เลขรันร่วมกันทั้ง 2 fleet (ใบปล่อยรถออกจากอู่เดียวกัน) */
  function nextReleaseNo() {
    const prefix = 'RL'
    const maxSeq = bookings.value.reduce((max, b) => {
      if (!b.releaseNo) return max
      const seq = Number(b.releaseNo.replace(prefix, '').replace('2569-', ''))
      return Number.isFinite(seq) && seq > max ? seq : max
    }, 0)
    return `${prefix}2569-${String(maxSeq + 1).padStart(4, '0')}`
  }

  function addBooking(data: Omit<Booking, 'id' | 'status' | 'createdAt'> & { createdAt?: Date }) {
    const { createdAt, ...rest } = data
    const booking: Booking = {
      ...rest,
      id: `b${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
      status: 'WAITING_DISPATCH',
      createdAt: createdAt || new Date(),
    }
    bookings.value.unshift(booking)
    addLog(`ลงงานใหม่ ${booking.docNo} (${booking.customer})`)
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
    addLog(`แก้ไขราคา ${booking.docNo}: ค่าเที่ยว ${booking.tripFee} บาท, ราคาที่ตกลง ${booking.agreedPrice} บาท`)
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
    addLog(`แก้ไขข้อมูลปฏิบัติงาน ${booking.docNo} (น้ำมัน/วันที่กลับ)`)
  }

  /**
   * แก้ไขข้อมูลงานแบบเต็ม (หน้างาน/สินค้า/ราคา/น้ำมัน/ข้อมูลติดต่อ) ได้ทุกสถานะงาน ไม่จำกัดสิทธิ์
   * ใช้ฟอร์มเดียวกับตอนสร้างงาน เพื่อให้แก้ไขได้อิสระเมื่อข้อมูลหน้างานเปลี่ยนหลังจ่ายงานไปแล้ว
   */
  function updateBookingFull(
    id: string,
    data: {
      destinations?: Destination[]
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
    }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    if (data.destinations !== undefined) booking.destinations = data.destinations
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
    addLog(`แก้ไขข้อมูลงาน ${booking.docNo} (แก้ไขแบบเต็ม)`)
  }

  /** เพิ่มปลายทางใหม่ (พร้อมรายการสินค้า) เข้าไปในงานที่มีอยู่แล้ว (ใช้ตอนจัดรถแล้วมีปลายทางเพิ่มทีหลัง) ไม่สร้างงาน/เลขที่เอกสารใหม่ */
  function addDestination(
    id: string,
    destination: Omit<Destination, 'id' | 'items' | 'deliveryStatus' | 'sequence'> & { items: Omit<JobItem, 'id'>[] }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    const newDestination: Destination = {
      ...destination,
      id: `dest${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      sequence: booking.destinations.length,
      deliveryStatus: 'PENDING',
      items: destination.items.map((item) => ({ ...item, id: `item${Date.now()}${Math.random().toString(36).slice(2, 6)}` })),
    }
    booking.destinations.push(newDestination)
    const productSummary = newDestination.items.map((i) => `${i.product} ${i.qty} ${i.unit}`).join(', ')
    addLog(`เพิ่มปลายทาง ${booking.docNo}: ${newDestination.name} (${productSummary})`)
    return newDestination
  }

  /** จ่ายงานให้คนขับ: WAITING_DISPATCH -> ASSIGNED (รอคนขับตอบรับใน Driver App ภายใน 15 นาที) */
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
    booking.status = 'ASSIGNED'
    booking.dispatchedAt = new Date()
    assignToOpenBatch(booking)
    addLog(`จ่ายงาน ${booking.docNo} ทะเบียน ${plate}${booking.driverName ? ' คนขับ ' + booking.driverName : ''} (รอคนขับตอบรับ, เข้ารอบบิลอัตโนมัติ)`)
  }

  /**
   * เข้ารอบบิลอัตโนมัติทันทีที่จัดรถเสร็จ (ไม่ต้องรอส่งของสำเร็จ)
   * จัดกลุ่มรอบบิลตามลูกค้า: หาบิลที่ยังเปิดอยู่ (draft) ของลูกค้ารายนั้น ถ้าไม่มีให้เปิดใหม่อัตโนมัติ
   */
  function assignToOpenBatch(booking: Booking) {
    let batch = batches.value.find((b) => b.customer === booking.customer && b.status === 'draft')
    if (!batch) {
      batch = {
        id: `batch${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        label: `รอบบิล ${booking.customer}`,
        customer: booking.customer,
        dateFrom: booking.dispatchedAt || new Date(),
        dateTo: booking.dispatchedAt || new Date(),
        bookingIds: [],
        createdAt: new Date(),
        status: 'draft',
      }
      batches.value.unshift(batch)
    }
    if (!batch.bookingIds.includes(booking.id)) batch.bookingIds.push(booking.id)
    booking.batchId = batch.id
    booking.billingStatus = 'IN_BATCH'
    const dispatchedAt = booking.dispatchedAt || new Date()
    if (dispatchedAt < batch.dateFrom) batch.dateFrom = dispatchedAt
    if (dispatchedAt > batch.dateTo) batch.dateTo = dispatchedAt
  }

  /** ถอนงานออกจากรอบบิล (ใช้ตอนยกเลิกการจ่ายงานอัตโนมัติ เพราะคนขับไม่ตอบรับ) */
  function removeFromBatch(booking: Booking) {
    if (!booking.batchId) return
    const batch = batches.value.find((b) => b.id === booking.batchId)
    if (batch) batch.bookingIds = batch.bookingIds.filter((id) => id !== booking.id)
    booking.batchId = undefined
    booking.billingStatus = undefined
  }

  /** คนขับกดตอบรับงานใน Driver App: ASSIGNED -> ACCEPTED */
  function acceptDispatch(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'ASSIGNED') return
    booking.status = 'ACCEPTED'
    addLog(`คนขับตอบรับงาน ${booking.docNo}`)
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
    addLog(`คนขับไม่รับงาน ${booking.docNo} รอจัดคนขับใหม่ (ถอนออกจากรอบบิล)`)
  }

  /** คนขับกดรับน้ำมันใน Driver App ระหว่างสถานะ ACCEPTED: ACCEPTED -> FUEL_RECEIVED */
  function markFuelReceived(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'ACCEPTED') return
    booking.status = 'FUEL_RECEIVED'
    booking.fuelReceivedAt = new Date()
    addLog(`คนขับรับน้ำมัน ${booking.docNo}`)
  }

  /** คนขับกดเริ่มรับสินค้าที่ต้นทาง: FUEL_RECEIVED -> LOADING */
  function startLoading(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'FUEL_RECEIVED') return
    booking.status = 'LOADING'
    addLog(`เริ่มรับสินค้าที่ต้นทาง ${booking.docNo}`)
  }

  /**
   * คนขับกดยืนยันรับสินค้าครบแล้ว: LOADING -> LOADED
   * จุดนี้คือจุดตัดสต๊อกของงานทั้งใบ (ทุกปลายทาง ทุกรายการสินค้า) ครั้งเดียว เพราะรถขนสินค้าทั้งหมดออกจากต้นทางพร้อมกัน
   */
  function confirmGoodsReceived(id: string, receivedBy?: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'LOADING') return
    booking.status = 'LOADED'
    booking.goodsReceivedAt = new Date()
    booking.goodsReceivedBy = receivedBy || authStore.userName || booking.driverName
    addLog(`รับสินค้าครบที่ต้นทาง ${booking.docNo} (โดย ${booking.goodsReceivedBy})`)
    const allItems = booking.destinations.flatMap((d) => d.items)
    const stock = inventoryStore.recordDeliveryMovement(booking, allItems)
    stock.matched.forEach((m) => addLog(`ตัดสต๊อก ${m} จากงาน ${booking.docNo}`))
    stock.unmatched.forEach((name) => addLog(`ไม่พบสินค้า "${name}" ในตั้งค่าสินค้า ข้ามการตัดสต๊อกสำหรับ ${booking.docNo}`))
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
      addLog(`ยกเลิกการจ่ายงาน ${booking.docNo} (คนขับไม่ตอบรับภายใน 15 นาที) รอจัดคนขับใหม่ (ถอนออกจากรอบบิล)`)
    })
  }

  /**
   * เผื่อข้อมูลเก่า (seed หรือ localStorage ก่อนหน้านี้) ที่งานถูกจัดรถไปแล้วแต่ยังไม่เคยเข้ารอบบิล
   * (เพราะสมัยก่อนรอบบิลต้องสร้างเองและรวมเฉพาะงานที่ DELIVERED) ให้ไล่เข้ารอบบิลอัตโนมัติให้ครบ
   */
  function reconcileMissingBatchAssignments() {
    bookings.value.forEach((booking) => {
      if (booking.status !== 'WAITING_DISPATCH' && !booking.batchId) {
        assignToOpenBatch(booking)
      }
    })
  }

  reconcileMissingBatchAssignments()
  checkExpiredDispatches()
  setInterval(checkExpiredDispatches, 30_000)

  /** คนขับกดเริ่มขนส่ง: LOADED -> IN_TRANSIT */
  function startTransit(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'LOADED') return
    booking.status = 'IN_TRANSIT'
    booking.transitStartedAt = new Date()
    addLog(`เริ่มขนส่ง ${booking.docNo}`)
  }

  /**
   * จบงานฝั่งออฟฟิศ (มีเพิ่ม/ลดหนี้ แต่ไม่บังคับ POD) — ปิดงานทั้งหมดทีเดียว รวมถึงปลายทางที่ยังไม่ได้กดส่งของทีละจุด
   * ไม่ตัดสต๊อกซ้ำที่นี่ เพราะสต๊อกถูกตัดไปแล้วครั้งเดียวตอนสถานะ LOADED (ดู confirmGoodsReceived)
   */
  function completeJob(id: string, debtAdjustments: DebtAdjustment[], odometerAfter?: number) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    booking.destinations.forEach((dest) => {
      if (dest.deliveryStatus !== 'DELIVERED') {
        dest.deliveryStatus = 'DELIVERED'
        dest.deliveredAt = dest.deliveredAt || new Date()
      }
    })
    const netAdjustment = debtAdjustments.reduce((sum, d) => sum + d.amount, 0)
    booking.debtAdjustments = debtAdjustments
    booking.finalAllowance = Math.round((booking.allowance || 0) - netAdjustment)
    if (odometerAfter !== undefined) booking.odometerAfter = odometerAfter
    booking.status = 'DELIVERED'
    // billingStatus ถูกตั้งเป็น IN_BATCH ไปแล้วตั้งแต่ตอนจัดรถ (assignToOpenBatch) ไม่ต้องตั้งซ้ำ
    booking.completedAt = new Date()
    addLog(`จบงาน ${booking.docNo}${booking.podImage ? ' (แนบ POD จากคนขับ)' : ' (ปิดงานโดยออฟฟิศ)'}`)
  }

  /**
   * คนขับกดส่งของสำเร็จทีละปลายทาง (Destination) แนบ POD + ชื่อผู้รับของจุดนั้นโดยเฉพาะ
   * ไม่ตัดสต๊อกที่นี่ (ตัดไปแล้วตอนรับสินค้าที่ต้นทาง — สถานะ LOADED)
   * เมื่อส่งครบทุกจุดแล้ว งานทั้งใบจะจบอัตโนมัติ (เลขไมล์สิ้นสุด/เบี้ยเลี้ยงสุทธิ/สถานะ DELIVERED)
   */
  function deliverDestination(
    bookingId: string,
    destinationId: string,
    podImage: string,
    deliveredBy: string,
    odometerAfter?: number
  ) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    const destination = booking?.destinations.find((d) => d.id === destinationId)
    if (!booking || !destination || destination.deliveryStatus === 'DELIVERED') return
    destination.deliveryStatus = 'DELIVERED'
    destination.podImage = podImage
    destination.deliveredBy = deliveredBy
    destination.deliveredAt = new Date()
    addLog(`ส่งของสำเร็จ ${booking.docNo}: ${destination.name} (ผู้รับ: ${deliveredBy})`)

    const allDelivered = booking.destinations.every((d) => d.deliveryStatus === 'DELIVERED')
    if (allDelivered) {
      if (odometerAfter !== undefined) booking.odometerAfter = odometerAfter
      booking.podImage = podImage
      booking.finalAllowance = booking.finalAllowance ?? booking.allowance
      booking.status = 'DELIVERED'
      booking.completedAt = new Date()
      addLog(`จบงาน ${booking.docNo} (ส่งของครบทุกปลายทางแล้ว)`)
    } else if (booking.status === 'IN_TRANSIT') {
      booking.status = 'DELIVERING'
    }
  }

  // --- Billing batch flow ---
  // หมายเหตุ: รอบบิลถูกสร้าง/เติมงานอัตโนมัติตอนจัดรถ (ดู assignToOpenBatch) ไม่มีการสร้างรอบบิลด้วยมือแล้ว

  const bookingsInBatch = (batchId: string) => computed(() => bookings.value.filter((b) => b.batchId === batchId))

  /** แก้ไขชื่อ/ลูกค้า/ช่วงวันที่ของรอบบิล (ไม่กระทบรายการงานที่มีอยู่ในรอบบิลแล้ว) */
  function updateBatch(batchId: string, data: { label?: string; customer?: string; dateFrom?: Date; dateTo?: Date }) {
    const batch = batches.value.find((b) => b.id === batchId)
    if (!batch) return
    if (data.label !== undefined) batch.label = data.label
    if (data.customer !== undefined) batch.customer = data.customer || undefined
    if (data.dateFrom !== undefined) batch.dateFrom = data.dateFrom
    if (data.dateTo !== undefined) batch.dateTo = data.dateTo
    addLog(`แก้ไขรอบบิล "${batch.label}"`)
  }

  /** ลบรอบบิล ได้เฉพาะรอบที่ยังไม่มีการออกใบแจ้งหนี้ (ปลดงานทั้งหมดกลับไปเป็นยังไม่วางบิล) */
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
    addLog(`ลบรอบบิล "${batch.label}"`)
    return true
  }

  /** พัก/ปลดพักงานในรอบบิล ตอนตรวจสอบก่อนออกใบแจ้งหนี้ */
  function setBookingHold(bookingId: string, hold: boolean) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking) return
    booking.billingStatus = hold ? 'HOLD' : 'IN_BATCH'
    addLog(`${hold ? 'พักบิล' : 'ปลดพักบิล'} ${booking.docNo}`)
  }

  function addExtraCharge(bookingId: string, charge: { label: string; amount: number }) {
    const booking = bookings.value.find((b) => b.id === bookingId)
    if (!booking) return
    if (!booking.extraCharges) booking.extraCharges = []
    booking.extraCharges.push({ id: `extra${Date.now()}`, ...charge })
    addLog(`เพิ่มค่า extra ${booking.docNo}: ${charge.label} ${charge.amount} บาท`)
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
    const doc: SalesDocument = {
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
    if (!stillPending) batch.status = 'invoiced'
    addLog(`ออกใบแจ้งหนี้ ${doc.number} (${readyBookings.length} งาน, ${amount} บาท)`)
    onboardingStore.markDone('issuedFirstInvoice')
    return doc
  }

  function markInvoiceSent(docId: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc) return
    doc.status = 'sent'
    addLog(`ส่งใบแจ้งหนี้ ${doc.number} ให้ลูกค้า`)
  }

  /**
   * บันทึกรับชำระ ต้องแนบเอกสาร POD ประกอบเสมอ เพราะใบแจ้งหนี้ออกได้ก่อนงานส่งของสำเร็จ
   * ไม่ออกใบเสร็จอัตโนมัติที่นี่ — การชำระเงินกับการออกใบเสร็จเป็นคนละขั้นตอน คนละสถานะ (ดู issueReceipt)
   */
  function markInvoicePaid(docId: string, podImage: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc || !podImage) return
    doc.status = 'paid'
    doc.podImage = podImage
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
        if (settled) batch.status = 'paid'
      }
    }
    addLog(`บันทึกรับชำระใบแจ้งหนี้ ${doc.number} (${doc.amount} บาท)`)
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
    addLog(`ออกใบเสร็จรับเงิน ${doc.receiptNumber} สำหรับใบแจ้งหนี้ ${doc.number}`)
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
    addBooking,
    updateBookingPrice,
    updateBookingOps,
    updateBookingFull,
    addDestination,
    dispatchBooking,
    acceptDispatch,
    declineDispatch,
    markFuelReceived,
    startLoading,
    confirmGoodsReceived,
    startTransit,
    completeJob,
    deliverDestination,
    bookingsInBatch,
    updateBatch,
    deleteBatch,
    setBookingHold,
    addExtraCharge,
    removeExtraCharge,
    issueInvoiceFromBatch,
    markInvoiceSent,
    markInvoicePaid,
    issueReceipt,
  }
})
