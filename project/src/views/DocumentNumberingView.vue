<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-text">เลขรันเอกสาร</h2>
      <button @click="save" class="btn-primary">
        <span class="material-symbols-rounded text-base">save</span>
        {{ saved ? 'บันทึกแล้ว' : 'บันทึกข้อมูล' }}
      </button>
    </div>

    <div class="card-lg space-y-5">
      <div v-for="doc in docTypes" :key="doc.key" class="border-b border-border last:border-0 pb-5 last:pb-0">
        <div class="font-semibold text-text mb-2">{{ doc.label }}</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">คำนำหน้าเลขที่</label>
            <input v-model="documentSettingsStore.settings.numbering[doc.key].prefix" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-muted mb-1">จำนวนหลัก</label>
            <input v-model.number="documentSettingsStore.settings.numbering[doc.key].padding" type="number" min="1" max="8" class="input-field w-full" />
          </div>
          <div>
            <div class="text-xs font-semibold text-muted mb-1">ตัวอย่างเลขที่เอกสาร</div>
            <div class="input-field w-full flex items-center bg-surface-2 text-text font-semibold">{{ preview(doc.key) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ตรวจสอบ/ซ่อม numberRegistry (Phase 1 Step 1 — แก้บัค "วางบิลรวมไม่ได้/เลขที่เอกสารถูกใช้ไปแล้ว") อ่านอย่างเดียว
         จนกว่าจะกด "ซ่อม (Backfill)" — ต้องรันบน Production จริงผ่านหน้านี้เท่านั้น (ดู
         salesDocumentsStore.checkDocumentNumberRegistryConsistency/backfillDocumentNumberRegistry) -->
    <div class="card-lg space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="font-semibold text-text">ตรวจสอบความสอดคล้องของเลขที่เอกสาร (numberRegistry)</div>
          <div class="text-xs text-muted mt-0.5">เทียบเลขที่เอกสารที่มีอยู่จริงกับทะเบียนเลขถาวร ก่อนเปลี่ยนวิธีออกเลขที่ Billing/Tax Invoice</div>
        </div>
        <button @click="runCheck" class="btn-secondary">
          <span class="material-symbols-rounded text-base">fact_check</span>
          ตรวจสอบ
        </button>
      </div>

      <div v-if="registryReport" class="space-y-3">
        <div v-if="registryReport.notReady" class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ข้อมูลเอกสารยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วกด "ตรวจสอบ" ใหม่อีกครั้ง
        </div>
        <div v-else class="overflow-auto border border-border rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 text-xs text-muted">
              <tr>
                <th class="text-left px-3 py-2 font-semibold">ประเภท</th>
                <th class="text-right px-3 py-2 font-semibold">เอกสารที่มีอยู่จริง</th>
                <th class="text-right px-3 py-2 font-semibold">sequence ปัจจุบัน</th>
                <th class="text-right px-3 py-2 font-semibold">sequence ที่แนะนำ (ขั้นต่ำ)</th>
                <th class="text-left px-3 py-2 font-semibold">เลขที่ยังไม่ได้ register</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in registryReport.perType" :key="t.type" class="border-t border-border">
                <td class="px-3 py-2 text-text">{{ salesDocumentTypeLabel[t.type] }} ({{ t.prefix }})</td>
                <td class="px-3 py-2 text-right text-text">{{ t.liveCount }}</td>
                <td class="px-3 py-2 text-right text-text">{{ t.currentSequenceValue }}</td>
                <td class="px-3 py-2 text-right" :class="t.recommendedMinSequence > t.currentSequenceValue ? 'text-red-600 font-semibold' : 'text-text'">
                  {{ t.recommendedMinSequence }}
                </td>
                <td class="px-3 py-2">
                  <span v-if="t.missingFromUsedNumbers.length === 0" class="text-xs text-green-700">ครบ</span>
                  <span v-else class="text-xs text-red-600">{{ t.missingFromUsedNumbers.length }} เลข — {{ t.missingFromUsedNumbers.slice(0, 5).join(', ') }}{{ t.missingFromUsedNumbers.length > 5 ? ' ...' : '' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!registryReport.notReady" class="flex items-center justify-between flex-wrap gap-3">
          <div class="text-xs text-muted">
            "ซ่อม" จะ register เลขที่ยังขาด + ดัน sequence ขึ้นให้ไม่ต่ำกว่าค่าที่แนะนำเท่านั้น ไม่ลด/ไม่ลบ/ไม่แก้เอกสารใดๆ ทั้งสิ้น
          </div>
          <button @click="runBackfill" class="btn-primary">
            <span class="material-symbols-rounded text-base">build</span>
            ซ่อม (Backfill)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useOnboardingStore } from '@/stores/onboarding'
import { useSalesDocumentsStore, type DocumentNumberRegistryConsistencyReport } from '@/stores/salesDocuments'
import { salesDocumentTypeLabel } from '@/utils/salesDocumentStatus'

const documentSettingsStore = useDocumentSettingsStore()
const onboardingStore = useOnboardingStore()
const salesDocumentsStore = useSalesDocumentsStore()

const registryReport = ref<DocumentNumberRegistryConsistencyReport | null>(null)
const runCheck = () => {
  registryReport.value = salesDocumentsStore.checkDocumentNumberRegistryConsistency()
}
const runBackfill = () => {
  if (!confirm('ยืนยัน Backfill numberRegistry? การกระทำนี้จะเพิ่มข้อมูลใน numberRegistry เท่านั้น ไม่แก้ไข/ลบเอกสารใดๆ')) return
  registryReport.value = salesDocumentsStore.backfillDocumentNumberRegistry()
}

const docTypes: { key: 'invoice' | 'receipt' | 'wht' | 'billingList' | 'quotation' | 'cashSale' | 'purchaseOrder' | 'salesOrder'; label: string }[] = [
  { key: 'quotation', label: 'ใบเสนอราคา' },
  { key: 'salesOrder', label: 'ใบสั่งสินค้า' },
  { key: 'billingList', label: 'รายการวางบิล' },
  { key: 'invoice', label: 'ใบแจ้งหนี้' },
  { key: 'receipt', label: 'ใบเสร็จรับเงิน' },
  { key: 'cashSale', label: 'ขายเงินสด' },
  { key: 'purchaseOrder', label: 'ใบสั่งซื้อ' },
  { key: 'wht', label: 'หนังสือรับรองหัก ณ ที่จ่าย' },
]

const preview = (key: 'invoice' | 'receipt' | 'wht' | 'billingList' | 'quotation' | 'cashSale' | 'purchaseOrder' | 'salesOrder') => {
  const cfg = documentSettingsStore.settings.numbering[key]
  // เอกสารฝั่ง Sales Document ใหม่ทั้งหมดใช้เลขที่แบบ {คำนำหน้า}{ปีเดือนวัน ค.ศ.}{เลขรัน} เช่น BL202608040001 —
  // ยกเว้นหนังสือรับรองหัก ณ ที่จ่าย (wht) ที่ยังเป็นระบบเดิม (ปี พ.ศ. + เลขรัน)
  if (key === 'wht') {
    const year = new Date().getFullYear() + 543
    return `${cfg.prefix}${year}-${String(1).padStart(cfg.padding || 1, '0')}`
  }
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${cfg.prefix}${yyyy}${mm}${dd}${String(1).padStart(cfg.padding || 1, '0')}`
}

const saved = ref(false)
const save = () => {
  onboardingStore.markDone('configuredDocumentSettings')
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}
</script>
