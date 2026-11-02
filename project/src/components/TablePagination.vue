<template>
  <div class="flex items-center justify-between flex-wrap gap-3 text-sm mt-3">
    <div class="flex items-center gap-2 text-muted">
      แถวต่อหน้า
      <select :value="perPage" @change="$emit('update:perPage', Number(($event.target as HTMLSelectElement).value))" class="input-field w-20">
        <option v-for="n in PER_PAGE_OPTIONS" :key="n" :value="n">{{ n }}</option>
      </select>
      <span>แสดง {{ from.toLocaleString() }}–{{ to.toLocaleString() }} จาก {{ total.toLocaleString() }}</span>
    </div>
    <Pager class="!mt-0" :page="page" :total="total" :per-page="perPage" @update:page="$emit('update:page', $event)" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pager from '@/components/Pager.vue'
import { PER_PAGE_OPTIONS } from '@/composables/usePagedRows'

const props = defineProps<{ page: number; perPage: number; total: number }>()
defineEmits<{ 'update:page': [page: number]; 'update:perPage': [perPage: number] }>()

const from = computed(() => (props.total ? (props.page - 1) * props.perPage + 1 : 0))
const to = computed(() => Math.min(props.page * props.perPage, props.total))
</script>
