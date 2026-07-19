import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Booking } from '@/types'

const PRODUCTS_KEY = 'tms_products_v1'
const MOVEMENTS_KEY = 'tms_stock_movements_v1'

export interface Product {
  id: string
  code: string
  name: string
  unit: string
  category: 'cements' | 'ceramics' | 'other'
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

function reviveMovement(raw: any): StockMovement {
  return { ...raw, date: new Date(raw.date) }
}

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall back to seed data
  }
  return [
    { id: 'p1', code: 'CM-M401', name: 'ปูนซีเมนต์ M401', unit: 'ตัน', category: 'cements' },
    { id: 'p2', code: 'CM-M402', name: 'ปูนซีเมนต์ M402', unit: 'ตัน', category: 'cements' },
    { id: 'p3', code: 'PL-WOOD', name: 'พาเลทไม้', unit: 'แผ่น', category: 'other' },
  ]
}

function loadMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY)
    if (raw) return JSON.parse(raw).map(reviveMovement)
  } catch {
    // corrupt/inaccessible storage, fall back to empty list
  }
  return []
}

export const useInventoryStore = defineStore('inventory', () => {
  const products = ref<Product[]>(loadProducts())
  const movements = ref<StockMovement[]>(loadMovements())

  watch(products, (val) => localStorage.setItem(PRODUCTS_KEY, JSON.stringify(val)), { deep: true })
  watch(movements, (val) => localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === PRODUCTS_KEY && e.newValue) {
      products.value = JSON.parse(e.newValue)
    }
    if (e.key === MOVEMENTS_KEY && e.newValue) {
      movements.value = JSON.parse(e.newValue).map(reviveMovement)
    }
  })

  function addProduct(data: Omit<Product, 'id'>) {
    const product: Product = { ...data, id: `prod${Date.now()}` }
    products.value.unshift(product)
    return product
  }

  function updateProduct(id: string, data: Partial<Omit<Product, 'id'>>) {
    const product = products.value.find((p) => p.id === id)
    if (!product) return
    Object.assign(product, data)
  }

  function addMovement(data: Omit<StockMovement, 'id' | 'date'> & { date?: Date }) {
    const movement: StockMovement = { ...data, id: `mv${Date.now()}${Math.random().toString(36).slice(2, 6)}`, date: data.date || new Date() }
    movements.value.unshift(movement)
    return movement
  }

  function stockBalance(productId: string) {
    return movements.value
      .filter((m) => m.productId === productId)
      .reduce((sum, m) => sum + (m.type === 'in' ? m.qty : -m.qty), 0)
  }

  /**
   * ตัดสต๊อกอัตโนมัติเมื่องานส่งของสำเร็จ โดยจับคู่ชื่อสินค้ากับ cementTypes ของงาน (best-effort)
   * คืนค่าสรุปรายการที่ตัดสต๊อกสำเร็จ/ไม่พบสินค้า ให้ผู้เรียกนำไปบันทึก log เอง (กันปัญหา circular import กับ booking store)
   */
  function recordDeliveryMovement(booking: Booking): { matched: string[]; unmatched: string[] } {
    const productNames = booking.cementTypes?.length ? booking.cementTypes : booking.category === 'ceramics' ? ['ปูนซีเมนต์'] : []
    const result = { matched: [] as string[], unmatched: [] as string[] }
    if (productNames.length === 0) return result
    const qty = booking.qty || booking.weight || 1
    productNames.forEach((name) => {
      const product = products.value.find((p) => p.name === name || name.includes(p.name))
      if (!product) {
        result.unmatched.push(name)
        return
      }
      addMovement({ productId: product.id, type: 'out', qty, refBookingId: booking.id, note: `ส่งของสำเร็จ ${booking.docNo}` })
      result.matched.push(`${product.name} ${qty} ${product.unit}`)
    })
    return result
  }

  return {
    products,
    movements,
    addProduct,
    updateProduct,
    addMovement,
    stockBalance,
    recordDeliveryMovement,
  }
})
