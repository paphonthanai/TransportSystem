import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type UserRole = 'ADMIN' | 'STAFF' | 'DISPATCHER' | 'DRIVER' | 'ACCOUNTING'

export interface LocalUser {
  id: string
  username: string
  passwordHash: string
  name: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

const USERS_KEY = 'tms_local_users_v1'

/**
 * Phase 0 (scaffolding ก่อนย้ายไป Firebase Authentication): hash ฝั่ง client ด้วย SHA-256 ผ่าน Web Crypto API
 * เพื่อไม่ให้เก็บรหัสผ่านเป็น plain text ตรงๆ ใน localStorage — แต่นี่ "ไม่ใช่" ระบบความปลอดภัยจริง เพราะผู้ใช้ที่เปิด
 * DevTools ยังแก้ไข field อื่น (เช่น active/role) ใน localStorage ได้อยู่ดี ความปลอดภัยจริงต้องรอ Phase ถัดไปที่
 * ย้ายไป Firebase Auth + Firestore Rules ตรวจสิทธิ์ฝั่ง server
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const DEFAULT_PASSWORD = 'password123'

async function seedUsers(): Promise<LocalUser[]> {
  const now = new Date().toISOString()
  const defaults: Array<{ username: string; name: string; role: UserRole }> = [
    { username: 'admin', name: 'Admin User', role: 'ADMIN' },
    { username: 'staff', name: 'Staff User', role: 'STAFF' },
    { username: 'dispatcher', name: 'Dispatcher User', role: 'DISPATCHER' },
    { username: 'driver', name: 'สมชาย ทองดี', role: 'DRIVER' },
    { username: 'accounting', name: 'Accounting User', role: 'ACCOUNTING' },
  ]
  const passwordHash = await hashPassword(DEFAULT_PASSWORD)
  return defaults.map((d, i) => ({
    id: `user${Date.now()}${i}`,
    username: d.username,
    passwordHash,
    name: d.name,
    role: d.role,
    active: true,
    createdAt: now,
    updatedAt: now,
  }))
}

function loadUsers(): LocalUser[] | null {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupt/inaccessible storage, fall through to re-seed
  }
  return null
}

export const useLocalUserStore = defineStore('localUsers', () => {
  const users = ref<LocalUser[]>(loadUsers() || [])
  const ready = ref(users.value.length > 0)

  if (!ready.value) {
    seedUsers().then((seeded) => {
      users.value = seeded
      ready.value = true
    })
  }

  watch(users, (val) => localStorage.setItem(USERS_KEY, JSON.stringify(val)), { deep: true })

  /** คืนค่า user ถ้า username/password ตรงกันและบัญชียังเปิดใช้งานอยู่ */
  async function verifyLogin(username: string, password: string): Promise<LocalUser | null> {
    const user = users.value.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (!user || !user.active) return null
    const hash = await hashPassword(password)
    return hash === user.passwordHash ? user : null
  }

  async function createUser(data: { username: string; password: string; name: string; role: UserRole }) {
    const exists = users.value.some((u) => u.username.toLowerCase() === data.username.trim().toLowerCase())
    if (exists) throw new Error('มีชื่อผู้ใช้นี้อยู่แล้ว')
    const now = new Date().toISOString()
    const user: LocalUser = {
      id: `user${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      username: data.username.trim(),
      passwordHash: await hashPassword(data.password),
      name: data.name,
      role: data.role,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    users.value.unshift(user)
    return user
  }

  async function updateUser(
    id: string,
    data: { name?: string; role?: UserRole; username?: string; password?: string }
  ) {
    const user = users.value.find((u) => u.id === id)
    if (!user) return
    if (data.name !== undefined) user.name = data.name
    if (data.role !== undefined) user.role = data.role
    if (data.username !== undefined) user.username = data.username.trim()
    if (data.password) user.passwordHash = await hashPassword(data.password)
    user.updatedAt = new Date().toISOString()
  }

  function setActive(id: string, active: boolean) {
    const user = users.value.find((u) => u.id === id)
    if (!user) return
    user.active = active
    user.updatedAt = new Date().toISOString()
  }

  return {
    users,
    ready,
    verifyLogin,
    createUser,
    updateUser,
    setActive,
  }
})
