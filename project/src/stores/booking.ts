import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Booking, BookingCategory, DebtAdjustment, BillingBatch, LogEntry } from '@/types'

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
}

const fixedCeramicsCustomer = 'บจก. ศรีไทยคอนกรีต'

/** ระยะเวลาที่ให้คนขับตอบรับงานหลังถูกจัดรถ ก่อนยกเลิกและกลับไปรอจัดคนขับใหม่อัตโนมัติ */
const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000

/**
 * ไม่มี backend จริง จึงใช้ localStorage เป็นตัวกลางเก็บข้อมูล
 * เพื่อให้หน้า Admin (สั่งงาน/จบงาน/วางบิล) กับหน้า Driver App ที่เปิดคนละแท็บ
 * เห็นข้อมูลชุดเดียวกันและอัปเดตหากันแบบเรียลไทม์ผ่าน storage event
 * (v2: เปลี่ยนโครงสร้างสถานะงาน/บิล จึงขึ้น key ใหม่เพื่อไม่ให้ข้อมูลรูปแบบเก่าปนกัน)
 */
const BOOKINGS_KEY = 'tms_bookings_v2'
const DOCUMENTS_KEY = 'tms_documents_v2'
const BATCHES_KEY = 'tms_batches_v2'
const LOGS_KEY = 'tms_logs_v1'

const BOOKING_DATE_FIELDS = ['createdAt', 'dispatchedAt', 'transitStartedAt', 'completedAt', 'billedAt'] as const

function reviveBooking(raw: any): Booking {
  const booking = { ...raw }
  for (const field of BOOKING_DATE_FIELDS) {
    if (booking[field]) booking[field] = new Date(booking[field])
  }
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
      siteName: 'ไซต์งาน นครสวรรค์',
      district: 'เมืองนครสวรรค์',
      cementTypes: ['ปูนซีเมนต์ M402'],
      jobType: 'ลงมือ',
      allowance: 350,
      tripFee: 4500,
      agreedPrice: 4500,
      fuelLiters: 40,
      fuelRate: 32,
      siteContactName: 'คุณสมชาย',
      sitePhone: '081-234-5678',
      siteCoords: '',
      plate: '',
      status: 'WAITING_DISPATCH',
      createdAt: now,
    },
    {
      id: 'b2',
      category: 'ceramics',
      docNo: 'CR2569-0002',
      customer: fixedCeramicsCustomer,
      siteName: 'ไซต์งาน ชลบุรี',
      district: 'ศรีราชา',
      allowance: 0,
      tripFee: 3800,
      agreedPrice: 3800,
      fuelLiters: 35,
      fuelRate: 32,
      siteContactName: '',
      sitePhone: '',
      siteCoords: '',
      plate: '',
      status: 'WAITING_DISPATCH',
      createdAt: now,
    },
    {
      id: 'b3',
      category: 'cements',
      docNo: 'CM2569-0002',
      customer: 'XYZ',
      siteName: 'ไซต์งาน ราชบุรี',
      district: 'เมืองราชบุรี',
      cementTypes: ['ปูนซีเมนต์ M401', 'ปูนซีเมนต์ M402'],
      jobType: 'พาเลทโรงงาน',
      allowance: 320,
      tripFee: 4200,
      agreedPrice: 4200,
      fuelLiters: 38,
      fuelRate: 32,
      siteContactName: 'คุณวิชัย',
      sitePhone: '089-111-2233',
      siteCoords: '',
      plate: '71-3390 ราชบุรี',
      driverName: 'วิรัตน์ ใจกล้า',
      status: 'DISPATCHED',
      createdAt: now,
      dispatchedAt: now,
    },
    {
      id: 'b3b',
      category: 'ceramics',
      docNo: 'CR2569-0003',
      customer: fixedCeramicsCustomer,
      siteName: 'ไซต์งาน อยุธยา',
      district: 'บางปะอิน',
      allowance: 0,
      tripFee: 4100,
      agreedPrice: 4100,
      fuelLiters: 33,
      fuelRate: 32,
      siteContactName: 'คุณอนุชา',
      sitePhone: '082-555-1122',
      siteCoords: '',
      plate: '72-6628 อยุธยา',
      driverName: 'สมหมาย เพียรงาน',
      status: 'IN_TRANSIT',
      createdAt: now,
      dispatchedAt: now,
      transitStartedAt: now,
    },
    {
      id: 'b4',
      category: 'ceramics',
      docNo: 'CR2569-0001',
      customer: fixedCeramicsCustomer,
      siteName: 'ไซต์งาน นครสวรรค์',
      district: 'เมืองนครสวรรค์',
      allowance: 1549,
      finalAllowance: 1449,
      debtAdjustments: [{ id: 'seed-adj-1', label: 'ค่าปรับความล่าช้า', amount: 100 }],
      tripFee: 4400,
      agreedPrice: 4400,
      fuelLiters: 36,
      fuelRate: 32,
      siteContactName: 'คุณสมชาย',
      sitePhone: '081-234-5678',
      siteCoords: '',
      plate: '70-8821 สระบุรี',
      driverName: 'สมชาย ทองดี',
      status: 'DELIVERED',
      billingStatus: 'UNBILLED',
      createdAt: now,
      dispatchedAt: now,
      transitStartedAt: now,
      completedAt: now,
    },
  ]
}

export const useBookingStore = defineStore('booking', () => {
  const authStore = useAuthStore()

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

  function addBooking(data: Omit<Booking, 'id' | 'status' | 'createdAt'>) {
    const booking: Booking = {
      ...data,
      id: `b${Date.now()}`,
      status: 'WAITING_DISPATCH',
      createdAt: new Date(),
    }
    bookings.value.unshift(booking)
    addLog(`ลงงานใหม่ ${booking.docNo} (${booking.customer})`)
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

  /** จ่ายงานให้คนขับ: WAITING_DISPATCH -> PENDING_ACCEPT (รอคนขับตอบรับใน Driver App ภายใน 15 นาที) */
  function dispatchBooking(
    id: string,
    plate: string,
    extra?: { driverName?: string; siteContactName?: string; sitePhone?: string; siteCoords?: string }
  ) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    booking.plate = plate
    if (extra?.driverName) booking.driverName = extra.driverName
    if (extra?.siteContactName) booking.siteContactName = extra.siteContactName
    if (extra?.sitePhone) booking.sitePhone = extra.sitePhone
    if (extra?.siteCoords) booking.siteCoords = extra.siteCoords
    booking.status = 'PENDING_ACCEPT'
    booking.dispatchedAt = new Date()
    addLog(`จ่ายงาน ${booking.docNo} ทะเบียน ${plate}${booking.driverName ? ' คนขับ ' + booking.driverName : ''} (รอคนขับตอบรับ)`)
  }

  /** คนขับกดตอบรับงานใน Driver App: PENDING_ACCEPT -> DISPATCHED */
  function acceptDispatch(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'PENDING_ACCEPT') return
    booking.status = 'DISPATCHED'
    addLog(`คนขับตอบรับงาน ${booking.docNo}`)
  }

  /** ตรวจงานที่รอคนขับตอบรับเกิน 15 นาที ยกเลิกการจ่ายงานและกลับไปรอจัดคนขับใหม่อัตโนมัติ */
  function checkExpiredDispatches() {
    const now = Date.now()
    bookings.value.forEach((booking) => {
      if (booking.status !== 'PENDING_ACCEPT' || !booking.dispatchedAt) return
      if (now - new Date(booking.dispatchedAt).getTime() < ACCEPT_TIMEOUT_MS) return
      booking.status = 'WAITING_DISPATCH'
      booking.plate = ''
      booking.driverName = undefined
      booking.dispatchedAt = undefined
      addLog(`ยกเลิกการจ่ายงาน ${booking.docNo} (คนขับไม่ตอบรับภายใน 15 นาที) รอจัดคนขับใหม่`)
    })
  }

  checkExpiredDispatches()
  setInterval(checkExpiredDispatches, 30_000)

  /** คนขับกดเริ่มขนส่ง: DISPATCHED -> IN_TRANSIT */
  function startTransit(id: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking || booking.status !== 'DISPATCHED') return
    booking.status = 'IN_TRANSIT'
    booking.transitStartedAt = new Date()
    addLog(`เริ่มขนส่ง ${booking.docNo}`)
  }

  /** จบงานฝั่งออฟฟิศ (มีเพิ่ม/ลดหนี้ แต่ไม่บังคับ POD) */
  function completeJob(id: string, debtAdjustments: DebtAdjustment[]) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    const netAdjustment = debtAdjustments.reduce((sum, d) => sum + d.amount, 0)
    booking.debtAdjustments = debtAdjustments
    booking.finalAllowance = Math.round((booking.allowance || 0) - netAdjustment)
    booking.status = 'DELIVERED'
    booking.billingStatus = 'UNBILLED'
    booking.completedAt = new Date()
    addLog(`จบงาน ${booking.docNo}${booking.podImage ? ' (แนบ POD จากคนขับ)' : ' (ปิดงานโดยออฟฟิศ)'}`)
  }

  /** จบงานฝั่งคนขับ (บังคับแนบ POD) */
  function completeJobByDriver(id: string, podImage: string) {
    const booking = bookings.value.find((b) => b.id === id)
    if (!booking) return
    booking.podImage = podImage
    completeJob(id, [])
  }

  // --- Billing batch flow ---

  /** รวมงานที่ DELIVERED และยังไม่วางบิล ตามช่วงวันที่ (และลูกค้า ถ้าระบุ) เข้าเป็นรอบบิลใหม่ */
  function createBillingBatch(params: { label: string; customer?: string; dateFrom: Date; dateTo: Date }) {
    const matching = bookings.value.filter((b) => {
      if (b.status !== 'DELIVERED' || b.billingStatus !== 'UNBILLED') return false
      if (params.customer && b.customer !== params.customer) return false
      if (!b.completedAt) return false
      const completed = new Date(b.completedAt)
      return completed >= params.dateFrom && completed <= params.dateTo
    })
    const batch: BillingBatch = {
      id: `batch${Date.now()}`,
      label: params.label,
      customer: params.customer,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      bookingIds: matching.map((b) => b.id),
      createdAt: new Date(),
      status: 'draft',
    }
    batches.value.unshift(batch)
    matching.forEach((b) => {
      b.billingStatus = 'IN_BATCH'
      b.batchId = batch.id
    })
    addLog(`สร้างรอบบิล "${batch.label}" (${matching.length} งาน)`)
    return batch
  }

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
    const doc: SalesDocument = {
      id: `doc${Date.now()}`,
      number: `INV${new Date().getFullYear() + 543}-${String(documents.value.length + 1).padStart(4, '0')}`,
      customer,
      bookingIds: readyBookings.map((b) => b.id),
      amount,
      date: issueDate,
      status: 'draft',
      batchId,
      creditDays,
      dueDate,
      reference: options?.reference || readyBookings.map((b) => b.docNo).join(', '),
    }
    documents.value.unshift(doc)
    readyBookings.forEach((b) => {
      b.billingStatus = 'INVOICED'
    })
    const stillPending = bookings.value.some((b) => b.batchId === batchId && b.billingStatus === 'IN_BATCH')
    if (!stillPending) batch.status = 'invoiced'
    addLog(`ออกใบแจ้งหนี้ ${doc.number} (${readyBookings.length} งาน, ${amount} บาท)`)
    return doc
  }

  function markInvoiceSent(docId: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc) return
    doc.status = 'sent'
    addLog(`ส่งใบแจ้งหนี้ ${doc.number} ให้ลูกค้า`)
  }

  function markInvoicePaid(docId: string) {
    const doc = documents.value.find((d) => d.id === docId)
    if (!doc) return
    doc.status = 'paid'
    doc.paidDate = new Date()
    doc.receiptNumber = `RE${new Date().getFullYear() + 543}-${String(
      documents.value.filter((d) => d.receiptNumber).length + 1
    ).padStart(4, '0')}`
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
    addLog(`บันทึกรับชำระใบแจ้งหนี้ ${doc.number} (${doc.amount} บาท) ออกใบเสร็จ ${doc.receiptNumber}`)
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
    addBooking,
    updateBookingPrice,
    dispatchBooking,
    acceptDispatch,
    startTransit,
    completeJob,
    completeJobByDriver,
    createBillingBatch,
    bookingsInBatch,
    updateBatch,
    deleteBatch,
    setBookingHold,
    addExtraCharge,
    removeExtraCharge,
    issueInvoiceFromBatch,
    markInvoiceSent,
    markInvoicePaid,
  }
})
