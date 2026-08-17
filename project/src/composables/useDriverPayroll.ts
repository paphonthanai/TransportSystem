import { ref, computed } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useVehiclesStore } from '@/stores/vehicles'
import { usePayrollDeductionsStore } from '@/stores/payrollDeductions'
import { useDriverPaymentsStore } from '@/stores/driverPayments'
import { exportRowsToExcel } from '@/utils/exportExcel'
import type { Booking, VehicleType, DriverPaymentStatusValue } from '@/types'

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** แปลง "YYYY-MM" (ค.ศ.) เป็นรอบบัญชี พ.ศ. เช่น "2026-08" -> "2569-08" ใช้เป็น key จับคู่กับ PayrollDeduction.periodLabel */
function toBEPeriodLabel(monthValue: string): string {
  const [y, m] = monthValue.split('-')
  return `${Number(y) + 543}-${m}`
}

function inPeriod(booking: Booking, monthValue: string): boolean {
  const date = booking.shipDate || booking.completedAt
  if (!date) return false
  const d = new Date(date)
  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return value === monthValue
}

function destinationLabel(booking: Booking): string {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

/**
 * รวม logic เงินเดือนคนขับที่ใช้ร่วมกันทั้งหน้า "พนักงานขับรถ" (รถบริษัท) และหน้า "รถร่วม" (รถร่วมใน/นอก/หุ้นส่วน)
 * แยกกันแค่ departmentFilter — ทุกอย่างอื่นเหมือนกันเป๊ะ (โหมดสรุป/รายเที่ยว, รอบเดือน, รายการหัก, Export Excel)
 */
export function useDriverPayroll(departmentFilter: (department: VehicleType | undefined) => boolean, exportPrefix: string) {
  const bookingStore = useBookingStore()
  const vehiclesStore = useVehiclesStore()
  const deductionsStore = usePayrollDeductionsStore()
  const paymentsStore = useDriverPaymentsStore()

  const mode = ref<'summary' | 'detail'>('summary')
  const period = ref(currentMonthValue())
  const selectedDriver = ref('')

  const periodLabel = computed(() => toBEPeriodLabel(period.value))

  const categoryFor = (booking: Booking): VehicleType | undefined =>
    booking.plate ? vehiclesStore.findByFullPlate(booking.plate)?.department : undefined

  /**
   * ชื่อคนขับที่ใช้เป็น key จับกลุ่มรายได้/หา deduction/payment status — อ่านจาก snapshot ที่บันทึกไว้บน Booking เอง
   * ตรงๆ (driverFirstName/driverLastName ณ ตอน dispatch) ไม่ไป match driverId กับทะเบียนคนขับปัจจุบันเพื่อเอาชื่อ
   * เพราะทะเบียนคนขับแก้ชื่อภายหลังได้ — ถ้าคำนวณเงินเดือนจากชื่อปัจจุบันของทะเบียน งานเก่าจะถูกคำนวณด้วยชื่อที่ไม่ตรงกับ
   * ตอนเกิดรายการจริง (ดู Booking.driverFirstName ใน types/index.ts) งานเก่าก่อนมี snapshot fields นี้ (ยังไม่ backfill)
   * fallback ไปใช้ driverName เดิมตรงๆ — payrollDeductions/driverPayments เองก็ผูกกับชื่อนี้ (ไม่ใช่ id) อยู่แล้ว จึงต้อง
   * resolve ชื่อให้นิ่งก่อนใช้เป็น key ร่วมกันทั้งหมด
   */
  const driverKeyFor = (booking: Booking): string => {
    if (booking.driverFirstName || booking.driverLastName) {
      return `${booking.driverFirstName || ''} ${booking.driverLastName || ''}`.trim()
    }
    return booking.driverName as string
  }

  /** driverId ของคนขับกลุ่มนี้ (ถ้ามี) — ดึงตรงจาก Booking.driverId ของงานใดงานหนึ่งในกลุ่มที่มีค่านี้อยู่แล้ว ไม่ match
   *  ชื่อกับทะเบียนคนขับ — ใช้พาไปหน้าออกเอกสารรายได้ (ต้องมี DriverRecord.id จริง) งานเก่าที่ยังไม่มี driverId (ยัง
   *  ไม่ backfill) จะไม่มีปุ่มนี้ให้ ต้อง backfill ก่อนถึงจะออกเอกสารได้ */
  const driverIdFor = (driverKey: string): string | undefined =>
    bookingsInScope.value.find((b) => driverKeyFor(b) === driverKey && b.driverId)?.driverId

  const bookingsInScope = computed(() =>
    bookingStore.bookings.filter(
      (b) => b.status === 'DELIVERED' && b.driverName && departmentFilter(categoryFor(b)) && inPeriod(b, period.value)
    )
  )

  const driverOptions = computed(() => [...new Set(bookingsInScope.value.map((b) => driverKeyFor(b)))].sort())

  const fuelCost = (booking: Booking) => Math.round((booking.fuelLiters || 0) * (booking.fuelRate || 0))

  const summaryRows = computed(() => {
    const byDriver = new Map<string, { trips: number; baseAllowance: number; debtNet: number; netIncome: number; fuelCost: number }>()
    bookingsInScope.value.forEach((b) => {
      const driver = driverKeyFor(b)
      const entry = byDriver.get(driver) || { trips: 0, baseAllowance: 0, debtNet: 0, netIncome: 0, fuelCost: 0 }
      const debtNet = b.debtAdjustments?.reduce((sum, d) => sum + d.amount, 0) || 0
      entry.trips += b.items.length
      entry.baseAllowance += b.allowance || 0
      entry.debtNet += debtNet
      entry.netIncome += b.finalAllowance ?? b.allowance ?? 0
      entry.fuelCost += fuelCost(b)
      byDriver.set(driver, entry)
    })
    return Array.from(byDriver.entries()).map(([driver, data]) => {
      const additionTotal = deductionsStore.additionsFor(driver, periodLabel.value).reduce((sum, d) => sum + d.amount, 0)
      const deductionTotal = deductionsStore.deductionsFor(driver, periodLabel.value).reduce((sum, d) => sum + d.amount, 0)
      const paymentStatus = paymentsStore.statusFor(driver, periodLabel.value)
      return { driver, ...data, additionTotal, deductionTotal, finalNet: data.netIncome + additionTotal - deductionTotal, paymentStatus }
    })
  })

  /** เปลี่ยนสถานะจ่ายรายได้คนขับของรอบที่กำลังดูอยู่ — ไม่แตะ Booking/Operational Status ใดๆ เลย (ดู driverPayments.ts) */
  const setPaymentStatus = (driver: string, status: DriverPaymentStatusValue) => paymentsStore.setStatus(driver, periodLabel.value, status)

  const detailRows = computed(() =>
    bookingsInScope.value
      .filter((b) => !selectedDriver.value || driverKeyFor(b) === selectedDriver.value)
      .map((b) => ({
        shipDate: b.shipDate || b.completedAt,
        shipmentNo: b.shipmentNo || b.docNo,
        siteName: destinationLabel(b),
        driverName: driverKeyFor(b),
        driverIncome: b.finalAllowance ?? b.allowance ?? 0,
        fuelCost: fuelCost(b),
      }))
      .sort((a, b) => (a.shipDate && b.shipDate ? new Date(a.shipDate).getTime() - new Date(b.shipDate).getTime() : 0))
  )

  const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')
  const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

  function exportSummary() {
    exportRowsToExcel(
      `${exportPrefix}-สรุป-${period.value}`,
      summaryRows.value.map((r) => ({
        คนขับ: r.driver,
        จำนวนเที่ยว: r.trips,
        เบี้ยเลี้ยงรวม: r.baseAllowance,
        'เพิ่ม/ลดหนี้สะสม': r.debtNet,
        รายได้สุทธิก่อนหัก: r.netIncome,
        รายได้อื่นๆ: r.additionTotal,
        รายการหักรวม: r.deductionTotal,
        รายได้สุทธิ: r.finalNet,
      }))
    )
  }

  function exportDetail() {
    exportRowsToExcel(
      `${exportPrefix}-รายเที่ยว-${period.value}`,
      detailRows.value.map((r) => ({
        วันที่ส่งงาน: formatDate(r.shipDate),
        เลขชิพเม้นท์: r.shipmentNo,
        ชื่อหน้างาน: r.siteName,
        คนขับ: r.driverName,
        รายได้คนขับ: r.driverIncome,
        ค่าน้ำมันที่ใช้: r.fuelCost,
      }))
    )
  }

  return {
    mode,
    period,
    periodLabel,
    selectedDriver,
    driverOptions,
    summaryRows,
    detailRows,
    driverIdFor,
    formatDate,
    formatBaht,
    exportSummary,
    exportDetail,
    setPaymentStatus,
  }
}
