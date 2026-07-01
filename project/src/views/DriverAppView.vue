<template>
  <div class="min-h-screen bg-primary flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div class="bg-gradient-to-r from-primary to-blue-700 text-white p-6">
        <div class="text-lg font-bold">Driver App</div>
        <div class="text-xs opacity-90">Mobile Application for Drivers</div>
      </div>
      <div class="p-6">
        <ComingSoon screenName="Driver App" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ComingSoon from '@/components/ComingSoon.vue'
</script>
