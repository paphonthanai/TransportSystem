<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap no-print">
      <h2 class="text-lg font-bold text-text">หนังสือรับรองการหักภาษี ณ ที่จ่าย</h2>
      <button @click="openCreate" class="btn-primary">
        <span class="material-symbols-rounded">note_add</span>
        ออกหนังสือรับรองฯ
      </button>
    </div>
    <div class="text-xs text-muted no-print">
      ออกเมื่อบริษัทจ่ายเงินให้คนขับ/รถร่วม/ผู้จำหน่าย และหักภาษี ณ ที่จ่ายตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร
    </div>

    <div class="card-lg overflow-hidden no-print">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-3 py-2 font-semibold text-muted">เลขที่</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">วันที่จ่าย</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">ผู้รับเงิน</th>
              <th class="text-left px-3 py-2 font-semibold text-muted">ประเภทเงินได้</th>
              <th class="text-right px-3 py-2 font-semibold text-muted">จำนวนเงินที่จ่าย</th>
              <th class="text-right px-3 py-2 font-semibold text-muted">อัตรา%</th>
              <th class="text-right px-3 py-2 font-semibold text-muted">ภาษีหัก ณ ที่จ่าย</th>
              <th class="text-left px-3 py-2 font-semibold text-muted"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cert in certificates" :key="cert.id" class="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
              <td class="px-3 py-2 font-bold text-primary">{{ cert.number }}</td>
              <td class="px-3 py-2 text-muted">{{ formatDate(cert.payDate) }}</td>
              <td class="px-3 py-2 text-text">
                <div class="font-semibold">{{ cert.payeeName }}</div>
                <div class="text-xs text-muted">{{ payeeTypeLabel[cert.payeeType] }}</div>
              </td>
              <td class="px-3 py-2 text-text">{{ cert.incomeType }}</td>
              <td class="px-3 py-2 text-right text-text">{{ formatBaht(cert.grossAmount) }}</td>
              <td class="px-3 py-2 text-right text-text">{{ cert.whtRate }}%</td>
              <td class="px-3 py-2 text-right font-semibold text-red-600">{{ formatBaht(whtAmount(cert)) }}</td>
              <td class="px-3 py-2 text-right">
                <button @click="openView(cert)" class="btn-sm">
                  <span class="material-symbols-rounded text-base">visibility</span>
                  ดูรายละเอียด
                </button>
              </td>
            </tr>
            <tr v-if="certificates.length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-muted">ยังไม่มีหนังสือรับรองการหักภาษี ณ ที่จ่าย</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body" v-if="showCreate">
      <div @click="showCreate = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย</div>
            <button @click="showCreate = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ประเภทผู้รับเงิน</label>
              <select v-model="form.payeeType" @change="onPayeeTypeChange" class="input-field w-full">
                <option value="driver">พนักงานขับรถ</option>
                <option value="vendor_fleet">รถร่วม</option>
                <option value="vendor">ผู้จำหน่าย</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>
            <div v-if="form.payeeType === 'driver' || form.payeeType === 'vendor_fleet'">
              <label class="block text-xs font-semibold text-muted mb-1">เลือกจากรายชื่อคนขับ</label>
              <select v-model="selectedDriverName" @change="applyDriverPreset" class="input-field w-full">
                <option value="">-- เลือก --</option>
                <option v-for="d in drivers" :key="d.name" :value="d.name">{{ d.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้รับเงิน</label>
              <input v-model="form.payeeName" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ที่อยู่ผู้รับเงิน</label>
              <input v-model="form.payeeAddress" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน</label>
              <input v-model="form.payeeTaxId" class="input-field w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">วันที่จ่ายเงิน</label>
                <input v-model="form.payDate" type="date" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ประเภทเงินได้</label>
                <input v-model="form.incomeType" class="input-field w-full" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">จำนวนเงินที่จ่าย (บาท)</label>
                <input v-model.number="form.grossAmount" type="number" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">อัตราภาษีหัก ณ ที่จ่าย (%)</label>
                <input v-model.number="form.whtRate" type="number" step="0.5" class="input-field w-full" />
              </div>
            </div>
            <div class="text-xs bg-surface-2 rounded-lg p-3 flex justify-between">
              <span class="text-muted">ภาษีที่หัก ณ ที่จ่าย</span>
              <span class="font-bold text-red-600">{{ formatBaht(formWhtAmount) }}</span>
            </div>
            <div class="text-xs bg-surface-2 rounded-lg p-3 flex justify-between">
              <span class="text-muted">จำนวนเงินที่จ่ายจริง (สุทธิ)</span>
              <span class="font-bold text-text">{{ formatBaht(form.grossAmount - formWhtAmount) }}</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">หมายเหตุ</label>
              <input v-model="form.note" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="showCreate = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmCreate" :disabled="!form.payeeName || !form.grossAmount" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded text-base">note_add</span>
              ออกหนังสือรับรองฯ
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View / Print Certificate -->
    <Teleport to="body" v-if="viewTarget">
      <div @click="viewTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-start justify-center p-6 overflow-y-auto">
        <div @click.stop class="w-full max-w-3xl">
          <div class="flex items-center justify-between mb-3 no-print">
            <button @click="viewTarget = null" class="btn-secondary">
              <span class="material-symbols-rounded text-base">close</span>
              ปิด
            </button>
            <button @click="window.print()" class="btn-primary">
              <span class="material-symbols-rounded text-base">print</span>
              พิมพ์เอกสาร
            </button>
          </div>

          <div id="print-area" class="print-sheet bg-white text-black rounded-xl shadow-2xl p-10">
            <div class="text-center mb-4">
              <div class="text-lg font-bold">หนังสือรับรองการหักภาษี ณ ที่จ่าย</div>
              <div class="text-xs text-gray-600">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</div>
              <div class="text-xs mt-1">เล่มที่ - เลขที่ {{ viewTarget.number }}</div>
            </div>

            <div class="border border-black p-3 mb-3 text-sm">
              <div class="font-semibold mb-1">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</div>
              <div>{{ companyInfo.name }}</div>
              <div class="text-xs">{{ companyInfo.address }}</div>
              <div class="text-xs">เลขประจำตัวผู้เสียภาษีอากร {{ companyInfo.taxId }}</div>
            </div>

            <div class="border border-black p-3 mb-3 text-sm">
              <div class="font-semibold mb-1">ผู้ถูกหักภาษี ณ ที่จ่าย</div>
              <div>{{ viewTarget.payeeName }}</div>
              <div class="text-xs">{{ viewTarget.payeeAddress || '-' }}</div>
              <div class="text-xs">เลขประจำตัวผู้เสียภาษีอากร / เลขบัตรประชาชน {{ viewTarget.payeeTaxId || '-' }}</div>
            </div>

            <table class="w-full text-sm border border-black mb-3">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border border-black px-2 py-1 text-left">ประเภทเงินได้ที่จ่าย</th>
                  <th class="border border-black px-2 py-1 text-left w-32">วันเดือนปีที่จ่าย</th>
                  <th class="border border-black px-2 py-1 text-right w-28">จำนวนเงินที่จ่าย</th>
                  <th class="border border-black px-2 py-1 text-right w-24">อัตรา%</th>
                  <th class="border border-black px-2 py-1 text-right w-28">ภาษีที่หักและนำส่งไว้</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-black px-2 py-1">{{ viewTarget.incomeType }}</td>
                  <td class="border border-black px-2 py-1">{{ formatDate(viewTarget.payDate) }}</td>
                  <td class="border border-black px-2 py-1 text-right">{{ formatBaht(viewTarget.grossAmount) }}</td>
                  <td class="border border-black px-2 py-1 text-right">{{ viewTarget.whtRate }}%</td>
                  <td class="border border-black px-2 py-1 text-right">{{ formatBaht(whtAmount(viewTarget)) }}</td>
                </tr>
                <tr>
                  <td colspan="4" class="border border-black px-2 py-1 text-right font-semibold">รวมเงินที่จ่ายและภาษีที่หักนำส่ง</td>
                  <td class="border border-black px-2 py-1 text-right font-semibold">{{ formatBaht(whtAmount(viewTarget)) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="text-sm mb-6">
              <span class="text-gray-600">ตัวอักษร:</span> ({{ bahtText(whtAmount(viewTarget)) }})
            </div>

            <div class="text-xs text-gray-700 mb-8">
              ผู้จ่ายเงินขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความเป็นจริงทุกประการ
            </div>

            <div class="flex justify-end">
              <div class="text-sm text-center w-64">
                <div class="border-t border-gray-500 pt-2">ผู้จ่ายเงิน</div>
                <div class="text-xs text-gray-600 mt-1">วันที่ {{ formatDate(viewTarget.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWHTCertificateStore } from '@/stores/whtCertificate'
import { companyInfo, bahtText } from '@/utils/companyInfo'
import type { WHTCertificate, WHTPayeeType } from '@/types'

const whtStore = useWHTCertificateStore()
const certificates = computed(() => whtStore.certificates)

const payeeTypeLabel: Record<WHTPayeeType, string> = {
  driver: 'พนักงานขับรถ',
  vendor_fleet: 'รถร่วม',
  vendor: 'ผู้จำหน่าย',
  other: 'อื่นๆ',
}

const drivers = [
  { name: 'สมชาย ทองดี', idCard: '1-2345-67890-12-3', address: '12/4 ต.ปากน้ำ อ.เมือง จ.สระบุรี' },
  { name: 'ประเสริฐ มั่นคง', idCard: '1-2345-67891-23-4', address: '45 ต.บางพลี อ.บางพลี จ.สมุทรปราการ' },
  { name: 'วิรัตน์ ใจกล้า', idCard: '1-2345-67892-34-5', address: '78 ต.หน้าเมือง อ.เมือง จ.ราชบุรี' },
  { name: 'สมหมาย เพียรงาน', idCard: '1-2345-67893-45-6', address: '90 ต.หัวรอ อ.พระนครศรีอยุธยา จ.พระนครศรีอยุธยา' },
]

const whtAmount = (cert: WHTCertificate) => Math.round(((cert.grossAmount || 0) * (cert.whtRate || 0)) / 100)

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')

// --- Create ---
const showCreate = ref(false)
const selectedDriverName = ref('')
const form = ref({
  payeeType: 'driver' as WHTPayeeType,
  payeeName: '',
  payeeAddress: '',
  payeeTaxId: '',
  payDate: new Date().toISOString().slice(0, 10),
  incomeType: 'ค่าขนส่ง',
  grossAmount: 0,
  whtRate: 1,
  note: '',
})

const formWhtAmount = computed(() => Math.round(((form.value.grossAmount || 0) * (form.value.whtRate || 0)) / 100))

const openCreate = () => {
  selectedDriverName.value = ''
  form.value = {
    payeeType: 'driver',
    payeeName: '',
    payeeAddress: '',
    payeeTaxId: '',
    payDate: new Date().toISOString().slice(0, 10),
    incomeType: 'ค่าขนส่ง',
    grossAmount: 0,
    whtRate: 1,
    note: '',
  }
  showCreate.value = true
}

const onPayeeTypeChange = () => {
  selectedDriverName.value = ''
  form.value.payeeName = ''
  form.value.payeeAddress = ''
  form.value.payeeTaxId = ''
}

const applyDriverPreset = () => {
  const driver = drivers.find((d) => d.name === selectedDriverName.value)
  if (!driver) return
  form.value.payeeName = driver.name
  form.value.payeeAddress = driver.address
  form.value.payeeTaxId = driver.idCard
}

const confirmCreate = () => {
  if (!form.value.payeeName || !form.value.grossAmount) return
  whtStore.addCertificate({
    payeeType: form.value.payeeType,
    payeeName: form.value.payeeName,
    payeeAddress: form.value.payeeAddress,
    payeeTaxId: form.value.payeeTaxId,
    payDate: new Date(form.value.payDate),
    incomeType: form.value.incomeType,
    grossAmount: form.value.grossAmount,
    whtRate: form.value.whtRate,
    note: form.value.note || undefined,
  })
  showCreate.value = false
}

// --- View / print ---
const viewTarget = ref<WHTCertificate | null>(null)
const openView = (cert: WHTCertificate) => {
  viewTarget.value = cert
}
</script>

<style scoped>
.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    margin: 0 !important;
  }
}
</style>
