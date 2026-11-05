import { describe, it, expect } from 'vitest'
import { cameraErrorMessage } from './cameraError'

describe('cameraErrorMessage', () => {
  it('แยกสาเหตุตามชื่อ error และทุกกรณีมีทางไปต่อ', () => {
    expect(cameraErrorMessage({ name: 'NotAllowedError' })).toContain('อนุญาต')
    expect(cameraErrorMessage({ name: 'NotFoundError' })).toContain('ไม่พบกล้อง')
    expect(cameraErrorMessage({ name: 'NotReadableError' })).toContain('แอปอื่น')
    expect(cameraErrorMessage(new Error('x'))).toContain('กล้องของเครื่อง')
    expect(cameraErrorMessage(null)).toContain('กล้องของเครื่อง')
  })
})
