import jsPDF from 'jspdf'
// html2canvas ตัวจริง (ของเดิม) parse สี CSS ได้แค่ rgb/hsl/hex เก่าๆ พอเจอ oklch() ที่ Chrome รุ่นใหม่ใช้เป็นค่า
// default ของ UI บางส่วน (เช่น focus outline/form control) จะโยน error "unsupported color function 'oklch'" ทันที
// เปลี่ยนมาใช้ html2canvas-pro (fork ที่ยังอัปเดตอยู่ รองรับ oklch/oklab/lab/lch/color()) แทน โดย API เหมือนเดิมทุกอย่าง
import html2canvas from 'html2canvas-pro'

export interface ExportDocRef {
  id: string
  /** ใช้ตั้งชื่อไฟล์ตอนแยกไฟล์ (mode: 'separate') — ปกติคือเลขที่เอกสาร */
  label: string
}

export type PdfExportMode = 'merged' | 'separate'

/**
 * ดาวน์โหลดเอกสารที่เลือกไว้เป็น PDF โดยใช้หน้าพิมพ์เอกสารเดิมที่มีอยู่แล้ว (เส้นทาง /documents/:docId ดู
 * InvoiceDocumentView.vue) ผ่าน iframe ซ่อนไว้ทีละใบ แทนการเขียนโค้ด render เอกสารซ้ำอีกชุด — รับรองว่าหน้าตา
 * ตรงกับที่กด "พิมพ์เอกสาร" เป๊ะเสมอ
 *
 * mode 'merged': รวมทุกเอกสารเป็นไฟล์ PDF เดียว (1 เอกสารต่อ 1 หน้า)
 * mode 'separate': แยกเป็นไฟล์ PDF ต่อเอกสาร ดาวน์โหลดทีละไฟล์ต่อเนื่องกัน (เบราว์เซอร์บางตัวอาจถามอนุญาต
 * "ดาวน์โหลดหลายไฟล์" ตอนไฟล์ที่ 2 เป็นต้นไป เป็นพฤติกรรมปกติของเบราว์เซอร์ ไม่ใช่บั๊ก)
 *
 * ทำทีละใบตามลำดับ (ไม่ทำพร้อมกันหลายใบ) เพราะแต่ละใบต้องบูตแอปทั้งหน้าใหม่ในเฟรมของตัวเอง (หน้านี้เป็น SPA
 * ที่โหลดข้อมูลจาก Firestore ตอน mount) ทำพร้อมกันเสี่ยงชนกัน/กิน memory เกินจำเป็น — จำนวนเอกสารมากจะใช้เวลานาน
 * ตามสัดส่วน (แต่ละใบรอโหลดข้อมูลจริงจาก Firestore ก่อนถ่ายภาพ ไม่ใช่แค่ animation)
 */
export async function exportDocumentsAsPdf(
  docs: ExportDocRef[],
  mode: PdfExportMode,
  mergedFilename: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (!docs.length) return

  if (mode === 'separate') {
    for (let i = 0; i < docs.length; i++) {
      const canvas = await renderDocumentToCanvas(docs[i].id)
      const pdf = buildSinglePagePdf(canvas)
      pdf.save(sanitizeFilename(docs[i].label) + '.pdf')
      onProgress?.(i + 1, docs.length)
    }
    return
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  for (let i = 0; i < docs.length; i++) {
    const canvas = await renderDocumentToCanvas(docs[i].id)
    addCanvasPage(pdf, canvas, pageWidth, pageHeight, i > 0)
    onProgress?.(i + 1, docs.length)
  }
  pdf.save(mergedFilename)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'document'
}

function buildSinglePagePdf(canvas: HTMLCanvasElement): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  addCanvasPage(pdf, canvas, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), false)
  return pdf
}

function addCanvasPage(pdf: jsPDF, canvas: HTMLCanvasElement, pageWidth: number, pageHeight: number, addNewPage: boolean) {
  const imgData = canvas.toDataURL('image/png')
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
  const w = canvas.width * ratio
  const h = canvas.height * ratio
  if (addNewPage) pdf.addPage()
  pdf.addImage(imgData, 'PNG', (pageWidth - w) / 2, 10, w, h)
}

/** เปิดเอกสาร docId ในเฟรมที่ซ่อนไว้ รอให้แอปข้างในโหลดข้อมูลจาก Firestore เสร็จและ render #print-area จริงก่อน
 *  (poll เนื้อหาจริง แทนใช้ setTimeout ตายตัว เพราะเวลาโหลดจาก Firestore ไม่คงที่) แล้วถ่ายภาพด้วย html2canvas */
function renderDocumentToCanvas(docId: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-10000px'
    iframe.style.left = '-10000px'
    iframe.style.width = '900px'
    iframe.style.height = '1200px'
    iframe.src = `/documents/${docId}`

    let settled = false
    const cleanup = () => {
      if (iframe.parentNode) iframe.remove()
    }
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const hardTimeout = setTimeout(() => {
      finish(() => {
        cleanup()
        reject(new Error(`โหลดเอกสาร ${docId} ไม่สำเร็จ (หมดเวลารอ)`))
      })
    }, 20000)

    iframe.onload = () => {
      const start = Date.now()
      const poll = setInterval(() => {
        const innerDoc = iframe.contentDocument
        const el = innerDoc?.querySelector('#print-area') as HTMLElement | null
        if (el && el.innerText.trim().length > 0) {
          clearInterval(poll)
          clearTimeout(hardTimeout)
          html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
            .then((canvas) => finish(() => {
              cleanup()
              resolve(canvas)
            }))
            .catch((err) => finish(() => {
              cleanup()
              reject(err)
            }))
        } else if (Date.now() - start > 15000) {
          clearInterval(poll)
          clearTimeout(hardTimeout)
          finish(() => {
            cleanup()
            reject(new Error(`หาเนื้อหาเอกสาร ${docId} ไม่เจอ`))
          })
        }
      }, 300)
    }

    document.body.appendChild(iframe)
  })
}
