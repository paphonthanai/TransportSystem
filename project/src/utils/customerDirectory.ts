export interface CustomerDirectoryEntry {
  name: string
  address: string
  taxId: string
}

const directory: CustomerDirectoryEntry[] = [
  { name: 'บจก. ศรีไทยคอนกรีต', address: '145 ถ.สุขุมวิท ต.บางปูใหม่ อ.เมือง จ.สมุทรปราการ 10280', taxId: '0105536001221' },
  { name: 'บมจ. พฤกษา', address: '1177 อาคารเพิร์ล แบงก์ค็อก ถ.พหลโยธิน แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400', taxId: '0107536000451' },
  { name: 'หจก. รุ่งเรืองวัสดุ', address: '88/2 ถ.มิตรภาพ ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา 30130', taxId: '0303536002233' },
  { name: 'บจก. แลนด์ดีเวลลอป', address: '55 ถ.รัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310', taxId: '0105536003344' },
  { name: 'บจก. เมกาโฮม', address: '333 ถ.บางนา-ตราด ต.บางแก้ว อ.บางพลี จ.สมุทรปราการ 10540', taxId: '0105536004455' },
  { name: 'หจก. ทวีทรัพย์', address: '21 ถ.เพชรมาตุคลา ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000', taxId: '0303536005566' },
]

export function lookupCustomer(name: string): CustomerDirectoryEntry {
  return (
    directory.find((c) => c.name === name) || {
      name,
      address: '-',
      taxId: '-',
    }
  )
}
