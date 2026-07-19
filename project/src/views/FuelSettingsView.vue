<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">ตั้งค่าน้ำมัน</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        เพิ่มอำเภอ
      </button>
    </div>
    <div class="text-xs text-muted">
      ตั้งค่าลิตรมาตรฐานต่อเที่ยวตามอำเภอ และราคาน้ำมัน ณ วันนี้ — ระบบจะดึงมากรอกให้อัตโนมัติตอนสร้างงานเมื่อกรอกอำเภอ (แก้ไขเองได้เพื่อป้องกันการโกงน้ำมัน)
    </div>

    <div class="card-lg">
      <div class="font-bold text-text mb-3">ราคาน้ำมัน ณ วันนี้</div>
      <div class="max-w-xs">
        <label class="block text-xs font-semibold text-muted mb-1">ราคาน้ำมัน (บาท/ลิตร)</label>
        <input v-model.number="fuelRateStore.settings.todayPricePerLiter" type="number" min="0" step="0.01" class="input-field w-full" />
        <div class="text-[11px] text-muted mt-1">ใช้เป็นเรทตั้งต้นทุกอำเภอ อัปเดตทุกวันที่ราคาน้ำมันเปลี่ยน</div>
      </div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[560px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">อำเภอ</th>
            <th class="px-4 py-3 font-semibold text-right">ลิตรมาตรฐาน/เที่ยว</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rate, idx) in fuelRateStore.settings.rates" :key="rate.district" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ rate.district }}</td>
            <td class="px-4 py-3 text-right text-text">{{ rate.liters }} ลิตร</td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button @click="openDialog(rate)" class="btn-sm">แก้ไข</button>
                <button @click="removeRate(idx)" class="btn-sm text-red-600">ลบ</button>
              </div>
            </td>
          </tr>
          <tr v-if="fuelRateStore.settings.rates.length === 0">
            <td colspan="3" class="px-4 py-8 text-center text-muted">ยังไม่มีข้อมูลอำเภอ</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingIndex === null ? 'เพิ่มอำเภอ' : 'แก้ไขอำเภอ' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">อำเภอ</label>
              <input v-model="form.district" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ลิตรมาตรฐาน/เที่ยว</label>
              <input v-model.number="form.liters" type="number" min="0" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="!form.district" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFuelRateStore, type FuelRate } from '@/stores/fuelRates'

const fuelRateStore = useFuelRateStore()

const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
const form = ref<FuelRate>({ district: '', liters: 0 })

const openDialog = (rate?: FuelRate) => {
  if (rate) {
    editingIndex.value = fuelRateStore.settings.rates.findIndex((r) => r.district === rate.district)
    form.value = { ...rate }
  } else {
    editingIndex.value = null
    form.value = { district: '', liters: 0 }
  }
  showDialog.value = true
}

const save = () => {
  if (!form.value.district) return
  if (editingIndex.value === null) {
    fuelRateStore.settings.rates.unshift({ ...form.value })
  } else {
    fuelRateStore.settings.rates[editingIndex.value] = { ...form.value }
  }
  showDialog.value = false
}

const removeRate = (idx: number) => {
  fuelRateStore.settings.rates.splice(idx, 1)
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
