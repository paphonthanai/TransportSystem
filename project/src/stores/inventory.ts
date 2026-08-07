import { defineStore } from 'pinia'
import { ref } from 'vue'
import { productRepository } from '@/repositories/productRepository'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import type { Booking, JobItem } from '@/types'

export interface Product {
  id: string
  code: string
  name: string
  unit: string
  category: 'cements' | 'ceramics' | 'other'
  price?: number
  vatRate?: number
  description?: string
}

export interface StockMovement {
  id: string
  productId: string
  type: 'in' | 'out'
  qty: number
  date: Date
  refBookingId?: string
  note?: string
}

export const useInventoryStore = defineStore('inventory', () => {
  const products = ref<Product[]>([])
  const movements = ref<StockMovement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [productList, movementList] = await Promise.all([
        productRepository.getAll(),
        stockMovementRepository.getAll(),
      ])
      products.value = productList
      movements.value = movementList
    } catch (err: any) {
      error.value = err?.message || 'โหลดข้อมูลสินค้า/สต๊อกจาก Firestore ไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  fetchAll()

  function addProduct(data: Omit<Product, 'id'>) {
    const tempId = `prod${Date.now()}`
    const product: Product = { ...data, id: tempId }
    products.value.unshift(product)
    productRepository
      .create(data)
      .then((id) => {
        product.id = id
      })
      .catch((err: any) => {
        error.value = err?.message || 'บันทึกสินค้าไป Firestore ไม่สำเร็จ'
      })
    return product
  }

  function updateProduct(id: string, data: Partial<Omit<Product, 'id'>>) {
    const product = products.value.find((p) => p.id === id)
    if (!product) return
    Object.assign(product, data)
    productRepository.update(id, data).catch((err: any) => {
      error.value = err?.message || 'บันทึกสินค้าไป Firestore ไม่สำเร็จ'
    })
  }

  function addMovement(data: Omit<StockMovement, 'id' | 'date'> & { date?: Date }) {
    const movement: StockMovement = { ...data, id: `mv${Date.now()}${Math.random().toString(36).slice(2, 6)}`, date: data.date || new Date() }
    movements.value.unshift(movement)
    const { id: _id, ...payload } = movement
    stockMovementRepository
      .create(payload)
      .then((id) => {
        movement.id = id
      })
      .catch((err: any) => {
        error.value = err?.message || 'บันทึกรายการตัดสต๊อกไป Firestore ไม่สำเร็จ'
      })
    return movement
  }

  function stockBalance(productId: string) {
    return movements.value
      .filter((m) => m.productId === productId)
      .reduce((sum, m) => sum + (m.type === 'in' ? m.qty : -m.qty), 0)
  }

  /**
   * ตัดสต๊อกอัตโนมัติเมื่อคนขับกดรับสินค้าแต่ละรายการที่ต้นทาง (ดู pickupJobItem) ตัดตามจำนวนของรายการสินค้า (JobItem) นั้นโดยตรง
   * ไม่ระบุ items = ตัดทุกรายการของงานนี้ (เช่น ปิดงานฝั่งออฟฟิศแบบไม่ผ่าน flow ปกติ)
   * คืนค่าสรุปรายการที่ตัดสต๊อกสำเร็จ/ไม่พบสินค้า ให้ผู้เรียกนำไปบันทึก log เอง (กันปัญหา circular import กับ booking store)
   */
  function recordDeliveryMovement(booking: Booking, items?: JobItem[]): { matched: string[]; unmatched: string[] } {
    const result = { matched: [] as string[], unmatched: [] as string[] }
    ;(items ?? booking.items).forEach((item) => {
      const product = products.value.find((p) => p.name === item.product || item.product.includes(p.name))
      if (!product) {
        result.unmatched.push(item.product)
        return
      }
      addMovement({ productId: product.id, type: 'out', qty: item.qty, refBookingId: booking.id, note: `รับสินค้าที่ต้นทาง ${booking.docNo}` })
      result.matched.push(`${product.name} ${item.qty} ${product.unit}`)
    })
    return result
  }

  /**
   * คืนสต๊อกที่ตัดไปตอนรับสินค้า (ดู recordDeliveryMovement) เมื่อ Reset สถานะงานขนส่งย้อนกลับไปก่อนขั้นรับสินค้า
   * สร้างรายการ "in" ชดเชยแทนการลบรายการ "out" เดิม เพื่อรักษาประวัติการตัดสต๊อกไว้ตรวจสอบย้อนหลังได้ครบ
   */
  function reverseDeliveryMovement(booking: Booking, items: JobItem[]): { matched: string[]; unmatched: string[] } {
    const result = { matched: [] as string[], unmatched: [] as string[] }
    items.forEach((item) => {
      const product = products.value.find((p) => p.name === item.product || item.product.includes(p.name))
      if (!product) {
        result.unmatched.push(item.product)
        return
      }
      addMovement({ productId: product.id, type: 'in', qty: item.qty, refBookingId: booking.id, note: `คืนสต๊อกจากการ Reset สถานะงาน ${booking.docNo}` })
      result.matched.push(`${product.name} ${item.qty} ${product.unit}`)
    })
    return result
  }

  return {
    products,
    movements,
    loading,
    error,
    addProduct,
    updateProduct,
    addMovement,
    stockBalance,
    recordDeliveryMovement,
    reverseDeliveryMovement,
  }
})
