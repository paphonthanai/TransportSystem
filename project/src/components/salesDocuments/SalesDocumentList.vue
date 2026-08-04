<template>
  <div class="card-lg overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-surface-2 border-b border-border">
        <tr>
          <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
          <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
          <th class="text-left px-4 py-3 font-semibold text-muted">วันที่</th>
          <th class="text-right px-4 py-3 font-semibold text-muted">ยอดรวม</th>
          <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
          <th class="text-left px-4 py-3 font-semibold text-muted"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="doc in docs" :key="doc.id" class="border-b border-border hover:bg-surface-2 transition-colors">
          <td class="px-4 py-3 font-bold text-primary">{{ doc.number }}</td>
          <td class="px-4 py-3 font-semibold text-text">{{ doc.customer }}</td>
          <td class="px-4 py-3 text-muted">{{ formatDate(doc.date) }}</td>
          <td class="px-4 py-3 text-right font-semibold text-text">{{ formatBaht(doc.amount) }}</td>
          <td class="px-4 py-3">
            <span class="text-xs font-semibold px-2 py-1 rounded-full" :class="salesDocumentStatusClass(doc.type, doc.status)">
              {{ salesDocumentStatusLabel(doc.type, doc.status) }}
            </span>
          </td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <slot name="actions" :doc="doc" />
            </div>
          </td>
        </tr>
        <tr v-if="docs.length === 0">
          <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีเอกสาร</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSalesDocumentsStore, type SalesDocumentType } from '@/stores/salesDocuments'
import { salesDocumentStatusLabel, salesDocumentStatusClass } from '@/utils/salesDocumentStatus'

const props = defineProps<{ documentType: SalesDocumentType }>()

const salesDocumentsStore = useSalesDocumentsStore()

const docs = computed(() => salesDocumentsStore.documents.filter((d) => d.type === props.documentType))

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')
</script>

<style scoped>
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
