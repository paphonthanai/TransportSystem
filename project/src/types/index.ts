export type BookingCategory = 'cements' | 'ceramics'

export type BookingJobType = 'ลงมือ' | 'พาเลทโรงงาน' | 'พาเลทฟรี'

/**
 * โหมดการคิดราคาค่าเที่ยวของงาน — ตั้งตอนสร้างงาน แก้ไขภายหลังได้ (ผ่าน confirmation เท่านั้น ดู switchPricingMode ใน stores/booking.ts)
 * SINGLE_DESTINATION (ค่า default เสมอ รวมถึงงานเก่าที่ไม่มีฟิลด์นี้): กรอกค่าเที่ยวครั้งเดียวทั้งงาน (booking.tripFee) ไม่ว่ามีกี่รายการ/ปลายทาง — พฤติกรรมเดิมของระบบ
 * MULTI_DESTINATION: แต่ละรายการ (JobItem) มีค่าเที่ยว+จำนวนเที่ยวเป็นของตัวเอง แล้วรวมเป็น booking.tripFee โดยอัตโนมัติ
 */
export type PricingMode = 'SINGLE_DESTINATION' | 'MULTI_DESTINATION'

/**
 * สถานะวงจรชีวิตของงาน (job lifecycle) แยกจากสถานะการเงิน (BillingStatus) โดยเจตนา
 * ตามหลักที่ว่า "ส่งของเสร็จ = งานจบ" ไม่เท่ากับ "วางบิล = แปลงงานเป็นเงิน"
 * WAITING_DISPATCH: ลงงานแล้ว รอจัดคนขับ/รถ (ราคาแก้ไขได้อิสระ)
 * ASSIGNED: จัดคนขับแล้ว รอคนขับตอบรับงานใน Driver App ภายใน 15 นาที ไม่งั้นถูกยกเลิกอัตโนมัติ กลับไป WAITING_DISPATCH
 * ACCEPTED: คนขับตอบรับงานแล้ว (ราคาถูกล็อก แก้ได้เฉพาะ admin)
 * FUEL_RECEIVED: คนขับกดรับน้ำมันแล้ว
 * LOADING: คนขับกดเริ่มรับสินค้าที่ต้นทาง
 * LOADED: รับสินค้าครบแล้ว — จุดที่ตัดสต๊อกออกจากคลังต้นทาง (ครั้งเดียวทั้งงาน)
 * IN_TRANSIT: คนขับกดเริ่มขนส่งแล้ว กำลังวิ่งไปยังปลายทางต่างๆ
 * DELIVERING: ส่งของถึงอย่างน้อย 1 ปลายทางแล้ว แต่ยังไม่ครบทุกปลายทาง
 * DELIVERED: ส่งของครบทุกปลายทางแล้ว (หรือจบงานผ่านออฟฟิศ)
 */
export type BookingStatus =
  | 'WAITING_DISPATCH'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'FUEL_RECEIVED'
  | 'LOADING'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'DELIVERING'
  | 'DELIVERED'

/**
 * สถานะฝั่งการเงิน — เป็นอิสระจาก BookingStatus โดยเจตนา ไม่ผูกกับสถานะงานขนส่งเลย
 * UNBILLED: ค่าเริ่มต้นของทุกงาน ยังไม่ถูกดึงเข้ารอบบิล (ไม่เกี่ยวกับว่างานจะจัดรถ/ส่งของถึงไหนแล้ว)
 * IN_BATCH: ผู้ใช้เลือกงาน UNBILLED เองที่หน้าใบวางบิลแล้วดึงเข้ารอบบิล รอตรวจสอบ/ออกใบแจ้งหนี้
 * HOLD: ตรวจสอบแล้วไม่ผ่าน (POD ไม่ครบ/ราคาไม่ตรง) พักไว้ก่อน
 * INVOICED: ออกใบแจ้งหนี้แล้ว
 * PAID: ลูกค้าชำระแล้ว ปิดรอบ
 */
export type BillingStatus = 'UNBILLED' | 'IN_BATCH' | 'HOLD' | 'INVOICED' | 'PAID'

export interface DebtAdjustment {
  id: string
  label: string
  /** จำนวนเงิน: บวก = เพิ่มหนี้ (หักจากเบี้ยเลี้ยง), ลบ = ลดหนี้ (เพิ่มให้เบี้ยเลี้ยง) */
  amount: number
  note?: string
}

export interface ExtraCharge {
  id: string
  /** เช่น ค่ารอรถ, ค่าเพิ่มระยะ, ค่าเปลี่ยนเส้นทาง */
  label: string
  amount: number
}

/**
 * ต้นทาง/จุดรับสินค้า ที่ตั้งค่าไว้ล่วงหน้า (เช่น โรงงาน/คลังต่างๆ) ให้เลือกใช้ซ้ำได้ตอนสร้างงาน
 * ไม่บังคับใช้ — แต่ละรายการสินค้ายังพิมพ์ชื่อต้นทางอิสระได้ถ้ายังไม่ได้ลงทะเบียนไว้
 */
export interface PickupOrigin {
  id: string
  name: string
  province?: string
  district?: string
  address?: string
  latitude?: number
  longitude?: number
  mapUrl?: string
}

/**
 * รายการสินค้า/ปลายทาง 1 รายการภายในงาน/เที่ยวรถ (Job/Trip) — 1 งานมีได้หลายรายการ
 * แต่ละรายการมีสินค้า/จำนวน/หน่วย/ปลายทาง/ต้นทางรับสินค้า เป็นของตัวเอง
 * (1 งานยังคงเป็น 1 รถ/1 คนขับ/1 เที่ยว/1 ค่าเที่ยว/1 สถานะงานรวม เสมอ — การเพิ่มรายการไม่ทำให้เกิดงานใหม่)
 */
export interface JobItem {
  id: string
  /** ชื่อสินค้า จับคู่กับสินค้าที่ตั้งค่าไว้ในคลังสินค้า */
  product: string
  /** จำนวน/น้ำหนักของรายการนี้ ตามหน่วยของสินค้า */
  qty: number
  /** หน่วยนับ ดึงมาจากสินค้าที่เลือกอัตโนมัติ ไม่ให้พิมพ์เอง เพื่อให้ตัดสต๊อกตรงหน่วย */
  unit: string
  /** เฉพาะ Fleet Cements: ประเภทงาน 3 แบบ แยกได้ต่อรายการ/ปลายทาง */
  jobType?: BookingJobType
  siteName: string
  /** จังหวัดของปลายทางนี้ ใช้จับคู่กับตั้งค่าน้ำมัน (จังหวัด+อำเภอ) เพื่อคำนวณลิตรน้ำมันมาตรฐานของรายการนี้ */
  province: string
  district: string
  siteContactName?: string
  sitePhone?: string
  /** พิกัด GPS ที่ parse ได้จากลิงก์/ข้อความที่ผู้ใช้กรอก */
  latitude?: number
  longitude?: number
  /** ข้อความ/ลิงก์ต้นฉบับที่ผู้ใช้กรอกไว้ (เช่น ลิงก์ Google Maps) เก็บคู่กับ latitude/longitude เสมอ */
  mapUrl?: string
  /** ต้นทาง/จุดรับสินค้าของรายการนี้ (ชื่อโรงงาน/คลัง) — ว่าง = ใช้ booking.origin (ต้นทางเดียวกันทั้งงาน) */
  pickupOriginName?: string
  /** สถานะการรับสินค้าที่ต้นทางของรายการนี้ — ไม่มีค่า = ยังไม่รับ (PENDING) */
  pickupStatus?: 'PENDING' | 'PICKED_UP'
  /** ลำดับที่คนขับเลือกไปรับสินค้ารายการนี้ (0 = รับก่อนสุด) กำหนดตอนกดรับสินค้าจริง */
  pickupSequence?: number
  pickedUpAt?: Date
  /** ลำดับการส่งของ = สลับกลับจาก pickupSequence โดยอัตโนมัติเมื่อรับสินค้าครบทุกรายการแล้ว (รับหลังสุด = ส่งก่อนสุด) */
  deliverySequence?: number
  /** สถานะการส่งของของรายการนี้ — ไม่มีค่า = ยังไม่ส่ง (PENDING) */
  deliveryStatus?: 'PENDING' | 'DELIVERED'
  /** รูปหลักฐานการส่งมอบสินค้า (POD) ของรายการนี้โดยเฉพาะ */
  podImage?: string
  /** ชื่อผู้รับสินค้าที่ปลายทางนี้ */
  deliveredBy?: string
  deliveredAt?: Date
  /** ค่าเที่ยวของรายการนี้ — มีค่าเฉพาะงาน MULTI_DESTINATION เท่านั้น (งาน SINGLE_DESTINATION ราคาทั้งหมดอยู่ที่ booking.tripFee แทน) */
  tripFee?: number
  /**
   * จำนวนเที่ยวสำหรับคิดราคา (pricing multiplier, itemTotal = tripFee * tripCount) — มีค่าเฉพาะงาน MULTI_DESTINATION, ค่าเริ่มต้น = 1
   * คำเตือน: นี่ไม่ใช่จำนวนครั้งที่รถวิ่งจริง — 1 Booking ยังคงเป็น 1 รถ/1 คนขับ/1 การจัดรถเสมอ ห้ามใช้ค่านี้แทนหรือปนกับแนวคิด "เที่ยวรถจริง"
   */
  tripCount?: number
  /** สินค้าอื่นที่ติดไปกับรายการนี้ (ปลายทางเดียวกัน) เพื่อบันทึกไว้เฉยๆ ไม่มีผลกับราคา/ค่าเที่ยวของงานเลย */
  extraProducts?: { product: string; qty: number; unit: string }[]
}

export interface Booking {
  id: string
  category: BookingCategory
  docNo: string
  /** เลขที่ใบปล่อยรถ ออกอัตโนมัติทีละงานตอนบันทึก เหมือน docNo */
  releaseNo?: string
  /** เลขที่ใบสั่งงาน (PO) จากลูกค้า ถ้ามี */
  po?: string
  /** id ของ SalesDocument ต้นทางที่สร้างงานนี้มา (ใบสั่งสินค้าที่อนุมัติแล้ว หรือใบเสนอราคา ถ้ามาจากทางลัด "สร้างใบสั่งงาน") ใช้ย้อนดูเอกสารต้นทาง */
  sourceDocumentId?: string
  /** วันที่ขนส่ง (แยกจากวันที่ลงข้อมูล/createdAt) */
  shipDate?: Date
  /** วันที่คาดว่ารถจะกลับ แก้ไขภายหลังได้ */
  returnDate?: Date
  /** เลขที่ชิพเม้น (ถ้ามี) — ระดับงาน เพราะเป็นเที่ยวรถเดียวกัน */
  shipmentNo?: string
  /** เส้นทางเดินรถทั้งเที่ยว เช่น กรุงเทพ-นครสวรรค์-เชียงใหม่ */
  route?: string
  /** ต้นทาง (จุดขึ้นสินค้า) ระดับงาน */
  origin?: string
  /** เลขที่อ้างอิงเอกสาร (ถ้ามี) */
  reference?: string
  /** รายละเอียดงาน */
  description?: string
  /** หมายเหตุ */
  note?: string
  customer: string
  /** รายการสินค้า/ปลายทางภายในงานนี้ (1 งานมีได้หลายรายการ) */
  items: JobItem[]
  allowance: number
  /** ค่าเที่ยวรวมทั้งเที่ยว — งาน SINGLE_DESTINATION กรอกตรงนี้โดยตรง, งาน MULTI_DESTINATION เป็นผลรวมที่คำนวณจาก items[].tripFee*tripCount เสมอ */
  tripFee: number
  /** โหมดคิดราคาของงานนี้ — ไม่มีค่า (undefined) ถือเป็น 'SINGLE_DESTINATION' เสมอ (ความเข้ากันได้กับข้อมูลเก่าใน localStorage) */
  pricingMode?: PricingMode
  /** ราคาที่ตกลงกับลูกค้าไว้ ใช้เทียบตอนตรวจสอบก่อนวางบิล แก้ไขได้อิสระตอน WAITING_DISPATCH เท่านั้น (หลังจากนั้นแก้ได้เฉพาะ admin) */
  agreedPrice: number
  /** โหมดส่วนลดของงานนี้ทั้งก้อน (คิดจากค่าเที่ยวรวม) — ไม่มีค่า = ไม่มีส่วนลด, ใช้ engine เดียวกับเอกสารขาย (documentTotals.ts) */
  discountMode?: 'percent' | 'fixed'
  /** ส่วนลดงานนี้เป็นเปอร์เซ็นต์ ใช้เมื่อ discountMode !== 'fixed' */
  discountPercent?: number
  /** ส่วนลดงานนี้เป็นจำนวนเงินตายตัว (บาท) ใช้เมื่อ discountMode === 'fixed' */
  discountAmount?: number
  /** อัตราภาษีมูลค่าเพิ่ม (%) ของงานนี้ — ไม่มีค่า/0 = ไม่มี VAT, ค่าเริ่มต้นดึงจาก documentSettingsStore.settings.vatRate ตอนสร้างงานใหม่ */
  vatRate?: number
  fuelLiters: number
  fuelRate: number
  plate?: string
  driverName?: string
  /** id ของ DriverRecord (stores/drivers.ts) ที่ตรงกับ driverName — เพิ่มเข้ามาคู่กับ driverName เพื่อจับคู่งานกับ
   * บัญชี login คนขับให้แม่นยำด้วย id แทนการเทียบชื่อ (string) ที่พลาดง่ายเวลารูปแบบชื่อไม่ตรงกัน (มี/ไม่มีคำนำหน้า
   * ฯลฯ) — งานเก่าก่อนมี field นี้จะไม่มีค่า ต้องรันสคริปต์จับคู่ย้อนหลัง (ดู utils/driverIdMigration.ts) หรือจ่ายงาน
   * ใหม่อีกครั้งถึงจะได้ค่านี้ ทุกจุดที่ใช้ driverId ต้อง fallback ไปเทียบ driverName เดิมเสมอสำหรับงานที่ยังไม่มีค่านี้ */
  driverId?: string
  /** เลขไมล์เริ่มต้น (กม.) ก่อนออกเที่ยวนี้ กรอกตอนจัดรถ ใช้คำนวณระยะทาง/อัตราสิ้นเปลืองน้ำมัน */
  odometerBefore?: number
  /** เลขไมล์สิ้นสุด (กม.) เมื่อกลับถึง กรอกตอนจบงาน */
  odometerAfter?: number
  status: BookingStatus
  debtAdjustments?: DebtAdjustment[]
  /** เบี้ยเลี้ยงหลังกระทบยอดเพิ่ม/ลดหนี้ ตอนกดจบงาน */
  finalAllowance?: number
  /** รูปหลักฐานการส่งมอบสินค้า (POD) ล่าสุด = ของปลายทางสุดท้ายที่ส่งสำเร็จ เก็บไว้ที่ระดับงานเพื่อความเข้ากันได้กับหน้าจอที่แสดง POD เดียว */
  podImage?: string
  /** สถานะการเงิน เป็นอิสระจาก status (BookingStatus) โดยสิ้นเชิง — ค่าเริ่มต้น UNBILLED เสมอ เปลี่ยนได้เฉพาะผ่านหน้าใบวางบิล (addBookingsToBatch / issueInvoiceFromBatch) เท่านั้น */
  billingStatus?: BillingStatus
  /** ค่าใช้จ่ายเพิ่มเติมที่เรียกเก็บลูกค้า เพิ่มได้ตอนตรวจสอบรอบบิล */
  extraCharges?: ExtraCharge[]
  /** รอบบิลที่งานนี้ถูกจัดเข้าไป (ถ้ามี) */
  batchId?: string
  createdAt: Date
  dispatchedAt?: Date
  /** เวลาที่คนขับกดรับน้ำมัน (สถานะ FUEL_RECEIVED) */
  fuelReceivedAt?: Date
  /** เวลาที่รับสินค้าครบทุกรายการที่ต้นทาง (สถานะ LOADED) — ตั้งอัตโนมัติเมื่อรายการสุดท้ายถูกกดรับสินค้า (ตัดสต๊อกทีละรายการตอนกดรับ ไม่รอครบ) */
  goodsReceivedAt?: Date
  /** ผู้ดำเนินการรับสินค้ารายการสุดท้าย (ปกติคือชื่อคนขับที่ล็อกอินอยู่) */
  goodsReceivedBy?: string
  transitStartedAt?: Date
  completedAt?: Date
  billedAt?: Date
}

export type WHTPayeeType = 'driver' | 'vendor_fleet' | 'vendor' | 'other'

/** หนังสือรับรองการหักภาษี ณ ที่จ่าย (ภ.ง.ด.3/53) ออกเมื่อบริษัทจ่ายเงินให้คนขับ/รถร่วม/ผู้จำหน่าย */
export interface WHTCertificate {
  id: string
  number: string
  payeeType: WHTPayeeType
  payeeName: string
  payeeAddress: string
  /** เลขประจำตัวผู้เสียภาษี หรือเลขบัตรประชาชน */
  payeeTaxId: string
  payDate: Date
  /** ประเภทเงินได้ที่จ่าย เช่น ค่าขนส่ง, ค่าเช่ารถ */
  incomeType: string
  /** จำนวนเงินที่จ่ายเต็ม (ก่อนหักภาษี) */
  grossAmount: number
  /** อัตราภาษีหัก ณ ที่จ่าย (%) */
  whtRate: number
  note?: string
  createdAt: Date
}

export interface LogEntry {
  id: string
  timestamp: Date
  /** ชื่อผู้ทำรายการ (จากบัญชีที่ล็อกอินอยู่) */
  actor: string
  /** คำอธิบายรายการที่ทำ */
  action: string
  /** อ้างอิงงาน/รายการวางบิล/เอกสาร ที่เกี่ยวข้องกับรายการนี้ (ไม่บังคับ) ใช้กรองประวัติเฉพาะรายการนั้นๆ */
  bookingId?: string
  batchId?: string
  docId?: string
}

export interface BillingBatch {
  id: string
  /** เลขที่วางบิล (เช่น VB2569-0001) ออกให้อัตโนมัติครั้งเดียวตอนสร้างรายการวางบิล ใช้เป็นตัวระบุหลักแทน label */
  number: string
  label: string
  /** ถ้าระบุ = รายการวางบิลเฉพาะลูกค้ารายนี้ ถ้าไม่ระบุ = รวมทุกลูกค้าในช่วงวันที่ */
  customer?: string
  dateFrom: Date
  dateTo: Date
  bookingIds: string[]
  createdAt: Date
  /**
   * workflow ของรายการวางบิลนี้เอง (แยกจาก Booking.billingStatus และ SalesDocument.status โดยเจตนา)
   * BILLING_PENDING: สร้างรายการแล้ว รอออกเอกสารวางบิล/ใบแจ้งหนี้
   * BILLED: ออกเอกสารวางบิล/ใบแจ้งหนี้ครบทุกงานในรายการแล้ว
   * WAITING_PAYMENT: ส่งเอกสารให้ลูกค้าครบแล้ว รอรับชำระ
   * PAID: รับชำระครบถ้วนแล้ว
   * CLOSED: ปิดรายการแล้ว (กดปิดเองหลังชำระครบ)
   */
  status: 'BILLING_PENDING' | 'BILLED' | 'WAITING_PAYMENT' | 'PAID' | 'CLOSED'
}

export interface Job {
  id: string
  bookingId: string
  driver: string
  vehicle: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  progress: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  contact?: string
  totalJobs: number
  totalAmount: number
  status: 'active' | 'inactive'
}

export interface Vendor {
  id: string
  name: string
  phone: string
  contact?: string
  address?: string
  category: string
  status: 'active' | 'inactive'
}

export interface StaffMember {
  id: string
  name: string
  phone: string
  position: string
  idCard?: string
  lineId?: string
  status: 'active' | 'inactive'
}

export interface Driver {
  id: string
  name: string
  phone: string
  code?: string
  vehicle?: string
  status: 'available' | 'busy' | 'off-duty' | 'inactive'
  totalTrips: number
  monthlyIncome: number
  rating: number
  /** ข้อมูลตั้งค่าคนขับ ตามเอกสารความต้องการ */
  idCard?: string
  address?: string
  lineId?: string
  bankAccount?: string
}

export type VehicleType = 'รถบริษัท' | 'รถร่วม' | 'รถหุ้นส่วน'

export interface Vehicle {
  id: string
  /** ทะเบียนรถ */
  plate: string
  /** ทะเบียนจังหวัด */
  plateProvince: string
  /** เบอร์รถ */
  vehicleNo: string
  /** ทะเบียนหาง */
  trailerPlate?: string
  /** ยี่ห้อ */
  brand: string
  /** ลักษณะรถ */
  bodyType: string
  /** เลขตัวถัง */
  chassisNo: string
  /** เลขเครื่อง */
  engineNo: string
  /** หน่วยงาน (ประเภทรถ) */
  department: VehicleType
  /** เลขไมล์ */
  mileage: number
  repairStatus?: string
  repairDays?: number
  /** รหัสคนขับประจำรถคันนี้ (ผูกกับ DriverRecord.code) ไม่บังคับต้องมี และเปลี่ยนได้ภายหลังเสมอ — แก้ไขผ่าน vehiclesStore.assignDriver() เท่านั้น เพื่อให้ทุกหน้าเห็นข้อมูลตรงกัน */
  driverCode?: string
}

export interface Document {
  id: string
  number: string
  type: 'quote' | 'invoice' | 'receipt' | 'shipment'
  jobId: string
  customer: string
  date: Date
  amount: number
}

export interface Bill {
  id: string
  number: string
  customer: string
  jobId: string
  date: Date
  dueDate: Date
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

export interface DriverIncome {
  id: string
  driver: string
  period: string
  trips: number
  baseIncome: number
  bonus: number
  penalty: number
  netIncome: number
  paymentStatus: 'pending' | 'paid' | 'overdue'
}

export interface KPI {
  label: string
  value: string | number
  icon: string
  color: string
  soft: string
  delta: string
  deltaIcon: string
  deltaColor: string
  deltaNote: string
}

export interface DashboardStats {
  totalRevenue: number
  totalTrips: number
  activeTrips: number
  efficiency: number
}
