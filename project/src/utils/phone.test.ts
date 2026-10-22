import { describe, it, expect } from 'vitest'
import { extractPhones, formatPhone, phonesOfSite } from './phone'
import { splitContactPhone } from './importRowParser'

describe('extractPhones', () => {
  it('สองเบอร์คั่นด้วยขึ้นบรรทัดใหม่/จุลภาค/เว้นวรรค แยกเป็นสองเบอร์ ไม่ต่อกัน (บั๊กจริงจากหน้างาน)', () => {
    expect(extractPhones('คุณอร 084-535-8614\n095-4218165 หน้างาน')).toEqual(['0845358614', '0954218165'])
    expect(extractPhones('คุณอร 084-535-8614, 095-4218165')).toEqual(['0845358614', '0954218165'])
    expect(extractPhones('0845358614 0954218165')).toEqual(['0845358614', '0954218165'])
  })

  it('รูปแบบเบอร์ปกติ มือถือ/เบอร์บ้าน และไม่ซ้ำ', () => {
    expect(extractPhones('086-3347315')).toEqual(['0863347315'])
    expect(extractPhones('02-123-4567')).toEqual(['021234567'])
    expect(extractPhones('ช่างจอม 086 334 7315 / 086-3347315')).toEqual(['0863347315'])
  })

  it('ไม่มีเบอร์/ข้อความอื่น = ว่าง', () => {
    expect(extractPhones('')).toEqual([])
    expect(extractPhones(undefined)).toEqual([])
    expect(extractPhones('หน้าโรงเรียน 31 ตัน')).toEqual([])
  })
})

describe('splitContactPhone — ช่อง "เบอร์" ใน Excel', () => {
  it('เก็บเบอร์แรกเป็น phone (เลขเดียวที่โทรได้) และข้อความเต็มเป็น contactName', () => {
    const r = splitContactPhone('คุณอร 084-535-8614\n095-4218165 หน้างาน')
    expect(r.phone).toBe('0845358614')
    expect(r.contactName).toBe('คุณอร 084-535-8614, 095-4218165 หน้างาน')
  })

  it('ผรม.กรวีวัลย์ + ชื่อช่าง + เบอร์เดียว ได้เบอร์เดียวเหมือนเดิม; ไม่มีเบอร์ = ว่าง', () => {
    expect(splitContactPhone('ผรม.กรวีวัลย์ โฮมเวิร์ค\nช่างจอม 086-3347315').phone).toBe('0863347315')
    expect(splitContactPhone('ช่างจอม').phone).toBe('')
  })
})

describe('phonesOfSite — ปุ่มโทรของคนขับ', () => {
  it('ดึงทุกเบอร์จากข้อความผู้ติดต่อ (งานที่นำเข้าไปแล้วด้วย) แม้ช่องเบอร์ถูกต่อกันผิด', () => {
    expect(phonesOfSite({ siteContactName: 'คุณอร 084-535-8614, 095-4218165 หน้างาน', sitePhone: '08453586140954218165' })).toEqual(['0845358614', '0954218165'])
  })

  it('ไม่มีเบอร์ในข้อความ แต่ช่องเบอร์ถูกต่อกัน = แยกกลับเป็นเบอร์ละ 10 หลัก; ช่องเบอร์ปกติ = ใช้เลยโดยไม่ซ้ำ', () => {
    expect(phonesOfSite({ sitePhone: '08453586140954218165' })).toEqual(['0845358614', '0954218165'])
    expect(phonesOfSite({ siteContactName: 'คุณอร', sitePhone: '084-535-8614' })).toEqual(['0845358614'])
    expect(phonesOfSite({ siteContactName: 'คุณอร 0845358614', sitePhone: '0845358614' })).toEqual(['0845358614'])
    expect(phonesOfSite({})).toEqual([])
  })
})

describe('formatPhone', () => {
  it('แสดงเบอร์อ่านง่าย', () => {
    expect(formatPhone('0845358614')).toBe('084-535-8614')
    expect(formatPhone('021234567')).toBe('02-123-4567')
    expect(formatPhone('123')).toBe('123')
  })
})
