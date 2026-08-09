<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold text-text">ตั้งค่า · จัดการผู้ใช้งาน</h2>
      <button @click="openCreateDialog" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มผู้ใช้งาน
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
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">Email</label>
              <input v-model="form.email" type="email" class="input-field w-full" :disabled="!!editingUser" />
            </div>
            <div v-if="!editingUser">
              <label class="block text-xs font-semibold text-muted mb-1">Password เริ่มต้น</label>
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
import { ref } from 'vue'
import { useUserStore, type UserProfile, type UserRole } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'

const userStore = useUserStore()
const authStore = useAuthStore()

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
const form = ref({ name: '', email: '', password: '', role: 'STAFF' as UserRole, canOverrideFuelRate: false })
const formError = ref('')
const saving = ref(false)

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
  form.value = { name: '', email: '', password: '', role: 'STAFF', canOverrideFuelRate: false }
  formError.value = ''
  showDialog.value = true
}

const openEditDialog = (user: UserProfile) => {
  editingUser.value = user
  form.value = { name: user.name, email: user.email, password: '', role: user.role, canOverrideFuelRate: user.canOverrideFuelRate ?? false }
  formError.value = ''
  showDialog.value = true
}

const save = async () => {
  formError.value = ''
  if (!form.value.name.trim() || !form.value.email.trim()) {
    formError.value = 'กรุณากรอกชื่อและ Email'
    return
  }
  if (!editingUser.value && form.value.password.trim().length < 6) {
    formError.value = 'กรุณากรอก Password อย่างน้อย 6 ตัวอักษร'
    return
  }
  saving.value = true
  try {
    if (editingUser.value) {
      await userStore.updateProfile(editingUser.value.id, { name: form.value.name, role: form.value.role, canOverrideFuelRate: form.value.canOverrideFuelRate })
    } else {
      const uid = await authStore.createStaffAccount(form.value.email, form.value.password, form.value.name, form.value.role)
      userStore.addLocalCopy({
        id: uid,
        email: form.value.email.trim(),
        name: form.value.name,
        role: form.value.role,
        active: true,
        canOverrideFuelRate: form.value.canOverrideFuelRate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      if (form.value.canOverrideFuelRate) {
        await userStore.updateProfile(uid, { canOverrideFuelRate: true })
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
