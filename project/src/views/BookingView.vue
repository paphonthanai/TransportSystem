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
          placeholder="ค้นหาเลข Booking, ลูกค้า..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
      <button class="btn-secondary">
        <span class="material-symbols-rounded">filter_list</span>
        ตัวกรอง
      </button>
    </div>

    <!-- Bookings Table -->
    <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลข Booking</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สินค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ต้นทาง</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">ราคา</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">Sh.No</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ผู้รับผิดชอบ</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">การดำเนิน</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(booking, index) in bookings" :key="index" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.id }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.date }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ booking.customer }}</td>
              <td class="px-4 py-3 text-text">{{ booking.goods }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.origin }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.dest }}</td>
              <td class="px-4 py-3 text-right font-semibold text-text">{{ booking.price }}</td>
              <td class="px-4 py-3">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', getStatusClass(booking.status)]">
                  {{ booking.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span v-if="booking.shipNo" class="font-semibold text-text">{{ booking.shipNo }}</span>
                <span v-else class="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">รอออกเลข</span>
              </td>
              <td class="px-4 py-3 text-muted">{{ booking.owner }}</td>
              <td class="px-4 py-3 text-right">
                <button class="btn-sm px-3 text-primary">
                  <span class="material-symbols-rounded text-base">edit</span>
                  แก้ไข
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border">
        <div class="text-xs text-muted">แสดง {{ bookings.length }} จาก 156 รายการ</div>
        <div class="flex gap-2">
          <button class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
            <span class="material-symbols-rounded text-base">chevron_left</span>
          </button>
          <button class="w-8 h-8 rounded-lg border-0 bg-primary text-white font-semibold">1</button>
          <button class="w-8 h-8 rounded-lg border border-border bg-surface text-text font-semibold hover:bg-surface-2">2</button>
          <button class="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center hover:bg-surface-2">
            <span class="material-symbols-rounded text-base">chevron_right</span>
          </button>
        </div>
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
                <div class="font-bold text-text">{{ dialogTitle }}</div>
                <div class="text-xs text-muted">เลขใบปฏิบัติงาน {{ formData.docNo }} · ใบปล่อยรถ</div>
              </div>
            </div>
            <button @click="closeDialog" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <!-- Dialog Content -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <!-- Form Area -->
            <div class="lg:col-span-2 px-6 py-6 space-y-6 border-r border-border">
              <!-- Vehicle & Driver Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">ข้อมูลรถและคนขับ</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">วันที่จัดส่ง</label>
                    <input v-model="formData.dateSend" type="date" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เวลาจัดส่ง</label>
                    <input v-model="formData.timeSend" placeholder="เช่น 08.00-16.00" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ</label>
                    <select v-model="formData.plate" class="input-field w-full">
                      <option value="">เลือกรถ...</option>
                      <option>กก 1234</option>
                      <option>กก 5678</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ประเภทรถ</label>
                    <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface-2 text-sm text-muted">
                      <span class="material-symbols-rounded">directions_bus</span>
                      {{ formData.vtypeLabel }}
                    </div>
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">ชื่อคนขับ</label>
                    <select v-model="formData.driver" class="input-field w-full">
                      <option value="">เลือกคนขับ...</option>
                      <option>สมชาย ใจกล้า</option>
                      <option>วิชัย เสียงแจ่ม</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Customer & Job Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">ข้อมูลลูกค้าและงาน</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">รหัสลูกค้า / ชื่อลูกค้า</label>
                    <select v-model="formData.customer" class="input-field w-full">
                      <option value="">เลือกลูกค้า...</option>
                      <option>บริษัท ABC จำกัด</option>
                      <option>บริษัท XYZ จำกัด</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ใบสั่งงาน (PO)</label>
                    <input v-model="formData.po" placeholder="PO..." class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้นท์</label>
                    <input v-model="formData.shipNo" placeholder="Sh.No" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
                    <input v-model="formData.origin" placeholder="ต้นทาง" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ปลายทาง</label>
                    <input v-model="formData.destination" placeholder="ปลายทาง" class="input-field w-full" />
                  </div>
                </div>
              </div>

              <!-- Goods Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">สินค้า</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ประเภทสินค้า</label>
                    <select v-model="formData.prodType" class="input-field w-full">
                      <option>ปูนถุง</option>
                      <option>กระเบื้อง</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ชื่อสินค้า</label>
                    <input v-model="formData.goods" placeholder="เช่น M402 + M300" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">น้ำหนัก (ตัน)</label>
                    <input v-model.number="formData.weight" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">จำนวน (ชิ้น/ถุง)</label>
                    <input v-model.number="formData.qty" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                </div>
              </div>

              <!-- Pricing Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">คิดค่าขนส่งตาม</h3>
                <div class="flex gap-2 mb-4 flex-wrap">
                  <button
                    v-for="option in calcByOptions"
                    :key="option.id"
                    @click="formData.calcBy = option.id"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-all',
                      formData.calcBy === option.id
                        ? 'bg-primary text-white'
                        : 'bg-surface-2 text-text border border-border hover:bg-border',
                    ]"
                  >
                    <span class="material-symbols-rounded text-base">{{ option.icon }}</span>
                    {{ option.label }}
                  </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div v-if="showTonRate">
                    <label class="block text-xs font-semibold text-muted mb-1">ตันละ (บาท)</label>
                    <input v-model.number="formData.ratePerTon" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div v-if="showTripRate">
                    <label class="block text-xs font-semibold text-muted mb-1">เที่ยวละ (บาท)</label>
                    <input v-model.number="formData.ratePerTrip" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div v-if="showPieceRate">
                    <label class="block text-xs font-semibold text-muted mb-1">ชิ้นละ (บาท)</label>
                    <input v-model.number="formData.ratePerPiece" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ราคาค่าขนส่ง (เต็ม)</label>
                    <input v-model.number="formData.price" type="number" placeholder="auto" class="input-field w-full" />
                  </div>
                </div>
              </div>

              <!-- Fuel & Allowance Section -->
              <div>
                <h3 class="font-semibold text-text mb-3">ค่าเชื้อเพลิง / เบี้ยเลี้ยง</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">จำนวนน้ำมัน (ลิตร)</label>
                    <input v-model.number="formData.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ราคาน้ำมัน (ลิตรละ)</label>
                    <input v-model.number="formData.fuelPrice" type="number" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
                    <input v-model.number="formData.perDiem" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Calculation Summary -->
            <div class="px-6 py-6 bg-surface-2">
              <h3 class="font-semibold text-text mb-4">สรุปการคำนวณ</h3>
              <div class="space-y-3">
                <div class="bg-surface border border-border rounded-lg p-3">
                  <div class="text-xs text-muted mb-1">รายได้ค่าขนส่ง</div>
                  <div class="text-2xl font-bold text-text">{{ calculatedIncome }}</div>
                  <div class="mt-2 pt-2 border-t border-border space-y-1 text-xs">
                    <div class="flex justify-between">
                      <span class="text-muted">ค่าขนส่ง</span>
                      <span class="font-semibold text-text">{{ formData.price || 0 }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-muted">ค่าน้ำมัน</span>
                      <span class="font-semibold text-green-600">{{ calculatedFuel }}</span>
                    </div>
                  </div>
                </div>
                <div class="bg-primary text-white rounded-lg p-3">
                  <div class="text-xs opacity-90 mb-1">รายได้คนขับ</div>
                  <div class="text-2xl font-bold">{{ calculatedDriverPay }}</div>
                  <div class="text-xs opacity-80 mt-1">ตามสูตร: Base × 1.0</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Footer -->
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="closeDialog" class="btn-secondary">ยกเลิก</button>
            <button @click="saveBooking" class="btn-primary">
              <span class="material-symbols-rounded">save</span>
              {{ saveLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showDialog = ref(false)
const searchQuery = ref('')
const dialogTitle = ref('สร้างงานขนส่งใหม่')
const saveLabel = ref('บันทึก')

const bookings = ref([
  {
    id: 'BK-2569-0001',
    date: '28 มิ.ย. 69',
    customer: 'บริษัท ABC จำกัด',
    goods: 'ปูนถุง M402',
    origin: 'นครสวรรค์',
    dest: 'กรุงเทพฯ',
    price: '฿4,500',
    status: 'สำเร็จ',
    shipNo: 'SH-2569-001',
    owner: 'สมชาย ใจกล้า',
  },
  {
    id: 'BK-2569-0002',
    date: '28 มิ.ย. 69',
    customer: 'บริษัท XYZ จำกัด',
    goods: 'กระเบื้องดำ',
    origin: 'ชลบุรี',
    dest: 'นนทบุรี',
    price: '฿3,800',
    status: 'รถกำลังวิ่ง',
    shipNo: null,
    owner: 'วิชัย เสียงแจ่ม',
  },
])

const formData = ref({
  docNo: '2569-0003',
  dateSend: '',
  timeSend: '',
  plate: '',
  vtypeLabel: 'รถ 6 ล้อ',
  driver: '',
  customer: '',
  po: '',
  shipNo: '',
  origin: '',
  destination: '',
  prodType: 'ปูนถุง',
  goods: '',
  weight: 0,
  qty: 0,
  calcBy: 'ton',
  ratePerTon: 0,
  ratePerTrip: 0,
  ratePerPiece: 0,
  price: 0,
  fuelLiters: 0,
  fuelPrice: 0,
  perDiem: 0,
})

const calcByOptions = [
  { id: 'ton', label: 'ตันละ', icon: 'scale' },
  { id: 'trip', label: 'เที่ยวละ', icon: 'route' },
  { id: 'piece', label: 'ชิ้นละ', icon: 'inventory_2' },
]

const showTonRate = computed(() => formData.value.calcBy === 'ton')
const showTripRate = computed(() => formData.value.calcBy === 'trip')
const showPieceRate = computed(() => formData.value.calcBy === 'piece')

const calculatedIncome = computed(() => {
  return formData.value.price || 0
})

const calculatedFuel = computed(() => {
  return (formData.value.fuelLiters || 0) * (formData.value.fuelPrice || 0)
})

const calculatedDriverPay = computed(() => {
  const base = calculatedIncome.value + calculatedFuel.value + (formData.value.perDiem || 0)
  return Math.round(base * 1.0)
})

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'สำเร็จ': 'bg-green-100 text-green-700',
    'รถกำลังวิ่ง': 'bg-blue-100 text-blue-700',
    'รอจัดรถ': 'bg-amber-100 text-amber-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

const openDialog = () => {
  showDialog.value = true
  dialogTitle.value = 'สร้างงานขนส่งใหม่'
  saveLabel.value = 'บันทึก'
}

const closeDialog = () => {
  showDialog.value = false
}

const saveBooking = () => {
  // Save logic here
  closeDialog()
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
