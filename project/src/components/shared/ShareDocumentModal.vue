<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-5 pt-4">
          <h3 class="text-base font-bold text-text">แชร์เอกสาร {{ number }}</h3>
          <button @click="$emit('close')" class="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2">
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <div class="flex gap-1 px-5 mt-3 border-b border-border">
          <button
            @click="tab = 'share'"
            :class="['tab-btn', tab === 'share' && 'tab-btn-active']"
          >
            แชร์เอกสาร
          </button>
          <button
            @click="tab = 'email'"
            :class="['tab-btn', tab === 'email' && 'tab-btn-active']"
          >
            อีเมล
          </button>
        </div>

        <div class="px-5 py-4 space-y-4 overflow-y-auto">
          <template v-if="tab === 'share'">
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input type="checkbox" v-model="includeOriginal" class="w-4 h-4" />
                {{ docTypeLabel }}: ต้นฉบับ
              </label>
              <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input type="checkbox" v-model="includeCopy" class="w-4 h-4" />
                {{ docTypeLabel }}: สำเนา
              </label>
            </div>

            <div class="text-sm">
              <span class="text-muted">ข้อมูลการรับชำระ: </span>
              <button @click="goToPaymentSettings" class="text-primary font-medium hover:underline inline-flex items-center gap-1">
                <span class="material-symbols-rounded text-sm">settings</span>
                ตั้งค่าข้อมูลการรับชำระ
              </button>
            </div>

            <div>
              <label class="field-label">ลิงก์เอกสาร:</label>
              <div class="flex gap-2">
                <input :value="url" readonly class="input-field flex-1 text-xs" @click="($event.target as HTMLInputElement).select()" />
                <button @click="copyLink" class="btn-secondary whitespace-nowrap">
                  <span class="material-symbols-rounded text-base">content_copy</span>
                  {{ copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์' }}
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div>
              <label class="field-label">ถึง</label>
              <input v-model="emailTo" type="email" placeholder="อีเมลผู้รับ" class="input-field w-full" />
              <button v-if="!showMore" @click="showMore = true" class="text-xs text-primary font-medium hover:underline mt-1">+ เพิ่มเติม</button>
              <div v-else class="grid grid-cols-2 gap-2 mt-2">
                <input v-model="emailCc" placeholder="สำเนาถึง (CC)" class="input-field w-full text-xs" />
                <input v-model="emailBcc" placeholder="สำเนาลับถึง (BCC)" class="input-field w-full text-xs" />
              </div>
            </div>
            <div>
              <label class="field-label">หัวข้อ</label>
              <input v-model="emailSubject" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">ข้อความ</label>
              <textarea v-model="emailBody" rows="6" class="input-field w-full leading-relaxed" />
            </div>
          </template>
        </div>

        <div class="flex items-center justify-between px-5 py-3 border-t border-border">
          <button @click="previewDoc" class="text-sm text-primary font-medium hover:underline">พรีวิวเอกสาร</button>
          <div class="flex items-center gap-2">
            <button @click="$emit('close')" class="btn-secondary">{{ tab === 'email' ? 'ยกเลิก' : 'ปิดหน้าต่าง' }}</button>
            <button v-if="tab === 'email'" @click="sendEmail" class="btn-primary">
              <span class="material-symbols-rounded text-base">send</span>
              ส่งอีเมล
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentSettingsStore } from '@/stores/documentSettings'

const props = defineProps<{
  open: boolean
  docId: string
  number: string
  customer: string
  docTypeLabel: string
}>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const documentSettingsStore = useDocumentSettingsStore()

const tab = ref<'share' | 'email'>('share')
const includeOriginal = ref(true)
const includeCopy = ref(false)
const copied = ref(false)

const showMore = ref(false)
const emailTo = ref('')
const emailCc = ref('')
const emailBcc = ref('')
const emailSubject = ref('')
const emailBody = ref('')

const url = computed(() => `${window.location.origin}/documents/${props.docId}`)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    tab.value = 'share'
    copied.value = false
    const companyName = documentSettingsStore.settings.company.name
    emailSubject.value = `เอกสารเลขที่ ${props.number} จาก ${companyName}`
    emailBody.value = `เรียนคุณ ${props.customer}\n\nทางบริษัทขอส่ง${props.docTypeLabel}เลขที่ ${props.number} มาให้ตามเอกสารแนบ\n\nสามารถดูเอกสารได้ที่ลิงก์นี้: ${url.value}\n\nขอบคุณครับ/ค่ะ\n${companyName}`
  },
  { immediate: true }
)

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // เบราว์เซอร์ไม่รองรับ clipboard API — ผู้ใช้คัดลอกจากช่อง input เองแทน
  }
}

const previewDoc = () => window.open(url.value, '_blank')

const goToPaymentSettings = () => {
  emit('close')
  router.push('/settings/documents/payment')
}

/** ระบบยังไม่มี backend ส่งอีเมลจริง — จำลองการส่งไว้ก่อน */
const sendEmail = () => {
  if (!emailTo.value.trim()) {
    alert('กรุณากรอกอีเมลผู้รับ')
    return
  }
  alert(`ส่งอีเมลถึง ${emailTo.value} เรียบร้อยแล้ว (จำลอง)`)
  emit('close')
}
</script>

<style scoped>
.tab-btn {
  @apply px-3 py-2 text-sm font-medium text-muted border-b-2 border-transparent cursor-pointer hover:text-text;
}

.tab-btn-active {
  @apply text-primary border-primary;
}

.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
}

.input-field {
  @apply h-10 px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}
</style>
