import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useVehiclesStore } from './vehicles'
import { vehicleRepository } from '@/repositories/vehicleRepository'
import type { Vehicle } from '@/types'

/**
 * บั๊กจริง (คนขับ 0035): เปลี่ยนรถประจำจาก 73-0388 เป็น 72-3379 แล้ว "เด้งกลับ" เป็น 0388 — รายชื่อรถโหลดครั้งเดียวตอนเปิดหน้า
 * (ไม่ realtime) และทุกการบันทึกเขียนทับทั้ง document จากสำเนาในเครื่อง เครื่องอื่นที่เปิดหน้าค้างไว้ตั้งแต่ก่อนเปลี่ยน (ยังเห็น
 * 0388 = รถประจำของ 0035) จัดรถให้ 0035 → ระบบล็อกทะเบียน 0388 + assignDriver เขียน 0388 กลับเป็นรถประจำ, แก้ข้อมูลรถคันใดก็
 * เขียน driverCode เก่ากลับไปด้วย
 */
const raw = (plate: string, driverCode?: string) => ({
  plate,
  plateProvince: 'สระบุรี',
  vehicleNo: '',
  trailerPlate: null,
  brand: '',
  bodyType: '',
  chassisNo: '',
  engineNo: '',
  department: 'รถบริษัท',
  year: null,
  mileage: 0,
  repairStatus: null,
  repairDays: null,
  driverCode: driverCode ?? null,
  allowedCategories: null,
})

const serverVehicle = async (id: string) => (await getDoc(doc(db as any, 'vehicles', id))).data() as Record<string, unknown>

beforeEach(async () => {
  vi.restoreAllMocks()
  await setDoc(doc(db as any, 'vehicles', 'v0388'), raw('73-0388', '0035'))
  await setDoc(doc(db as any, 'vehicles', 'v3379'), raw('72-3379'))
  setActivePinia(createPinia())
})

describe('รถประจำคนขับไม่เด้งกลับจากเครื่องที่ถือข้อมูลรถเก่า', () => {
  it('รายชื่อรถอัปเดตตามเซิร์ฟเวอร์แบบ realtime — เครื่องที่เปิดค้างเห็นรถประจำใหม่ทันที', async () => {
    let emit: ((v: Vehicle[]) => void) | undefined
    const real = vehicleRepository.subscribe
    vi.spyOn(vehicleRepository, 'subscribe').mockImplementation((onData, onError) => {
      emit = onData
      return real(onData, onError)
    })
    const store = useVehiclesStore()
    await vi.waitFor(() => expect(store.vehicles).toHaveLength(2))
    expect(store.vehicleForDriver('0035')?.plate).toBe('73-0388')

    // อีกเครื่องเปลี่ยนรถประจำของ 0035 เป็น 72-3379
    emit!(store.vehicles.map((v) => ({ ...v, driverCode: v.plate === '72-3379' ? '0035' : undefined })))
    expect(store.vehicleForDriver('0035')?.plate).toBe('72-3379')
  })

  it('แก้ข้อมูลรถจากสำเนาเก่าไม่เขียนคนขับประจำเก่ากลับไป', async () => {
    const store = useVehiclesStore()
    await vi.waitFor(() => expect(store.vehicles).toHaveLength(2))
    // อีกเครื่องย้าย 0035 ไปรถ 3379 แล้ว (เครื่องนี้ยังไม่รู้)
    await updateDoc(doc(db as any, 'vehicles', 'v0388'), { driverCode: null })
    await updateDoc(doc(db as any, 'vehicles', 'v3379'), { driverCode: '0035' })

    const stale = store.vehicles.find((v) => v.id === 'v0388')!
    const { id, repairStatus, repairDays, driverCode, ...details } = stale
    await store.updateVehicle('v0388', { ...details, mileage: 12345 })

    const after = await serverVehicle('v0388')
    expect(after.mileage).toBe(12345)
    expect(after.driverCode).toBeNull()
  })

  it('กำหนดคนขับประจำเขียนเฉพาะช่องคนขับ ไม่เขียนข้อมูลรถเก่าทับ และถอดคนขับจากรถคันอื่นทุกคัน', async () => {
    const store = useVehiclesStore()
    await vi.waitFor(() => expect(store.vehicles).toHaveLength(2))
    // อีกเครื่องแก้เลขไมล์รถ 3379 (เครื่องนี้ยังไม่รู้)
    await updateDoc(doc(db as any, 'vehicles', 'v3379'), { mileage: 999 })
    // ข้อมูลเพี้ยนที่ค้างอยู่: รถ 2 คันมีคนขับประจำคนเดียวกัน
    store.vehicles.find((v) => v.id === 'v3379')!.driverCode = '0035'

    await store.assignDriver('v3379', '0035')

    expect((await serverVehicle('v3379')).driverCode).toBe('0035')
    expect((await serverVehicle('v3379')).mileage).toBe(999)
    expect((await serverVehicle('v0388')).driverCode).toBeNull()
    expect(store.vehicles.filter((v) => v.driverCode === '0035').map((v) => v.id)).toEqual(['v3379'])
  })
})
