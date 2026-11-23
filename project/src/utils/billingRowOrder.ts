/** เวลาของวันที่ในแถวเอกสาร (ไม่มีวันที่/อ่านไม่ได้ = ไม่รู้ตำแหน่ง ถือว่าอยู่ท้ายสุด) */
const rowTime = (r: { shipDate?: Date | string }) => {
  const t = r.shipDate ? new Date(r.shipDate).getTime() : NaN
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY
}

/**
 * รวมแถวงานที่ติ๊กเพิ่มเข้าใบวางบิล โดยแทรกแต่ละแถวตามวันที่ (ก่อนแถวเดิมแถวแรกที่วันที่ถัดไป) แทนการต่อท้ายสุด
 * แถวเดิมคงลำดับเดิม แถวที่กรอกเองไม่มีวันที่อยู่ที่เดิม แถวใหม่ที่วันที่เท่ากับแถวเดิมต่อหลังแถวเดิม — คืน array ใหม่
 */
export function insertRowsByDate<T extends { shipDate?: Date | string }>(rows: T[], newRows: T[]): T[] {
  const out = [...rows]
  const sorted = [...newRows].sort((a, b) => rowTime(a) - rowTime(b))
  for (const row of sorted) {
    const t = rowTime(row)
    const idx = out.findIndex((r) => !!r.shipDate && rowTime(r) > t)
    if (idx === -1) out.push(row)
    else out.splice(idx, 0, row)
  }
  return out
}
