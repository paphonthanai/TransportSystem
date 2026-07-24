<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">ต้นทาง/จุดรับสินค้า</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        เพิ่มต้นทาง
      </button>
    </div>
    <div class="text-xs text-muted">
      รายชื่อต้นทาง/โรงงาน/คลังที่ใช้รับสินค้าซ้ำได้บ่อยๆ ลงทะเบียนไว้ล่วงหน้าเพื่อเลือกใช้ตอนสร้างงาน แทนการพิมพ์ที่อยู่ใหม่ทุกครั้ง (กรณีมีต้นทางคนละที่คนละโรงงาน)
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[720px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ชื่อต้นทาง</th>
            <th class="px-4 py-3 font-semibold">จังหวัด</th>
            <th class="px-4 py-3 font-semibold">อำเภอ</th>
            <th class="px-4 py-3 font-semibold">ที่อยู่</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="origin in originsStore.origins" :key="origin.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ origin.name }}</td>
            <td class="px-4 py-3 text-muted">{{ origin.province || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ origin.district || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ origin.address || '-' }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button @click="openDialog(origin)" class="btn-sm">แก้ไข</button>
                <button @click="originsStore.removeOrigin(origin.id)" class="btn-sm text-red-600">ลบ</button>
              </div>
            </td>
          </tr>
          <tr v-if="originsStore.origins.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีต้นทาง</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingId === null ? 'เพิ่มต้นทาง' : 'แก้ไขต้นทาง' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อต้นทาง</label>
              <input v-model="form.name" placeholder="เช่น โรงงานสระบุรี, คลังบางนา" class="input-field w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">จังหวัด</label>
                <input v-model="form.province" list="originProvinceOptions" placeholder="จังหวัด" class="input-field w-full" />
                <datalist id="originProvinceOptions">
                  <option v-for="p in fuelRateStore.provincesList" :key="p" :value="p" />
                </datalist>
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">อำเภอ</label>
                <input v-model="form.district" list="originDistrictOptions" placeholder="อำเภอ" class="input-field w-full" />
                <datalist id="originDistrictOptions">
                  <option v-for="d in fuelRateStore.districtsForProvince(form.province || '')" :key="d" :value="d" />
                </datalist>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ที่อยู่ (ไม่บังคับ)</label>
              <input v-model="form.address" placeholder="ที่อยู่ต้นทาง" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">พิกัด/ลิงก์ Google Maps (ไม่บังคับ)</label>
              <input v-model="gpsInput" placeholder="วางลิงก์ Google Maps หรือพิกัด lat,lng" class="input-field w-full" />
              <div v-if="parsedGps.latitude !== undefined" class="text-[11px] text-muted mt-1">
                พิกัด: {{ parsedGps.latitude }}, {{ parsedGps.longitude }}
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="!form.name" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOriginsStore } from '@/stores/origins'
import { useFuelRateStore } from '@/stores/fuelRates'
import type { PickupOrigin } from '@/types'
import { parseGpsInput } from '@/utils/gps'

const originsStore = useOriginsStore()
const fuelRateStore = useFuelRateStore()

const showDialog = ref(false)
const editingId = ref<string | null>(null)
const form = ref<Omit<PickupOrigin, 'id'>>({ name: '', province: '', district: '', address: '' })
const gpsInput = ref('')
const parsedGps = computed(() => parseGpsInput(gpsInput.value))

const openDialog = (origin?: PickupOrigin) => {
  if (origin) {
    editingId.value = origin.id
    form.value = { name: origin.name, province: origin.province, district: origin.district, address: origin.address }
    gpsInput.value = origin.mapUrl || ''
  } else {
    editingId.value = null
    form.value = { name: '', province: '', district: '', address: '' }
    gpsInput.value = ''
  }
  showDialog.value = true
}

const save = () => {
  if (!form.value.name) return
  const gps = parseGpsInput(gpsInput.value)
  const data = { ...form.value, mapUrl: gpsInput.value || undefined, latitude: gps.latitude, longitude: gps.longitude }
  if (editingId.value === null) {
    originsStore.addOrigin(data)
  } else {
    originsStore.updateOrigin(editingId.value, data)
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
