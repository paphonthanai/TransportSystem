/** ส่งออกรายการเป็นไฟล์ .xlsx ให้ผู้ใช้ดาวน์โหลด — ใช้ร่วมกันทุกหน้าที่มีปุ่ม "นำออกเป็น Excel"
 *  โหลดไลบรารี xlsx (~400 KB) ตอนกดปุ่มเท่านั้น ไม่ให้ทุกหน้าที่มีปุ่มนี้ต้องดาวน์โหลดตั้งแต่เปิดหน้า */
export async function exportRowsToExcel(filename: string, rows: Record<string, unknown>[], sheetName = 'Sheet1') {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
