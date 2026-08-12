<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">สมุดรายชื่อ · เสมียน (พนักงานออฟฟิศ)</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มพนักงาน
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[860px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">รหัส</th>
            <th class="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
            <th class="px-4 py-3 font-semibold">ตำแหน่ง</th>
            <th class="px-4 py-3 font-semibold">เบอร์โทร</th>
            <th class="px-4 py-3 font-semibold">เลขบัตรประชาชน</th>
            <th class="px-4 py-3 font-semibold">สถานภาพ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="staff in staffStore.staffList" :key="staff.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted">{{ staff.code }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div v-if="staff.photo" class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  <img :src="staff.photo" class="w-full h-full object-cover" />
                </div>
                <div v-else :style="{ background: staff.avatarBg }" class="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0">
                  {{ staff.firstName.charAt(0) }}
                </div>
                <div class="font-semibold text-text">{{ fullName(staff) }}</div>
              </div>
            </td>
            <td class="px-4 py-3 text-muted">{{ staff.position || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ staff.phone || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ staff.idCard || '-' }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', staff.employmentStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                {{ staff.employmentStatus === 'active' ? 'ทำงานปกติ' : 'ลาออกแล้ว' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button @click="openDialog(staff)" class="btn-sm">แก้ไข</button>
                <button @click="remove(staff)" class="btn-sm text-red-600 hover:bg-red-50">ลบ</button>
              </div>
            </td>
          </tr>
          <tr v-if="staffStore.staffList.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-muted">ยังไม่มีข้อมูลเสมียน</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">{{ editingId === null ? 'เพิ่มพนักงาน' : 'แก้ไขข้อมูลพนักงาน' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div class="px-6 py-5 space-y-5">
            <!-- ข้อมูลพนักงาน -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">ข้อมูลพนักงาน</div>
              <div class="flex gap-4 flex-col md:flex-row">
                <div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">รหัสพนักงาน</label>
                    <input v-model="form.code" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">คำนำหน้า</label>
                    <select v-model="form.prefix" class="input-field w-full">
                      <option v-for="p in prefixOptions" :key="p" :value="p">{{ p }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ชื่อ</label>
                    <input v-model="form.firstName" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">นามสกุล</label>
                    <input v-model="form.lastName" class="input-field w-full" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">ตำแหน่ง</label>
                    <input v-model="form.position" class="input-field w-full" />
                  </div>
                </div>
                <div class="w-full md:w-28 flex-shrink-0">
                  <label class="block text-xs font-semibold text-muted mb-1">รูปถ่ายพนักงาน</label>
                  <label class="relative block border-2 border-dashed border-border rounded-xl aspect-square cursor-pointer hover:border-primary transition-all overflow-hidden flex items-center justify-center">
                    <input type="file" accept="image/*" class="hidden" @change="onPhotoSelected" />
                    <img v-if="form.photo" :src="form.photo" class="w-full h-full object-cover" />
                    <span v-else class="material-symbols-rounded text-2xl text-muted">add_a_photo</span>
                  </label>
                  <button v-if="form.photo" type="button" @click="form.photo = null" class="text-[11px] text-red-600 font-semibold mt-1">ลบรูปภาพ</button>
                </div>
              </div>
            </div>

            <!-- เอกสาร -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">เอกสาร</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขบัตรประจำตัวประชาชน</label>
                  <input v-model="form.idCard" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขที่บัญชี</label>
                  <input v-model="form.bankAccount" class="input-field w-full" />
                </div>
              </div>
            </div>

            <!-- ที่อยู่ -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">ที่อยู่</div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div class="col-span-2 md:col-span-1">
                  <label class="block text-xs font-semibold text-muted mb-1">บ้านเลขที่ / ถนน</label>
                  <input v-model="form.address" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ตำบล/แขวง</label>
                  <input v-model="form.subDistrict" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">อำเภอ/เขต</label>
                  <input v-model="form.district" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">จังหวัด</label>
                  <input v-model="form.province" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">รหัสไปรษณีย์</label>
                  <input v-model="form.zipCode" class="input-field w-full" />
                </div>
              </div>
            </div>

            <!-- ช่องทางติดต่อ -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">ช่องทางติดต่อ</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรศัพท์มือถือ</label>
                  <input v-model="form.phone" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ไอดี Line</label>
                  <input v-model="form.lineId" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ผู้ติดต่อกรณีฉุกเฉิน</label>
                  <input v-model="form.emergencyContact" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ความสัมพันธ์</label>
                  <input v-model="form.emergencyRelation" class="input-field w-full" />
                </div>
              </div>
            </div>

            <!-- การจ้างงาน -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">การจ้างงาน</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่เริ่มงาน</label>
                  <input v-model="form.startDate" type="date" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">สถานภาพการจ้างงาน</label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="form.employmentStatus = 'active'"
                      :class="['flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all', form.employmentStatus === 'active' ? 'bg-primary text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                    >
                      ทำงานปกติ
                    </button>
                    <button
                      type="button"
                      @click="form.employmentStatus = 'resigned'"
                      :class="['flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all', form.employmentStatus === 'resigned' ? 'bg-red-600 text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                    >
                      ลาออกแล้ว
                    </button>
                  </div>
                </div>
                <div v-if="form.employmentStatus === 'resigned'">
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่ลาออก</label>
                  <input v-model="form.resignDate" type="date" class="input-field w-full" />
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="saving" class="btn-primary disabled:opacity-50">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useStaffStore, type StaffRecord } from '@/stores/staff'

const staffStore = useStaffStore()
const fullName = staffStore.fullName

const prefixOptions = ['นาย', 'นาง', 'นางสาว']

const emptyForm = (): StaffRecord => ({
  code: String(staffStore.staffList.length + 1).padStart(4, '0'),
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  position: '',
  idCard: '',
  address: '',
  subDistrict: '',
  district: '',
  province: '',
  zipCode: '',
  phone: '',
  lineId: '',
  emergencyContact: '',
  emergencyRelation: '',
  startDate: '',
  employmentStatus: 'active',
  resignDate: '',
  bankAccount: '',
  photo: null,
  avatarBg: '#64748b',
})

const showDialog = ref(false)
const editingId = ref<string | null>(null)
const form = ref<StaffRecord>(emptyForm())
const saving = ref(false)

const openDialog = (staff?: StaffRecord) => {
  if (staff) {
    editingId.value = staff.id ?? null
    form.value = { ...staffStore.sanitizeStaff(staff), id: staff.id }
  } else {
    editingId.value = null
    form.value = emptyForm()
  }
  showDialog.value = true
}

const onPhotoSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    form.value.photo = reader.result as string
  }
  reader.readAsDataURL(file)
}

const save = async () => {
  if (!form.value.firstName) return
  saving.value = true
  try {
    const { id, ...data } = form.value
    if (editingId.value) {
      await staffStore.updateStaff(editingId.value, data)
    } else {
      await staffStore.createStaff(data)
    }
    showDialog.value = false
  } finally {
    saving.value = false
  }
}

const remove = async (staff: StaffRecord) => {
  if (!staff.id) return
  if (!confirm(`ยืนยันลบพนักงาน ${fullName(staff)}? การลบนี้ไม่สามารถกู้คืนได้`)) return
  await staffStore.deleteStaff(staff.id)
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
