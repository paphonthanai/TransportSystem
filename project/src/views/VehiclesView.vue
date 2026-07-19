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
      <table class="min-w-[1080px] w-full text-sm border-separate border-spacing-0">
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
            <th class="px-4 py-3 font-semibold">หน่วยงาน</th>
            <th class="px-4 py-3 font-semibold text-right">เลขไมล์</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(vehicle, index) in vehicles" :key="vehicle.plate" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted">{{ index + 1 }}</td>
            <td class="px-4 py-3 font-semibold text-text">{{ vehicle.plate }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.plateProvince }}</td>
            <td class="px-4 py-3 text-text">{{ vehicle.vehicleNo }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.trailerPlate || '-' }}</td>
            <td class="px-4 py-3 text-text">{{ vehicle.brand }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.bodyType }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.chassisNo }}</td>
            <td class="px-4 py-3 text-muted">{{ vehicle.engineNo }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{{ vehicle.department }}</span>
            </td>
            <td class="px-4 py-3 text-right text-text">{{ vehicle.mileage.toLocaleString('th-TH') }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="openDialog(vehicle)" class="btn-sm">แก้ไข</button>
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
import { ref } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { Vehicle, VehicleType } from '@/types'

const onboardingStore = useOnboardingStore()

type VehicleForm = Omit<Vehicle, 'id' | 'repairStatus' | 'repairDays'>

const departmentOptions: VehicleType[] = ['รถบริษัท', 'รถร่วม', 'รถหุ้นส่วน']

const vehicles = ref<VehicleForm[]>([
  { plate: '70-8821', plateProvince: 'สระบุรี', vehicleNo: 'T-001', trailerPlate: '', brand: 'HINO', bodyType: 'รถบรรทุก 10 ล้อ', chassisNo: 'MPBUR2CE0M1012345', engineNo: 'J08E-10234', department: 'รถบริษัท', mileage: 152340 },
  { plate: '82-4417', plateProvince: 'กรุงเทพมหานคร', vehicleNo: 'T-002', trailerPlate: '', brand: 'ISUZU', bodyType: 'รถบรรทุก 6 ล้อ', chassisNo: 'MPBUR2CE0K1054321', engineNo: '6HK1-55123', department: 'รถบริษัท', mileage: 98210 },
  { plate: '71-3390', plateProvince: 'ราชบุรี', vehicleNo: 'T-003', trailerPlate: 'ห-1204 ราชบุรี', brand: 'FUSO', bodyType: 'รถหัวลาก', chassisNo: 'MPBUR2CE0L1067788', engineNo: '6M70-67788', department: 'รถหุ้นส่วน', mileage: 210875 },
  { plate: '72-6628', plateProvince: 'พระนครศรีอยุธยา', vehicleNo: 'T-004', trailerPlate: 'ห-3387 อยุธยา', brand: 'HINO', bodyType: 'รถกึ่งพ่วง', chassisNo: 'MPBUR2CE0J1099001', engineNo: 'J08E-99001', department: 'รถร่วม', mileage: 176420 },
])

const showDialog = ref(false)
const editingIndex = ref<number | null>(null)

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
  mileage: 0,
})

const form = ref<VehicleForm>(emptyForm())

const openDialog = (vehicle?: VehicleForm) => {
  if (vehicle) {
    editingIndex.value = vehicles.value.indexOf(vehicle)
    form.value = { ...vehicle }
  } else {
    editingIndex.value = null
    form.value = emptyForm()
  }
  showDialog.value = true
}

const save = () => {
  if (!form.value.plate) return
  if (editingIndex.value === null) {
    vehicles.value.unshift({ ...form.value })
    onboardingStore.markDone('addedVehicleOrDriver')
  } else {
    vehicles.value[editingIndex.value] = { ...form.value }
  }
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
