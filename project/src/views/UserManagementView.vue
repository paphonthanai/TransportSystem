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
            <th class="px-4 py-3 font-semibold">Username</th>
            <th class="px-4 py-3 font-semibold">Password</th>
            <th class="px-4 py-3 font-semibold">Role</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in localUserStore.users" :key="user.id" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 font-semibold text-text">{{ user.name }}</td>
            <td class="px-4 py-3 text-muted font-mono">{{ user.username }}</td>
            <td class="px-4 py-3 text-muted">••••••••</td>
            <td class="px-4 py-3 text-muted">{{ roleLabels[user.role] }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                {{ user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button @click="openEditDialog(user)" class="btn-sm">แก้ไข</button>
              <button @click="openPasswordDialog(user)" class="btn-sm ml-1.5">ตั้งรหัสผ่านชั่วคราว</button>
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
          <tr v-if="localUserStore.users.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีผู้ใช้งาน</td>
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
              <label class="block text-xs font-semibold text-muted mb-1">Username</label>
              <input v-model="form.username" class="input-field w-full" :disabled="!!editingUser" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                Password {{ editingUser ? '(เว้นว่างถ้าไม่เปลี่ยน)' : '' }}
              </label>
              <input v-model="form.password" type="password" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">Role</label>
              <select v-model="form.role" class="input-field w-full">
                <option v-for="r in roleOptions" :key="r" :value="r">{{ roleLabels[r] }}</option>
              </select>
            </div>
            <div v-if="formError" class="text-xs text-red-600">{{ formError }}</div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" class="btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body" v-if="showPasswordDialog">
      <div @click="showPasswordDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ตั้งรหัสผ่านชั่วคราว</div>
            <button @click="showPasswordDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="text-sm text-muted">ไม่สามารถดูรหัสผ่านเดิมได้ (ถูกเก็บเป็น hash) — คุณสามารถตั้งรหัสผ่านชั่วคราวใหม่ให้ผู้ใช้นี้ได้</div>
            <div class="mt-3">
              <label class="block text-xs font-semibold text-muted mb-1">รหัสผ่านชั่วคราว</label>
              <div class="input-field font-mono">{{ tempPassword }}</div>
            </div>
            <div v-if="passwordApplied" class="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ตั้งรหัสผ่านให้ {{ passwordTarget?.name }} เรียบร้อยแล้ว — คัดลอกรหัสด้านบนไปแจ้งผู้ใช้ได้เลย
            </div>
            <div v-if="passwordError" class="text-xs text-red-600">{{ passwordError }}</div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="generateTempPassword" class="btn-secondary">สร้างใหม่</button>
            <button @click="applyTempPassword" class="btn-primary">ตั้งรหัสผ่านและแสดง</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLocalUserStore, type LocalUser, type UserRole } from '@/stores/localUsers'
import { useAuthStore } from '@/stores/auth'

const localUserStore = useLocalUserStore()
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
const editingUser = ref<LocalUser | null>(null)
const form = ref({ name: '', username: '', password: '', role: 'STAFF' as UserRole })
const formError = ref('')
const showPasswordDialog = ref(false)
const passwordTarget = ref<LocalUser | null>(null)
const tempPassword = ref('')
const passwordError = ref('')
const passwordApplied = ref(false)

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  tempPassword.value = out
  passwordApplied.value = false
}

const openPasswordDialog = (user: LocalUser) => {
  if (authStore.currentUser?.role !== 'ADMIN') return
  passwordTarget.value = user
  generateTempPassword()
  passwordError.value = ''
  showPasswordDialog.value = true
}

const applyTempPassword = async () => {
  passwordError.value = ''
  if (!passwordTarget.value) return
  if (!tempPassword.value) {
    passwordError.value = 'รหัสผ่านไม่ถูกต้อง'
    return
  }
  try {
    await localUserStore.updateUser(passwordTarget.value.id, { password: tempPassword.value })
    passwordApplied.value = true
  } catch (err: any) {
    passwordError.value = err?.message || 'ไม่สามารถตั้งรหัสผ่านได้'
  }
}

const openCreateDialog = () => {
  editingUser.value = null
  form.value = { name: '', username: '', password: '', role: 'STAFF' }
  formError.value = ''
  showDialog.value = true
}

const openEditDialog = (user: LocalUser) => {
  editingUser.value = user
  form.value = { name: user.name, username: user.username, password: '', role: user.role }
  formError.value = ''
  showDialog.value = true
}

const save = async () => {
  formError.value = ''
  if (!form.value.name.trim() || !form.value.username.trim()) {
    formError.value = 'กรุณากรอกชื่อและ Username'
    return
  }
  if (!editingUser.value && !form.value.password.trim()) {
    formError.value = 'กรุณากรอก Password'
    return
  }
  try {
    if (editingUser.value) {
      await localUserStore.updateUser(editingUser.value.id, {
        name: form.value.name,
        role: form.value.role,
        password: form.value.password || undefined,
      })
    } else {
      await localUserStore.createUser({
        username: form.value.username,
        password: form.value.password,
        name: form.value.name,
        role: form.value.role,
      })
    }
    showDialog.value = false
  } catch (err: any) {
    formError.value = err.message || 'บันทึกไม่สำเร็จ'
  }
}

const toggleActive = (user: LocalUser) => {
  if (user.id === authStore.currentUser?.id) return
  localUserStore.setActive(user.id, !user.active)
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
