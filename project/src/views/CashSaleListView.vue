<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="text-xs text-muted">ขายเงินสด — เอกสารชำระเงินทันทีตอนสร้าง ไม่มีขั้นตอนติดตามการชำระ</div>
      <button @click="openBlankForm" class="btn-primary">
        <span class="material-symbols-rounded text-base">add</span>
        สร้างขายเงินสด
      </button>
    </div>

    <SalesDocumentList document-type="CASH_SALE">
      <template #actions="{ doc }">
        <button @click="router.push(`/documents/${doc.id}`)" class="btn-sm">
          <span class="material-symbols-rounded text-base">print</span>
          ดู/พิมพ์เอกสาร
        </button>
      </template>
    </SalesDocumentList>

    <SalesDocumentForm
      document-type="CASH_SALE"
      :open="formOpen"
      :initial="formInitial"
      @close="formOpen = false"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentPrefillStore } from '@/stores/documentPrefill'
import SalesDocumentList from '@/components/salesDocuments/SalesDocumentList.vue'
import SalesDocumentForm, { type SalesDocumentFormInitial } from '@/components/salesDocuments/SalesDocumentForm.vue'

const router = useRouter()
const salesDocumentsStore = useSalesDocumentsStore()
const documentPrefillStore = useDocumentPrefillStore()

const formOpen = ref(false)
const formInitial = ref<SalesDocumentFormInitial | null>(null)
/** เปิดหน้านี้มาจากดรอปดาวน์สถานะของใบเสนอราคา (สร้างใบกำกับภาษี/ใบเสร็จรับเงิน เงินสด) — เปิด modal พร้อมข้อมูลให้ทันที */
const sourceQuotationId = ref<string | undefined>()
const prefill = documentPrefillStore.consumePrefill(['QUOTATION'])
if (prefill) {
  formInitial.value = { customer: prefill.customer, items: prefill.items, creditDays: prefill.creditDays, reference: prefill.reference }
  sourceQuotationId.value = prefill.sourceId
  formOpen.value = true
}

const openBlankForm = () => {
  formInitial.value = null
  sourceQuotationId.value = undefined
  formOpen.value = true
}

const onSubmit = (payload: Parameters<typeof salesDocumentsStore.createCashSale>[0]) => {
  if (sourceQuotationId.value) {
    salesDocumentsStore.convertQuotationToCashSale(sourceQuotationId.value, payload)
  } else {
    salesDocumentsStore.createCashSale(payload)
  }
  formOpen.value = false
}
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}
</style>
