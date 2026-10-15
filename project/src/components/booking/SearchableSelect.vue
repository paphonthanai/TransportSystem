<template>
  <div ref="rootEl" class="relative">
    <!-- ช่องพิมพ์ค้นหาแบบเห็นข้อความที่กำลังพิมพ์และเคอร์เซอร์ชัดเจน (แทน <select> ที่ค้นหาด้วยการกดตัวอักษรโดยไม่เห็นว่าพิมพ์อะไรไป) -->
    <div
      :class="[
        'flex items-center gap-2 h-12 px-4 rounded-lg border bg-surface transition-all',
        open ? 'border-primary ring-1 ring-primary/20' : 'border-border',
      ]"
    >
      <span class="material-symbols-rounded text-muted text-xl">search</span>
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        :placeholder="selectedLabel || placeholder"
        class="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium text-text placeholder:text-text caret-primary"
        autocomplete="off"
        @focus="openList"
        @input="openList"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="pickHighlighted"
        @keydown.esc="closeList"
      />
      <button v-if="modelValue" type="button" @click="clear" class="text-muted hover:text-text" title="ล้างที่เลือก">
        <span class="material-symbols-rounded text-lg">close</span>
      </button>
    </div>
    <div
      v-if="open"
      class="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg z-30 py-1"
    >
      <button
        v-for="(opt, idx) in filtered"
        :key="opt.value"
        type="button"
        @mousedown.prevent="select(opt.value)"
        :style="{ backgroundColor: idx === highlighted ? undefined : opt.color }"
        :class="[
          'w-full text-left px-4 py-2.5 text-sm text-text',
          idx === highlighted ? 'bg-primary/10' : 'hover:bg-surface-2',
          opt.value === modelValue ? 'font-bold' : '',
        ]"
      >
        {{ opt.label }}
      </button>
      <div v-if="!filtered.length" class="px-4 py-3 text-sm text-muted">ไม่พบ "{{ query }}"</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface SearchableOption {
  value: string
  label: string
  /** สีพื้นหลังของตัวเลือก (เช่นสีตามจำนวนเที่ยวของรถ) */
  color?: string
}

const props = defineProps<{
  modelValue: string
  options: SearchableOption[]
  placeholder?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const rootEl = ref<HTMLDivElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const highlighted = ref(0)

const selectedLabel = computed(() => props.options.find((o) => o.value === props.modelValue)?.label || '')

/** ค้นหาแบบไม่สนตัวพิมพ์/ช่องว่าง/ขีด เพื่อให้พิมพ์ "73 1124" หรือ "731124" ก็เจอทะเบียน "73-1124 สระบุรี" */
const norm = (s: string) => s.toLowerCase().replace(/[\s-]/g, '')
const filtered = computed(() => {
  const q = norm(query.value)
  return q ? props.options.filter((o) => norm(o.label).includes(q) || norm(o.value).includes(q)) : props.options
})

const openList = () => {
  open.value = true
  highlighted.value = 0
}
const closeList = () => {
  open.value = false
  query.value = ''
}
const select = (value: string) => {
  emit('update:modelValue', value)
  closeList()
  inputEl.value?.blur()
}
const clear = () => {
  emit('update:modelValue', '')
  query.value = ''
}
const move = (delta: number) => {
  if (!open.value) openList()
  const n = filtered.value.length
  if (!n) return
  highlighted.value = (highlighted.value + delta + n) % n
}
const pickHighlighted = () => {
  const opt = filtered.value[highlighted.value]
  if (opt) select(opt.value)
}

const onDocPointerDown = (e: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) closeList()
}
onMounted(() => document.addEventListener('mousedown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocPointerDown))
</script>
