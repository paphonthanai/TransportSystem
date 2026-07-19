<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">คลังสินค้า</h2>
      <button @click="openAdjust()" class="btn-primary">
        <span class="material-symbols-rounded">tune</span>
        ปรับปรุงสต๊อก
      </button>
    </div>
    <div class="text-xs text-muted">
      สต๊อกสินค้าจะถูกตัดออกอัตโนมัติเมื่องานขนส่งที่จับคู่กับสินค้านี้ถูกกดจบงาน (ส่งของสำเร็จ) — สามารถปรับปรุงสต๊อกเข้า/ออกด้วยมือเพิ่มเติมได้
    </div>

    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">ยอดคงเหลือปัจจุบัน</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-3 py-2 font-semibold text-muted">รหัสสินค้า</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">ชื่อสินค้า</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">หน่วยนับ</th>
              <th class="text-right px-3 py-2 font-semibold text-muted">คงเหลือ</th>
              <th class="text-left px-3 py-2 font-semibold text-muted"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in inventoryStore.products" :key="product.id" class="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2 font-bold text-primary">{{ product.code }}</td>
              <td class="px-3 py-2 text-text">{{ product.name }}</td>
              <td class="px-3 py-2 text-muted">{{ product.unit }}</td>
              <td class="px-3 py-2 text-right font-bold text-text">{{ inventoryStore.stockBalance(product.id) }}</td>
              <td class="px-3 py-2 text-right">
                <button @click="openAdjust(product)" class="btn-sm">ปรับปรุง</button>
              </td>
            </tr>
            <tr v-if="inventoryStore.products.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีสินค้า — เพิ่มได้ที่ตั้งค่าสินค้า</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">ประวัติการเคลื่อนไหวสต๊อก</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-3 py-2 font-semibold text-muted">วันที่</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">สินค้า</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">ประเภท</th>
              <th class="text-right px-3 py-2 font-semibold text-muted">จำนวน</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="movement in recentMovements" :key="movement.id" class="border-b border-border last:border-0">
              <td class="px-3 py-2 text-muted">{{ formatDate(movement.date) }}</td>
              <td class="px-3 py-2 text-text">{{ productName(movement.productId) }}</td>
              <td class="px-3 py-2">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', movement.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                  {{ movement.type === 'in' ? 'รับเข้า' : 'ตัดออก' }}
                </span>
              </td>
              <td class="px-3 py-2 text-right font-semibold text-text">{{ movement.qty }}</td>
              <td class="px-3 py-2 text-muted text-xs">{{ movement.note || '-' }}</td>
            </tr>
            <tr v-if="recentMovements.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีการเคลื่อนไหวสต๊อก</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Manual Adjustment Modal -->
    <Teleport to="body" v-if="showAdjust">
      <div @click="showAdjust = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ปรับปรุงสต๊อก</div>
            <button @click="showAdjust = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">สินค้า</label>
              <select v-model="adjustForm.productId" class="input-field w-full">
                <option v-for="p in inventoryStore.products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ประเภทการปรับปรุง</label>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="adjustForm.type = 'in'"
                  :class="['flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all', adjustForm.type === 'in' ? 'bg-primary text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                >
                  รับเข้า
                </button>
                <button
                  type="button"
                  @click="adjustForm.type = 'out'"
                  :class="['flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all', adjustForm.type === 'out' ? 'bg-red-600 text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                >
                  ตัดออก
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">จำนวน</label>
              <input v-model.number="adjustForm.qty" type="number" min="0" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">หมายเหตุ</label>
              <input v-model="adjustForm.note" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showAdjust = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmAdjust" :disabled="!adjustForm.productId || !adjustForm.qty" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore, type Product } from '@/stores/inventory'

const inventoryStore = useInventoryStore()

const recentMovements = computed(() => inventoryStore.movements.slice(0, 30))

const productName = (productId: string) => inventoryStore.products.find((p) => p.id === productId)?.name || '-'

const formatDate = (date: Date) => new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })

const showAdjust = ref(false)
const adjustForm = ref({ productId: '', type: 'in' as 'in' | 'out', qty: 0, note: '' })

const openAdjust = (product?: Product) => {
  adjustForm.value = { productId: product?.id || inventoryStore.products[0]?.id || '', type: 'in', qty: 0, note: '' }
  showAdjust.value = true
}

const confirmAdjust = () => {
  if (!adjustForm.value.productId || !adjustForm.value.qty) return
  inventoryStore.addMovement({
    productId: adjustForm.value.productId,
    type: adjustForm.value.type,
    qty: adjustForm.value.qty,
    note: adjustForm.value.note || 'ปรับปรุงสต๊อกด้วยมือ',
  })
  showAdjust.value = false
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
