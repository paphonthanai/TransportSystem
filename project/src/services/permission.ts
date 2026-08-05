import type { UserRole } from '@/stores/users'

/**
 * ชั้นสิทธิ์กลาง (Permission Layer) — ทุกที่ในแอปที่ต้องเช็คสิทธิ์ (route guard, sidebar menu, ปุ่มในหน้าต่างๆ)
 * ต้องเรียกผ่านฟังก์ชันในไฟล์นี้เท่านั้น แทนที่จะเทียบ authStore.role ตรงๆ กระจายไปทั่วแอป เพื่อให้ตอนย้ายจาก
 * Local User (localStorage) ไปเป็น Firebase Auth + Firestore ในอนาคต แก้ที่ไฟล์นี้ไฟล์เดียวโดยไม่ต้องไล่แก้ทุกหน้า
 */

/** permission key แบบ 'resource:action' — ใช้ '*' แทน "ทุก action ของ resource นี้" */
export type PermissionKey = string

const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMIN: ['*'],
  STAFF: ['booking:*', 'customer:*', 'quotation:*'],
  DISPATCHER: ['booking:*', 'driver:*', 'vehicle:*'],
  DRIVER: ['driver-app:*'],
  ACCOUNTING: ['documents:*', 'billing:*', 'customer:read'],
}

function matches(granted: PermissionKey, required: PermissionKey): boolean {
  if (granted === '*') return true
  if (granted === required) return true
  const [grantedResource, grantedAction] = granted.split(':')
  const [requiredResource, requiredAction] = required.split(':')
  if (grantedResource !== requiredResource) return false
  return grantedAction === '*' || grantedAction === requiredAction
}

export function hasRole(role: UserRole | null | undefined, allowed: UserRole[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}

export function hasPermission(role: UserRole | null | undefined, required: PermissionKey): boolean {
  if (!role) return false
  const granted = ROLE_PERMISSIONS[role] || []
  return granted.some((g) => matches(g, required))
}

/** เส้นทาง (route) ที่ไม่ได้ระบุ roles ไว้ = ทุก role ที่ login แล้วเข้าได้ */
export function canAccess(role: UserRole | null | undefined, allowedRoles?: UserRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return hasRole(role, allowedRoles)
}
