<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between no-print">
      <button @click="router.back()" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <button v-if="docExists" @click="printEnvelope" class="btn-primary">
        <span class="material-symbols-rounded text-base">print</span>
        พิมพ์
      </button>
    </div>

    <div v-if="!docExists" class="card-lg text-center text-muted py-12">ไม่พบเอกสาร</div>

    <div v-else id="envelope-area" class="envelope-sheet bg-white text-black border border-border rounded-xl shadow-default mx-auto p-10 max-w-2xl aspect-[7/4] relative">
      <div class="text-xs leading-relaxed max-w-[45%]">
        <div class="font-bold">{{ documentSettingsStore.settings.company.name }}</div>
        <div>{{ documentSettingsStore.settings.company.address }} {{ documentSettingsStore.settings.company.zipCode }}</div>
      </div>

      <div class="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-semibold">กรุณานำส่ง</div>

      <div class="absolute right-10 bottom-10 text-sm text-right max-w-[55%] ml-auto">
        <div class="text-base font-bold mb-1">คุณ {{ customerName }}</div>
        <div class="leading-relaxed">{{ customer.address ? `${customer.address} ${customer.zipCode || ''}`.trim() : 'ไม่มีข้อมูลที่อยู่' }}</div>
        <div v-if="customer.phone" class="mt-1">โทร: {{ customer.phone }}</div>
      </div>
    </div>

    <div v-if="docExists" class="text-center text-xs text-muted no-print">อ้างอิงเอกสารเลขที่ {{ docNumber }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()

const legacyDoc = computed(() => bookingStore.documents.find((d) => d.id === route.params.docId))
const newDoc = computed(() => salesDocumentsStore.documents.find((d) => d.id === route.params.docId))
const docExists = computed(() => !!legacyDoc.value || !!newDoc.value)

const customerName = computed(() => legacyDoc.value?.customer || newDoc.value?.customer || '')
const docNumber = computed(() => legacyDoc.value?.number || newDoc.value?.number || '')

/** ใบเสนอราคา/เอกสารกรอกเองมี snapshot ที่อยู่ลูกค้าเก็บไว้บนเอกสารเองอยู่แล้ว — ถ้าไม่มีค่อย fallback ไปสมุดรายชื่อลูกค้า */
const customer = computed(() => {
  const snapshot = newDoc.value
  if (snapshot?.customerAddress) {
    return { address: snapshot.customerAddress, zipCode: snapshot.customerZipCode, phone: customerStore.lookupCustomer(customerName.value).phone }
  }
  return customerStore.lookupCustomer(customerName.value)
})

const printEnvelope = () => window.print()
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

@media print {
  .no-print {
    display: none !important;
  }
  .envelope-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
}
</style>
