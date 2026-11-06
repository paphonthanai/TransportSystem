<template>
  <div :class="['inline-flex items-center gap-0.5 whitespace-nowrap', align === 'right' && 'justify-end w-full', align === 'center' && 'justify-center w-full']">
    <button type="button" @click="table.toggleSort(column)" :title="`เรียงตาม${label}`" class="inline-flex items-center gap-0.5 font-semibold hover:text-text" :class="sortDir && 'text-primary'">
      {{ label }}
      <span class="material-symbols-rounded text-sm">{{ sortDir === 'asc' ? 'arrow_upward' : sortDir === 'desc' ? 'arrow_downward' : 'unfold_more' }}</span>
    </button>
    <button
      ref="filterBtn"
      type="button"
      @click="openFilter"
      :title="`กรอง${label}`"
      :aria-label="`กรอง${label}`"
      class="w-5 h-5 rounded flex items-center justify-center hover:bg-border"
      :class="selected.length ? 'text-primary' : 'text-muted'"
    >
      <span class="material-symbols-rounded text-sm">{{ selected.length ? 'filter_alt' : 'filter_list' }}</span>
    </button>
    <!-- Teleport ไป body — ตารางอยู่ใน overflow-x-auto ถ้าวางในหัวตารางตัวเลือกจะถูกตัด -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="open = false" @wheel="open = false"></div>
      <div v-if="open" class="fixed w-60 rounded-lg border border-border bg-surface shadow-lg z-50 text-sm font-normal text-text" :style="{ top: pos.top + 'px', left: pos.left + 'px' }">
        <div class="p-2 border-b border-border">
          <input v-model="search" type="text" placeholder="ค้นหาในคอลัมน์นี้..." class="input-field w-full !h-8 !text-xs" />
        </div>
        <div class="max-h-60 overflow-y-auto py-1">
          <label v-for="option in visibleOptions" :key="option" class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-surface-2">
            <input type="checkbox" :checked="selected.includes(option)" @change="toggleOption(option)" />
            <span class="truncate" :title="option">{{ option }}</span>
          </label>
          <div v-if="!visibleOptions.length" class="px-3 py-2 text-xs text-muted">ไม่พบค่าที่ค้นหา</div>
        </div>
        <div class="flex justify-between gap-2 p-2 border-t border-border">
          <button type="button" @click="table.setFilter(column, [])" :disabled="!selected.length" class="btn-sm disabled:opacity-40">ล้าง</button>
          <button type="button" @click="open = false" class="btn-sm">ปิด</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumnsApi } from '@/composables/useTableColumns'

/** หัวตารางที่กดเรียงและกรองได้แบบ Excel — ไม่ติ๊กค่าใดเลย = แสดงทั้งหมด ติ๊กแล้วกรองทันที */
const props = defineProps<{ table: TableColumnsApi; column: string; label: string; align?: 'left' | 'right' | 'center' }>()

const POPUP_WIDTH = 240
const POPUP_HEIGHT = 340

const open = ref(false)
const search = ref('')
const pos = ref({ top: 0, left: 0 })
const filterBtn = ref<HTMLElement | null>(null)

const sortDir = computed(() => (props.table.sort.value?.key === props.column ? props.table.sort.value.dir : null))
const selected = computed(() => props.table.filters.value[props.column] || [])
const visibleOptions = computed(() => {
  // ค่าที่ติ๊กไว้ต้องยังเห็นเสมอแม้คอลัมน์อื่นกรองออกไปแล้ว ไม่งั้นเอาติ๊กออกไม่ได้
  const options = [...new Set([...selected.value, ...props.table.optionsFor(props.column)])]
  const q = search.value.trim().toLowerCase()
  return q ? options.filter((o) => o.toLowerCase().includes(q)) : options
})

const openFilter = () => {
  const rect = filterBtn.value?.getBoundingClientRect()
  if (!rect) return
  search.value = ''
  pos.value = {
    top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - POPUP_HEIGHT - 8)),
    left: Math.max(8, Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8)),
  }
  open.value = true
}

const toggleOption = (option: string) => {
  const values = selected.value.includes(option) ? selected.value.filter((v) => v !== option) : [...selected.value, option]
  props.table.setFilter(props.column, values)
}
</script>
