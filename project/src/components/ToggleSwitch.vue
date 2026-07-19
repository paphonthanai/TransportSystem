<template>
  <button
    type="button"
    @click="$emit('update:modelValue', !modelValue)"
    :class="['relative w-11 h-6 rounded-full transition-colors flex-shrink-0', modelValue ? 'bg-primary' : 'bg-border']"
  >
    <span :class="['absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', modelValue ? 'translate-x-5' : '']"></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
