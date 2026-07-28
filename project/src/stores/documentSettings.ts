import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const SETTINGS_KEY = 'tms_document_settings_v1'

export type PriceDisplay = 'exclusive' | 'inclusive'
export type CalcMode = 'separate' | 'included'

export interface DocumentSettings {
  company: {
    name: string
    address: string
    taxId: string
    logo: string | null
    stamp: string | null
  }
  priceDisplay: PriceDisplay
  vatRate: number
  whtRate: number
  calcMode: {
    sales: { vat: CalcMode; discount: CalcMode; wht: CalcMode }
    purchase: { vat: CalcMode; discount: CalcMode; wht: CalcMode }
  }
  numbering: {
    invoice: { prefix: string; padding: number }
    receipt: { prefix: string; padding: number }
    wht: { prefix: string; padding: number }
    billingList: { prefix: string; padding: number }
  }
  payment: {
    bankName: string
    accountName: string
    accountNumber: string
    promptPay: string
    note: string
  }
  currency: { code: string; symbol: string }
  notes: { invoice: string; receipt: string; wht: string }
  toggles: {
    showAdjustmentRow: boolean
    showWarehouseOnDocument: boolean
    defaultMainWarehouse: boolean
  }
}

function defaultSettings(): DocumentSettings {
  return {
    company: {
      name: 'บริษัท ธัญธารา จำกัด (สำนักงานใหญ่)',
      address: '99 หมู่ 4 ถ.มิตรภาพ ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา 30130',
      taxId: '0305566001234',
      logo: null,
      stamp: null,
    },
    priceDisplay: 'exclusive',
    vatRate: 7,
    whtRate: 1,
    calcMode: {
      sales: { vat: 'separate', discount: 'separate', wht: 'separate' },
      purchase: { vat: 'separate', discount: 'separate', wht: 'separate' },
    },
    numbering: {
      invoice: { prefix: 'INV', padding: 4 },
      receipt: { prefix: 'RE', padding: 4 },
      wht: { prefix: 'WHT', padding: 4 },
      billingList: { prefix: 'VB', padding: 4 },
    },
    payment: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      promptPay: '',
      note: '',
    },
    currency: { code: 'THB', symbol: '฿' },
    notes: { invoice: '', receipt: '', wht: '' },
    toggles: {
      showAdjustmentRow: true,
      showWarehouseOnDocument: false,
      defaultMainWarehouse: true,
    },
  }
}

/** รวม settings ที่โหลดจาก localStorage เข้ากับค่า default เผื่อมีฟิลด์ใหม่ที่ข้อมูลเก่ายังไม่มี */
function mergeWithDefaults(raw: any): DocumentSettings {
  const def = defaultSettings()
  return {
    company: { ...def.company, ...raw?.company },
    priceDisplay: raw?.priceDisplay ?? def.priceDisplay,
    vatRate: raw?.vatRate ?? def.vatRate,
    whtRate: raw?.whtRate ?? def.whtRate,
    calcMode: {
      sales: { ...def.calcMode.sales, ...raw?.calcMode?.sales },
      purchase: { ...def.calcMode.purchase, ...raw?.calcMode?.purchase },
    },
    numbering: {
      invoice: { ...def.numbering.invoice, ...raw?.numbering?.invoice },
      receipt: { ...def.numbering.receipt, ...raw?.numbering?.receipt },
      wht: { ...def.numbering.wht, ...raw?.numbering?.wht },
      billingList: { ...def.numbering.billingList, ...raw?.numbering?.billingList },
    },
    payment: { ...def.payment, ...raw?.payment },
    currency: { ...def.currency, ...raw?.currency },
    notes: { ...def.notes, ...raw?.notes },
    toggles: { ...def.toggles, ...raw?.toggles },
  }
}

function loadSettings(): DocumentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return mergeWithDefaults(JSON.parse(raw))
  } catch {
    // corrupt/inaccessible storage, fall back to defaults
  }
  return defaultSettings()
}

export const useDocumentSettingsStore = defineStore('documentSettings', () => {
  const settings = ref<DocumentSettings>(loadSettings())

  watch(settings, (val) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === SETTINGS_KEY && e.newValue) {
      settings.value = mergeWithDefaults(JSON.parse(e.newValue))
    }
  })

  function padNumber(seq: number, padding: number) {
    return String(seq).padStart(padding, '0')
  }

  return {
    settings,
    padNumber,
  }
})
