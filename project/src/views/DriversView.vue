<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">สมุดรายชื่อ · พนักงานขับรถ</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มคนขับ
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[960px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">รหัส</th>
            <th class="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
            <th class="px-4 py-3 font-semibold">ทะเบียนรถ</th>
            <th class="px-4 py-3 font-semibold">เบอร์โทร</th>
            <th class="px-4 py-3 font-semibold">เลขบัตรประชาชน</th>
            <th class="px-4 py-3 font-semibold">เลขใบขับขี่</th>
            <th class="px-4 py-3 font-semibold">สถานภาพ</th>
            <th v-if="isAdmin" class="px-4 py-3 font-semibold">Driver Login</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="driver in driversStore.drivers" :key="driver.code" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted">{{ driver.code }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div v-if="driver.photo" class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  <img :src="driver.photo" class="w-full h-full object-cover" />
                </div>
                <div v-else :style="{ background: driver.avatarBg }" class="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0">
                  {{ driver.firstName.charAt(0) }}
                </div>
                <div class="font-semibold text-text">{{ fullName(driver) }}</div>
              </div>
            </td>
            <td class="px-4 py-3 text-muted">{{ assignedVehicleLabel(driver) }}</td>
            <td class="px-4 py-3 text-muted">{{ driver.phone || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ driver.idCard || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ driver.licenseNo || '-' }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', driver.employmentStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                {{ driver.employmentStatus === 'active' ? 'ทำงานปกติ' : 'ลาออกแล้ว' }}
              </span>
            </td>
            <td v-if="isAdmin" class="px-4 py-3">
              <span v-if="driverLoginStatus[driver.code]" class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">ตั้งค่าแล้ว</span>
              <span v-else-if="hasExistingAccount(driver)" class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700" title="มีบัญชี Firebase Auth เดิมอยู่แล้ว (Login ด้วย Email/Password เดิม) ยัง Migrate อัตโนมัติไม่ได้">
                มีบัญชี Login เดิม
              </span>
              <div v-else class="flex items-center gap-1.5">
                <span class="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">ยังไม่ได้ตั้งค่า</span>
                <button @click="openSetupDialog(driver)" class="btn-sm">ตั้งค่า</button>
              </div>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <RouterLink v-if="driver.id" :to="`/settings/drivers/${driver.id}`" class="btn-sm">รายละเอียด</RouterLink>
                <button @click="openDialog(driver)" class="btn-sm">แก้ไข</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">{{ editingCode === null ? 'เพิ่มคนขับ' : 'แก้ไขข้อมูลคนขับ' }}</div>
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

            <!-- เอกสาร / รถที่ประจำ -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">เอกสาร / รถที่ประจำ</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขบัตรประจำตัวประชาชน</label>
                  <input v-model="form.idCard" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขใบขับขี่</label>
                  <input v-model="form.licenseNo" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ประเภทใบขับขี่</label>
                  <div class="flex gap-2">
                    <button
                      v-for="t in licenseTypeOptions"
                      :key="t"
                      type="button"
                      @click="form.licenseType = t"
                      :class="['flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all', form.licenseType === t ? 'bg-primary text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                    >
                      {{ t }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่ใบขับขี่หมดอายุ</label>
                  <input v-model="form.licenseExpiry" type="date" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">รถประจำ</label>
                  <select v-model="assignedVehicleId" class="input-field w-full">
                    <option value="">ไม่ระบุ</option>
                    <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">{{ vehiclesStore.fullPlate(v) }}</option>
                  </select>
                  <div class="text-[11px] text-muted mt-1">ผูกคนขับกับรถ ใช้ดึงอัตโนมัติตอนจัดรถ/สร้างงาน — รถ 1 คันมีคนขับประจำได้ทีละ 1 คน</div>
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

            <!-- รายได้ -->
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-2">รายได้</div>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ประเภทรายได้</label>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="opt in incomeTypeOptions"
                      :key="opt.value"
                      type="button"
                      @click="form.incomeType = opt.value"
                      :class="['px-3 py-2 text-sm font-medium rounded-lg transition-all', form.incomeType === opt.value ? 'bg-primary text-white' : 'bg-surface-2 text-text border border-border hover:bg-border']"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">อัตรา ({{ incomeUnitLabel }}) บาท</label>
                    <input v-model.number="form.incomeAmount" type="number" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ค่าคอมมิชชั่น (บาท)</label>
                    <input v-model.number="form.commission" type="number" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ค่าโทรศัพท์ (บาท)</label>
                    <input v-model.number="form.phoneAllowance" type="number" class="input-field w-full" />
                    <div class="text-[11px] text-muted mt-1">ค่าโทรติดต่อลูกค้าก่อนส่งงาน</div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขที่บัญชี</label>
                  <input v-model="form.bankAccount" class="input-field w-full" />
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" class="btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ตั้งค่า Driver Login ให้คนขับที่ยังไม่มีบัญชีเลย -->
    <Teleport to="body" v-if="setupTarget">
      <div @click="setupTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ตั้งค่า Driver Login — {{ fullName(setupTarget) }} ({{ setupTarget.code }})</div>
            <button @click="setupTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="text-xs text-muted">
              จะสร้างบัญชี Login ใหม่ให้คนขับคนนี้ (ยังไม่เคยมีบัญชีมาก่อน) คนขับจะใช้รหัสคนขับ ({{ setupTarget.code }}) คู่กับรหัสผ่านที่ตั้งด้านล่างนี้เข้าแอปได้ทันที ไม่ต้องพิมพ์ Email เลย
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">รหัสผ่านคนขับ (ตัวเลขอย่างน้อย 4 หลัก)</label>
              <input v-model="setupPassword" inputmode="numeric" type="password" class="input-field w-full" placeholder="เช่น 123456" />
            </div>
            <div v-if="setupError" class="text-xs text-red-600">{{ setupError }}</div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="setupTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmSetup" :disabled="setupSaving" class="btn-primary disabled:opacity-50">{{ setupSaving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import { useDriversStore, type DriverRecord, type LicenseType, type IncomeType } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useUserStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { internalDriverEmail } from '@/utils/driverAuth'
import type { DriverLoginCredentials } from '@/repositories/driverLoginCredentialsRepository'

const onboardingStore = useOnboardingStore()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const fullName = driversStore.fullName

/**
 * Driver Login Credential — สถานะ Migrate ต่อคนขับ (ADMIN เท่านั้นที่เห็นคอลัมน์นี้) โหลดทีเดียวตอนเปิดหน้า ไม่ auto
 * สร้าง/ทับข้อมูลใครเลย เป็นแค่การแสดงสถานะ + ปุ่ม "ตั้งค่า" ที่ ADMIN ต้องกดเองทีละคนเท่านั้น (ตามข้อกำหนด)
 *
 * แบ่ง 3 สถานะ:
 * - "ตั้งค่าแล้ว" — มี driverLoginCredentials/{code} อยู่แล้ว
 * - "มีบัญชี Login เดิม" — ยังไม่มี driverLoginCredentials แต่มีบัญชี Firebase Auth (users/*) ผูก driverId นี้อยู่แล้ว
 *   (ระบบเดิมก่อนมี Driver Login) — Migrate อัตโนมัติไม่ได้เพราะไม่มีทางรู้รหัสผ่าน Firebase Auth เดิมที่ตั้งไว้ (Hash
 *   ทางเดียว ไม่มี Backend/Admin SDK ให้ reset แทนได้) คนขับกลุ่มนี้ยังคง Login ด้วย Email + Password เดิมได้ปกติ
 *   ต่อไป จนกว่าจะมีการ Migrate ด้วยวิธีอื่น (นอกขอบเขตงานนี้)
 * - "ยังไม่ได้ตั้งค่า" — ไม่มีทั้งคู่ ADMIN ตั้งค่า Driver Login ใหม่ให้ได้เลย (สร้างบัญชี Firebase Auth ภายใน + PIN
 *   คู่กัน ครั้งเดียว)
 */
const driverLoginStatus = ref<Record<string, DriverLoginCredentials | null>>({})
const isAdmin = computed(() => authStore.role === 'ADMIN')

const hasExistingAccount = (driver: DriverRecord) => userStore.users.some((u) => u.role === 'DRIVER' && u.driverId === driver.id)

const loadDriverLoginStatuses = async () => {
  const entries = await Promise.all(
    driversStore.drivers.map(async (d) => [d.code, await driversStore.getDriverLoginCredentials(d.code)] as const)
  )
  driverLoginStatus.value = Object.fromEntries(entries)
}

/**
 * ต้อง watch ทั้ง isAdmin (authStore.role โหลดแบบ async รอ onAuthStateChanged + fetch profile — ตอน mounted
 * ตรงๆ อาจยังเป็น false อยู่) และ driversStore.drivers.length (store fetch รายชื่อคนขับตอนสร้าง instance เองก็เป็น
 * async เช่นกัน ไม่มี fetchDrivers() แบบ await เพิ่มได้จากข้างนอก) — ถ้า watch แค่ตัวใดตัวหนึ่ง มีโอกาสพลาดจังหวะที่
 * อีกตัวโหลดเสร็จทีหลัง ทำให้สถานะของคนขับที่โหลดไม่ทันหายไปเงียบๆ
 */
watch(
  [isAdmin, () => driversStore.drivers.length],
  ([admin, count]) => {
    if (admin && count > 0) loadDriverLoginStatuses()
  },
  { immediate: true }
)

// --- ตั้งค่า Driver Login ให้คนขับที่ยังไม่มีบัญชีเลย (เฉพาะกรณีนี้เท่านั้นที่ทำอัตโนมัติได้ปลอดภัย) ---
const setupTarget = ref<DriverRecord | null>(null)
const setupPassword = ref('')
const setupError = ref('')
const setupSaving = ref(false)

const openSetupDialog = (driver: DriverRecord) => {
  setupTarget.value = driver
  setupPassword.value = ''
  setupError.value = ''
  setupSaving.value = false
}

const confirmSetup = async () => {
  setupError.value = ''
  const driver = setupTarget.value
  if (!driver?.id) return
  const password = setupPassword.value.replace(/\D/g, '')
  if (!/^\d{4,}$/.test(password)) {
    setupError.value = 'กรุณากรอกรหัสผ่านคนขับเป็นตัวเลขอย่างน้อย 4 หลัก'
    return
  }
  setupSaving.value = true
  try {
    const authPassword = await driversStore.createDriverLoginCredentials(driver.id, driver.code, password)
    const email = internalDriverEmail(driver.code)
    const uid = await authStore.createStaffAccount(email, authPassword, fullName(driver), 'DRIVER', driver.id)
    userStore.addLocalCopy({
      id: uid,
      email,
      name: fullName(driver),
      role: 'DRIVER',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      driverId: driver.id,
    })
    await driversStore.updateDriver(driver.id, { ...driver, authEmail: email })
    driverLoginStatus.value = { ...driverLoginStatus.value, [driver.code]: await driversStore.getDriverLoginCredentials(driver.code) }
    setupTarget.value = null
  } catch (err: any) {
    setupError.value = err?.message || 'ตั้งค่า Driver Login ไม่สำเร็จ'
  } finally {
    setupSaving.value = false
  }
}

/** รถที่ประจำคนขับคนนี้อยู่ (ถ้ามี) แสดงในตารางรายชื่อ */
const assignedVehicleLabel = (driver: DriverRecord) => {
  const vehicle = vehiclesStore.vehicleForDriver(driver.code)
  return vehicle ? vehiclesStore.fullPlate(vehicle) : '-'
}

const prefixOptions = ['นาย', 'นาง', 'นางสาว']
const licenseTypeOptions: LicenseType[] = ['ท.1', 'ท.2']
const incomeTypeOptions: { value: IncomeType; label: string }[] = [
  { value: 'daily', label: 'รายวัน' },
  { value: 'monthly', label: 'รายเดือน' },
  { value: 'trip', label: 'รายเที่ยว' },
]

const emptyForm = (): DriverRecord => ({
  code: String(driversStore.drivers.length + 1).padStart(4, '0'),
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  idCard: '',
  licenseNo: '',
  licenseType: 'ท.1',
  licenseExpiry: '',
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
  incomeType: 'trip',
  incomeAmount: 0,
  commission: 0,
  phoneAllowance: 0,
  bankAccount: '',
  photo: null,
  avatarBg: '#64748b',
})

const showDialog = ref(false)
const editingCode = ref<string | null>(null)
/** id เอกสาร Firestore ของรายการที่กำลังแก้ไข — แยกจาก editingCode (ใช้แค่โชว์หัวข้อ dialog เดิม) เพราะ update ต้องใช้ id จริง */
const editingId = ref<string | undefined>(undefined)
const form = ref<DriverRecord>(emptyForm())
/** รถที่เลือกให้ประจำคนขับคนนี้ในฟอร์ม — ไม่ใช่ field ของ DriverRecord แต่เป็นความสัมพันธ์ที่เก็บไว้ที่ฝั่งรถ (Vehicle.driverCode) */
const assignedVehicleId = ref('')

const incomeUnitLabel = computed(
  () => ({ daily: 'บาท/วัน', monthly: 'บาท/เดือน', trip: 'บาท/เที่ยว' })[form.value.incomeType]
)

const openDialog = (driver?: DriverRecord) => {
  if (driver) {
    editingCode.value = driver.code
    editingId.value = driver.id
    // sanitizeDriver() ตัด field ที่ไม่ได้เป็นส่วนหนึ่งของ DriverRecord ทิ้งก่อนเอาเข้าฟอร์ม (เผื่อ driver ที่ส่งมา
    // ถูก enrich เพิ่มจากที่อื่นในอนาคต) — ปัจจุบัน DriversView.vue วนลูป driversStore.drivers ตรงๆ ไม่มี enrich อยู่แล้ว
    form.value = { ...driversStore.sanitizeDriver(driver), id: driver.id }
    assignedVehicleId.value = vehiclesStore.vehicleForDriver(driver.code)?.id ?? ''
  } else {
    editingCode.value = null
    editingId.value = undefined
    form.value = emptyForm()
    assignedVehicleId.value = ''
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
  const code = form.value.code
  const { id, ...data } = form.value
  if (editingId.value) {
    await driversStore.updateDriver(editingId.value, data)
  } else {
    await driversStore.createDriver(data)
    onboardingStore.markDone('addedVehicleOrDriver')
  }
  // ถอดคนขับออกจากรถคันเดิมก่อน เผื่อผู้ใช้เปลี่ยนเป็น "ไม่ระบุ" หรือย้ายไปรถคันอื่น
  const previousVehicle = vehiclesStore.vehicleForDriver(code)
  if (previousVehicle && previousVehicle.id !== assignedVehicleId.value) {
    vehiclesStore.assignDriver(previousVehicle.id, undefined)
  }
  if (assignedVehicleId.value) {
    vehiclesStore.assignDriver(assignedVehicleId.value, code)
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
