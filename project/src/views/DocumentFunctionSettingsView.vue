<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">ฟังก์ชั่นเอกสาร</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-2">
      <div class="font-bold text-text">ตั้งค่าราคาที่แสดงในเอกสาร</div>
      <div class="text-xs text-muted">แสดงราคาสินค้าหรือบริการในเอกสาร เป็นราคารวมภาษี หรือราคาไม่รวมภาษี</div>
      <select v-model="documentSettingsStore.settings.priceDisplay" class="input-field w-full max-w-xs mt-2">
        <option value="exclusive">ราคาไม่รวมภาษี</option>
        <option value="inclusive">ราคารวมภาษี</option>
      </select>
    </div>

    <div class="card-lg space-y-2">
      <div class="font-bold text-text">อัตราภาษี</div>
      <div class="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">อัตราภาษีมูลค่าเพิ่ม (%)</label>
          <input v-model.number="documentSettingsStore.settings.vatRate" type="number" step="0.01" class="input-field w-full" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">อัตราหัก ณ ที่จ่าย (%)</label>
          <input v-model.number="documentSettingsStore.settings.whtRate" type="number" step="0.01" class="input-field w-full" />
        </div>
      </div>
    </div>

    <div class="card-lg space-y-3">
      <div>
        <div class="font-bold text-text">ตั้งค่าภาษีมูลค่าเพิ่ม ส่วนลด และหัก ณ ที่จ่าย</div>
        <div class="text-xs text-muted">ตั้งค่ารูปแบบการคำนวณ เมื่อสินค้าและบริการแต่ละรายการมีภาษีมูลค่าเพิ่ม ส่วนลด หรือภาษีหัก ณ ที่จ่าย ที่ไม่เท่ากัน</div>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-surface-2 rounded-lg p-4 space-y-3">
          <div class="font-semibold text-text text-sm">เอกสารขาย</div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ภาษีมูลค่าเพิ่ม</label>
            <select v-model="documentSettingsStore.settings.calcMode.sales.vat" class="input-field w-full">
              <option value="separate">แยกรายการ</option>
              <option value="included">รวมในราคา</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ส่วนลด</label>
            <select v-model="documentSettingsStore.settings.calcMode.sales.discount" class="input-field w-full">
              <option value="separate">แยกรายการ</option>
              <option value="included">รวมในราคา</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">หัก ณ ที่จ่าย</label>
            <select v-model="documentSettingsStore.settings.calcMode.sales.wht" class="input-field w-full">
              <option value="separate">แยกรายการ</option>
              <option value="included">รวมในราคา</option>
            </select>
          </div>
        </div>

        <div class="bg-surface-2 rounded-lg p-4 space-y-3">
          <div class="font-semibold text-text text-sm">เอกสารซื้อและค่าใช้จ่าย</div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ภาษีมูลค่าเพิ่ม</label>
            <select v-model="documentSettingsStore.settings.calcMode.purchase.vat" class="input-field w-full">
              <option value="separate">แยกรายการ</option>
              <option value="included">รวมในราคา</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">ส่วนลด</label>
            <select v-model="documentSettingsStore.settings.calcMode.purchase.discount" class="input-field w-full">
              <option value="separate">แยกรายการ</option>
              <option value="included">รวมในราคา</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">หัก ณ ที่จ่าย</label>
            <select v-model="documentSettingsStore.settings.calcMode.purchase.wht" class="input-field w-full">
              <option value="separate">แยกรายการ</option>
              <option value="included">รวมในราคา</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card-lg space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="font-semibold text-text">แสดงรายการปรับลดท้ายเอกสารใบเสร็จรับเงิน</div>
          <div class="text-xs text-muted">แสดงรายการทักจากยอดจำนวนเงินรวมทั้งสิ้นท้ายใบเสร็จรับเงิน เพื่อได้ยอดตะระที่เรียกเก็บเงินจริง</div>
        </div>
        <ToggleSwitch v-model="documentSettingsStore.settings.toggles.showAdjustmentRow" />
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="font-semibold text-text">แสดงคลังสินค้าบนเอกสาร</div>
          <div class="text-xs text-muted">เมื่อเปิดใช้งานจะแสดงคลังสินค้าที่หน้าเอกสารและตัดหรือเพิ่มสต๊อกจากคลังที่เลือก</div>
        </div>
        <ToggleSwitch v-model="documentSettingsStore.settings.toggles.showWarehouseOnDocument" />
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="font-semibold text-text">ตั้ง 'คลังหลัก' เป็นค่าเริ่มต้นในหน้าเอกสาร</div>
          <div class="text-xs text-muted">ใช้สำหรับการให้คลังสินค้าคลังหลักเป็นค่าเริ่มต้นในหน้าเอกสารให้อัตโนมัติ หากปิดการใช้งาน ผู้ใช้งานจะต้องเลือกเอง</div>
        </div>
        <ToggleSwitch v-model="documentSettingsStore.settings.toggles.defaultMainWarehouse" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useOnboardingStore } from '@/stores/onboarding'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const documentSettingsStore = useDocumentSettingsStore()
const onboardingStore = useOnboardingStore()

const saved = ref(false)
const save = () => {
  onboardingStore.markDone('configuredDocumentSettings')
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>
