<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">ตั้งค่า · จัดการผู้ใช้งาน</h2>
      <button @click="openCreateDialog" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มผู้ใช้งาน
      </button>
      <button @click="runDriverIdSync" class="btn-secondary" title="จับคู่ driverId ให้บัญชี/งานเดิมที่ยังผูกด้วยชื่ออยู่">
        <span class="material-symbols-rounded">sync</span>
        ซิงก์ driverId ให้ข้อมูลเดิม
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[720px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ชื่อ</th>
            <th class="px-4 py-3 font-semibold">Email</th>
            <th class="px-4 py-3 font-semibold">Role</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in userStore.users" :key="user.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ user.name }}</td>
            <td class="px-4 py-3 text-muted font-mono">{{ user.email }}</td>
            <td class="px-4 py-3 text-muted">
              {{ roleLabels[user.role] }}
              <span v-if="user.canOverrideFuelRate" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">ผู้จัดการ (น้ำมัน)</span>
            </td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                {{ user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button @click="openEditDialog(user)" class="btn-sm">แก้ไข</button>
              <button @click="openPasswordDialog(user)" class="btn-sm ml-1.5">ส่งลิงก์ตั้งรหัสผ่านใหม่</button>
              <button
                @click="toggleActive(user)"
                :disabled="user.id === authStore.currentUser?.id"
                :title="user.id === authStore.currentUser?.id ? 'ปิดใช้งานบัญชีตัวเองไม่ได้' : ''"
                class="btn-sm ml-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ user.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน' }}
              </button>
            </td>
          </tr>
          <tr v-if="userStore.users.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-muted">ยังไม่มีผู้ใช้งาน</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">{{ editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อ</label>
              <input v-model="form.name" class="input-field w-full" />
            </div>
            <div v-if="form.role === 'DRIVER'">
              <label class="block text-xs font-semibold text-muted mb-1">ผูกกับคนขับในสมุดรายชื่อ{{ editingUser ? '' : ' (แนะนำ — auto-fill Email จากรหัสคนขับ)' }}</label>
              <select v-model="form.driverId" class="input-field w-full">
                <option :value="undefined">-- ไม่ผูก (จับคู่งานด้วยชื่อแบบเดิม) --</option>
                <option v-for="d in driversStore.drivers" :key="d.id" :value="d.id">{{ driversStore.fullName(d) }} ({{ d.code }})</option>
              </select>
              <div class="text-[11px] text-muted mt-1">ผูกไว้แล้วงานที่จ่ายให้คนขับคนนี้จะขึ้นในแอปคนขับแม่นยำ ไม่พึ่งชื่อบัญชีตรงกับสมุดรายชื่อเป๊ะอีกต่อไป และคนขับ login ด้วยรหัสคนขับ + PIN แทน Email ได้ทันที</div>
              <div v-if="!form.driverId" class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-2 flex items-start gap-1.5">
                <span class="material-symbols-rounded text-sm flex-shrink-0">warning</span>
                <span>
                  ยังไม่ได้ผูกกับคนขับในสมุดรายชื่อ — งานที่จ่ายให้บัญชีนี้จะจับคู่ด้วยการเทียบชื่อเท่านั้น (ผิดพลาดง่ายกว่า) และคนขับจะ login ด้วยรหัสคนขับ + PIN ไม่ได้ ต้องใช้ Email เต็มแทน
                  <label class="flex items-center gap-1.5 mt-1.5 cursor-pointer font-semibold">
                    <input v-model="confirmNoDriverLink" type="checkbox" class="w-3.5 h-3.5" />
                    เข้าใจแล้ว ต้องการสร้างบัญชีนี้โดยไม่ผูกกับคนขับ
                  </label>
                </span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">{{ form.role === 'DRIVER' ? 'Email (auto จากรหัสคนขับ ถ้าผูกไว้ — แก้ไขเองได้)' : 'Email' }}</label>
              <input v-model="form.email" type="email" class="input-field w-full" :disabled="!!editingUser" />
            </div>
            <div v-if="!editingUser">
              <label class="block text-xs font-semibold text-muted mb-1">{{ form.role === 'DRIVER' ? 'PIN เริ่มต้น (ใช้ล็อกอินคู่กับรหัสคนขับ)' : 'Password เริ่มต้น' }}</label>
              <input v-model="form.password" type="password" class="input-field w-full" placeholder="อย่างน้อย 6 ตัวอักษร" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">Role</label>
              <select v-model="form.role" class="input-field w-full">
                <option v-for="r in roleOptions" :key="r" :value="r">{{ roleLabels[r] }}</option>
              </select>
            </div>
            <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input v-model="form.canOverrideFuelRate" type="checkbox" class="w-4 h-4" />
              สิทธิ์ผู้จัดการ: กรอกค่าน้ำมันสำหรับอำเภอที่ยังไม่ได้ตั้งค่าไว้ได้
            </label>
            <div v-if="formError" class="text-xs text-red-600">{{ formError }}</div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="saving" class="btn-primary disabled:opacity-50">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body" v-if="showPasswordDialog">
      <div @click="showPasswordDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ส่งลิงก์ตั้งรหัสผ่านใหม่</div>
            <button @click="showPasswordDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="text-sm text-muted">
              ระบบจะส่งอีเมลลิงก์ตั้งรหัสผ่านใหม่ไปที่ <span class="font-mono font-semibold text-text">{{ passwordTarget?.email }}</span> —
              ต้องเป็นอีเมลที่รับได้จริงจึงจะใช้งานได้ (ไม่สามารถตั้งรหัสผ่านแทนผู้ใช้จาก client ได้โดยตรง)
            </div>
            <div v-if="passwordApplied" class="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ส่งอีเมลแล้ว
            </div>
            <div v-if="passwordError" class="text-xs text-red-600">{{ passwordError }}</div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showPasswordDialog = false" class="btn-secondary">ปิด</button>
            <button @click="sendReset" class="btn-primary">ส่งอีเมล</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserStore, type UserProfile, type UserRole } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useBookingStore } from '@/stores/booking'
import { matchDriverIds } from '@/utils/driverIdMigration'
import { internalDriverEmail } from '@/utils/driverAuth'

const userStore = useUserStore()
const authStore = useAuthStore()
const driversStore = useDriversStore()
const bookingStore = useBookingStore()

const roleOptions: UserRole[] = ['ADMIN', 'STAFF', 'DISPATCHER', 'DRIVER', 'ACCOUNTING']
const roleLabels: Record<UserRole, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'เสมียน',
  DISPATCHER: 'ผู้จัดรถ',
  DRIVER: 'คนขับ',
  ACCOUNTING: 'บัญชี',
}

const showDialog = ref(false)
const editingUser = ref<UserProfile | null>(null)
const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'STAFF' as UserRole,
  driverId: undefined as string | undefined,
  canOverrideFuelRate: false,
})
const formError = ref('')
const saving = ref(false)
/** ต้องติ๊กยอมรับก่อนถึงจะบันทึกบัญชี role DRIVER ที่ไม่ได้ผูก driverId ได้ (D6 — เตือนแทนการบล็อกเด็ดขาด เพื่อให้ยัง
 *  รองรับ workflow เดิมที่จับคู่งานด้วยชื่อได้ต่อไปถ้าตั้งใจจริงๆ) */
const confirmNoDriverLink = ref(false)

/** ผูกคนขับ (ตอนสร้างบัญชีใหม่เท่านั้น) -> auto-fill Email เป็นอีเมลภายใน d{code}@drivers.internal ให้ทันที
 *  ไม่ทับ Email ที่แอดมินพิมพ์เองไปแล้วถ้าไม่ตรงกับค่าที่ auto-fill ไว้ก่อนหน้า (เผื่อแอดมินตั้งใจพิมพ์อีเมลจริงเอง) */
let lastAutoFilledEmail = ''
watch(
  () => form.value.driverId,
  (driverId) => {
    if (editingUser.value || form.value.role !== 'DRIVER' || !driverId) return
    const driver = driversStore.drivers.find((d) => d.id === driverId)
    if (!driver) return
    if (!form.value.email.trim() || form.value.email === lastAutoFilledEmail) {
      form.value.email = internalDriverEmail(driver.code)
      lastAutoFilledEmail = form.value.email
    }
    confirmNoDriverLink.value = false
  }
)

const showPasswordDialog = ref(false)
const passwordTarget = ref<UserProfile | null>(null)
const passwordError = ref('')
const passwordApplied = ref(false)

const openPasswordDialog = (user: UserProfile) => {
  passwordTarget.value = user
  passwordError.value = ''
  passwordApplied.value = false
  showPasswordDialog.value = true
}

const sendReset = async () => {
  passwordError.value = ''
  if (!passwordTarget.value) return
  try {
    await authStore.sendPasswordReset(passwordTarget.value.email)
    passwordApplied.value = true
  } catch (err: any) {
    passwordError.value = err?.message || 'ส่งอีเมลไม่สำเร็จ'
  }
}

const openCreateDialog = () => {
  editingUser.value = null
  form.value = { name: '', email: '', password: '', role: 'STAFF', driverId: undefined, canOverrideFuelRate: false }
  formError.value = ''
  confirmNoDriverLink.value = false
  showDialog.value = true
}

const openEditDialog = (user: UserProfile) => {
  editingUser.value = user
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    driverId: user.driverId,
    canOverrideFuelRate: user.canOverrideFuelRate ?? false,
  }
  formError.value = ''
  confirmNoDriverLink.value = !!user.driverId // บัญชีที่ผูกอยู่แล้วไม่ต้องติ๊กซ้ำ
  showDialog.value = true
}

const save = async () => {
  formError.value = ''
  if (!form.value.name.trim() || !form.value.email.trim()) {
    formError.value = 'กรุณากรอกชื่อและ Email'
    return
  }
  if (form.value.role === 'DRIVER' && !form.value.driverId && !confirmNoDriverLink.value) {
    formError.value = 'กรุณาผูกกับคนขับในสมุดรายชื่อ หรือติ๊กยืนยันว่าต้องการสร้างบัญชีนี้โดยไม่ผูกกับคนขับ'
    return
  }
  if (!editingUser.value && form.value.password.trim().length < 6) {
    formError.value = 'กรุณากรอก Password อย่างน้อย 6 ตัวอักษร'
    return
  }
  saving.value = true
  try {
    if (editingUser.value) {
      await userStore.updateProfile(editingUser.value.id, {
        name: form.value.name,
        role: form.value.role,
        driverId: form.value.driverId,
        canOverrideFuelRate: form.value.canOverrideFuelRate,
      })
    } else {
      const uid = await authStore.createStaffAccount(form.value.email, form.value.password, form.value.name, form.value.role, form.value.driverId)
      userStore.addLocalCopy({
        id: uid,
        email: form.value.email.trim(),
        name: form.value.name,
        role: form.value.role,
        active: true,
        canOverrideFuelRate: form.value.canOverrideFuelRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driverId: form.value.driverId,
      })
      if (form.value.canOverrideFuelRate) {
        await userStore.updateProfile(uid, { canOverrideFuelRate: true })
      }
      // เก็บอีเมลที่ใช้ล็อกอินจริงไว้ที่ DriverRecord ด้วย (โชว์ในหน้าแอดมินเท่านั้น — ไม่ใช่ตัวที่หน้า Login ใช้ resolve
      // เพราะยังเป็นค่า default ที่ derive ได้ตรงๆ จาก code อยู่แล้ว ไม่ต้องเขียน driverAuthEmails index ซ้ำ)
      if (form.value.role === 'DRIVER' && form.value.driverId) {
        const driver = driversStore.drivers.find((d) => d.id === form.value.driverId)
        if (driver) await driversStore.updateDriver(driver.id!, { ...driver, authEmail: form.value.email.trim() })
      }
    }
    showDialog.value = false
  } catch (err: any) {
    const code = err?.code as string | undefined
    formError.value = code === 'auth/email-already-in-use' ? 'มี Email นี้อยู่ในระบบแล้ว' : err.message || 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

const toggleActive = (user: UserProfile) => {
  if (user.id === authStore.currentUser?.id) return
  userStore.setActive(user.id, !user.active)
}

/** จับคู่ driverId ย้อนหลังให้งาน/บัญชีคนขับเดิมที่ยังผูกด้วยชื่ออยู่ (ดู utils/driverIdMigration.ts) — เพิ่มข้อมูล
 * อย่างเดียว ไม่ลบ/ทับของเดิม ปลอดภัยกดซ้ำได้ รายงานสรุปพร้อมรายการที่ต้องตรวจสอบเองผ่าน alert */
const runDriverIdSync = async () => {
  const report = await matchDriverIds(bookingStore.bookings, driversStore.drivers, userStore.users)
  const lines = [
    `งานขนส่ง: จับคู่ใหม่ ${report.bookings.matched.length} · มีอยู่แล้ว ${report.bookings.alreadyLinked} · หาไม่เจอ ${report.bookings.unmatched.length} · กำกวม ${report.bookings.ambiguous.length}`,
    `บัญชีคนขับ: จับคู่ใหม่ ${report.users.matched.length} · มีอยู่แล้ว ${report.users.alreadyLinked} · หาไม่เจอ ${report.users.unmatched.length} · กำกวม ${report.users.ambiguous.length}`,
  ]
  if (report.bookings.unmatched.length) {
    lines.push('', 'งานที่หาคนขับไม่เจอ (ต้องตรวจสอบเอง):')
    lines.push(...report.bookings.unmatched.slice(0, 10).map((b) => `- ${b.docNo}: "${b.driverName}"`))
  }
  if (report.bookings.ambiguous.length) {
    lines.push('', 'งานที่ชื่อกำกวม เจอมากกว่า 1 คน (ต้องเลือกเอง):')
    lines.push(...report.bookings.ambiguous.slice(0, 10).map((b) => `- ${b.docNo}: "${b.driverName}" (${b.candidates.length} คน)`))
  }
  if (report.users.unmatched.length) {
    lines.push('', 'บัญชีคนขับที่หาคนขับไม่เจอ (ต้องผูกเอง):')
    lines.push(...report.users.unmatched.slice(0, 10).map((u) => `- ${u.email}: "${u.name}"`))
  }
  alert(lines.join('\n'))
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all disabled:opacity-60;
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
