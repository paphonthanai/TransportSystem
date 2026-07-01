<template>
  <div class="text-center py-12">
    <span class="material-symbols-rounded text-6xl text-muted mb-4 block">construction</span>
    <h2 class="text-2xl font-bold text-text mb-2">{{ screenName }}</h2>
    <p class="text-muted">หน้านี้อยู่ในการพัฒนา</p>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({
  screenName: {
    type: String,
    default: 'Page',
  },
})
</script>
