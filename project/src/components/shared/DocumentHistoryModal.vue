<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 class="text-base font-bold text-text">ประวัติเอกสาร {{ number }}</h3>
          <button @click="$emit('close')" class="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2">
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        <div class="px-5 py-4 overflow-y-auto">
          <EntityTimeline :doc-id="docId" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import EntityTimeline from '@/components/shared/EntityTimeline.vue'

defineProps<{ open: boolean; docId: string; number: string }>()
defineEmits<{ close: [] }>()
</script>
