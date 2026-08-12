<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold">สมุดรายชื่อ · ลูกค้า/คู่ค้า</h2>
      <button @click="openDialog()" class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มผู้ติดต่อ
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[880px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">รหัส</th>
            <th class="px-4 py-3 font-semibold">ผู้ติดต่อ</th>
            <th class="px-4 py-3 font-semibold">ประเภท</th>
            <th class="px-4 py-3 font-semibold">ผู้ติดต่อหลัก</th>
            <th class="px-4 py-3 font-semibold">เบอร์</th>
            <th class="px-4 py-3 font-semibold text-right">งานสะสม</th>
            <th class="px-4 py-3 font-semibold text-right">ยอดรวม</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customerRows" :key="customer.code || customer.name" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3 text-muted font-semibold">{{ customer.code || '-' }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div :style="{ background: customer.avatarBg }" class="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold">{{ customer.initial }}</div>
                <div class="font-semibold text-text">{{ customer.name }}</div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1 flex-wrap">
                <span v-if="customer.isCustomer" class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">ลูกค้า</span>
                <span v-if="customer.isVendor" class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">ผู้จำหน่าย</span>
              </div>
            </td>
            <td class="px-4 py-3 text-text">{{ customer.contact || '-' }}</td>
            <td class="px-4 py-3 text-muted">{{ customer.phone || '-' }}</td>
            <td class="px-4 py-3 text-right font-semibold text-text">{{ customer.isCustomer ? customer.jobs : '-' }}</td>
            <td class="px-4 py-3 text-right font-semibold text-text">{{ customer.isCustomer ? customer.total : '-' }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="openDialog(customer)" class="btn-sm">แก้ไข</button>
            </td>
          </tr>
          <tr v-if="customerRows.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-muted">ยังไม่มีผู้ติดต่อ</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body" v-if="showDialog">
      <div @click="showDialog = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">{{ editingCode === null ? 'สร้างรายชื่อผู้ติดต่อ' : 'แก้ไขรายชื่อผู้ติดต่อ' }}</div>
            <button @click="showDialog = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <!-- ซ้าย: ข้อมูลผู้ติดต่อ -->
            <div class="space-y-3">
              <div class="text-xs font-bold text-muted uppercase tracking-wide">ข้อมูลผู้ติดต่อ</div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ประเภทผู้ติดต่อ</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                    <input type="radio" value="corporate" v-model="form.entityType" />
                    นิติบุคคล
                  </label>
                  <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                    <input type="radio" value="individual" v-model="form.entityType" />
                    บุคคลธรรมดา
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ประเภท</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                    <input type="checkbox" v-model="form.isCustomer" />
                    ลูกค้า
                  </label>
                  <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                    <input type="checkbox" v-model="form.isVendor" />
                    ผู้จำหน่าย
                  </label>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เครดิต (วัน)</label>
                  <input v-model.number="form.creditDays" type="number" min="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">
                    รหัสผู้ติดต่อ
                    <span class="text-[10px] font-normal text-muted">(ใช้อ้างอิงในเลข PO)</span>
                  </label>
                  <input v-model="form.code" placeholder="เช่น SCC" class="input-field w-full" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ชื่อกิจการ / ชื่อ</label>
                <input v-model="form.name" placeholder="ตัวอย่างการกรอก: บริษัท โฟลว์แอคเคาท์ จำกัด" class="input-field w-full" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เลขประจำตัวผู้เสียภาษี</label>
                <input v-model="form.taxId" placeholder="ระบุเลขผู้เสียภาษี 10 - 13 หลัก" class="input-field w-full" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">สำนักงาน/สาขา</label>
                <div class="flex gap-4 mb-2">
                  <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                    <input type="radio" value="hq" v-model="form.office" />
                    สำนักงานใหญ่
                  </label>
                  <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                    <input type="radio" value="branch" v-model="form.office" />
                    สาขา
                  </label>
                </div>
                <input v-if="form.office === 'branch'" v-model="form.branchName" placeholder="ชื่อสาขา" class="input-field w-full" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ที่อยู่</label>
                <textarea v-model="form.address" rows="3" class="input-field w-full resize-none"></textarea>
              </div>

              <div>
                <label class="block text-xs font-semibold text-muted mb-1">รหัสไปรษณีย์</label>
                <input v-model="form.zipCode" class="input-field w-full" />
              </div>
            </div>

            <!-- ขวา: รายละเอียดผู้ติดต่อ + ธนาคาร + เพิ่มเติม -->
            <div class="space-y-3">
              <div class="text-xs font-bold text-muted uppercase tracking-wide">รายละเอียดผู้ติดต่อ</div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อ</label>
                <input v-model="form.contact" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">อีเมล</label>
                <input v-model="form.email" type="email" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทร</label>
                <input v-model="form.phone" class="input-field w-full" />
              </div>

              <div class="text-xs font-bold text-muted uppercase tracking-wide pt-3 border-t border-border">ข้อมูลธนาคาร</div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ธนาคาร</label>
                <input v-model="form.bankName" class="input-field w-full" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ชื่อบัญชี</label>
                  <input v-model="form.bankAccountName" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขที่บัญชี</label>
                  <input v-model="form.bankAccountNumber" class="input-field w-full" />
                </div>
              </div>

              <div class="text-xs font-bold text-muted uppercase tracking-wide pt-3 border-t border-border">ข้อมูลเพิ่มเติม</div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">โน้ต</label>
                <textarea v-model="form.note" rows="3" class="input-field w-full resize-none"></textarea>
              </div>
            </div>
          </div>

          <div class="px-6 pb-5">
            <CustomerContactsPanel v-if="editingId" :customer-id="editingId" />
            <div v-else class="text-xs text-muted border border-dashed border-border rounded-lg p-3">
              บันทึกลูกค้ารายนี้ก่อน จึงจะเพิ่มรายชื่อผู้ติดต่อได้
            </div>
          </div>

          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="showDialog = false" class="btn-secondary">ยกเลิก</button>
            <button @click="save" :disabled="!form.name" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึก</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCustomerStore, type CustomerRecord } from '@/stores/customers'
import { useBookingStore } from '@/stores/booking'
import CustomerContactsPanel from '@/components/customers/CustomerContactsPanel.vue'

const customerStore = useCustomerStore()
const bookingStore = useBookingStore()

const avatarPalette = ['#3b82f6', '#10b981', '#2563eb', '#8b5cf6', '#f97316', '#ec4899']
const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const customerRows = computed(() =>
  customerStore.customers.map((customer, i) => {
    const jobs = bookingStore.bookings.filter((b) => b.customer === customer.name).length
    const total = bookingStore.documents
      .filter((d) => d.customer === customer.name && d.status === 'paid')
      .reduce((sum, d) => sum + d.amount, 0)
    return {
      ...customer,
      jobs,
      total: formatBaht(total),
      initial: customer.name.charAt(0),
      avatarBg: avatarPalette[i % avatarPalette.length],
    }
  })
)

const showDialog = ref(false)
const editingCode = ref<string | null>(null)
/** id เอกสาร Firestore ของรายการที่กำลังแก้ไข — แยกจาก editingCode (ใช้แค่โชว์หัวข้อ dialog เดิม) เพราะ update ต้องใช้ id จริง */
const editingId = ref<string | undefined>(undefined)

const emptyForm = (): CustomerRecord => ({
  code: '',
  entityType: 'corporate',
  isCustomer: true,
  isVendor: false,
  creditDays: 0,
  name: '',
  taxId: '',
  office: 'hq',
  branchName: '',
  address: '',
  zipCode: '',
  contact: '',
  email: '',
  phone: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  note: '',
})

const form = ref<CustomerRecord>(emptyForm())

const openDialog = (customer?: CustomerRecord) => {
  if (customer) {
    editingCode.value = customer.code || customer.name
    editingId.value = customer.id
    // customer อาจมาจาก customerRows (ใน template) ที่ enrich เพิ่ม avatarBg/initial/jobs/total ไว้แสดงผลในตาราง
    // เท่านั้น — sanitizeCustomer() ตัดฟิลด์เหล่านี้ทิ้งก่อนเอาเข้าฟอร์ม กัน field แปลกปลอมหลุดไปกับตอน save
    form.value = { ...customerStore.sanitizeCustomer(customer), id: customer.id }
  } else {
    editingCode.value = null
    editingId.value = undefined
    form.value = emptyForm()
  }
  showDialog.value = true
}

const save = async () => {
  if (!form.value.name) return
  const { id, ...data } = form.value
  if (editingId.value) {
    await customerStore.updateCustomer(editingId.value, data)
  } else {
    await customerStore.createCustomer(data)
  }
  showDialog.value = false
}
</script>

<style scoped>
.input-field {
  @apply px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.btn-sm {
  @apply h-8 px-2 rounded-lg border border-border bg-surface font-medium text-xs cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}
</style>
