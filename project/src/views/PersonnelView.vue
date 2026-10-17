<template>
  <div class="space-y-5">
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-lg font-bold text-text">ตั้งค่า · ผู้ใช้งานและบุคลากร</h2>
        <div class="text-xs text-muted mt-0.5">ผู้ใช้งานระบบ เสมียน และพนักงานขับรถ — จัดการทุกคนได้จากตารางเดียว แยกกลุ่มด้วย Role</div>
      </div>
      <!-- เพิ่มคน: เลือกชนิด -->
      <div class="relative">
        <button class="btn-primary" @click="addMenuOpen = !addMenuOpen">
          <span class="material-symbols-rounded">person_add</span>
          เพิ่ม
          <span class="material-symbols-rounded text-base">expand_more</span>
        </button>
        <div v-if="addMenuOpen" class="fixed inset-0 z-30" @click="addMenuOpen = false"></div>
        <div v-if="addMenuOpen" class="absolute right-0 mt-1 w-56 rounded-lg border border-border bg-surface shadow-lg z-40 py-1 text-sm">
          <button v-if="isAdmin" class="menu-item" @click="addUser">
            <span class="material-symbols-rounded text-base">manage_accounts</span>
            เพิ่มผู้ใช้งานระบบ (บัญชี login)
          </button>
          <button v-if="isAdmin" class="menu-item" @click="addStaff">
            <span class="material-symbols-rounded text-base">badge</span>
            เพิ่มเสมียน (พนักงานออฟฟิศ)
          </button>
          <button class="menu-item" @click="addDriver">
            <span class="material-symbols-rounded text-base">person</span>
            เพิ่มพนักงานขับรถ
          </button>
        </div>
      </div>
    </div>

    <!-- ตัวกรอง Role + ค้นหา -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="chip in roleChips"
        :key="chip.key"
        @click="roleFilter = chip.key"
        :class="[
          'h-9 px-3 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-colors',
          roleFilter === chip.key ? 'bg-primary text-white border-primary' : 'bg-surface text-text border-border hover:bg-surface-2',
        ]"
      >
        {{ chip.label }}
        <span :class="['text-xs font-semibold px-1.5 rounded-full', roleFilter === chip.key ? 'bg-white/20' : 'bg-surface-2 text-muted']">
          {{ counts[chip.key] ?? 0 }}
        </span>
      </button>
      <div class="flex items-center gap-2 px-3 h-9 rounded-lg bg-surface border border-border flex-1 min-w-[200px] max-w-sm ml-auto">
        <span class="material-symbols-rounded text-muted text-lg">search</span>
        <input v-model="query" type="text" placeholder="ค้นหา ชื่อ ชื่อเล่น รหัส อีเมล ทะเบียน..." class="border-0 outline-0 bg-transparent text-sm text-text w-full" />
      </div>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[960px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">ชื่อ</th>
            <th class="px-4 py-3 font-semibold">Role</th>
            <th class="px-4 py-3 font-semibold">รหัส / อีเมล</th>
            <th class="px-4 py-3 font-semibold">ทะเบียนรถประจำ</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold">บัญชี login</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.key" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div v-if="avatarPhoto(row)" class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  <img :src="avatarPhoto(row)!" class="w-full h-full object-cover" />
                </div>
                <div v-else :style="{ background: avatarBg(row) }" class="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0">
                  {{ row.name.charAt(0) }}
                </div>
                <div>
                  <div class="font-semibold text-text">{{ row.name }}</div>
                  <div v-if="row.nickname" class="text-xs text-muted">ชื่อเล่น: {{ row.nickname }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', roleBadge[row.role]]">{{ roleLabels[row.role] }}</span>
              <span v-if="row.user?.canOverrideFuelRate" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">ผู้จัดการ (น้ำมัน)</span>
            </td>
            <td class="px-4 py-3 text-muted">
              <div v-if="row.code">{{ row.code }}</div>
              <div v-if="row.email" class="font-mono text-xs">{{ row.email }}</div>
              <div v-if="row.user?.contactEmail" class="text-[11px] text-text">อีเมลจริง: {{ row.user.contactEmail }}</div>
            </td>
            <td class="px-4 py-3 text-muted">{{ plateOf(row) || '-' }}</td>
            <td class="px-4 py-3">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', row.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                {{ statusLabel(row) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <template v-if="row.user">
                <span class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">มีบัญชี</span>
              </template>
              <template v-else-if="row.driver && isAdmin">
                <div v-if="driverLoginReady(row.driver)" class="flex items-center gap-1.5">
                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700" title="ตั้งรหัสเข้าแอปไว้แล้ว แต่ไม่มีโปรไฟล์ผู้ใช้ผูกอยู่ — คนขับล็อกอินไม่ได้/ไม่เห็นงาน">ไม่มีโปรไฟล์</span>
                  <button class="btn-sm" @click="drivers?.repairAccount(row.driver)">ซ่อมบัญชี</button>
                </div>
                <div v-else class="flex items-center gap-1.5">
                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">ยังไม่มีบัญชี</span>
                  <button class="btn-sm" @click="drivers?.openSetupDialog(row.driver)">ตั้งค่า</button>
                </div>
              </template>
              <span v-else class="text-xs text-muted">-</span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-1.5">
                <RouterLink v-if="row.driver?.id" :to="`/settings/drivers/${row.driver.id}`" class="btn-sm">รายละเอียด</RouterLink>
                <button class="btn-sm" @click="editPrimary(row)">แก้ไข</button>
                <button v-if="row.user && (row.driver || row.staff) && isAdmin" class="btn-sm" @click="users?.openEditDialog(row.user)">บัญชี</button>
                <button class="btn-sm text-red-600 hover:bg-red-50" @click="removeRow(row)">ลบ</button>
                <UserActionMenu
                  v-if="row.user && isAdmin"
                  :user="row.user"
                  :can-hard-delete="isAdmin"
                  :is-self="row.user.id === authStore.currentUser?.id"
                  @reset-password="users?.openPasswordDialog(row.user)"
                  @toggle-active="users?.toggleActive(row.user)"
                  @delete="users?.hardDeleteUser(row.user)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="visibleRows.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-muted">ไม่พบรายการ</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ฟอร์ม/ไดอะล็อกจัดการ (ใช้ของหน้าเดิมทั้งหมด ซ่อนเฉพาะตารางของแต่ละหน้า) -->
    <UserManagementView v-if="isAdmin" ref="users" embedded />
    <StaffView v-if="isAdmin" ref="staff" embedded />
    <DriversView ref="drivers" embedded />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore, type UserRole } from '@/stores/users'
import { useStaffStore, type StaffRecord } from '@/stores/staff'
import { useDriversStore, type DriverRecord } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import UserActionMenu from '@/components/settings/UserActionMenu.vue'
import UserManagementView from '@/views/UserManagementView.vue'
import StaffView from '@/views/StaffView.vue'
import DriversView from '@/views/DriversView.vue'
import { buildPersonnelRows, filterPersonnelRows, countByRole, type PersonnelRow } from '@/utils/personnelDirectory'

/**
 * ตารางเดียวรวมทุกคน (บัญชีผู้ใช้ + ทะเบียนเสมียน + ทะเบียนคนขับ) แยกกลุ่มด้วย Role — ดู utils/personnelDirectory.ts
 * ปุ่มแก้ไข/ลบ/ตั้งค่า login เรียกฟังก์ชันของหน้าเดิม 3 หน้า (ฝังแบบ embedded เหลือเฉพาะไดอะล็อก) จึงใช้ฟอร์ม/กติกาเดิมทั้งหมด
 */
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const staffStore = useStaffStore()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()

const isAdmin = computed(() => authStore.role === 'ADMIN')

// ---- ref ของหน้าฝัง (เรียกฟังก์ชันที่ expose ไว้) ----
const users = ref<InstanceType<typeof UserManagementView> | null>(null)
const staff = ref<InstanceType<typeof StaffView> | null>(null)
const drivers = ref<InstanceType<typeof DriversView> | null>(null)

// ---- แถวรวม ----
const rows = computed<PersonnelRow[]>(() =>
  buildPersonnelRows({
    users: isAdmin.value ? userStore.users : [],
    staff: isAdmin.value ? staffStore.staffList : [],
    drivers: driversStore.drivers,
  })
)

const plateOf = (row: PersonnelRow) => {
  if (!row.driver) return ''
  const v = vehiclesStore.vehicleForDriver(row.driver.code)
  return v ? vehiclesStore.fullPlate(v) : ''
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'เสมียน',
  DISPATCHER: 'ผู้จัดรถ',
  DRIVER: 'พนักงานขับรถ',
  ACCOUNTING: 'บัญชี',
}
const roleBadge: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  STAFF: 'bg-blue-100 text-blue-700',
  DISPATCHER: 'bg-amber-100 text-amber-700',
  DRIVER: 'bg-teal-100 text-teal-700',
  ACCOUNTING: 'bg-pink-100 text-pink-700',
}

// ---- ตัวกรอง Role (ซิงก์กับ ?role= เพื่อให้ลิงก์เดิม /settings/staff|drivers ชี้ตรงกลุ่ม) ----
type RoleKey = UserRole | 'ALL'
const allChips: { key: RoleKey; label: string; roles: string[] }[] = [
  { key: 'ALL', label: 'ทั้งหมด', roles: ['ADMIN', 'DISPATCHER'] },
  { key: 'ADMIN', label: 'ผู้ดูแลระบบ', roles: ['ADMIN'] },
  { key: 'STAFF', label: 'เสมียน', roles: ['ADMIN'] },
  { key: 'DISPATCHER', label: 'ผู้จัดรถ', roles: ['ADMIN'] },
  { key: 'DRIVER', label: 'พนักงานขับรถ', roles: ['ADMIN', 'DISPATCHER'] },
  { key: 'ACCOUNTING', label: 'บัญชี', roles: ['ADMIN'] },
]
const roleChips = computed(() => allChips.filter((c) => c.roles.includes(authStore.role || '')))

const roleFilter = ref<RoleKey>('ALL')
watch(
  () => route.query.role,
  (q) => {
    const wanted = String(q || '').toUpperCase()
    const match = allChips.find((c) => c.key === wanted)
    if (match) roleFilter.value = match.key
  },
  { immediate: true }
)
watch(roleFilter, (key) => {
  const current = String(route.query.role || '')
  if (key === 'ALL' ? current : current !== key) router.replace({ query: key === 'ALL' ? {} : { role: key } })
})

const query = ref('')
const counts = computed(() => countByRole(rows.value))
const visibleRows = computed(() =>
  filterPersonnelRows(rows.value, { role: roleFilter.value, query: query.value, plateOf })
)

// ---- แสดงผลแถว ----
const avatarPhoto = (row: PersonnelRow) => row.driver?.photo || row.staff?.photo || null
const avatarBg = (row: PersonnelRow) => row.driver?.avatarBg || row.staff?.avatarBg || '#64748b'
const statusLabel = (row: PersonnelRow) => {
  if (row.user) return row.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'
  return row.active ? 'ทำงานปกติ' : 'ลาออกแล้ว'
}
const driverLoginReady = (d: DriverRecord) => !!drivers.value?.driverLoginStatus?.[d.code]

// ---- ปุ่มเพิ่ม ----
const addMenuOpen = ref(false)
const addUser = () => {
  addMenuOpen.value = false
  users.value?.openCreateDialog()
}
const addStaff = () => {
  addMenuOpen.value = false
  staff.value?.openDialog()
}
const addDriver = () => {
  addMenuOpen.value = false
  drivers.value?.openDialog()
}

// ---- แก้ไข/ลบ: เปิดตัวจัดการของชนิดข้อมูลหลักของแถว (คนขับ → ทะเบียนคนขับ, เสมียน → ทะเบียนเสมียน, อื่น ๆ → บัญชีผู้ใช้) ----
const editPrimary = (row: PersonnelRow) => {
  if (row.driver) drivers.value?.openDialog(row.driver)
  else if (row.staff) staff.value?.openDialog(row.staff as StaffRecord)
  else if (row.user) users.value?.openEditDialog(row.user)
}
const removeRow = (row: PersonnelRow) => {
  if (row.driver) drivers.value?.remove(row.driver)
  else if (row.staff) staff.value?.remove(row.staff as StaffRecord)
  else if (row.user) users.value?.hardDeleteUser(row.user)
}
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}
.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2 inline-flex items-center;
}
.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
.menu-item {
  @apply w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 text-text;
}
</style>
