<template>
  <div class="space-y-5 pb-24">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-lg font-bold text-text">ตารางลงงาน · {{ fleetLabel }}</h2>
        <div class="text-xs text-muted mt-0.5 max-w-2xl">
          กรอก/วางข้อมูลงานเป็นตารางเหมือนในชีท Excel ได้เลย ระบบตรวจให้ทุกแถวทันที (คนขับ, ลูกค้า, น้ำมัน, ราคา) แล้วเลือก
          "ดาวน์โหลด Excel" ไปใช้ต่อ หรือ "สร้างงานเข้าระบบ" ได้เลยโดยไม่ต้องกรอกลงไฟล์ Excel
        </div>
      </div>
      <button class="btn-secondary" @click="router.push(`/booking/${props.fleet}`)">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับหน้ารายการงาน
      </button>
    </div>

    <!-- ราคาน้ำมันของวันนี้ยังไม่ได้ตั้ง — เตือนก่อนสร้างงาน กันลืม -->
    <div
      v-if="missingTodayPriceTypes.length"
      class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap"
    >
      <span class="material-symbols-rounded text-base">local_gas_station</span>
      <span class="flex-1 min-w-0">
        ยังไม่มีราคาน้ำมันของวันนี้ ({{ missingTodayPriceTypes.join(', ') }}) — งานที่สร้างวันนี้จะยังไม่มีเรทน้ำมัน ตั้งราคาก่อนจะได้ไม่ลืม
      </span>
      <button class="btn-sm" @click="router.push('/settings/fuel')">ไปตั้งค่าน้ำมัน</button>
    </div>

    <div class="card-lg space-y-4">
      <div class="flex items-end gap-3 flex-wrap">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">วันที่ลงงาน (ส่งของ)</label>
          <input v-model="shipDate" type="date" class="input-field" />
        </div>
        <button class="btn-secondary" @click="addRow()">
          <span class="material-symbols-rounded text-base">add</span>
          เพิ่มแถว
        </button>
        <button class="btn-secondary" @click="addRows(5)">
          <span class="material-symbols-rounded text-base">playlist_add</span>
          เพิ่ม 5 แถว
        </button>
        <button class="btn-secondary" @click="showColumnForm = !showColumnForm">
          <span class="material-symbols-rounded text-base">view_column</span>
          เพิ่มคอลัมน์
        </button>
        <button class="btn-secondary text-red-600" @click="clearAll" :disabled="!hasAnyData">
          <span class="material-symbols-rounded text-base">delete_sweep</span>
          ล้างตาราง
        </button>
        <div class="ml-auto flex gap-2 flex-wrap">
          <button class="btn-secondary" @click="exportExcel" :disabled="!filledRows.length">
            <span class="material-symbols-rounded text-base">download</span>
            ดาวน์โหลด Excel
          </button>
          <button class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed" @click="createJobs" :disabled="!filledRows.length">
            <span class="material-symbols-rounded text-base">send</span>
            สร้างงานเข้าระบบ ({{ filledRows.length }})
          </button>
        </div>
      </div>

      <div v-if="showColumnForm" class="flex items-end gap-2 flex-wrap bg-surface-2 rounded-lg p-3">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">ชื่อคอลัมน์ใหม่ (เช่น ผู้ติดต่อ, เลขที่ DO)</label>
          <input v-model="newColumnName" @keydown.enter.prevent="addColumn" class="input-field w-64" placeholder="ชื่อคอลัมน์" />
        </div>
        <button class="btn-primary" @click="addColumn" :disabled="!newColumnName.trim()">เพิ่ม</button>
        <div class="text-[11px] text-muted w-full">
          คอลัมน์ที่เพิ่มจะถูกส่งออกใน Excel และเมื่อสร้างงานเข้าระบบจะต่อท้ายหมายเหตุของงานเป็น "ชื่อคอลัมน์: ค่า"
        </div>
      </div>

      <div class="text-[11px] text-muted">
        เคล็ดลับ: คัดลอกช่วงเซลล์จาก Excel แล้วกด Ctrl+V ในช่องแรกที่ต้องการ ระบบจะวางต่อเป็นแถว/คอลัมน์และเพิ่มแถวให้เอง
      </div>

      <div class="overflow-x-auto border border-border rounded-xl">
        <table class="text-sm border-separate border-spacing-0 min-w-max">
          <thead class="bg-surface-2 text-xs text-muted">
            <tr>
              <th class="sticky left-0 z-10 bg-surface-2 px-2 py-2 text-left font-semibold w-10">#</th>
              <th v-for="col in allColumns" :key="col.key" class="px-2 py-2 text-left font-semibold whitespace-nowrap">
                <div class="flex items-center gap-1">
                  {{ col.label }}
                  <button v-if="col.custom" class="text-red-500 hover:text-red-700" title="ลบคอลัมน์นี้" @click="removeColumn(col.key)">
                    <span class="material-symbols-rounded text-sm">close</span>
                  </button>
                </div>
              </th>
              <th class="px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[220px]">ผลตรวจ</th>
              <th class="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rIdx) in rows" :key="row.id" class="border-t border-border" :class="rowTone(rIdx)">
              <td class="sticky left-0 z-10 bg-surface px-2 py-1 text-xs text-muted">{{ rIdx + 1 }}</td>
              <td v-for="(col, cIdx) in allColumns" :key="col.key" class="px-1 py-1">
                <input
                  v-model="row.values[col.key]"
                  :list="datalistFor(col.key)"
                  :class="['cell-input', col.wide ? 'w-56' : col.narrow ? 'w-20' : 'w-36']"
                  @paste="onPaste($event, rIdx, cIdx)"
                />
              </td>
              <td class="px-2 py-1 align-top">
                <template v-if="parsed[rIdx] && !parsed[rIdx].isEmpty">
                  <div class="text-xs space-y-0.5">
                    <div v-if="issuesOf(rIdx).length === 0" class="text-green-700 font-semibold flex items-center gap-1">
                      <span class="material-symbols-rounded text-sm">check_circle</span>
                      ข้อมูลครบ
                    </div>
                    <div v-else class="text-amber-700 font-semibold flex items-center gap-1" :title="issuesOf(rIdx).join('\n')">
                      <span class="material-symbols-rounded text-sm">warning</span>
                      {{ issuesOf(rIdx).length }} คำเตือน
                    </div>
                    <div class="text-muted">
                      คนขับ: <span :class="parsed[rIdx].driverName ? 'text-text' : 'text-red-600'">{{ parsed[rIdx].driverName || 'ยังจับคู่ไม่ได้' }}</span>
                      · น้ำมัน {{ parsed[rIdx].fuelLiters }} ล.
                    </div>
                    <ul v-if="issuesOf(rIdx).length" class="text-[11px] text-amber-800 list-disc pl-4 max-w-[260px]">
                      <li v-for="(w, wIdx) in issuesOf(rIdx).slice(0, 3)" :key="wIdx">{{ w }}</li>
                      <li v-if="issuesOf(rIdx).length > 3">…และอีก {{ issuesOf(rIdx).length - 3 }} รายการ</li>
                    </ul>
                  </div>
                </template>
                <span v-else class="text-xs text-muted">แถวว่าง</span>
              </td>
              <td class="px-1 py-1">
                <button class="text-red-500 hover:text-red-700" title="ลบแถวนี้" @click="removeRow(rIdx)">
                  <span class="material-symbols-rounded text-base">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <datalist id="sheet-plates">
        <option v-for="p in plateOptions" :key="p" :value="p" />
      </datalist>
      <datalist id="sheet-drivers">
        <option v-for="n in driverNicknames" :key="n" :value="n" />
      </datalist>
      <datalist id="sheet-customers">
        <option v-for="c in customerCodes" :key="c" :value="c" />
      </datalist>
      <datalist id="sheet-jobtypes">
        <option v-for="t in jobTypes" :key="t" :value="t" />
      </datalist>
    </div>
  </div>
</template>

<script setup lang="ts">
import { JOB_TYPE_CODE, JOB_TYPE_OPTIONS } from '@/utils/jobType'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { BookingCategory } from '@/types'
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useImportDraftStore } from '@/stores/importDraft'
import { bangkokDay } from '@/utils/fuelPrice'
import {
  IMPORT_HEADERS,
  IMPORT_HEADER_MARKER,
  parseImportRow,
  matchDriverForImport,
  matchCustomerForImport,
  flagPriceOutliers,
  type ImportRowResult,
} from '@/utils/importRowParser'

/**
 * ตารางลงงาน — กรอก/วางข้อมูลงานเป็นตารางแล้วตรวจก่อนสร้างงานหรือส่งออก Excel (ไม่ต้องกรอกในชีท Excel ก่อน)
 * ใช้ parseImportRow ตัวเดียวกับ "นำเข้า Excel" ทุกประการ: คำเตือนที่เห็นที่นี่ = คำเตือนที่จะเห็นตอนนำเข้าจริง
 * "สร้างงานเข้าระบบ" ส่งแถวเข้าขั้นตอนพรีวิว/ยืนยันของหน้า Booking (ผ่าน importDraft store) จึงสร้างงาน/ใบสั่งสินค้า/เรทน้ำมัน
 * ด้วยกระบวนการเดียวกับนำเข้า Excel
 */
const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const importDraftStore = useImportDraftStore()

const fleetLabel = computed(() => (props.fleet === 'cements' ? 'Fleet Cements' : 'Fleet Ceramics'))

// ---------- คอลัมน์ ----------
interface SheetColumn {
  key: string
  label: string
  custom?: boolean
  wide?: boolean
  narrow?: boolean
}

const baseColumns: SheetColumn[] = [
  { key: IMPORT_HEADERS.tripNo, label: 'เที่ยวที่', narrow: true },
  { key: IMPORT_HEADERS.driverName, label: 'พขร. (ชื่อเล่น)' },
  { key: IMPORT_HEADERS.plate, label: 'ทะเบียนรถ (คอนเฟิร์ม)' },
  { key: IMPORT_HEADERS.docRef, label: 'เลขที่เอกสาร' },
  { key: IMPORT_HEADERS.customer, label: 'ลูกค้า (รหัส/ชื่อ)' },
  { key: IMPORT_HEADERS.ticketChecked, label: 'เช็คตั๋ว', narrow: true },
  { key: IMPORT_HEADERS.time, label: 'เวลา', narrow: true },
  { key: IMPORT_HEADERS.siteName, label: 'สถานที่ส่งสินค้า', wide: true },
  { key: IMPORT_HEADERS.districtProvince, label: 'อำเภอ/จังหวัด' },
  { key: IMPORT_HEADERS.phone, label: 'เบอร์' },
  { key: IMPORT_HEADERS.product, label: 'ชนิดปูน', narrow: true },
  { key: IMPORT_HEADERS.qty, label: 'จำนวนตัน', narrow: true },
  { key: IMPORT_HEADERS.allowance, label: 'เบี้ยเลี้ยง', narrow: true },
  { key: IMPORT_HEADERS.price, label: 'ราคาปูน', narrow: true },
  { key: IMPORT_HEADERS.fuel, label: 'น้ำมัน', narrow: true },
  { key: IMPORT_HEADERS.jobType, label: 'ประเภท (d1/d2/d3)', narrow: true },
  { key: IMPORT_HEADERS.mapLink, label: 'พิกัด/ลิงก์ Google Maps', wide: true },
  { key: IMPORT_HEADERS.note, label: 'หมายเหตุ', wide: true },
]

const customColumns = ref<string[]>([])
const allColumns = computed<SheetColumn[]>(() => [
  ...baseColumns,
  ...customColumns.value.map((name) => ({ key: `custom:${name}`, label: name, custom: true })),
])

const showColumnForm = ref(false)
const newColumnName = ref('')
const addColumn = () => {
  const name = newColumnName.value.trim()
  if (!name || customColumns.value.includes(name) || baseColumns.some((c) => c.label === name || c.key === name)) return
  customColumns.value.push(name)
  newColumnName.value = ''
}
const removeColumn = (key: string) => {
  const name = key.replace(/^custom:/, '')
  customColumns.value = customColumns.value.filter((n) => n !== name)
  rows.value.forEach((r) => delete r.values[key])
}

// ---------- แถว ----------
interface SheetRow {
  id: string
  values: Record<string, string>
}

let seq = 0
const newRow = (): SheetRow => ({ id: `r${Date.now()}${seq++}`, values: {} })

const STORAGE_KEY = computed(() => `tms.bookingSheet.v1.${props.fleet}`)
const shipDate = ref(bangkokDay(new Date()) as string)
const rows = ref<SheetRow[]>([])

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.value)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.shipDate) shipDate.value = saved.shipDate
      customColumns.value = Array.isArray(saved.customColumns) ? saved.customColumns : []
      rows.value = (saved.rows || []).map((r: Record<string, string>) => ({ id: `r${Date.now()}${seq++}`, values: { ...r } }))
    }
  } catch {
    // อ่านฉบับร่างไม่ได้ (ข้อมูลเสีย/ปิดการใช้ที่เก็บข้อมูล) ก็เริ่มตารางใหม่ตามปกติ
  }
  if (!rows.value.length) rows.value = Array.from({ length: 10 }, newRow)
}
loadDraft()

// เก็บฉบับร่างไว้ในเครื่องอัตโนมัติ กันรีเฟรช/ปิดหน้าแล้วข้อมูลหาย
watch(
  [rows, customColumns, shipDate],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY.value,
        JSON.stringify({ shipDate: shipDate.value, customColumns: customColumns.value, rows: rows.value.map((r) => r.values) })
      )
    } catch {
      // เขียนที่เก็บข้อมูลไม่ได้ก็ไม่เป็นไร แค่ไม่มีฉบับร่างอัตโนมัติ
    }
  },
  { deep: true }
)

const addRow = () => rows.value.push(newRow())
const addRows = (n: number) => {
  for (let i = 0; i < n; i++) rows.value.push(newRow())
}
const removeRow = (idx: number) => {
  rows.value.splice(idx, 1)
  if (!rows.value.length) addRows(1)
}
const hasAnyData = computed(() => rows.value.some((r) => Object.values(r.values).some((v) => String(v ?? '').trim())))
const clearAll = () => {
  if (!confirm('ล้างข้อมูลทั้งตาราง?')) return
  rows.value = Array.from({ length: 10 }, newRow)
}

/** วางข้อมูลจากคลิปบอร์ด (Excel/Google Sheets: คั่นด้วย Tab และขึ้นบรรทัดใหม่) เริ่มที่ช่องที่ผู้ใช้วางอยู่ */
const onPaste = (e: ClipboardEvent, rIdx: number, cIdx: number) => {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!/[\t\n]/.test(text)) return // วางข้อความธรรมดาในช่องเดียว = ให้เบราว์เซอร์จัดการตามปกติ
  e.preventDefault()
  const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n')
  lines.forEach((line, i) => {
    while (rows.value.length <= rIdx + i) rows.value.push(newRow())
    const cells = line.split('\t')
    cells.forEach((cell, j) => {
      const col = allColumns.value[cIdx + j]
      if (col) rows.value[rIdx + i].values[col.key] = cell.trim()
    })
  })
}

// ---------- ตรวจแถวด้วย parser เดียวกับนำเข้า Excel ----------
const matchDriver = (nickname: string, plate: string) => {
  const d = matchDriverForImport(nickname, plate, driversStore.drivers, vehiclesStore.vehicleForDriver)
  if (d) {
    const v = vehiclesStore.vehicleForDriver(d.code)
    return {
      id: d.id,
      fullName: `${d.firstName} ${d.lastName}`.trim(),
      firstName: d.firstName,
      lastName: d.lastName,
      plate: v?.plate,
    }
  }
  // มีทะเบียนต้องมีคนขับ: ชื่อเล่นจับคู่ไม่ได้/ว่าง → ใช้คนขับประจำรถ (เตือนให้ตรวจ)
  const code = plate ? vehiclesStore.findByPlateLoose(plate)?.driverCode : undefined
  const byPlate = code ? driversStore.drivers.find((x) => x.code === code) : undefined
  return byPlate
    ? { id: byPlate.id, fullName: `${byPlate.firstName} ${byPlate.lastName}`.trim(), firstName: byPlate.firstName, lastName: byPlate.lastName, viaPlate: true }
    : undefined
}

/** คอลัมน์เพิ่มเติม → ต่อท้ายหมายเหตุ "ชื่อคอลัมน์: ค่า" (parser ไม่รู้จักคอลัมน์ที่เพิ่มเอง) */
const toRaw = (row: SheetRow): Record<string, string> => {
  const raw: Record<string, string> = {}
  baseColumns.forEach((c) => {
    raw[c.key] = String(row.values[c.key] ?? '').trim()
  })
  const extras = customColumns.value
    .map((name) => ({ name, value: String(row.values[`custom:${name}`] ?? '').trim() }))
    .filter((x) => x.value)
    .map((x) => `${x.name}: ${x.value}`)
  if (extras.length) raw[IMPORT_HEADERS.note] = [raw[IMPORT_HEADERS.note], ...extras].filter(Boolean).join(' | ')
  return raw
}

const parsed = computed<ImportRowResult[]>(() => {
  const results = rows.value.map((row, idx) =>
    parseImportRow(toRaw(row), idx + 1, {
      matchDriver,
      matchCustomer: (raw) => {
        const c = matchCustomerForImport(raw, customerStore.customers)
        return c ? { name: c.name } : undefined
      },
      findFuelRate: (province, district) => fuelRateStore.findRate(province, district) ?? undefined,
    })
  )
  flagPriceOutliers(results)
  return results
})

/** คำเตือนทั้งหมดของแถว = ข้อมูลไม่ครบ/จับคู่ไม่ได้ (warnings) + ข้อควรตรวจก่อนนำเข้า เช่น พิกัด/ลิงก์ GPS (checks) */
const issuesOf = (idx: number) => {
  const p = parsed.value[idx]
  return p ? [...p.warnings, ...p.checks] : []
}

const filledRows = computed(() => rows.value.filter((_, i) => parsed.value[i] && !parsed.value[i].isEmpty))

const rowTone = (idx: number) => {
  const p = parsed.value[idx]
  if (!p || p.isEmpty) return ''
  return p.warnings.length || p.checks.length ? 'bg-amber-50/50' : ''
}

// ---------- ตัวช่วยกรอก ----------
const plateOptions = computed(() => vehiclesStore.vehicles.map((v) => v.plate))
const driverNicknames = computed(() => [...new Set(driversStore.drivers.map((d) => (d.nickname || '').trim()).filter(Boolean))])
const customerCodes = computed(() => customerStore.customers.map((c) => c.code).filter(Boolean))
const jobTypes = JOB_TYPE_OPTIONS.map((t) => JOB_TYPE_CODE[t])
const datalistFor = (key: string) => {
  if (key === IMPORT_HEADERS.plate) return 'sheet-plates'
  if (key === IMPORT_HEADERS.driverName) return 'sheet-drivers'
  if (key === IMPORT_HEADERS.customer) return 'sheet-customers'
  if (key === IMPORT_HEADERS.jobType) return 'sheet-jobtypes'
  return undefined
}

const FUEL_TYPES = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม'] as const
const missingTodayPriceTypes = computed(() => FUEL_TYPES.filter((t) => !(fuelRateStore.fuelRateFor(t, bangkokDay(new Date())).rate > 0)))

// ---------- ส่งออก / สร้างงาน ----------
/** หัวเรื่อง "ตารางงาน… ส่งวันที่ DD-MM-YY" (ปี พ.ศ. 2 หลัก) เพื่อให้นำเข้ากลับมาแล้วได้วันที่ลงงานเหมือนไฟล์งานจริง */
const titleRow = () => {
  const [y, m, d] = shipDate.value.split('-')
  if (!y || !m || !d) return 'ตารางงานจัดงาน'
  const be2 = String((Number(y) + 543) % 100).padStart(2, '0')
  return `ตารางงานจัดงาน${props.fleet === 'cements' ? 'ปูน' : 'เซรามิก'} ส่งวันที่ ${d}-${m}-${be2}`
}

const exportExcel = async () => {
  if (!filledRows.value.length) return
  const XLSX = await import('xlsx') // โหลดตอนกดเท่านั้น (ไลบรารีใหญ่)
  const header = [IMPORT_HEADER_MARKER, ...baseColumns.map((c) => c.key), ...customColumns.value]
  const body = filledRows.value.map((row, i) => [
    i + 1,
    ...baseColumns.map((c) => String(row.values[c.key] ?? '').trim()),
    ...customColumns.value.map((name) => String(row.values[`custom:${name}`] ?? '').trim()),
  ])
  const sheet = XLSX.utils.aoa_to_sheet([[titleRow()], header, ...body])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1')
  XLSX.writeFile(wb, `ตารางลงงาน_${shipDate.value || 'draft'}.xlsx`)
}

const createJobs = () => {
  if (!filledRows.value.length) return
  importDraftStore.set({
    fleet: props.fleet,
    shipDate: shipDate.value,
    rows: filledRows.value.map(toRaw),
  })
  router.push(`/booking/${props.fleet}`)
}
</script>

<style scoped>
.cell-input {
  @apply h-9 px-2 border border-border rounded-md bg-surface text-text text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20;
}
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}
.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed;
}
.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
