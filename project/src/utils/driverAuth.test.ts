import { describe, it, expect } from 'vitest'
import { isCorporateEmail, filterDigits, internalDriverEmail, generateAuthBootstrapSecret } from './driverAuth'

describe('isCorporateEmail', () => {
  it('accepts .com', () => {
    expect(isCorporateEmail('pj06052538@gmail.com')).toBe(true)
  })
  it('accepts .co.th', () => {
    expect(isCorporateEmail('employee@company.co.th')).toBe(true)
  })
  it('accepts .go.th', () => {
    expect(isCorporateEmail('officer@agency.go.th')).toBe(true)
  })
  it('rejects a plain driver code (no @ at all)', () => {
    expect(isCorporateEmail('0040')).toBe(false)
  })
  it('rejects unsupported TLDs — must not fall back to a loose includes(@) check', () => {
    expect(isCorporateEmail('driver@example.internal')).toBe(false)
    expect(isCorporateEmail('driver@example.net')).toBe(false)
    expect(isCorporateEmail('driver@example.org')).toBe(false)
  })
  it('rejects malformed email-like strings', () => {
    expect(isCorporateEmail('not-an-email@')).toBe(false)
    expect(isCorporateEmail('@missing-local.com')).toBe(false)
    expect(isCorporateEmail('spaces in@email.com')).toBe(false)
  })
  it('is case-insensitive on the TLD', () => {
    expect(isCorporateEmail('Employee@Company.CO.TH')).toBe(true)
  })
})

describe('filterDigits', () => {
  it('strips letters and symbols from a driver ID, per spec example', () => {
    expect(filterDigits('A0B-0C4#0')).toBe('0040')
  })
  it('strips letters and symbols from a password, per spec example', () => {
    expect(filterDigits('12a3@45#6')).toBe('123456')
  })
  it('returns empty string when nothing is numeric', () => {
    expect(filterDigits('abc-#@!')).toBe('')
  })
  it('leaves an already-numeric string untouched', () => {
    expect(filterDigits('123456')).toBe('123456')
  })
})

describe('internalDriverEmail', () => {
  it('derives the default internal email from a driver code', () => {
    expect(internalDriverEmail('0040')).toBe('d0040@drivers.internal')
  })
})

describe('generateAuthBootstrapSecret', () => {
  it('generates a long, non-empty, non-predictable secret', () => {
    const a = generateAuthBootstrapSecret()
    const b = generateAuthBootstrapSecret()
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(a).not.toBe(b)
    expect(/^[0-9a-f]+$/.test(a)).toBe(true)
  })
})
