import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { useAuthStore } from './auth'
import { userRepository } from '@/repositories/userRepository'

const EMAIL = 'd0001@drivers.internal'
const NAME = 'นายสุรพรชัย เกตุรังษี'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(createUserWithEmailAndPassword).mockReset()
  vi.mocked(signInWithEmailAndPassword).mockReset()
})

const authError = (code: string) => Object.assign(new Error(code), { code })

describe('authStore.repairDriverAccount — ซ่อมบัญชีคนขับที่ตั้งรหัสไว้แล้วแต่ไม่มีโปรไฟล์', () => {
  it('ยังไม่มีบัญชี Auth = สร้างบัญชีด้วย secret เดิม + สร้างโปรไฟล์ DRIVER ผูก driverId', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: { uid: 'u1' } } as never)
    const auth = useAuthStore()

    const result = await auth.repairDriverAccount(EMAIL, 'secret', NAME, 'drv1')

    expect(result).toEqual({ uid: 'u1', created: true })
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), EMAIL, 'secret')
    const profile = await userRepository.get('u1')
    expect(profile).toMatchObject({ email: EMAIL, name: NAME, role: 'DRIVER', active: true, driverId: 'drv1' })
  })

  it('มีบัญชี Auth อยู่แล้ว (โปรไฟล์ถูกลบ) = ล็อกอินด้วย secret เดิมเพื่อได้ uid แล้วสร้างโปรไฟล์ใหม่ ไม่เปลี่ยนรหัส', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(authError('auth/email-already-in-use'))
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: { uid: 'u2' } } as never)
    const auth = useAuthStore()

    const result = await auth.repairDriverAccount(EMAIL, 'secret', NAME, 'drv1')

    expect(result).toEqual({ uid: 'u2', created: true })
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), EMAIL, 'secret')
    expect((await userRepository.get('u2'))?.driverId).toBe('drv1')
  })

  it('secret ไม่ตรงกับบัญชี Auth เดิม = ซ่อมไม่ได้ บอกให้ลบใน Firebase Console และไม่สร้างโปรไฟล์', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(authError('auth/email-already-in-use'))
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(authError('auth/invalid-credential'))
    const auth = useAuthStore()

    await expect(auth.repairDriverAccount(EMAIL, 'wrong', NAME, 'drv1')).rejects.toThrow('Firebase Console')
    expect(await userRepository.getAll()).toHaveLength(0)
  })

  it('มีโปรไฟล์ DRIVER ของ uid นี้อยู่แล้วแต่ไม่มี driverId = ผูก driverId ให้ แต่ห้ามทับถ้าผูกคนขับอื่น/เป็น role อื่น', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(authError('auth/email-already-in-use'))
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: { uid: 'u3' } } as never)
    const auth = useAuthStore()
    const base = { email: EMAIL, name: NAME, active: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' }

    await userRepository.create('u3', { ...base, role: 'DRIVER' })
    expect(await auth.repairDriverAccount(EMAIL, 'secret', NAME, 'drv1')).toEqual({ uid: 'u3', created: false })
    expect(await userRepository.get('u3')).toMatchObject({ driverId: 'drv1', active: true })

    await userRepository.update('u3', { driverId: 'other' })
    await expect(auth.repairDriverAccount(EMAIL, 'secret', NAME, 'drv1')).rejects.toThrow('อีกคน')

    await userRepository.update('u3', { driverId: undefined, role: 'STAFF' })
    await expect(auth.repairDriverAccount(EMAIL, 'secret', NAME, 'drv1')).rejects.toThrow('STAFF')
  })
})
