<template>
  <div class="space-y-6">
    <!-- ================= Batch List ================= -->
    <template v-if="!selectedBatch">
      <div class="card-lg bg-primary-soft border-primary text-sm text-text">
        รอบบิล (Billing Batch) คือการรวมงานที่ส่งของสำเร็จแล้วแต่ยังไม่วางบิล เข้าเป็นชุดตามช่วงวันที่/ลูกค้า
        เพื่อตรวจสอบความถูกต้อง (POD, ราคา, ค่า extra) ก่อนออกใบแจ้งหนี้
      </div>

      <div class="flex justify-end">
        <button @click="openCreateBatch" class="btn-primary">
          <span class="material-symbols-rounded">add</span>
          สร้างรอบบิลใหม่
        </button>
      </div>

      <div class="card-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-muted">รอบบิล</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ช่วงวันที่</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">จำนวนงาน</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
                <th class="text-left px-4 py-3 font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in batches" :key="batch.id" class="border-b border-border hover:bg-surface-2 transition-colors">
                <td class="px-4 py-3 font-semibold text-text">{{ batch.label }}</td>
                <td class="px-4 py-3 text-text">{{ batch.customer || 'ทุกลูกค้า' }}</td>
                <td class="px-4 py-3 text-muted">{{ formatDate(batch.dateFrom) }} - {{ formatDate(batch.dateTo) }}</td>
                <td class="px-4 py-3 text-right text-text">{{ batch.bookingIds.length }}</td>
                <td class="px-4 py-3">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', batchStatusClass[batch.status]]">{{ batchStatusLabel[batch.status] }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="selectedBatchId = batch.id" class="btn-sm">
                      <span class="material-symbols-rounded text-base">visibility</span>
                      ดูรายละเอียด
                    </button>
                    <button
                      @click="openEditBatch(batch)"
                      :disabled="!canEditBatch(batch)"
                      :title="canEditBatch(batch) ? 'แก้ไขรอบบิล' : 'ออกใบแจ้งหนี้แล้ว ไม่สามารถแก้ไขได้'"
                      class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span class="material-symbols-rounded text-base">edit</span>
                      แก้ไข
                    </button>
                    <button
                      @click="openDeleteBatch(batch)"
                      :disabled="!canEditBatch(batch)"
                      :title="canEditBatch(batch) ? 'ลบรอบบิล' : 'ออกใบแจ้งหนี้แล้ว ไม่สามารถลบได้'"
                      class="btn-sm text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span class="material-symbols-rounded text-base">delete</span>
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="batches.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีรอบบิล</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ================= Batch Detail ================= -->
    <template v-else>
      <button @click="selectedBatchId = null" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับไปหน้ารายการรอบบิล
      </button>

      <div class="card-lg">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="font-bold text-text">{{ selectedBatch.label }}</div>
            <div class="text-xs text-muted">
              {{ selectedBatch.customer || 'ทุกลูกค้า' }} · {{ formatDate(selectedBatch.dateFrom) }} - {{ formatDate(selectedBatch.dateTo) }}
            </div>
          </div>
          <span :class="['text-xs font-semibold px-2 py-1 rounded-full', batchStatusClass[selectedBatch.status]]">{{ batchStatusLabel[selectedBatch.status] }}</span>
        </div>
      </div>

      <div class="card-lg overflow-hidden">
        <div class="font-bold text-text mb-3">ตรวจสอบก่อนคิดเงิน</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    :checked="allReadySelected"
                    :disabled="readyBookings.length === 0"
                    @change="toggleSelectAll"
                    class="w-4 h-4"
                  />
                </th>
                <th class="text-left px-3 py-2 font-semibold text-muted">เลขที่เอกสาร</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">หน้างาน</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">POD</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ราคาตรงตกลงไหม</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ค่า extra</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">ยอดรวม</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">สถานะบิล</th>
                <th class="text-left px-3 py-2 font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in batchBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors align-top">
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(booking.id)"
                    :disabled="booking.billingStatus !== 'IN_BATCH'"
                    @change="toggleSelected(booking.id)"
                    class="w-4 h-4"
                  />
                </td>
                <td class="px-3 py-2 font-bold text-primary">{{ booking.docNo }}</td>
                <td class="px-3 py-2 font-semibold text-text">{{ booking.siteName }}</td>
                <td class="px-3 py-2">
                  <span v-if="booking.podImage" class="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <span class="material-symbols-rounded text-base">check_circle</span> ครบ
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
                    <span class="material-symbols-rounded text-base">cancel</span> ไม่มี POD
                  </span>
                </td>
                <td class="px-3 py-2">
                  <span v-if="priceMatches(booking)" class="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <span class="material-symbols-rounded text-base">check_circle</span> ตรง
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">
                    <span class="material-symbols-rounded text-base">warning</span>
                    ต่าง {{ formatBaht(bookingTotal(booking) - booking.agreedPrice) }}
                  </span>
                </td>
                <td class="px-3 py-2 min-w-[180px]">
                  <div v-for="extra in booking.extraCharges || []" :key="extra.id" class="flex items-center justify-between text-xs mb-1">
                    <span class="text-muted">{{ extra.label }}</span>
                    <span class="text-text">{{ formatBaht(extra.amount) }}</span>
                  </div>
                  <button @click="openAddExtra(booking)" class="text-xs text-primary font-semibold">+ เพิ่มค่า extra</button>
                </td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(booking)) }}</td>
                <td class="px-3 py-2">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[booking.billingStatus || 'UNBILLED']]">
                    {{ billingStatusLabel[booking.billingStatus || 'UNBILLED'] }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <button @click="openViewDialog(booking)" class="btn-sm">
                      <span class="material-symbols-rounded text-base">visibility</span>
                      ดูรายละเอียด
                    </button>
                    <button
                      v-if="booking.billingStatus === 'HOLD'"
                      @click="releaseBooking(booking)"
                      class="btn-sm text-primary"
                    >
                      ปลดพัก
                    </button>
                    <button
                      v-else-if="booking.billingStatus === 'IN_BATCH'"
                      @click="holdBooking(booking)"
                      class="btn-sm text-red-600"
                    >
                      พักบิล
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="batchBookings.length === 0">
                <td colspan="9" class="px-4 py-8 text-center text-muted">ไม่มีงานในรอบบิลนี้</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div class="text-sm text-muted">
            เลือกแล้ว {{ selectedBookings.length }} รายการ (พร้อมออกใบแจ้งหนี้ {{ readyBookings.length }} รายการ) · ยอดรวม {{ formatBaht(selectedTotal) }}
          </div>
          <button @click="openCreateInvoice" :disabled="selectedBookings.length === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-symbols-rounded text-base">receipt_long</span>
            สร้างใบแจ้งหนี้
          </button>
        </div>
      </div>

      <div v-if="batchInvoices.length" class="card-lg overflow-hidden">
        <div class="font-bold text-text mb-3">ใบแจ้งหนี้จากรอบบิลนี้</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-3 py-2 font-semibold text-muted">เลขที่</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ลูกค้า</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ครบกำหนด</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">ยอดรวม</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">สถานะ</th>
                <th class="text-left px-3 py-2 font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in batchInvoices" :key="doc.id" class="border-b border-border last:border-0">
                <td class="px-3 py-2 font-bold text-primary">{{ doc.number }}</td>
                <td class="px-3 py-2 text-text">{{ doc.customer }}</td>
                <td class="px-3 py-2 text-muted">{{ formatDate(doc.dueDate) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(doc.amount) }}</td>
                <td class="px-3 py-2">
                  <span class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">{{ invoiceStatusLabel[doc.status] }}</span>
                </td>
                <td class="px-3 py-2">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="router.push(`/documents/${doc.id}`)" class="btn-sm">
                      <span class="material-symbols-rounded text-base">visibility</span>
                      ดูรายละเอียด
                    </button>
                    <button v-if="doc.status === 'draft'" @click="bookingStore.markInvoiceSent(doc.id)" class="btn-sm text-primary">ส่งให้ลูกค้า</button>
                    <button v-else-if="doc.status === 'sent'" @click="bookingStore.markInvoicePaid(doc.id)" class="btn-sm text-green-700">บันทึกรับชำระ</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Create Batch Modal -->
    <Teleport to="body" v-if="showCreateBatch">
      <div @click="showCreateBatch = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">สร้างรอบบิลใหม่</div>
            <button @click="showCreateBatch = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อรอบบิล</label>
              <input v-model="batchForm.label" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ลูกค้า</label>
              <select v-model="batchForm.customer" class="input-field w-full">
                <option value="">ทุกลูกค้า</option>
                <option v-for="c in customerOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ตั้งแต่วันที่</label>
                <input v-model="batchForm.dateFrom" type="date" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ถึงวันที่</label>
                <input v-model="batchForm.dateTo" type="date" class="input-field w-full" />
              </div>
            </div>
            <div class="text-xs text-muted bg-surface-2 rounded-lg p-3">
              พบงานที่ตรงเงื่อนไข <span class="font-bold text-text">{{ previewCount }}</span> รายการ
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showCreateBatch = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmCreateBatch" :disabled="previewCount === 0 || !batchForm.label" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">add</span>
              สร้างรอบบิล
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Batch Modal -->
    <Teleport to="body" v-if="showEditBatch">
      <div @click="showEditBatch = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">แก้ไขรอบบิล</div>
            <button @click="showEditBatch = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อรอบบิล</label>
              <input v-model="editBatchForm.label" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ลูกค้า</label>
              <select v-model="editBatchForm.customer" class="input-field w-full">
                <option value="">ทุกลูกค้า</option>
                <option v-for="c in customerOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ตั้งแต่วันที่</label>
                <input v-model="editBatchForm.dateFrom" type="date" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ถึงวันที่</label>
                <input v-model="editBatchForm.dateTo" type="date" class="input-field w-full" />
              </div>
            </div>
            <div class="text-xs text-muted bg-surface-2 rounded-lg p-3">
              หมายเหตุ: การแก้ไขช่วงวันที่/ลูกค้าจะไม่เปลี่ยนรายการงานที่มีอยู่ในรอบบิลแล้ว
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="showEditBatch = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmEditBatch" :disabled="!editBatchForm.label" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded text-base">save</span>
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Batch Confirm Modal -->
    <Teleport to="body" v-if="deleteBatchTarget">
      <div @click="deleteBatchTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ลบรอบบิล</div>
            <button @click="deleteBatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 text-sm text-text">
            ยืนยันลบรอบบิล "<span class="font-bold">{{ deleteBatchTarget.label }}</span>" ใช่หรือไม่?
            งานทั้งหมดในรอบบิลนี้จะกลับไปเป็นสถานะยังไม่วางบิล
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="deleteBatchTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmDeleteBatch" class="h-10 px-4 rounded-lg border-0 bg-red-600 text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90">
              <span class="material-symbols-rounded text-base">delete</span>
              ลบรอบบิล
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Extra Charge Modal -->
    <Teleport to="body" v-if="extraTarget">
      <div @click="extraTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">เพิ่มค่า extra: {{ extraTarget.docNo }}</div>
            <button @click="extraTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">รายการ</label>
              <input v-model="extraForm.label" placeholder="เช่น ค่ารอรถ, ค่าเพิ่มระยะ, ค่าเปลี่ยนเส้นทาง" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">จำนวนเงิน (บาท)</label>
              <input v-model.number="extraForm.amount" type="number" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="extraTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmAddExtra" :disabled="!extraForm.label || !extraForm.amount" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Invoice Modal -->
    <Teleport to="body" v-if="showCreateInvoice">
      <div @click="showCreateInvoice = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">สร้างใบแจ้งหนี้</div>
            <button @click="showCreateInvoice = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-muted mb-1">ลูกค้า</label>
                <input v-model="invoiceForm.customer" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">วันที่ออกเอกสาร</label>
                <input :value="formatDate(new Date())" disabled class="input-field w-full opacity-70" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เครดิต (วัน)</label>
                <input v-model.number="invoiceForm.creditDays" type="number" min="0" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">วันครบกำหนด</label>
                <input :value="formatDate(invoiceDueDatePreview)" disabled class="input-field w-full opacity-70" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เลขที่อ้างอิง</label>
                <input v-model="invoiceForm.reference" class="input-field w-full" />
              </div>
            </div>

            <div class="overflow-x-auto border border-border rounded-lg">
              <table class="w-full text-sm">
                <thead class="bg-surface-2 border-b border-border">
                  <tr>
                    <th class="text-left px-3 py-2 font-semibold text-muted">ลำดับ</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted">รายละเอียด</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted">จำนวน</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted">หน่วย</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted">ราคาต่อหน่วย</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(booking, idx) in selectedBookings" :key="booking.id" class="border-b border-border last:border-0">
                    <td class="px-3 py-2 text-text">{{ idx + 1 }}</td>
                    <td class="px-3 py-2 text-text">
                      <div class="font-semibold">{{ booking.docNo }} · {{ booking.siteName }}</div>
                      <div class="text-xs text-muted">{{ formatDate(booking.completedAt) }}</div>
                    </td>
                    <td class="px-3 py-2 text-right text-text">1</td>
                    <td class="px-3 py-2 text-text">เที่ยว</td>
                    <td class="px-3 py-2 text-right text-text">{{ formatBaht(bookingTotal(booking)) }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(bookingTotal(booking)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-end">
              <div class="w-full max-w-xs space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted">รวมเป็นเงิน</span>
                  <span class="text-text">{{ formatBaht(selectedTotal) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">ภาษีมูลค่าเพิ่ม 0%</span>
                  <span class="text-text">{{ formatBaht(0) }}</span>
                </div>
                <div class="flex justify-between font-bold text-text pt-1 border-t border-border">
                  <span>จำนวนเงินรวมทั้งสิ้น</span>
                  <span>{{ formatBaht(selectedTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="showCreateInvoice = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmCreateInvoice" :disabled="!invoiceForm.customer || selectedBookings.length === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded text-base">receipt_long</span>
              สร้างใบแจ้งหนี้
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View / Edit Details Modal -->
    <Teleport to="body" v-if="viewTarget">
      <div @click="closeViewDialog" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div>
              <div class="font-bold text-text">รายละเอียดงาน {{ viewTarget.docNo }}</div>
              <div class="text-xs text-muted">{{ viewTarget.customer }}</div>
            </div>
            <button @click="closeViewDialog" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[viewTarget.billingStatus || 'UNBILLED']]">
                {{ billingStatusLabel[viewTarget.billingStatus || 'UNBILLED'] }}
              </span>
              <span :class="['text-xs font-semibold px-2 py-1 rounded-full', viewTarget.category === 'cements' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700']">
                {{ viewTarget.category === 'cements' ? 'Fleet Cements' : 'Fleet Ceramics' }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-muted">ชื่อหน้างาน:</span> {{ viewTarget.siteName }}</div>
              <div><span class="text-muted">อำเภอ:</span> {{ viewTarget.district }}</div>
              <div class="col-span-2"><span class="text-muted">สินค้า:</span> {{ productLabel(viewTarget) }}</div>
              <div><span class="text-muted">เบอร์โทรหน้างาน:</span> {{ viewTarget.sitePhone || '-' }}</div>
              <div><span class="text-muted">พิกัดหน้างาน:</span> {{ viewTarget.siteCoords || '-' }}</div>
              <div><span class="text-muted">ทะเบียนรถ:</span> {{ viewTarget.plate || '-' }}</div>
              <div><span class="text-muted">คนขับ:</span> {{ viewTarget.driverName || '-' }}</div>
            </div>

            <div class="flex items-center justify-between">
              <div class="text-xs font-semibold text-muted">ค่าเที่ยว / ราคาที่ตกลง</div>
              <button
                v-if="!isEditing"
                @click="startEdit"
                :disabled="!isAdmin"
                :title="isAdmin ? 'แก้ไขราคา' : 'ต้องมีสิทธิ์ Admin ในการแก้ไข'"
                class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span class="material-symbols-rounded text-base">edit</span>
                แก้ไข
              </button>
            </div>

            <div v-if="!isEditing" class="grid grid-cols-2 gap-3">
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">ค่าเที่ยว</div>
                <div class="font-bold text-text">{{ formatBaht(viewTarget.tripFee) }}</div>
              </div>
              <div class="bg-surface-2 rounded-lg p-3">
                <div class="text-xs text-muted mb-1">ราคาที่ตกลง</div>
                <div class="font-bold text-text">{{ formatBaht(viewTarget.agreedPrice) }}</div>
              </div>
            </div>
            <div v-else class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว</label>
                <input v-model.number="editForm.tripFee" type="number" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ราคาที่ตกลง</label>
                <input v-model.number="editForm.agreedPrice" type="number" class="input-field w-full" />
              </div>
              <div class="col-span-2 flex justify-end gap-2">
                <button @click="isEditing = false" class="btn-secondary">ยกเลิก</button>
                <button @click="saveEdit" class="btn-sm text-primary">
                  <span class="material-symbols-rounded text-base">save</span>
                  บันทึกราคา
                </button>
              </div>
            </div>

            <div v-if="viewTarget.extraCharges?.length">
              <div class="text-xs font-semibold text-muted mb-1">ค่าใช้จ่ายเพิ่มเติม (extra)</div>
              <div v-for="extra in viewTarget.extraCharges" :key="extra.id" class="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                <span class="text-text">{{ extra.label }}</span>
                <span class="text-text">{{ formatBaht(extra.amount) }}</span>
              </div>
            </div>

            <div v-if="viewTarget.debtAdjustments?.length">
              <div class="text-xs font-semibold text-muted mb-1">รายการเพิ่ม/ลดหนี้ (คนขับ)</div>
              <div v-for="adj in viewTarget.debtAdjustments" :key="adj.id" class="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                <span class="text-text">{{ adj.label || '-' }}</span>
                <span :class="adj.amount >= 0 ? 'text-red-500' : 'text-green-600'">{{ adj.amount >= 0 ? '-' : '+' }}{{ formatBaht(Math.abs(adj.amount)) }}</span>
              </div>
            </div>

            <div v-if="viewTarget.podImage">
              <div class="text-xs font-semibold text-muted mb-1">รูปหลักฐานการส่งมอบสินค้า (POD)</div>
              <img :src="viewTarget.podImage" class="w-full max-h-64 object-contain rounded-lg border border-border" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="closeViewDialog" class="btn-secondary">ปิด</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAppStore } from '@/stores/app'
import { billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import type { Booking, BillingBatch } from '@/types'

const router = useRouter()
const bookingStore = useBookingStore()
const appStore = useAppStore()
const isAdmin = computed(() => appStore.currentRole === 'admin')

const batches = computed(() => bookingStore.batches)
const selectedBatchId = ref<string | null>(null)
const selectedBatch = computed(() => batches.value.find((b) => b.id === selectedBatchId.value) || null)

const batchBookings = computed(() => (selectedBatchId.value ? bookingStore.bookingsInBatch(selectedBatchId.value).value : []))

const batchInvoices = computed(() =>
  selectedBatchId.value ? bookingStore.documents.filter((d) => d.batchId === selectedBatchId.value) : []
)

const readyBookings = computed(() => batchBookings.value.filter((b) => b.billingStatus === 'IN_BATCH'))

// --- Checkbox selection: เลือกงานที่จะรวมอยู่ในใบแจ้งหนี้ที่กำลังจะออก ---
const selectedIds = ref<Set<string>>(new Set())

/** เข้ารอบบิลใหม่: เลือกงานที่พร้อมออกใบแจ้งหนี้ทั้งหมดเป็นค่าเริ่มต้น ผู้ใช้ปรับได้ทีหลัง */
watch(selectedBatchId, () => {
  selectedIds.value = new Set(readyBookings.value.map((b) => b.id))
})

const toggleSelected = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

const allReadySelected = computed(
  () => readyBookings.value.length > 0 && readyBookings.value.every((b) => selectedIds.value.has(b.id))
)

const toggleSelectAll = () => {
  if (allReadySelected.value) {
    readyBookings.value.forEach((b) => selectedIds.value.delete(b.id))
  } else {
    readyBookings.value.forEach((b) => selectedIds.value.add(b.id))
  }
}

const selectedBookings = computed(() => readyBookings.value.filter((b) => selectedIds.value.has(b.id)))
const selectedTotal = computed(() => selectedBookings.value.reduce((sum, b) => sum + bookingTotal(b), 0))

const holdBooking = (booking: Booking) => {
  bookingStore.setBookingHold(booking.id, true)
  selectedIds.value.delete(booking.id)
}

const releaseBooking = (booking: Booking) => {
  bookingStore.setBookingHold(booking.id, false)
  selectedIds.value.add(booking.id)
}

const batchStatusLabel: Record<string, string> = { draft: 'ร่าง', invoiced: 'ออกใบแจ้งหนี้แล้ว', paid: 'ปิดรอบแล้ว' }
const batchStatusClass: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  invoiced: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}
const invoiceStatusLabel: Record<string, string> = { draft: 'ร่าง', sent: 'ส่งแล้ว', paid: 'ชำระแล้ว' }

function bookingTotal(booking: Booking) {
  const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
  return (booking.tripFee || 0) + extras
}

function priceMatches(booking: Booking) {
  return bookingTotal(booking) === booking.agreedPrice
}

const productLabel = (booking: Booking) => {
  if (booking.category === 'ceramics') return 'ปูนซีเมนต์'
  const types = (booking.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH') : '-')

// --- Create invoice ---
const showCreateInvoice = ref(false)
const invoiceForm = ref({ customer: '', creditDays: 30, reference: '' })

const invoiceDueDatePreview = computed(() => {
  const due = new Date()
  due.setDate(due.getDate() + (invoiceForm.value.creditDays || 0))
  return due
})

const openCreateInvoice = () => {
  if (!selectedBatch.value || selectedBookings.value.length === 0) return
  invoiceForm.value = {
    customer: selectedBatch.value.customer || selectedBookings.value[0].customer,
    creditDays: 30,
    reference: selectedBookings.value.map((b) => b.docNo).join(', '),
  }
  showCreateInvoice.value = true
}

const confirmCreateInvoice = () => {
  if (!selectedBatchId.value || !invoiceForm.value.customer || selectedBookings.value.length === 0) return
  bookingStore.issueInvoiceFromBatch(
    selectedBatchId.value,
    selectedBookings.value.map((b) => b.id),
    {
      customer: invoiceForm.value.customer,
      creditDays: invoiceForm.value.creditDays,
      reference: invoiceForm.value.reference,
    }
  )
  showCreateInvoice.value = false
}

// --- Create batch ---
const showCreateBatch = ref(false)
const batchForm = ref({ label: '', customer: '', dateFrom: '', dateTo: '' })

const customerOptions = computed(() => {
  const set = new Set(
    bookingStore.bookings.filter((b) => b.status === 'DELIVERED' && b.billingStatus === 'UNBILLED').map((b) => b.customer)
  )
  return Array.from(set)
})

const previewCount = computed(() => {
  if (!batchForm.value.dateFrom || !batchForm.value.dateTo) return 0
  const from = new Date(batchForm.value.dateFrom)
  const to = new Date(batchForm.value.dateTo)
  to.setHours(23, 59, 59, 999)
  return bookingStore.bookings.filter((b) => {
    if (b.status !== 'DELIVERED' || b.billingStatus !== 'UNBILLED') return false
    if (batchForm.value.customer && b.customer !== batchForm.value.customer) return false
    if (!b.completedAt) return false
    const completed = new Date(b.completedAt)
    return completed >= from && completed <= to
  }).length
})

const openCreateBatch = () => {
  const today = new Date().toISOString().slice(0, 10)
  batchForm.value = { label: `รอบบิล ${new Date().toLocaleDateString('th-TH')}`, customer: '', dateFrom: today, dateTo: today }
  showCreateBatch.value = true
}

const confirmCreateBatch = () => {
  if (previewCount.value === 0 || !batchForm.value.label) return
  const from = new Date(batchForm.value.dateFrom)
  const to = new Date(batchForm.value.dateTo)
  to.setHours(23, 59, 59, 999)
  const batch = bookingStore.createBillingBatch({
    label: batchForm.value.label,
    customer: batchForm.value.customer || undefined,
    dateFrom: from,
    dateTo: to,
  })
  showCreateBatch.value = false
  selectedBatchId.value = batch.id
}

// --- Edit / delete batch ---
/** แก้ไข/ลบได้เฉพาะรอบบิลที่ยังไม่มีการออกใบแจ้งหนี้ */
const canEditBatch = (batch: BillingBatch) => !bookingStore.documents.some((d) => d.batchId === batch.id)

const showEditBatch = ref(false)
const editBatchTarget = ref<BillingBatch | null>(null)
const editBatchForm = ref({ label: '', customer: '', dateFrom: '', dateTo: '' })

const openEditBatch = (batch: BillingBatch) => {
  if (!canEditBatch(batch)) return
  editBatchTarget.value = batch
  editBatchForm.value = {
    label: batch.label,
    customer: batch.customer || '',
    dateFrom: new Date(batch.dateFrom).toISOString().slice(0, 10),
    dateTo: new Date(batch.dateTo).toISOString().slice(0, 10),
  }
  showEditBatch.value = true
}

const confirmEditBatch = () => {
  if (!editBatchTarget.value || !editBatchForm.value.label) return
  const from = new Date(editBatchForm.value.dateFrom)
  const to = new Date(editBatchForm.value.dateTo)
  to.setHours(23, 59, 59, 999)
  bookingStore.updateBatch(editBatchTarget.value.id, {
    label: editBatchForm.value.label,
    customer: editBatchForm.value.customer || undefined,
    dateFrom: from,
    dateTo: to,
  })
  showEditBatch.value = false
}

const deleteBatchTarget = ref<BillingBatch | null>(null)

const openDeleteBatch = (batch: BillingBatch) => {
  if (!canEditBatch(batch)) return
  deleteBatchTarget.value = batch
}

const confirmDeleteBatch = () => {
  if (!deleteBatchTarget.value) return
  const deletedId = deleteBatchTarget.value.id
  const ok = bookingStore.deleteBatch(deletedId)
  if (ok && selectedBatchId.value === deletedId) selectedBatchId.value = null
  deleteBatchTarget.value = null
}

// --- Add extra charge ---
const extraTarget = ref<Booking | null>(null)
const extraForm = ref({ label: '', amount: 0 })

const openAddExtra = (booking: Booking) => {
  extraTarget.value = booking
  extraForm.value = { label: '', amount: 0 }
}

const confirmAddExtra = () => {
  if (!extraTarget.value || !extraForm.value.label || !extraForm.value.amount) return
  bookingStore.addExtraCharge(extraTarget.value.id, { label: extraForm.value.label, amount: extraForm.value.amount })
  extraTarget.value = null
}

// --- View / edit booking details ---
const viewTarget = ref<Booking | null>(null)
const isEditing = ref(false)
const editForm = ref({ tripFee: 0, agreedPrice: 0 })

const openViewDialog = (booking: Booking) => {
  viewTarget.value = booking
  isEditing.value = false
}

const closeViewDialog = () => {
  viewTarget.value = null
  isEditing.value = false
}

const startEdit = () => {
  if (!viewTarget.value || !isAdmin.value) return
  editForm.value = { tripFee: viewTarget.value.tripFee, agreedPrice: viewTarget.value.agreedPrice }
  isEditing.value = true
}

const saveEdit = () => {
  if (!viewTarget.value) return
  bookingStore.updateBookingPrice(viewTarget.value.id, editForm.value)
  isEditing.value = false
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
</style>
