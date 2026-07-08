<template>
  <div class="flex justify-end items-center gap-2 mt-2">
    <button
      class="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted disabled:opacity-30"
      :disabled="page <= 1"
      @click="$emit('update:page', page - 1)"
    >
      <span class="material-symbols-rounded text-base">chevron_left</span>
    </button>
    <span class="text-xs text-muted">{{ page }}/{{ maxPage }}</span>
    <button
      class="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted disabled:opacity-30"
      :disabled="page >= maxPage"
      @click="$emit('update:page', page + 1)"
    >
      <span class="material-symbols-rounded text-base">chevron_right</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ page: number; total: number; perPage: number }>()
defineEmits<{ 'update:page': [page: number] }>()

const maxPage = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
</script>
