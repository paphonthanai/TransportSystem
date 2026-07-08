<template>
  <div :class="depth === 0 ? 'mb-1' : 'mb-0.5'">
    <!-- Group with children (may also be directly navigable) -->
    <template v-if="item.children">
      <div class="w-full flex items-center gap-1">
        <button
          @click="handleLabelClick"
          class="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface-2 hover:text-text transition-all text-left"
          :class="[
            isActive ? 'bg-primary-soft text-primary font-semibold' : (hasActiveDescendant ? 'text-primary font-semibold' : ''),
            depth > 0 ? 'text-xs py-1.5' : '',
          ]"
        >
          <span class="material-symbols-rounded" :class="depth === 0 ? 'text-lg' : 'text-base'">{{ item.icon }}</span>
          <span class="flex-1 text-left">{{ item.label }}</span>
        </button>
        <button
          @click="toggleOpen"
          class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-all"
        >
          <span class="material-symbols-rounded text-base transition-transform" :class="[isOpen ? 'rotate-180' : '']">
            expand_more
          </span>
        </button>
      </div>
      <div v-if="isOpen" class="mt-1 ml-4 pl-3 border-l border-border space-y-0.5">
        <SidebarMenuItem
          v-for="child in item.children"
          :key="child.id"
          :item="child"
          :depth="depth + 1"
          @navigate="emit('navigate', $event)"
        />
      </div>
    </template>

    <!-- Leaf item -->
    <button
      v-else
      @click="emit('navigate', item.route)"
      class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface-2 hover:text-text transition-all"
      :class="[
        isActive ? 'bg-primary-soft text-primary font-semibold' : '',
        depth > 0 ? 'text-xs py-1.5' : '',
      ]"
    >
      <span class="material-symbols-rounded" :class="depth === 0 ? 'text-lg' : 'text-base'">{{ item.icon }}</span>
      <span class="flex-1 text-left">{{ item.label }}</span>
      <span
        v-if="item.badge"
        class="text-xs font-bold min-w-fit px-1.5 h-5 rounded-full bg-primary text-white flex items-center justify-center"
      >
        {{ item.badge }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { MenuItem } from '@/stores/app'

defineOptions({ name: 'SidebarMenuItem' })

const props = defineProps<{ item: MenuItem; depth: number }>()
const emit = defineEmits<{ navigate: [route?: string] }>()

const route = useRoute()
const manuallyOpened = ref(false)
const manuallyClosed = ref(false)

function containsActiveRoute(item: MenuItem): boolean {
  if (item.route === route.path) return true
  return !!item.children?.some((child) => containsActiveRoute(child))
}

const hasActiveDescendant = computed(() => containsActiveRoute(props.item))
const isActive = computed(() => props.item.route === route.path)

const isOpen = computed(() => {
  if (manuallyClosed.value) return false
  return manuallyOpened.value || hasActiveDescendant.value
})

function toggleOpen() {
  if (isOpen.value) {
    manuallyOpened.value = false
    manuallyClosed.value = true
  } else {
    manuallyOpened.value = true
    manuallyClosed.value = false
  }
}

function handleLabelClick() {
  if (props.item.route) {
    emit('navigate', props.item.route)
  } else {
    toggleOpen()
  }
}
</script>
