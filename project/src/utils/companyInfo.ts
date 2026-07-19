const digitText = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const unitText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

function convertGroup(numStr: string): string {
  let result = ''
  const len = numStr.length
  for (let i = 0; i < len; i++) {
    const digit = Number(numStr[i])
    const place = len - i - 1
    if (digit === 0) continue
    if (place === 0 && digit === 1 && len > 1) {
      result += 'เอ็ด'
    } else if (place === 1 && digit === 2) {
      result += 'ยี่' + unitText[1]
    } else if (place === 1 && digit === 1) {
      result += unitText[1]
    } else {
      result += digitText[digit] + unitText[place]
    }
  }
  return result
}

function convertInteger(value: number): string {
  if (value === 0) return 'ศูนย์'
  let numStr = String(value)
  let result = ''
  // handle millions recursively by chunking into groups of 6 digits (ล้าน place)
  while (numStr.length > 6) {
    const head = numStr.slice(0, numStr.length - 6)
    const tail = numStr.slice(numStr.length - 6)
    result += convertGroup(head) + 'ล้าน'
    numStr = tail
  }
  result += convertGroup(numStr)
  return result
}

/** แปลงจำนวนเงินเป็นคำอ่านภาษาไทย เช่น 50032.11 -> "ห้าหมื่นสามสิบสองบาทสิบเอ็ดสตางค์" */
export function bahtText(amount: number): string {
  const rounded = Math.round((amount || 0) * 100) / 100
  const baht = Math.floor(rounded)
  const satang = Math.round((rounded - baht) * 100)

  const bahtWords = convertInteger(baht) + 'บาท'
  const satangWords = satang > 0 ? convertInteger(satang) + 'สตางค์' : 'ถ้วน'

  return bahtWords + satangWords
}
