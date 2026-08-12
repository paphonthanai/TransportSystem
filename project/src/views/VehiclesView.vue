<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">รถบรรทุก</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        เพิ่มรถ
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[1180px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ลำดับ</th>
            <th class="px-4 py-3 font-semibold">ทะเบียนรถ</th>
            <th class="px-4 py-3 font-semibold">ทะเบียนจังหวัด</th>
            <th class="px-4 py-3 font-semibold">เบอร์รถ</th>
            <th class="px-4 py-3 font-semibold">ทะเบียนหาง</th>
            <th class="px-4 py-3 font-semibold">ยี่ห้อ</th>
            <th class="px-4 py-3 font-semibold">ลักษณะรถ</th>
            <th class="px-4 py-3 font-semibold">เลขตัวถัง</th>
            <th class="px-4 py-3 font-semibold">เลขเครื่อง</th>
            <th class="px-4 py-3 font-semibold">ปีรถ</th>
            <th class="px-4 py-3 font-semibold">หน่วยงาน</th>
            <th class="px-4 py-3 font-semibold">คนขับประจำ</th>
            <th class="px-4 py-3 font-semibold text-right">เลขไมล์</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(vehicle, index) in vehicles" :key="vehicle.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted">{{ index + 1 }}</td>
            <td class="px-4 py-3 font-semibold text-text">{{ vehicle.plate }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.plateProvince }}</td>
            <td class="px-4 py-3 text-text">{{ vehicle.vehicleNo }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.trailerPlate || '-' }}</td>
            <td class="px-4 py-3 text-text">{{ vehicle.brand }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.bodyType }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.chassisNo }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.engineNo }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.year || '-' }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{{ vehicle.department }}</span>
            </td>
            <td class="px-4 py-3 text-muted">{{ assignedDriverLabel(vehicle) }}</td>
            <td class="px-4 py-3 text-right text-text">{{ vehicle.mileage.toLocaleString('th-TH') }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button v-if="authStore.role === 'ADMIN'" @click="router.push(`/payroll/vendor-fleet/${vehicle.id}`)" class="btn-sm">รายละเอียด</button>
              <button @click="openDialog(vehicle)" class="btn-sm ml-1.5">แก้ไข</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
            <div class="font-bold text-text">{{ editingIndex === null ? 'เพิ่มรถ' : 'แก้ไขรถ' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ</label>
              <input v-model="form.plate" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนจังหวัด</label>
              <input v-model="form.plateProvince" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เบอร์รถ</label>
              <input v-model="form.vehicleNo" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนหาง</label>
              <input v-model="form.trailerPlate" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ยี่ห้อ</label>
              <input v-model="form.brand" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ลักษณะรถ</label>
              <input v-model="form.bodyType" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขตัวถัง</label>
              <input v-model="form.chassisNo" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขเครื่อง</label>
              <input v-model="form.engineNo" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ปีรถ</label>
              <input v-model.number="form.year" type="number" class="input-field w-full" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-muted mb-1">หน่วยงาน</label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="type in departmentOptions"
                  :key="type"
                  type="button"
                  @click="form.department = type"
                  :class="['px-3 py-2 text-sm font-medium rounded-lg transition-all', form.department === type ? 'bg-primary text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                >
                  {{ type }}
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขไมล์</label>
              <input v-model.number="form.mileage" type="number" class="input-field w-full" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-muted mb-1">คนขับประจำ</label>
              <select v-model="selectedDriverCode" class="input-field w-full">
                <option value="">ไม่ระบุ</option>
                <option v-for="d in driversStore.drivers" :key="d.code" :value="d.code">{{ driversStore.fullName(d) }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" class="btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '@/stores/onboarding'
import { useVehiclesStore } from '@/stores/vehicles'
import { useDriversStore } from '@/stores/drivers'
import { useAuthStore } from '@/stores/auth'
import type { Vehicle, VehicleType } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const onboardingStore = useOnboardingStore()
const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()

type VehicleForm = Omit<Vehicle, 'id' | 'repairStatus' | 'repairDays' | 'driverCode'>

const departmentOptions: VehicleType[] = ['รถบริษัท', 'รถร่วมใน', 'รถร่วมนอก', 'รถหุ้นส่วน']

/** ต้องเป็น computed (ไม่ใช่ const เฉยๆ) เพราะตอนนี้ vehiclesStore.vehicles โหลดข้อมูลแบบ async จาก Firestore —
 *  ค่าตอน setup อาจยังว่างอยู่ ถ้า snapshot เป็น const ธรรมดา ตารางจะไม่อัปเดตตอนโหลดเสร็จ (ใช้ได้เฉยๆ ตอนเป็น
 *  localStorage แบบเดิมเพราะข้อมูลพร้อมตั้งแต่ก่อน component mount แล้ว ไม่มีช่วง async ให้พลาด) */
const vehicles = computed(() => vehiclesStore.vehicles)

/** คนขับประจำรถคันนี้ (ถ้ามี) แสดงในตารางรายการรถ */
const assignedDriverLabel = (vehicle: Vehicle) => {
  const driver = driversStore.drivers.find((d) => d.code === vehicle.driverCode)
  return driver ? driversStore.fullName(driver) : '-'
}

const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
/** id เอกสาร Firestore ของรายการที่กำลังแก้ไข — ใช้เรียก vehiclesStore.updateVehicle() ให้ตรงตัวจริง แทนการอิง index ในอาเรย์ */
const editingId = ref<string | undefined>(undefined)
/** คนขับที่เลือกให้ประจำรถคันนี้ในฟอร์ม — ไม่ใช่ field ของ VehicleForm เพราะการแก้ไขความสัมพันธ์ต้องผ่าน vehiclesStore.assignDriver() เท่านั้น */
const selectedDriverCode = ref('')

const emptyForm = (): VehicleForm => ({
  plate: '',
  plateProvince: '',
  vehicleNo: '',
  trailerPlate: '',
  brand: '',
  bodyType: '',
  chassisNo: '',
  engineNo: '',
  department: 'รถบริษัท',
  year: undefined,
  mileage: 0,
})

const form = ref<VehicleForm>(emptyForm())

const openDialog = (vehicle?: Vehicle) => {
  if (vehicle) {
    editingIndex.value = vehicles.value.indexOf(vehicle)
    editingId.value = vehicle.id
    form.value = { ...vehicle }
    selectedDriverCode.value = vehicle.driverCode ?? ''
  } else {
    editingIndex.value = null
    editingId.value = undefined
    form.value = emptyForm()
    selectedDriverCode.value = ''
  }
  showDialog.value = true
}

const save = async () => {
  if (!form.value.plate) return
  let id: string
  if (editingId.value === undefined) {
    id = await vehiclesStore.createVehicle({ ...form.value })
    onboardingStore.markDone('addedVehicleOrDriver')
  } else {
    id = editingId.value
    await vehiclesStore.updateVehicle(id, { ...form.value })
  }
  vehiclesStore.assignDriver(id, selectedDriverCode.value || undefined)
  showDialog.value = false
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
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
