import type { UserProfile, UserRole } from '@/stores/users'
import type { StaffRecord } from '@/stores/staff'
import type { DriverRecord } from '@/stores/drivers'

/**
 * แถวเดียวต่อ 1 คนในหน้า "ผู้ใช้งานและบุคลากร" — รวมข้อมูล 3 แหล่ง (บัญชีผู้ใช้ / ทะเบียนเสมียน / ทะเบียนคนขับ) โดยใช้ Role เป็นตัวแยก
 *  - ทุกบัญชีผู้ใช้เป็น 1 แถว (role = user.role)
 *  - บัญชี DRIVER ที่ผูก driverId → รวมกับทะเบียนคนขับเป็นแถวเดียว
 *  - บัญชี STAFF ที่ชื่อตรงกับทะเบียนเสมียน → รวมเป็นแถวเดียว (ทะเบียนเสมียนไม่มีลิงก์ไปบัญชี จึงจับด้วยชื่อ ชื่อ+นามสกุล ไม่สนคำนำหน้า)
 *  - ทะเบียนเสมียน/คนขับที่ไม่มีบัญชี → แถว role STAFF/DRIVER ที่ไม่มีบัญชี login
 */
export interface PersonnelRow {
  key: string
  role: UserRole
  name: string
  nickname?: string
  /** รหัสพนักงาน (คนขับ/เสมียน) */
  code?: string
  email?: string
  /** true = ใช้งานอยู่ (บัญชีเปิดใช้งาน หรือทะเบียนยังทำงานปกติ) */
  active: boolean
  user?: UserProfile
  driver?: DriverRecord
  staff?: StaffRecord
  /** บัญชีคนขับผูก driverId ที่ไม่มีในทะเบียน แต่จับคู่ทะเบียนได้จากชื่อ — ต้องผูกบัญชีใหม่ ไม่งั้นคนขับไม่เห็นงาน */
  linkIssue?: string
}

/** คำสั่งในเมนู ⋮ ของแถว (ดู components/settings/PersonnelRowMenu.vue) */
export type PersonnelRowAction = 'detail' | 'edit-account' | 'setup-login' | 'reset-password' | 'toggle-active' | 'remove' | 'delete-account'

/** สถานะทำงานตามทะเบียน (คนขับ/เสมียน) ขัดกับสถานะบัญชี login — ว่าง = ตรงกัน */
export function personnelStatusMismatch(row: Pick<PersonnelRow, 'user' | 'driver' | 'staff'>): string {
  const registry = row.driver || row.staff
  if (!row.user || !registry) return ''
  const working = registry.employmentStatus === 'active'
  if (working && !row.user.active) return 'บัญชี login ถูกปิดอยู่'
  if (!working && row.user.active) return 'ลาออกแล้วแต่บัญชียังเปิดอยู่'
  return ''
}

const PREFIXES = ['นางสาว', 'น.ส.', 'นาง', 'นาย']

const squish = (s: string | undefined) => (s || '').replace(/\s+/g, ' ').trim()

/** ชื่อสำหรับเทียบ: ตัดช่องว่างซ้อนและคำนำหน้า (นาย/นาง/นางสาว/น.ส.) ไม่สนตัวพิมพ์ */
export function normalizePersonName(name: string | undefined): string {
  let n = squish(name)
  for (const p of PREFIXES) {
    if (n.startsWith(p)) {
      n = squish(n.slice(p.length))
      break
    }
  }
  return n.toLowerCase()
}

const driverName = (d: DriverRecord) => squish(`${d.firstName} ${d.lastName}`)
const staffName = (s: StaffRecord) => squish(`${s.firstName} ${s.lastName}`)

export function buildPersonnelRows(input: { users: UserProfile[]; staff: StaffRecord[]; drivers: DriverRecord[] }): PersonnelRow[] {
  const rows: PersonnelRow[] = []
  const usedDrivers = new Set<string>()
  const usedStaff = new Set<string>()
  const driverById = new Map(input.drivers.filter((d) => d.id).map((d) => [d.id as string, d]))

  for (const user of input.users) {
    const row: PersonnelRow = {
      key: `user:${user.id}`,
      role: user.role,
      name: squish(user.name),
      email: user.email,
      active: user.active,
      user,
    }
    if (user.role === 'DRIVER') {
      let d = user.driverId ? driverById.get(user.driverId) : undefined
      if (!d) {
        // driverId ไม่มีในทะเบียน (ทะเบียนถูกลบแล้วเพิ่มใหม่) หรือยังไม่ได้ผูก — จับจากชื่อ ถ้าตรงพอดี 1 คนที่ยังไม่มีบัญชีอื่นผูก
        const target = normalizePersonName(user.name)
        const byName = input.drivers.filter((x) => x.id && !usedDrivers.has(x.id) && normalizePersonName(driverName(x)) === target)
        if (byName.length === 1) {
          d = byName[0]
          row.linkIssue = user.driverId
            ? 'บัญชีนี้ผูกกับรหัสคนขับที่ไม่มีในทะเบียนแล้ว — กด "แก้ไขบัญชี login" แล้วเลือกคนขับใหม่ ไม่งั้นคนขับไม่เห็นงานในแอป'
            : 'บัญชีนี้ยังไม่ได้ผูกกับทะเบียนคนขับ — กด "แก้ไขบัญชี login" แล้วเลือกคนขับ'
        }
      }
      if (d) {
        row.driver = d
        row.code = d.code
        row.nickname = d.nickname || undefined
        row.name = driverName(d) || row.name
        usedDrivers.add(d.id as string)
      }
    } else if (user.role === 'STAFF') {
      const target = normalizePersonName(user.name)
      const s = input.staff.find((x) => x.id && !usedStaff.has(x.id) && normalizePersonName(staffName(x)) === target)
      if (s) {
        row.staff = s
        row.code = s.code
        usedStaff.add(s.id as string)
      }
    }
    rows.push(row)
  }

  for (const s of input.staff) {
    if (s.id && usedStaff.has(s.id)) continue
    rows.push({
      key: `staff:${s.id || s.code}`,
      role: 'STAFF',
      name: staffName(s),
      code: s.code,
      active: s.employmentStatus === 'active',
      staff: s,
    })
  }

  for (const d of input.drivers) {
    if (d.id && usedDrivers.has(d.id)) continue
    rows.push({
      key: `driver:${d.id || d.code}`,
      role: 'DRIVER',
      name: driverName(d),
      nickname: d.nickname || undefined,
      code: d.code,
      active: d.employmentStatus === 'active',
      driver: d,
    })
  }

  return rows
}

export interface PersonnelFilter {
  role?: UserRole | 'ALL'
  query?: string
  /** ทะเบียนรถประจำของคนขับ (ใช้ค้นหาด้วยทะเบียน) */
  plateOf?: (row: PersonnelRow) => string
}

/** กรองตาม Role + ค้นหา (ชื่อ/ชื่อเล่น/รหัส/อีเมล/ทะเบียน) ไม่สนตัวพิมพ์/ช่องว่าง */
export function filterPersonnelRows(rows: PersonnelRow[], filter: PersonnelFilter): PersonnelRow[] {
  const q = squish(filter.query).toLowerCase()
  return rows.filter((r) => {
    if (filter.role && filter.role !== 'ALL' && r.role !== filter.role) return false
    if (!q) return true
    const hay = [r.name, r.nickname, r.code, r.email, r.user?.contactEmail, filter.plateOf?.(r)].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function countByRole(rows: PersonnelRow[]): Record<UserRole | 'ALL', number> {
  const out: Record<string, number> = { ALL: rows.length, ADMIN: 0, STAFF: 0, DISPATCHER: 0, DRIVER: 0, ACCOUNTING: 0 }
  for (const r of rows) out[r.role] = (out[r.role] || 0) + 1
  return out as Record<UserRole | 'ALL', number>
}
