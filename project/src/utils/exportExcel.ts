import * as XLSX from 'xlsx'

/** ส่งออกรายการเป็นไฟล์ .xlsx ให้ผู้ใช้ดาวน์โหลด — ใช้ร่วมกันทุกหน้าที่มีปุ่ม "นำออกเป็น Excel" */
export function exportRowsToExcel(filename: string, rows: Record<string, unknown>[], sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
