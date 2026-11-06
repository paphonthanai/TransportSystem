import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** คอลัมน์ที่เรียง/กรองได้: label = ข้อความที่แสดงและใช้กรอง, sortValue = ค่าที่ใช้เรียง (ไม่ระบุใช้ label) ไม่มีค่า = อยู่ท้ายสุดเสมอ */
export interface TableColumn<T> {
  key: string
  label: (row: T) => string
  sortValue?: (row: T) => number | string | undefined
}

export type TableSort = { key: string; dir: 'asc' | 'desc' } | null
/** ค่าที่ติ๊กไว้ต่อคอลัมน์ — ไม่มี key/รายการว่าง = ไม่กรองคอลัมน์นั้น */
export type TableFilters = Record<string, string[]>

export const EMPTY_CELL_LABEL = '-'

const labelOf = <T>(column: TableColumn<T>, row: T) => column.label(row) || EMPTY_CELL_LABEL

function filterRows<T>(rows: T[], columns: TableColumn<T>[], filters: TableFilters, exceptKey?: string): T[] {
  const active = columns.filter((c) => c.key !== exceptKey && filters[c.key]?.length)
  if (!active.length) return rows
  return rows.filter((row) => active.every((c) => filters[c.key].includes(labelOf(c, row))))
}

/** เรียงแบบคงลำดับเดิมเมื่อค่าเท่ากัน ไม่เลือกการเรียง = คงลำดับที่ส่งเข้ามา (ลำดับเริ่มต้นของตาราง) */
function sortRows<T>(rows: T[], columns: TableColumn<T>[], sort: TableSort): T[] {
  const column = sort && columns.find((c) => c.key === sort.key)
  if (!sort || !column) return rows
  const valueOf = (row: T) => {
    const value = column.sortValue ? column.sortValue(row) : column.label(row)
    return value === '' ? undefined : value
  }
  const sign = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = valueOf(a)
    const vb = valueOf(b)
    if (va === undefined || vb === undefined) return va === vb ? 0 : va === undefined ? 1 : -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sign
    return String(va).localeCompare(String(vb), 'th', { numeric: true }) * sign
  })
}

export function applyTableColumns<T>(rows: T[], columns: TableColumn<T>[], sort: TableSort, filters: TableFilters): T[] {
  return sortRows(filterRows(rows, columns, filters), columns, sort)
}

export interface TableColumnsApi {
  sort: Ref<TableSort>
  filters: Ref<TableFilters>
  hasFilters: ComputedRef<boolean>
  toggleSort: (key: string) => void
  optionsFor: (key: string) => string[]
  setFilter: (key: string, values: string[]) => void
  clearFilters: () => void
}

/** สถานะเรียง/กรองตามหัวตาราง 1 ตาราง — ใช้คู่กับ ColumnHeader.vue */
export function useTableColumns<T>(baseRows: Ref<T[]>, columns: TableColumn<T>[]): TableColumnsApi & { rows: ComputedRef<T[]> } {
  const sort = ref<TableSort>(null)
  const filters = ref<TableFilters>({})
  const rows = computed(() => applyTableColumns(baseRows.value, columns, sort.value, filters.value))
  const hasFilters = computed(() => Object.values(filters.value).some((values) => values.length > 0))

  /** กดซ้ำ: น้อย → มาก → มาก → น้อย → กลับลำดับเริ่มต้น */
  const toggleSort = (key: string) => {
    const current = sort.value
    if (current?.key !== key) sort.value = { key, dir: 'asc' }
    else sort.value = current.dir === 'asc' ? { key, dir: 'desc' } : null
  }

  /** ตัวเลือกของคอลัมน์นี้ = ค่าที่มีจริงหลังกรองคอลัมน์อื่นแล้ว (เหมือนตัวกรองของ Excel) */
  const optionsFor = (key: string) => {
    const column = columns.find((c) => c.key === key)
    if (!column) return []
    const labels = filterRows(baseRows.value, columns, filters.value, key).map((row) => labelOf(column, row))
    return [...new Set(labels)].sort((a, b) => a.localeCompare(b, 'th', { numeric: true }))
  }

  const setFilter = (key: string, values: string[]) => {
    filters.value = { ...filters.value, [key]: values }
  }
  const clearFilters = () => {
    filters.value = {}
  }

  return { rows, sort, filters, hasFilters, toggleSort, optionsFor, setFilter, clearFilters }
}
