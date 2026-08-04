<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">ตั้งค่าสินค้า</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        เพิ่มสินค้า
      </button>
    </div>
    <div class="text-xs text-muted">
      รายการสินค้า/สินค้าขนส่งของลูกค้า (เช่น ปูนซีเมนต์ พาเลท) ใช้จับคู่กับงานขนส่งเพื่อตัดสต๊อกอัตโนมัติเมื่อส่งของสำเร็จ
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[640px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">รหัสสินค้า</th>
            <th class="px-4 py-3 font-semibold">ชื่อสินค้า</th>
            <th class="px-4 py-3 font-semibold">หน่วยนับ</th>
            <th class="px-4 py-3 font-semibold">หมวดหมู่</th>
            <th class="px-4 py-3 font-semibold text-right">คงเหลือ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in inventoryStore.products" :key="product.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ product.code }}</td>
            <td class="px-4 py-3 text-text">{{ product.name }}</td>
            <td class="px-4 py-3 text-muted">{{ product.unit }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{{ categoryLabel[product.category] }}</span>
            </td>
            <td class="px-4 py-3 text-right font-bold text-text">{{ inventoryStore.stockBalance(product.id) }} {{ product.unit }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="openDialog(product)" class="btn-sm">แก้ไข</button>
            </td>
          </tr>
          <tr v-if="inventoryStore.products.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีสินค้า</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingId === null ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">รหัสสินค้า</label>
              <input v-model="form.code" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อสินค้า</label>
              <input v-model="form.name" placeholder="เช่น ปูนซีเมนต์ M402, พาเลทไม้" class="input-field w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">หน่วยนับ</label>
                <input v-model="form.unit" placeholder="เช่น ตัน, แผ่น, ชิ้น" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">หมวดหมู่</label>
                <select v-model="form.category" class="input-field w-full">
                  <option value="cements">Fleet Cements</option>
                  <option value="ceramics">Fleet Ceramics</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ราคาต่อหน่วย (ถ้ามี)</label>
                <input v-model.number="form.price" type="number" min="0" placeholder="0.00" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">อัตรา VAT % (ถ้ามี)</label>
                <input v-model.number="form.vatRate" type="number" min="0" max="100" placeholder="7" class="input-field w-full" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
              <input v-model="form.description" placeholder="รายละเอียดสินค้าสำหรับใช้ในเอกสาร" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="!form.name" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useInventoryStore, type Product } from '@/stores/inventory'

const inventoryStore = useInventoryStore()

const categoryLabel: Record<Product['category'], string> = {
  cements: 'Fleet Cements',
  ceramics: 'Fleet Ceramics',
  other: 'อื่นๆ',
}

const showDialog = ref(false)
const editingId = ref<string | null>(null)
const form = ref<Omit<Product, 'id'>>({ code: '', name: '', unit: '', category: 'other', price: undefined, vatRate: undefined, description: '' })

const openDialog = (product?: Product) => {
  if (product) {
    editingId.value = product.id
    form.value = {
      code: product.code,
      name: product.name,
      unit: product.unit,
      category: product.category,
      price: product.price,
      vatRate: product.vatRate,
      description: product.description ?? '',
    }
  } else {
    editingId.value = null
    form.value = { code: '', name: '', unit: '', category: 'other', price: undefined, vatRate: undefined, description: '' }
  }
  showDialog.value = true
}

const save = () => {
  if (!form.value.name) return
  if (editingId.value === null) {
    inventoryStore.addProduct({ ...form.value })
  } else {
    inventoryStore.updateProduct(editingId.value, { ...form.value })
  }
  showDialog.value = false
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
