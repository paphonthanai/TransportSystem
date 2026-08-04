<template>
  <div class="flex items-center gap-4">
    <button @click="$emit('share')" :disabled="disabled" class="toolbar-btn" title="แชร์">
      <span class="material-symbols-rounded text-xl">share</span>
      <span class="text-[11px]">แชร์</span>
    </button>
    <button @click="$emit('print')" :disabled="disabled" class="toolbar-btn" title="พิมพ์">
      <span class="material-symbols-rounded text-xl">print</span>
      <span class="text-[11px]">พิมพ์</span>
    </button>
    <button @click="$emit('download')" :disabled="disabled" class="toolbar-btn" title="ดาวน์โหลด">
      <span class="material-symbols-rounded text-xl">download</span>
      <span class="text-[11px]">ดาวน์โหลด</span>
    </button>
    <div class="relative">
      <button @click="menuOpen = !menuOpen" class="toolbar-btn" title="เพิ่มเติม">
        <span class="material-symbols-rounded text-xl">more_horiz</span>
        <span class="text-[11px]">เพิ่มเติม</span>
      </button>
      <div v-if="menuOpen" v-click-outside="closeMenu" class="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg py-1 z-30 text-left">
        <button @click="onEnvelope" :disabled="disabled" class="menu-item disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">mail</span>
          พิมพ์จ่าหน้าซอง
        </button>
        <button @click="onHistory" class="menu-item">
          <span class="material-symbols-rounded text-base">history</span>
          ประวัติเอกสาร
        </button>
        <button @click="onSettings" class="menu-item">
          <span class="material-symbols-rounded text-base">settings</span>
          ตั้งค่าเอกสาร
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ share: []; print: []; download: []; envelope: []; history: []; settings: [] }>()

const menuOpen = ref(false)
const closeMenu = () => (menuOpen.value = false)

const onEnvelope = () => {
  closeMenu()
  emit('envelope')
}
const onHistory = () => {
  closeMenu()
  emit('history')
}
const onSettings = () => {
  closeMenu()
  emit('settings')
}

const vClickOutside = {
  mounted(el: HTMLElement & { _clickOutside?: (e: MouseEvent) => void }, binding: { value: () => void }) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el: HTMLElement & { _clickOutside?: (e: MouseEvent) => void }) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside, true)
  },
}
</script>

<style scoped>
.toolbar-btn {
  @apply flex flex-col items-center gap-0.5 text-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted;
}

.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 cursor-pointer text-left;
}
</style>
