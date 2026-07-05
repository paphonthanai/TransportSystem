<template>
  <div class="space-y-6">
    <!-- Create Button -->
    <div class="flex justify-end">
      <button @click="openDialog" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        สร้างงาน
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="flex gap-3 flex-wrap">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาเลขที่เอกสาร, ชื่อหน้างาน..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
      <button class="btn-secondary">
        <span class="material-symbols-rounded">filter_list</span>
        ตัวกรอง
      </button>
    </div>

    <!-- Bookings Table (งานที่ได้รับมาในวันนั้น ยังไม่ได้จัด) -->
    <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ชื่อหน้างาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">เขตอำเภอ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ชื่อชนิดสินค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">เบอร์โทรหน้างาน</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">จำนวนน้ำมัน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ประเภทงาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ทะเบียนรถ / ส่งงาน</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in filteredBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ booking.siteName }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.district }}</td>
              <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.sitePhone || '-' }}</td>
              <td class="px-4 py-3 text-right text-text">{{ booking.fuelLiters || 0 }} ล.</td>
              <td class="px-4 py-3 text-text">{{ booking.jobType || '-' }}</td>
              <td class="px-4 py-3">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', getStatusClass(booking.status)]">
                  {{ booking.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <input
                    v-model="booking.plate"
                    :disabled="booking.status === 'ส่งงานแล้ว'"
                    placeholder="ทะเบียนรถ"
                    class="input-field w-32 disabled:opacity-60"
                  />
                  <button
                    @click="sendToDriver(booking)"
                    :disabled="!booking.plate || booking.status === 'ส่งงานแล้ว'"
                    class="btn-sm text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span class="material-symbols-rounded text-base">send</span>
                    ส่งงาน
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredBookings.length === 0">
              <td colspan="9" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Booking Modal -->
    <Teleport to="body" v-if="showDialog">
      <div @click="closeDialog" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-4xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <!-- Dialog Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <span class="material-symbols-rounded">assignment</span>
              </div>
              <div>
                <div class="font-bold text-text">สร้างงานขนส่งใหม่</div>
                <div class="text-xs text-muted">เลขที่เอกสาร {{ formData.docNo }}</div>
              </div>
            </div>
            <button @click="closeDialog" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Category Selector -->
          <div class="px-6 pt-6">
            <h3 class="font-semibold text-text mb-3">ประเภทการจองงาน</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                v-for="option in categoryOptions"
                :key="option.id"
                @click="setCategory(option.id)"
                :class="[
                  'text-left rounded-2xl border p-4 transition',
                  formData.category === option.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary',
                ]"
              >
                <div class="font-bold text-text">{{ option.label }}</div>
                <div class="text-xs text-muted mt-1">{{ option.subtitle }}</div>
              </button>
            </div>
          </div>

          <!-- Dialog Content -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-0 mt-6">
            <!-- Form Area -->
            <div class="lg:col-span-2 px-6 pb-6 space-y-6 border-r border-border">
              <!-- Job Info Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">ข้อมูลงาน</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เลขที่เอกสาร</label>
                    <input v-model="formData.docNo" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ชื่อลูกค้า</label>
                    <select v-if="formData.category === 'ceramics'" v-model="formData.customer" class="input-field w-full">
                      <option value="">เลือกลูกค้า...</option>
                      <option>บริษัท ABC จำกัด</option>
                      <option>บริษัท XYZ จำกัด</option>
                    </select>
                    <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-medium">
                      {{ fixedCementsCustomer }}
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
                    <input v-model="formData.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">อำเภอ</label>
                    <input v-model="formData.district" placeholder="อำเภอ" class="input-field w-full" />
                  </div>

                  <template v-if="formData.category === 'ceramics'">
                    <div class="md:col-span-2">
                      <label class="block text-xs font-semibold text-muted mb-1">ชนิดปูน (1-3 ชนิดต่อเที่ยว)</label>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input v-model="formData.cementTypes[0]" placeholder="ชนิดปูน #1" class="input-field w-full" />
                        <input v-model="formData.cementTypes[1]" placeholder="ชนิดปูน #2 (ถ้ามี)" class="input-field w-full" />
                        <input v-model="formData.cementTypes[2]" placeholder="ชนิดปูน #3 (ถ้ามี)" class="input-field w-full" />
                      </div>
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-xs font-semibold text-muted mb-1">ประเภทงาน</label>
                      <div class="flex gap-2 flex-wrap">
                        <button
                          v-for="jt in jobTypeOptions"
                          :key="jt"
                          @click="formData.jobType = jt"
                          :class="[
                            'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                            formData.jobType === jt ? 'bg-primary text-white' : 'bg-surface-2 text-text border border-border hover:bg-border',
                          ]"
                        >
                          {{ jt }}
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Trip / Fuel / Allowance Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">ค่าเที่ยว / น้ำมัน / เบี้ยเลี้ยง</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว (บาท)</label>
                    <input v-model.number="formData.tripFee" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">น้ำมัน (ลิตร)</label>
                    <input v-model.number="formData.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร วันนั้น)</label>
                    <input v-model.number="formData.fuelRate" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
                    <input
                      v-if="formData.category === 'ceramics'"
                      v-model.number="formData.allowance"
                      type="number"
                      placeholder="0"
                      class="input-field w-full"
                    />
                    <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">
                      {{ formatBaht(calculatedCementsAllowance) }} (คำนวณอัตโนมัติ)
                    </div>
                  </div>
                </div>
              </div>

              <!-- Site Contact Section (optional, can be filled later on dispatch) -->
              <div>
                <h3 class="font-semibold text-text mb-3">
                  ข้อมูลหน้างาน
                  <span class="text-xs font-normal text-muted">(ไม่บังคับ - ใส่ทีหลังตอนกดส่งงานได้)</span>
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน</label>
                    <input v-model="formData.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน</label>
                    <input v-model="formData.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">พิกัดหน้างาน</label>
                    <input v-model="formData.siteCoords" placeholder="โลเคชั่นหน้างาน" class="input-field w-full" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Calculation Summary -->
            <div class="px-6 pb-6 bg-surface-2">
              <h3 class="font-semibold text-text mb-4">สรุปการคำนวณ</h3>
              <div class="space-y-3">
                <div class="bg-surface border border-border rounded-lg p-3">
                  <div class="text-xs text-muted mb-1">ค่าเที่ยว</div>
                  <div class="text-2xl font-bold text-text">{{ formatBaht(formData.tripFee) }}</div>
                  <div class="mt-2 pt-2 border-t border-border space-y-1 text-xs">
                    <div class="flex justify-between">
                      <span class="text-muted">ค่าน้ำมัน ({{ formData.fuelLiters || 0 }} ล. x {{ formData.fuelRate || 0 }})</span>
                      <span class="font-semibold text-green-600">{{ formatBaht(calculatedFuelCost) }}</span>
                    </div>
                  </div>
                </div>
                <div class="bg-primary text-white rounded-lg p-3">
                  <div class="text-xs opacity-90 mb-1">เบี้ยเลี้ยงคนขับ</div>
                  <div class="text-2xl font-bold">{{ formatBaht(displayedAllowance) }}</div>
                  <div class="text-xs opacity-80 mt-1">
                    {{ formData.category === 'ceramics' ? 'กรอกเอง' : 'สูตร: ((ค่าเที่ยว - 1%) x 62%) - ค่าน้ำมัน' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Footer -->
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="closeDialog" class="btn-secondary">ยกเลิก</button>
            <button @click="saveBooking" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">save</span>
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Booking, BookingCategory, BookingJobType } from '@/types'

const showDialog = ref(false)
const searchQuery = ref('')

const fixedCementsCustomer = 'บจก. ศรีไทยคอนกรีต'

const categoryOptions: { id: BookingCategory; label: string; subtitle: string }[] = [
  { id: 'ceramics', label: 'Fleet Ceramics', subtitle: 'หลายลูกค้า · ระบุชนิดปูนและประเภทงาน · เบี้ยเลี้ยงกรอกเอง' },
  { id: 'cements', label: 'Fleet Cements', subtitle: `ลูกค้าประจำ (${fixedCementsCustomer}) · เบี้ยเลี้ยงคำนวณอัตโนมัติ` },
]

const jobTypeOptions: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

const bookings = ref<Booking[]>([
  {
    id: 'b1',
    category: 'ceramics',
    docNo: 'CR2569-0001',
    customer: 'บริษัท ABC จำกัด',
    siteName: 'ไซต์งาน นครสวรรค์',
    district: 'เมืองนครสวรรค์',
    cementTypes: ['ปูนซีเมนต์ M402'],
    jobType: 'ลงมือ',
    allowance: 350,
    tripFee: 4500,
    fuelLiters: 40,
    fuelRate: 32,
    siteContactName: 'คุณสมชาย',
    sitePhone: '081-234-5678',
    siteCoords: '',
    plate: '',
    status: 'รอจัดรถ',
    createdAt: new Date(),
  },
  {
    id: 'b2',
    category: 'cements',
    docNo: 'CM2569-0002',
    customer: fixedCementsCustomer,
    siteName: 'ไซต์งาน ชลบุรี',
    district: 'ศรีราชา',
    allowance: 0,
    tripFee: 3800,
    fuelLiters: 35,
    fuelRate: 32,
    siteContactName: '',
    sitePhone: '',
    siteCoords: '',
    plate: '',
    status: 'รอจัดรถ',
    createdAt: new Date(),
  },
])

const defaultFormData = (category: BookingCategory = 'ceramics') => ({
  docNo: nextDocNo(category),
  category,
  customer: category === 'cements' ? fixedCementsCustomer : '',
  siteName: '',
  district: '',
  cementTypes: ['', '', ''] as string[],
  jobType: undefined as BookingJobType | undefined,
  allowance: 0,
  tripFee: 0,
  fuelLiters: 0,
  fuelRate: 0,
  siteContactName: '',
  sitePhone: '',
  siteCoords: '',
})

const formData = ref(defaultFormData())

function nextDocNo(category: BookingCategory) {
  const prefix = category === 'ceramics' ? 'CR' : 'CM'
  const maxSeq = bookings.value
    .filter((b) => b.category === category)
    .reduce((max, b) => {
      const seq = Number(b.docNo.replace(prefix, '').replace('2569-', ''))
      return Number.isFinite(seq) && seq > max ? seq : max
    }, 0)
  return `${prefix}2569-${String(maxSeq + 1).padStart(4, '0')}`
}

const setCategory = (category: BookingCategory) => {
  formData.value.category = category
  formData.value.docNo = nextDocNo(category)
  formData.value.customer = category === 'cements' ? fixedCementsCustomer : ''
}

const calculatedFuelCost = computed(() => (formData.value.fuelLiters || 0) * (formData.value.fuelRate || 0))

const calculatedCementsAllowance = computed(() => {
  const tripFee = formData.value.tripFee || 0
  return Math.round(tripFee * 0.99 * 0.62 - calculatedFuelCost.value)
})

const displayedAllowance = computed(() =>
  formData.value.category === 'ceramics' ? formData.value.allowance || 0 : calculatedCementsAllowance.value
)

const canSave = computed(() => {
  const f = formData.value
  const baseValid = !!f.docNo && !!f.siteName && !!f.district && !!f.tripFee
  const customerValid = f.category === 'cements' || !!f.customer
  return baseValid && customerValid
})

const productLabel = (booking: Booking) => {
  if (booking.category === 'cements') return 'ปูน (Fleet Cements)'
  const types = (booking.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'รอจัดรถ': 'bg-amber-100 text-amber-700',
    'ส่งงานแล้ว': 'bg-blue-100 text-blue-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const filteredBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return bookings.value
  return bookings.value.filter(
    (b) => b.docNo.toLowerCase().includes(q) || b.siteName.toLowerCase().includes(q)
  )
})

const openDialog = () => {
  formData.value = defaultFormData()
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const saveBooking = () => {
  if (!canSave.value) return
  const f = formData.value
  bookings.value.unshift({
    id: `b${bookings.value.length + 1}`,
    category: f.category,
    docNo: f.docNo,
    customer: f.customer,
    siteName: f.siteName,
    district: f.district,
    cementTypes: f.category === 'ceramics' ? f.cementTypes.filter(Boolean) : undefined,
    jobType: f.category === 'ceramics' ? f.jobType : undefined,
    allowance: displayedAllowance.value,
    tripFee: f.tripFee,
    fuelLiters: f.fuelLiters,
    fuelRate: f.fuelRate,
    siteContactName: f.siteContactName || undefined,
    sitePhone: f.sitePhone || undefined,
    siteCoords: f.siteCoords || undefined,
    plate: '',
    status: 'รอจัดรถ',
    createdAt: new Date(),
  })
  closeDialog()
}

const sendToDriver = (booking: Booking) => {
  if (!booking.plate) return
  booking.status = 'ส่งงานแล้ว'
  alert(`ส่งงาน ${booking.docNo} ให้ทะเบียนรถ ${booking.plate} เรียบร้อย — งานจะไปแสดงในหน้าสถานะงาน`)
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.animate-fade {
  animation: tmsfade 0.2s ease both;
}

.animate-slide {
  animation: tmsslide 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

@keyframes tmsfade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes tmsslide {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
