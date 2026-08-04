<template>
  <div class="space-y-6">
    <!-- ================= Batch List ================= -->
    <template v-if="!selectedBatch">
      <div class="card-lg bg-primary-soft border-primary text-sm text-text">
        เลือกงานที่ "ยังไม่วางบิล" ของลูกค้าเดียวกันด้านล่าง แล้วกด "ออกใบวางบิล" เพื่อรวมเป็นรายการวางบิลเดียวกัน (ไม่ต้องรอส่งของสำเร็จ)
        จากนั้นเปิดรายการวางบิลเพื่อตรวจสอบความถูกต้อง (POD, ราคา, ค่า extra) แล้วเลือกงานที่พร้อม กด "ออกใบแจ้งหนี้"
      </div>

      <div class="card-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่วางบิล</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ช่วงวันที่</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">จำนวนงาน</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
                <th class="text-left px-4 py-3 font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in batches" :key="batch.id" class="border-b border-border hover:bg-surface-2 transition-colors">
                <td class="px-4 py-3 font-semibold text-text">{{ batch.number }}</td>
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
                      :title="canEditBatch(batch) ? 'แก้ไขรายการวางบิล' : 'ออกใบแจ้งหนี้แล้ว ไม่สามารถแก้ไขได้'"
                      class="btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span class="material-symbols-rounded text-base">edit</span>
                      แก้ไข
                    </button>
                    <button
                      @click="openDeleteBatch(batch)"
                      :disabled="!canEditBatch(batch)"
                      :title="canEditBatch(batch) ? 'ลบรายการวางบิล' : 'ออกใบแจ้งหนี้แล้ว ไม่สามารถลบได้'"
                      class="btn-sm text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span class="material-symbols-rounded text-base">delete</span>
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="batches.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-muted">ยังไม่มีรายการวางบิล</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- งานที่ยังไม่วางบิล (billingStatus = UNBILLED เท่านั้น ไม่เกี่ยวกับสถานะงานขนส่ง) -->
      <div class="card-lg overflow-hidden">
        <div class="font-bold text-text mb-3">งานที่ยังไม่วางบิล ({{ unbilledBookings.length }})</div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="px-3 py-2 w-8"></th>
                <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สถานะงาน</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ความพร้อมวางบิล</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">ชื่อหน้างาน</th>
                <th class="text-left px-4 py-3 font-semibold text-muted">สินค้า</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">เบี้ยเลี้ยง</th>
                <th class="text-right px-4 py-3 font-semibold text-muted">ค่าเที่ยว</th>
                <th class="text-left px-4 py-3 font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in unbilledBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    :checked="unbilledSelectedIds.has(booking.id)"
                    :disabled="!billingRuleStore.isEligible(booking)"
                    @change="toggleUnbilledSelected(booking.id)"
                    class="w-4 h-4 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </td>
                <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
                <td class="px-4 py-3 text-text">{{ booking.customer }}</td>
                <td class="px-4 py-3">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="billingRuleStore.isEligible(booking)" class="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">พร้อมวางบิล</span>
                  <span v-else class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">{{ billingRuleStore.eligibilityReason(booking) }}</span>
                </td>
                <td class="px-4 py-3 font-semibold text-text">{{ destinationLabel(booking) }}</td>
                <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
                <td class="px-4 py-3 text-right text-text">{{ formatBaht(booking.finalAllowance ?? booking.allowance) }}</td>
                <td class="px-4 py-3 text-right text-text">{{ formatBaht(booking.tripFee) }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="router.push(`/job/${booking.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
              <tr v-if="unbilledBookings.length === 0">
                <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่มีงานที่รอวางบิล</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="unbilledBookings.length" class="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div class="text-sm text-muted">
            เลือกแล้ว {{ unbilledSelectedBookings.length }} รายการ
            <span v-if="unbilledSelectedBookings.length &amp;&amp; !unbilledSelectionCustomer" class="text-red-600">— ต้องเลือกงานของลูกค้าเดียวกันเท่านั้น</span>
            <span v-else-if="unbilledSelectionCustomer">(ลูกค้า: {{ unbilledSelectionCustomer }})</span>
          </div>
          <button @click="confirmAddToBatch" :disabled="!canAddSelectedToBatch" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-symbols-rounded text-base">note_add</span>
            ออกใบวางบิล
          </button>
        </div>
      </div>
    </template>

    <!-- ================= Batch Detail ================= -->
    <template v-else>
      <button @click="backToBatchList" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับไปหน้ารายการวางบิล
      </button>

      <div class="card-lg">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="font-bold text-text">{{ selectedBatch.number }}</div>
            <div class="text-xs text-muted">
              {{ selectedBatch.label }} · {{ selectedBatch.customer || 'ทุกลูกค้า' }} · {{ formatDate(selectedBatch.dateFrom) }} -
              {{ formatDate(selectedBatch.dateTo) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span :class="['text-xs font-semibold px-2 py-1 rounded-full', batchStatusClass[selectedBatch.status]]">{{ batchStatusLabel[selectedBatch.status] }}</span>
            <button @click="router.push(`/billing-note/${selectedBatch.id}`)" class="btn-sm">
              <span class="material-symbols-rounded text-base">print</span>
              พิมพ์ใบวางบิล
            </button>
            <button v-if="selectedBatch.status === 'PAID'" @click="confirmCloseBatch" class="btn-sm">
              <span class="material-symbols-rounded text-base">task_alt</span>
              ปิดรายการวางบิล
            </button>
          </div>
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
                <th class="text-left px-3 py-2 font-semibold text-muted">สถานะงาน</th>
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
                <td class="px-3 py-2 font-semibold text-text">{{ destinationLabel(booking) }}</td>
                <td class="px-3 py-2">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">
                    {{ bookingStatusLabel[booking.status] }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <span v-if="hasAllPods(booking)" class="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
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
                    <button @click="router.push(`/job/${booking.id}`)" class="btn-sm">
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
                <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่มีงานในรายการวางบิลนี้</td>
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
            ออกใบแจ้งหนี้
          </button>
        </div>
      </div>

      <div v-if="batchInvoices.length" class="card-lg overflow-hidden">
        <div class="font-bold text-text mb-3">ใบแจ้งหนี้จากรายการวางบิลนี้</div>
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
                    <button v-if="doc.status === 'draft'" @click="bookingStore.markInvoiceSent(doc.id)" class="btn-sm text-primary">ส่งใบแจ้งหนี้</button>
                    <button v-else-if="doc.status === 'sent'" @click="openRecordPayment(doc)" class="btn-sm text-green-700">บันทึกรับชำระ</button>
                    <button v-else-if="doc.status === 'paid' && !doc.receiptNumber" @click="bookingStore.issueReceipt(doc.id)" class="btn-sm text-purple-700">
                      <span class="material-symbols-rounded text-base">receipt_long</span>
                      ออกใบเสร็จรับเงิน
                    </button>
                    <span v-else-if="doc.receiptNumber" class="text-xs text-muted">ใบเสร็จ {{ doc.receiptNumber }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card-lg">
        <div class="font-bold text-text mb-3">ประวัติรายการวางบิล</div>
        <EntityTimeline :batch-id="selectedBatch.id" />
      </div>
    </template>

    <!-- Edit Batch Modal -->
    <Teleport to="body" v-if="showEditBatch">
      <div @click="showEditBatch = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">แก้ไขรายการวางบิล</div>
            <button @click="showEditBatch = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อรายการวางบิล</label>
              <input v-model="editBatchForm.label" class="input-field w-full" />
            </div>
            <div class="text-xs text-muted bg-surface-2 rounded-lg p-3">
              ลูกค้าและช่วงวันที่ถูกกำหนดอัตโนมัติตามงานที่จัดรถเข้ารายการวางบิลนี้ แก้ไขได้เฉพาะชื่อรายการวางบิล
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
            <div class="font-bold text-text">ลบรายการวางบิล</div>
            <button @click="deleteBatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 text-sm text-text">
            ยืนยันลบรายการวางบิล "<span class="font-bold">{{ deleteBatchTarget.number }}</span>" ใช่หรือไม่?
            งานทั้งหมดในรายการวางบิลนี้จะกลับไปเป็นสถานะยังไม่วางบิล
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="deleteBatchTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmDeleteBatch" class="h-10 px-4 rounded-lg border-0 bg-red-600 text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90">
              <span class="material-symbols-rounded text-base">delete</span>
              ลบรายการวางบิล
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
            <div class="font-bold text-text">ออกใบแจ้งหนี้</div>
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
                      <div class="font-semibold">{{ booking.docNo }} · {{ destinationLabel(booking) }}</div>
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
                <div v-if="previewShowVatRow" class="flex justify-between">
                  <span class="text-muted">ภาษีมูลค่าเพิ่ม {{ documentSettingsStore.settings.vatRate }}%</span>
                  <span class="text-text">{{ formatBaht(previewVatAmount) }}</span>
                </div>
                <div class="flex justify-between font-bold text-text pt-1 border-t border-border">
                  <span>จำนวนเงินรวมทั้งสิ้น</span>
                  <span>{{ formatBaht(previewGrandTotal) }}</span>
                </div>
                <template v-if="previewShowWhtRow">
                  <div class="flex justify-between text-red-600">
                    <span>หัก ภาษี ณ ที่จ่าย {{ documentSettingsStore.settings.whtRate }}%</span>
                    <span>-{{ formatBaht(previewWhtAmount) }}</span>
                  </div>
                  <div class="flex justify-between font-bold text-text pt-1 border-t border-border">
                    <span>จำนวนเงินที่ต้องชำระ</span>
                    <span>{{ formatBaht(previewNetPayable) }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="showCreateInvoice = false" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmCreateInvoice" :disabled="!invoiceForm.customer || selectedBookings.length === 0" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded text-base">receipt_long</span>
              ออกใบแจ้งหนี้
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Record Payment Modal (บังคับแนบหลักฐานการชำระเงินก่อนบันทึกรับชำระ) -->
    <Teleport to="body" v-if="paymentTarget">
      <div @click="closeRecordPayment" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">บันทึกรับชำระ {{ paymentTarget.number }}</div>
            <button @click="closeRecordPayment" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="text-xs text-muted">
              ต้องแนบหลักฐานการชำระเงินก่อนจึงจะบันทึกรับชำระได้ (ยอด {{ formatBaht(paymentTarget.amount) }})
            </div>
            <label class="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all">
              <input type="file" accept="image/*" class="hidden" @change="onPaymentProofSelected" />
              <img v-if="paymentProofPreview" :src="paymentProofPreview" class="max-h-48 mx-auto rounded-lg object-contain" />
              <template v-else>
                <span class="material-symbols-rounded text-3xl text-muted block mb-1">upload_file</span>
                <div class="text-sm text-muted">แตะเพื่อแนบหลักฐานการชำระเงิน</div>
              </template>
            </label>
            <div v-if="paymentProofError" class="text-xs text-red-600 flex items-center gap-1">
              <span class="material-symbols-rounded text-sm">error</span>
              {{ paymentProofError }}
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="closeRecordPayment" class="btn-secondary">ยกเลิก</button>
            <button
              @click="confirmRecordPayment"
              :disabled="!paymentProofPreview"
              class="h-10 px-4 rounded-lg border-0 bg-green-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">paid</span>
              ยืนยันบันทึกรับชำระ
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import type { LegacySalesDocument } from '@/stores/booking'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useBillingRuleStore } from '@/stores/billingRule'
import { billingStatusLabel, billingStatusClass, bookingStatusLabel, bookingStatusClass } from '@/utils/bookingStatus'
import type { Booking, BillingBatch } from '@/types'
import EntityTimeline from '@/components/shared/EntityTimeline.vue'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const documentSettingsStore = useDocumentSettingsStore()
const billingRuleStore = useBillingRuleStore()

const batches = computed(() => bookingStore.batches)
/** เปิดรายการวางบิลที่ระบุไว้ใน query (?batch=) ทันทีถ้าลิงก์มาจากหน้าอื่น (ใบแจ้งหนี้/งาน/เอกสารขาย) */
const initialBatchId = typeof route.query.batch === 'string' && bookingStore.batches.some((b) => b.id === route.query.batch) ? route.query.batch : null
const selectedBatchId = ref<string | null>(initialBatchId)
const selectedBatch = computed(() => batches.value.find((b) => b.id === selectedBatchId.value) || null)

// งานที่ยังไม่วางบิล (billingStatus = UNBILLED เท่านั้น ไม่เกี่ยวกับ BookingStatus/การส่งของเลย)
const unbilledBookings = computed(() =>
  bookingStore.bookings
    .filter((b) => (b.billingStatus ?? 'UNBILLED') === 'UNBILLED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

const unbilledSelectedIds = ref<Set<string>>(new Set())

const toggleUnbilledSelected = (id: string) => {
  if (unbilledSelectedIds.value.has(id)) unbilledSelectedIds.value.delete(id)
  else unbilledSelectedIds.value.add(id)
}

const unbilledSelectedBookings = computed(() => unbilledBookings.value.filter((b) => unbilledSelectedIds.value.has(b.id)))

/** ต้องเลือกงานของลูกค้าเดียวกันเท่านั้นถึงจะรวมเป็นรายการวางบิลเดียวกันได้ */
const unbilledSelectionCustomer = computed(() => {
  if (unbilledSelectedBookings.value.length === 0) return null
  const customer = unbilledSelectedBookings.value[0].customer
  return unbilledSelectedBookings.value.every((b) => b.customer === customer) ? customer : null
})

const canAddSelectedToBatch = computed(() => unbilledSelectedBookings.value.length > 0 && !!unbilledSelectionCustomer.value)

const confirmAddToBatch = () => {
  if (!canAddSelectedToBatch.value) return
  const batch = bookingStore.addBookingsToBatch(unbilledSelectedBookings.value.map((b) => b.id))
  if (batch) {
    unbilledSelectedIds.value = new Set()
    selectedBatchId.value = batch.id
  }
}

const productLabel = (booking: Booking) => {
  const names = [...new Set(booking.items.map((i) => i.product).filter(Boolean))]
  return names.length ? names.join(', ') : '-'
}

const destinationLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

/** ทุกรายการของงานนี้ส่งของสำเร็จพร้อม POD ครบหรือไม่ (แยกจาก booking.podImage เดี่ยวๆ แบบเดิม เพราะตอนนี้แต่ละรายการมี POD ของตัวเอง) */
const hasAllPods = (booking: Booking) =>
  booking.items.length > 0 && booking.items.every((i) => i.deliveryStatus === 'DELIVERED' && !!i.podImage)

const batchBookings = computed(() => (selectedBatchId.value ? bookingStore.bookingsInBatch(selectedBatchId.value).value : []))

const batchInvoices = computed(() =>
  selectedBatchId.value ? bookingStore.documents.filter((d) => d.batchId === selectedBatchId.value) : []
)

const readyBookings = computed(() => batchBookings.value.filter((b) => b.billingStatus === 'IN_BATCH'))

// --- Checkbox selection: เลือกงานที่จะรวมอยู่ในใบแจ้งหนี้ที่กำลังจะออก ---
const selectedIds = ref<Set<string>>(new Set())

/** เข้ารายการวางบิลใหม่: เลือกงานที่พร้อมออกใบแจ้งหนี้ทั้งหมดเป็นค่าเริ่มต้น ผู้ใช้ปรับได้ทีหลัง */
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

// --- พรีวิว VAT/หัก ณ ที่จ่าย ตามตั้งค่าเอกสาร (คำนวณจริงตอนกดยืนยันออกใบแจ้งหนี้ใน issueInvoiceFromBatch) ---
const previewShowVatRow = computed(() => documentSettingsStore.settings.calcMode.sales.vat !== 'included')
const previewVatAmount = computed(() =>
  previewShowVatRow.value ? Math.round((selectedTotal.value * documentSettingsStore.settings.vatRate) / 100) : 0
)
const previewGrandTotal = computed(() => selectedTotal.value + previewVatAmount.value)
const previewShowWhtRow = computed(() => documentSettingsStore.settings.calcMode.sales.wht !== 'included')
const previewWhtAmount = computed(() =>
  previewShowWhtRow.value ? Math.round((selectedTotal.value * documentSettingsStore.settings.whtRate) / 100) : 0
)
const previewNetPayable = computed(() => previewGrandTotal.value - previewWhtAmount.value)

const holdBooking = (booking: Booking) => {
  bookingStore.setBookingHold(booking.id, true)
  selectedIds.value.delete(booking.id)
}

const releaseBooking = (booking: Booking) => {
  bookingStore.setBookingHold(booking.id, false)
  selectedIds.value.add(booking.id)
}

const batchStatusLabel: Record<string, string> = {
  BILLING_PENDING: 'รอวางบิล',
  BILLED: 'วางบิลแล้ว',
  WAITING_PAYMENT: 'รอรับชำระ',
  PAID: 'ชำระแล้ว',
  CLOSED: 'ปิดรายการ',
}
const batchStatusClass: Record<string, string> = {
  BILLING_PENDING: 'bg-amber-100 text-amber-700',
  BILLED: 'bg-blue-100 text-blue-700',
  WAITING_PAYMENT: 'bg-purple-100 text-purple-700',
  PAID: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
}
const invoiceStatusLabel: Record<string, string> = { draft: 'ร่าง', sent: 'ส่งแล้ว', paid: 'ชำระแล้ว' }

function bookingTotal(booking: Booking) {
  const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
  return (booking.tripFee || 0) + extras
}

function priceMatches(booking: Booking) {
  return bookingTotal(booking) === booking.agreedPrice
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

// --- Edit / delete batch ---
/** แก้ไข/ลบได้เฉพาะรายการวางบิลที่ยังไม่มีการออกใบแจ้งหนี้ */
const canEditBatch = (batch: BillingBatch) => !bookingStore.documents.some((d) => d.batchId === batch.id)

const showEditBatch = ref(false)
const editBatchTarget = ref<BillingBatch | null>(null)
const editBatchForm = ref({ label: '' })

const openEditBatch = (batch: BillingBatch) => {
  if (!canEditBatch(batch)) return
  editBatchTarget.value = batch
  editBatchForm.value = { label: batch.label }
  showEditBatch.value = true
}

const confirmEditBatch = () => {
  if (!editBatchTarget.value || !editBatchForm.value.label) return
  bookingStore.updateBatch(editBatchTarget.value.id, { label: editBatchForm.value.label })
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

const confirmCloseBatch = () => {
  if (!selectedBatchId.value) return
  bookingStore.closeBatch(selectedBatchId.value)
}

/** ปิดรายการวางบิลที่เปิดอยู่ และล้าง query (?batch=) เผื่อลิงก์มาจากหน้าอื่น ไม่ให้รีเฟรชแล้วเด้งกลับมาที่เดิม */
const backToBatchList = () => {
  selectedBatchId.value = null
  if (route.query.batch) router.replace({ query: {} })
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

// --- Record payment (บังคับแนบหลักฐานการชำระเงินก่อนบันทึกรับชำระ) ---
const paymentTarget = ref<LegacySalesDocument | null>(null)
const paymentProofPreview = ref<string | null>(null)
const paymentProofError = ref('')

const openRecordPayment = (doc: LegacySalesDocument) => {
  paymentTarget.value = doc
  paymentProofPreview.value = null
  paymentProofError.value = ''
}

const closeRecordPayment = () => {
  paymentTarget.value = null
}

const onPaymentProofSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  paymentProofError.value = ''
  paymentProofPreview.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) {
    paymentProofError.value = 'ไฟล์ที่แนบไม่ใช่รูปภาพ กรุณาแนบหลักฐานการชำระเงินที่ถูกต้อง'
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    paymentProofPreview.value = reader.result as string
  }
  reader.onerror = () => {
    paymentProofError.value = 'ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่'
  }
  reader.readAsDataURL(file)
}

const confirmRecordPayment = () => {
  if (!paymentTarget.value || !paymentProofPreview.value) return
  bookingStore.markInvoicePaid(paymentTarget.value.id, paymentProofPreview.value)
  closeRecordPayment()
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
