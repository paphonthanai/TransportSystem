export type BookingCategory = 'cements' | 'ceramics'

export type BookingJobType = 'ลงมือ' | 'พาเลทโรงงาน' | 'พาเลทฟรี'

/**
 * สถานะวงจรชีวิตของงาน (job lifecycle) แยกจากสถานะการเงิน (BillingStatus) โดยเจตนา
 * ตามหลักที่ว่า "ส่งของเสร็จ = งานจบ" ไม่เท่ากับ "วางบิล = แปลงงานเป็นเงิน"
 * WAITING_DISPATCH: ลงงานแล้ว รอจัดคนขับ/รถ/น้ำมัน (ราคาแก้ไขได้อิสระ)
 * PENDING_ACCEPT: จัดคนขับแล้ว รอคนขับตอบรับงานใน Driver App ภายใน 15 นาที ไม่งั้นถูกยกเลิกอัตโนมัติ กลับไป WAITING_DISPATCH
 * DISPATCHED: คนขับตอบรับงานแล้ว (ราคาถูกล็อก แก้ได้เฉพาะ admin)
 * IN_TRANSIT: คนขับกดเริ่มขนส่งแล้ว กำลังวิ่งงาน
 * DELIVERED: ส่งของสำเร็จแล้ว (มี POD หรือจบงานผ่านออฟฟิศ)
 */
export type BookingStatus = 'WAITING_DISPATCH' | 'PENDING_ACCEPT' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED'

/**
 * สถานะฝั่งการเงิน
 * UNBILLED: ยังไม่ถูกจัดเข้ารอบบิล (ปัจจุบันแทบไม่เกิดขึ้น เพราะงานเข้ารอบบิลอัตโนมัติทันทีที่จัดรถ)
 * IN_BATCH: อยู่ในรอบบิล (เข้าอัตโนมัติตั้งแต่ตอนจัดรถ ไม่ต้องรอส่งของสำเร็จ) รอตรวจสอบ/ออกใบแจ้งหนี้
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

export interface Booking {
  id: string
  category: BookingCategory
  docNo: string
  /** เลขที่ใบปล่อยรถ ออกอัตโนมัติทีละงานตอนบันทึก เหมือน docNo */
  releaseNo?: string
  /** เลขที่ใบสั่งงาน (PO) จากลูกค้า ถ้ามี */
  po?: string
  /** วันที่ขนส่ง (แยกจากวันที่ลงข้อมูล/createdAt) */
  shipDate?: Date
  /** วันที่คาดว่ารถจะกลับ แก้ไขภายหลังได้ */
  returnDate?: Date
  /** เลขที่ชิพเม้น (ถ้ามี) */
  shipmentNo?: string
  /** เส้นทางเดินรถ เช่น กรุงเทพ-นครสวรรค์ */
  route?: string
  /** ต้นทาง (จุดขึ้นสินค้า) */
  origin?: string
  /** ปลายทาง (จุดส่งสินค้า) แยกจากชื่อหน้างาน/อำเภอซึ่งเป็นรายละเอียดที่อยู่ปลายทาง */
  destination?: string
  customer: string
  siteName: string
  district: string
  /** เฉพาะ Fleet Cements: รหัสปูน 1-3 ชนิดต่อเที่ยว */
  cementTypes?: string[]
  /** เฉพาะ Fleet Cements: ประเภทงาน 3 แบบ */
  jobType?: BookingJobType
  /** น้ำหนักสินค้า (ตัน) เมื่อคิดค่าเที่ยวตามน้ำหนัก */
  weight?: number
  /** จำนวนสินค้า (ชิ้น) เมื่อคิดค่าเที่ยวตามจำนวนชิ้น */
  qty?: number
  allowance: number
  /** ค่าเที่ยวที่ใช้คำนวณจริง (ต้นทุน/เบี้ยเลี้ยง) */
  tripFee: number
  /** ราคาที่ตกลงกับลูกค้าไว้ ใช้เทียบตอนตรวจสอบก่อนวางบิล แก้ไขได้อิสระตอน WAITING_DISPATCH เท่านั้น (หลังจากนั้นแก้ได้เฉพาะ admin) */
  agreedPrice: number
  fuelLiters: number
  fuelRate: number
  siteContactName?: string
  sitePhone?: string
  siteCoords?: string
  plate?: string
  driverName?: string
  /** เลขไมล์เริ่มต้น (กม.) ก่อนออกเที่ยวนี้ กรอกตอนจัดรถ ใช้คำนวณระยะทาง/อัตราสิ้นเปลืองน้ำมัน */
  odometerBefore?: number
  /** เลขไมล์สิ้นสุด (กม.) เมื่อกลับถึง กรอกตอนจบงาน */
  odometerAfter?: number
  status: BookingStatus
  debtAdjustments?: DebtAdjustment[]
  /** เบี้ยเลี้ยงหลังกระทบยอดเพิ่ม/ลดหนี้ ตอนกดจบงาน */
  finalAllowance?: number
  /** รูปหลักฐานการส่งมอบสินค้า (Proof of Delivery) ที่คนขับแนบตอนกดจบงานจาก Driver App */
  podImage?: string
  /** สถานะการเงิน มีผลเมื่อ status เป็น DELIVERED เท่านั้น */
  billingStatus?: BillingStatus
  /** ค่าใช้จ่ายเพิ่มเติมที่เรียกเก็บลูกค้า เพิ่มได้ตอนตรวจสอบรอบบิล */
  extraCharges?: ExtraCharge[]
  /** รอบบิลที่งานนี้ถูกจัดเข้าไป (ถ้ามี) */
  batchId?: string
  createdAt: Date
  dispatchedAt?: Date
  /** เวลาที่คนขับกดรับน้ำมัน (ระหว่างสถานะ DISPATCHED ก่อนกดเริ่มขนส่ง) */
  fuelReceivedAt?: Date
  transitStartedAt?: Date
  /** เวลาที่คนขับกดส่งของ/ลงของเสร็จสิ้น (ระหว่างสถานะ IN_TRANSIT ก่อนกดจบงาน) */
  unloadedAt?: Date
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
}

export interface BillingBatch {
  id: string
  label: string
  /** ถ้าระบุ = รอบบิลเฉพาะลูกค้ารายนี้ ถ้าไม่ระบุ = รวมทุกลูกค้าในช่วงวันที่ */
  customer?: string
  dateFrom: Date
  dateTo: Date
  bookingIds: string[]
  createdAt: Date
  status: 'draft' | 'invoiced' | 'paid'
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
