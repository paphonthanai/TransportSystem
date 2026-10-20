import { describe, it, expect } from 'vitest'
import { parseGpsInput } from './gps'

describe('parseGpsInput — รูปแบบลิงก์เพิ่มเติม', () => {
  it.each([
    ['https://www.google.com/maps/place/Foo/data=!3d13.7367!4d100.5231', 13.7367, 100.5231],
    ['https://www.google.com/maps/place/13.7367,100.5231', 13.7367, 100.5231],
    ['https://www.google.com/maps/search/?api=1&query=13.7367,100.5231', 13.7367, 100.5231],
    ['https://www.google.com/maps/dir/?api=1&destination=13.7367%2C100.5231', 13.7367, 100.5231],
    ['geo:13.7367,100.5231', 13.7367, 100.5231],
  ])('%s', (raw, lat, lng) => {
    expect(parseGpsInput(raw)).toEqual({ latitude: lat, longitude: lng })
  })
  it('ลิงก์สั้นไม่มีพิกัด → ว่าง (ผู้เรียกเก็บ mapUrl ไว้เอง)', () => {
    expect(parseGpsInput('https://maps.app.goo.gl/TeiWqRmaq9Tciyw98')).toEqual({})
  })
})
