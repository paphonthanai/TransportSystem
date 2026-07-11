<template>
  <div class="space-y-6">
    <!-- Create Button -->
    <div class="flex justify-end">
      <button @click="openDialog" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        สร้างงาน
      </button>
    </div>

    <!-- Search -->
    <div class="flex gap-3 flex-wrap">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาเลขที่เอกสาร, PO, ลูกค้า, ชื่อหน้างาน, ทะเบียนรถ..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
    </div>

    <!-- In-progress Table -->
    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">งานที่กำลังดำเนินการ ({{ inProgressBookings.length }})</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">PO</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ชื่อหน้างาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">อำเภอ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">{{ isCements ? 'ชนิดปูน' : 'สินค้า' }}</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">น้ำหนัก/จำนวน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ทะเบียนรถ / คนขับ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in inProgressBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.po || '-' }}</td>
              <td class="px-4 py-3 text-text">{{ booking.customer }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ booking.siteName }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.district }}</td>
              <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ weightQtyLabel(booking) }}</td>
              <td class="px-4 py-3 text-text">
                <div class="font-semibold">{{ booking.plate || '-' }}</div>
                <div class="text-xs text-muted">{{ booking.driverName || '-' }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                  <span v-if="booking.status === 'PENDING_ACCEPT'" class="text-[11px] text-muted">
                    เหลือ {{ formatCountdown(remainingAcceptSeconds(booking)) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <button @click="router.push(`/job/${booking.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button @click="openEditOps(booking)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                  <button v-if="booking.status === 'WAITING_DISPATCH'" @click="openDispatchDialog(booking)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">local_shipping</span>
                    กรอกทะเบียน / ส่งงาน
                  </button>
                  <button v-else-if="booking.status === 'DISPATCHED'" @click="bookingStore.startTransit(booking.id)" class="btn-sm text-indigo-700">
                    <span class="material-symbols-rounded text-base">directions</span>
                    เริ่มขนส่ง
                  </button>
                  <button v-else-if="booking.status === 'IN_TRANSIT'" @click="openCompleteDialog(booking)" class="btn-sm text-green-700">
                    <span class="material-symbols-rounded text-base">task_alt</span>
                    จบงาน
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="inProgressBookings.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Completed Table -->
    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">งานที่เสร็จแล้ว ({{ completedBookings.length }})</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">PO</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ชื่อหน้างาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">{{ isCements ? 'ชนิดปูน' : 'สินค้า' }}</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">น้ำหนัก/จำนวน</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">เบี้ยเลี้ยง</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">ค่าเที่ยว</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะบิล</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in completedBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.po || '-' }}</td>
              <td class="px-4 py-3 text-text">{{ booking.customer }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ booking.siteName }}</td>
              <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ weightQtyLabel(booking) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ formatBaht(booking.finalAllowance ?? booking.allowance) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ formatBaht(booking.tripFee) }}</td>
              <td class="px-4 py-3">
                <span v-if="booking.billingStatus" :class="['text-xs font-semibold px-2 py-1 rounded-full', billingStatusClass[booking.billingStatus]]">
                  {{ billingStatusLabel[booking.billingStatus] }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <button @click="router.push(`/job/${booking.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button @click="openEditOps(booking)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="completedBookings.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Booking Modal -->
    <Teleport to="body" v-if="showDialog">
      <div @click="closeDialog" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-5xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <!-- Dialog Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <span class="material-symbols-rounded">assignment</span>
              </div>
              <div>
                <div class="font-bold text-text">สร้างงานขนส่งใหม่ ({{ isCements ? 'Fleet Cements' : 'Fleet Ceramics' }})</div>
                <div class="text-xs text-muted">เลขที่เอกสารจะออกให้อัตโนมัติทีละรายการตอนบันทึก</div>
              </div>
            </div>
            <button @click="closeDialog" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div class="px-6 py-6 space-y-6">
            <!-- Header Info (ใช้ร่วมกันทุกรายการสินค้าในเอกสารนี้) -->
            <div>
              <h3 class="font-semibold text-text mb-3">ข้อมูลเอกสาร</h3>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ใบสั่งงาน (PO)</label>
                  <input v-model="header.po" placeholder="เลขที่ PO" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่ขนส่ง</label>
                  <input v-model="header.shipDate" type="date" class="input-field w-full" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-muted mb-1">ชื่อลูกค้า</label>
                  <input
                    v-if="isCements"
                    v-model="header.customer"
                    placeholder="ชื่อย่อลูกค้า เช่น ABC"
                    class="input-field w-full"
                  />
                  <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-medium">
                    {{ fixedCustomer }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Line Item Sub-form: กรอกทีละรายการสินค้า/หน้างาน แล้วกดยืนยันเพิ่มลงตาราง -->
            <div class="border border-border rounded-xl p-4 bg-surface-2">
              <h3 class="font-semibold text-text mb-3">เพิ่มรายการสินค้า</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
                  <input v-model="item.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">อำเภอ (พิกัดหน้างาน)</label>
                  <input v-model="item.district" placeholder="อำเภอ" class="input-field w-full" />
                </div>

                <template v-if="isCements">
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">ชนิดปูน (1-3 ชนิดต่อเที่ยว)</label>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input v-model="item.cementTypes[0]" placeholder="ชนิดปูน #1" class="input-field w-full" />
                      <input v-model="item.cementTypes[1]" placeholder="ชนิดปูน #2 (ถ้ามี)" class="input-field w-full" />
                      <input v-model="item.cementTypes[2]" placeholder="ชนิดปูน #3 (ถ้ามี)" class="input-field w-full" />
                    </div>
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">ประเภทงาน</label>
                    <div class="flex gap-2 flex-wrap">
                      <button
                        v-for="jt in jobTypeOptions"
                        :key="jt"
                        @click="item.jobType = jt"
                        :class="[
                          'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                          item.jobType === jt ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                        ]"
                      >
                        {{ jt }}
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <div class="mt-4">
                <label class="block text-xs font-semibold text-muted mb-1">คิดค่าเที่ยวตาม</label>
                <div class="flex gap-2 flex-wrap mb-3">
                  <button
                    v-for="basis in calcBasisOptions"
                    :key="basis.id"
                    @click="item.calcBasis = basis.id"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      item.calcBasis === basis.id ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                    ]"
                  >
                    {{ basis.label }}
                  </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div v-if="item.calcBasis === 'weight'">
                    <label class="block text-xs font-semibold text-muted mb-1">น้ำหนัก (ตัน)</label>
                    <input v-model.number="item.weight" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div v-if="item.calcBasis === 'weight'">
                    <label class="block text-xs font-semibold text-muted mb-1">ตันละ (บาท)</label>
                    <input v-model.number="item.ratePerTon" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div v-if="item.calcBasis === 'piece'">
                    <label class="block text-xs font-semibold text-muted mb-1">จำนวน (ชิ้น)</label>
                    <input v-model.number="item.qty" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div v-if="item.calcBasis === 'piece'">
                    <label class="block text-xs font-semibold text-muted mb-1">ชิ้นละ (บาท)</label>
                    <input v-model.number="item.ratePerPiece" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div v-if="item.calcBasis === 'trip'">
                    <label class="block text-xs font-semibold text-muted mb-1">เที่ยวละ (บาท)</label>
                    <input v-model.number="item.ratePerTrip" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">
                      ราคาที่ตกลงกับลูกค้า (บาท)
                      <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยวที่คำนวณได้)</span>
                    </label>
                    <input v-model.number="item.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div class="text-sm text-text">
                  ค่าเที่ยว <span class="font-bold">{{ formatBaht(itemComputedTripFee) }}</span>
                  <span class="text-muted"> · ค่าน้ำมัน {{ formatBaht(itemFuelCost) }}</span>
                </div>
                <button @click="confirmAddItem" :disabled="!canAddItem" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  <span class="material-symbols-rounded text-base">playlist_add</span>
                  ยืนยันเพิ่มรายการสินค้า
                </button>
              </div>
            </div>

            <!-- Line Items Table -->
            <div>
              <h3 class="font-semibold text-text mb-3">ตารางรายการสินค้า ({{ lineItems.length }} รายการ)</h3>
              <div class="overflow-x-auto border border-border rounded-lg">
                <table class="w-full text-sm">
                  <thead class="bg-surface-2 border-b border-border">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ลำดับ</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ชื่อหน้างาน</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">อำเภอ</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">สินค้า</th>
                      <th class="text-right px-3 py-2 font-semibold text-muted">น้ำหนัก/จำนวน</th>
                      <th class="text-right px-3 py-2 font-semibold text-muted">เบี้ยเลี้ยง</th>
                      <th class="text-right px-3 py-2 font-semibold text-muted">รายได้</th>
                      <th class="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(li, idx) in lineItems" :key="idx" class="border-b border-border last:border-0">
                      <td class="px-3 py-2 text-text">{{ idx + 1 }}</td>
                      <td class="px-3 py-2 font-semibold text-text">{{ li.siteName }}</td>
                      <td class="px-3 py-2 text-muted">{{ li.district }}</td>
                      <td class="px-3 py-2 text-text">{{ lineItemProductLabel(li) }}</td>
                      <td class="px-3 py-2 text-right text-text">{{ lineItemWeightQtyLabel(li) }}</td>
                      <td class="px-3 py-2 text-right text-text">{{ formatBaht(li.allowance) }}</td>
                      <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht(li.tripFee) }}</td>
                      <td class="px-3 py-2 text-right">
                        <button @click="removeItem(idx)" class="text-red-500 hover:text-red-700">
                          <span class="material-symbols-rounded text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                    <tr v-if="lineItems.length === 0">
                      <td colspan="8" class="px-4 py-6 text-center text-muted">ยังไม่มีรายการสินค้า กรอกฟอร์มด้านบนแล้วกดยืนยันเพิ่มรายการ</td>
                    </tr>
                  </tbody>
                  <tfoot v-if="lineItems.length">
                    <tr class="bg-surface-2 font-semibold text-text">
                      <td colspan="5" class="px-3 py-2 text-right">รวม</td>
                      <td class="px-3 py-2 text-right">{{ formatBaht(totalAllowance) }}</td>
                      <td class="px-3 py-2 text-right">{{ formatBaht(totalTripFee) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Trip Fee / Fuel Sub-form: แยก container ไว้ด้านล่างสุด กรอกน้ำมัน/เบี้ยเลี้ยง/ข้อมูลติดต่อหน้างานของรายการที่กำลังจะเพิ่ม (กรอกก่อนหรือหลังกดยืนยันด้านบนก็ได้ เพราะยังเป็นข้อมูลของรายการถัดไปที่ยังไม่ได้ยืนยัน) -->
            <div class="border border-border rounded-xl p-4 bg-surface-2">
              <h3 class="font-semibold text-text mb-3">ตารางกรอกค่าเที่ยว + ค่าน้ำมัน</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">น้ำมัน (ลิตร)</label>
                  <input v-model.number="item.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร วันนั้น)</label>
                  <input v-model.number="item.fuelRate" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
                  <input
                    v-if="isCements"
                    v-model.number="item.allowance"
                    type="number"
                    placeholder="0"
                    class="input-field w-full"
                  />
                  <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface text-sm text-text font-semibold">
                    {{ formatBaht(itemCalculatedAllowance) }} (อัตโนมัติ)
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน (ไม่บังคับ)</label>
                  <input v-model="item.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน (ไม่บังคับ)</label>
                  <input v-model="item.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">พิกัดหน้างาน (ไม่บังคับ)</label>
                  <input v-model="item.siteCoords" placeholder="โลเคชั่นหน้างาน" class="input-field w-full" />
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Footer -->
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="closeDialog" class="btn-secondary">ยกเลิก</button>
            <button @click="saveAllItems" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">save</span>
              บันทึกงานทั้งหมด ({{ lineItems.length }} รายการ)
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Dispatch Dialog -->
    <Teleport to="body" v-if="dispatchTarget">
      <div @click="dispatchTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">ส่งงาน {{ dispatchTarget.docNo }}</div>
            <button @click="dispatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ *</label>
              <input v-model="dispatchForm.plate" placeholder="เช่น 82-4417 กรุงเทพ" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">คนขับ</label>
              <select v-model="dispatchForm.driverName" class="input-field w-full">
                <option value="">เลือกคนขับ...</option>
                <option v-for="name in driverOptions" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
            <div class="text-xs font-semibold text-muted pt-2 border-t border-border">
              ข้อมูลหน้างาน (ใส่ทีหลังได้)
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน</label>
              <input v-model="dispatchForm.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน</label>
              <input v-model="dispatchForm.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">พิกัดหน้างาน</label>
              <input v-model="dispatchForm.siteCoords" placeholder="โลเคชั่นหน้างาน" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="dispatchTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmDispatch" :disabled="!dispatchForm.plate" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">send</span>
              ส่งงาน
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Complete Job Dialog (เพิ่ม/ลดหนี้) -->
    <Teleport to="body" v-if="completeTarget">
      <div @click="completeTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <div class="font-bold text-text">จบงาน {{ completeTarget.docNo }}</div>
              <div class="text-xs text-muted">เพิ่ม/ลดหนี้ กระทบยอดกับค่าแรงคนขับในเที่ยวนี้</div>
            </div>
            <button @click="completeTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">เบี้ยเลี้ยงเดิม</span>
              <span class="font-bold text-text">{{ formatBaht(completeTarget.allowance) }}</span>
            </div>
            <div class="space-y-2">
              <div v-for="(adj, i) in debtAdjustments" :key="adj.id" class="flex items-center gap-2">
                <input v-model="adj.label" placeholder="รายการ เช่น ค่าปรับ, คืนเงิน" class="input-field flex-1" />
                <input v-model.number="adj.amount" type="number" placeholder="0" class="input-field w-28" />
                <button @click="debtAdjustments.splice(i, 1)" class="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-red-600 hover:bg-red-50">
                  <span class="material-symbols-rounded text-base">delete</span>
                </button>
              </div>
            </div>
            <button @click="addAdjustmentRow" class="btn-secondary w-full justify-center">
              <span class="material-symbols-rounded text-base">add</span>
              เพิ่มรายการเพิ่ม/ลดหนี้
            </button>
            <div class="flex items-center justify-between pt-3 border-t border-border">
              <span class="text-sm font-semibold text-text">เบี้ยเลี้ยงสุทธิ</span>
              <span class="text-xl font-bold text-primary">{{ formatBaht(finalAllowance) }}</span>
            </div>
            <div class="text-[11px] text-muted">
              หมายเหตุ: จำนวนเป็นบวก = เพิ่มหนี้ (หักจากเบี้ยเลี้ยง), จำนวนเป็นลบ = ลดหนี้ (คืนให้เบี้ยเลี้ยง)
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="completeTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmComplete" class="btn-primary">
              <span class="material-symbols-rounded">task_alt</span>
              ยืนยันจบงาน
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Ops Dialog (น้ำมัน/ข้อมูลหน้างาน แก้ไขได้ทุกสถานะ) -->
    <Teleport to="body" v-if="editOpsTarget">
      <div @click="editOpsTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">แก้ไขข้อมูล {{ editOpsTarget.docNo }}</div>
            <button @click="editOpsTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div class="text-xs text-muted">แก้ไขได้ทุกสถานะงาน เผื่อกรณีข้อมูลน้ำมัน/หน้างานมาทีหลัง</div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">น้ำมัน (ลิตร)</label>
                <input v-model.number="editOpsForm.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร)</label>
                <input v-model.number="editOpsForm.fuelRate" type="number" placeholder="0" class="input-field w-full" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน</label>
              <input v-model="editOpsForm.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน</label>
              <input v-model="editOpsForm.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">พิกัดหน้างาน</label>
              <input v-model="editOpsForm.siteCoords" placeholder="โลเคชั่นหน้างาน" class="input-field w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="editOpsTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmEditOps" class="btn-primary">
              <span class="material-symbols-rounded text-base">save</span>
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, DebtAdjustment } from '@/types'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'

type CalcBasis = 'weight' | 'piece' | 'trip'

interface CommittedLineItem {
  siteName: string
  district: string
  cementTypes?: string[]
  jobType?: BookingJobType
  weight?: number
  qty?: number
  tripFee: number
  agreedPrice: number
  allowance: number
  fuelLiters: number
  fuelRate: number
  siteContactName?: string
  sitePhone?: string
  siteCoords?: string
}

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const bookingStore = useBookingStore()
const fixedCustomer = bookingStore.fixedCustomer

const showDialog = ref(false)
const searchQuery = ref('')

const isCements = computed(() => props.fleet === 'cements')

const jobTypeOptions: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']
const calcBasisOptions: { id: CalcBasis; label: string }[] = [
  { id: 'weight', label: 'ตามน้ำหนัก' },
  { id: 'piece', label: 'ตามจำนวนชิ้น' },
  { id: 'trip', label: 'ต่อเที่ยว (เหมา)' },
]

// --- นาฬิกาสำหรับนับถอยหลังเวลาที่เหลือให้คนขับตอบรับงาน (PENDING_ACCEPT) ---
const now = ref(Date.now())
let clockTimer: number
onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(clockTimer))

const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000
const remainingAcceptSeconds = (booking: Booking) => {
  if (!booking.dispatchedAt) return 0
  const deadline = new Date(booking.dispatchedAt).getTime() + ACCEPT_TIMEOUT_MS
  return Math.max(0, Math.floor((deadline - now.value) / 1000))
}
const formatCountdown = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

const driverOptions = ['สมชาย ทองดี', 'ประเสริฐ มั่นคง', 'วิรัตน์ ใจกล้า', 'สมหมาย เพียรงาน', 'ธีรพงษ์ ขยันยิ่ง']

const statusRank: Record<BookingStatus, number> = {
  WAITING_DISPATCH: 0,
  PENDING_ACCEPT: 1,
  DISPATCHED: 2,
  IN_TRANSIT: 3,
  DELIVERED: 4,
}

// --- แยกตาราง: งานที่กำลังดำเนินการ (ยังไม่ DELIVERED) กับงานที่เสร็จแล้ว ---
const fleetBookings = computed(() => bookingStore.bookings.filter((b) => b.category === props.fleet))

const matchesSearch = (b: Booking, q: string) =>
  b.docNo.toLowerCase().includes(q) ||
  (b.po || '').toLowerCase().includes(q) ||
  b.customer.toLowerCase().includes(q) ||
  b.siteName.toLowerCase().includes(q) ||
  (b.plate || '').toLowerCase().includes(q)

const inProgressBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter((b) => b.status !== 'DELIVERED' && (!q || matchesSearch(b, q)))
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status]
      if (rankDiff !== 0) return rankDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

const completedBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter((b) => b.status === 'DELIVERED' && (!q || matchesSearch(b, q)))
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
})

// --- Header info: ใช้ร่วมกันทุกรายการสินค้าที่เพิ่มในเซสชันนี้ ---
const defaultHeader = () => ({
  po: '',
  shipDate: new Date().toISOString().slice(0, 10),
  customer: isCements.value ? '' : fixedCustomer,
})
const header = ref(defaultHeader())

// --- Line item sub-form: กรอกทีละรายการ แล้วกดยืนยันเพิ่มลงตาราง ---
const defaultItem = () => ({
  siteName: '',
  district: '',
  cementTypes: ['', '', ''] as string[],
  jobType: undefined as BookingJobType | undefined,
  calcBasis: 'weight' as CalcBasis,
  weight: 0,
  qty: 0,
  ratePerTon: 0,
  ratePerPiece: 0,
  ratePerTrip: 0,
  agreedPrice: 0,
  fuelLiters: 0,
  fuelRate: 0,
  allowance: 0,
  siteContactName: '',
  sitePhone: '',
  siteCoords: '',
})
const item = ref(defaultItem())

const lineItems = ref<CommittedLineItem[]>([])

const itemComputedTripFee = computed(() => {
  const it = item.value
  if (it.calcBasis === 'weight') return (it.weight || 0) * (it.ratePerTon || 0)
  if (it.calcBasis === 'piece') return (it.qty || 0) * (it.ratePerPiece || 0)
  return it.ratePerTrip || 0
})

const itemFuelCost = computed(() => (item.value.fuelLiters || 0) * (item.value.fuelRate || 0))

const itemCalculatedAllowance = computed(() => {
  return Math.round(itemComputedTripFee.value * 0.99 * 0.62 - itemFuelCost.value)
})

const itemDisplayedAllowance = computed(() => (isCements.value ? item.value.allowance || 0 : itemCalculatedAllowance.value))

const canAddItem = computed(() => !!item.value.siteName && !!item.value.district && itemComputedTripFee.value > 0)

const confirmAddItem = () => {
  if (!canAddItem.value) return
  const it = item.value
  lineItems.value.push({
    siteName: it.siteName,
    district: it.district,
    cementTypes: isCements.value ? it.cementTypes.filter(Boolean) : undefined,
    jobType: isCements.value ? it.jobType : undefined,
    weight: it.calcBasis === 'weight' ? it.weight : undefined,
    qty: it.calcBasis === 'piece' ? it.qty : undefined,
    tripFee: itemComputedTripFee.value,
    agreedPrice: it.agreedPrice || itemComputedTripFee.value,
    allowance: itemDisplayedAllowance.value,
    fuelLiters: it.fuelLiters,
    fuelRate: it.fuelRate,
    siteContactName: it.siteContactName || undefined,
    sitePhone: it.sitePhone || undefined,
    siteCoords: it.siteCoords || undefined,
  })
  item.value = defaultItem()
}

const removeItem = (idx: number) => {
  lineItems.value.splice(idx, 1)
}

const totalTripFee = computed(() => lineItems.value.reduce((sum, li) => sum + li.tripFee, 0))
const totalAllowance = computed(() => lineItems.value.reduce((sum, li) => sum + li.allowance, 0))

const canSave = computed(() => {
  const customerValid = !isCements.value || !!header.value.customer
  return customerValid && lineItems.value.length > 0
})

const lineItemProductLabel = (li: CommittedLineItem) => {
  if (!isCements.value) return 'ปูนซีเมนต์'
  const types = (li.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const lineItemWeightQtyLabel = (li: { weight?: number; qty?: number }) => {
  if (li.weight) return `${li.weight} ตัน`
  if (li.qty) return `${li.qty} ชิ้น`
  return '-'
}

const productLabel = (booking: Booking) => {
  if (booking.category === 'ceramics') return 'ปูนซีเมนต์'
  const types = (booking.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const weightQtyLabel = (booking: Booking) => lineItemWeightQtyLabel(booking)

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const openDialog = () => {
  header.value = defaultHeader()
  item.value = defaultItem()
  lineItems.value = []
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const saveAllItems = () => {
  if (!canSave.value) return
  const shipDate = header.value.shipDate ? new Date(header.value.shipDate) : undefined
  lineItems.value.forEach((li) => {
    bookingStore.addBooking({
      category: props.fleet,
      docNo: bookingStore.nextDocNo(props.fleet),
      po: header.value.po || undefined,
      shipDate,
      customer: header.value.customer,
      siteName: li.siteName,
      district: li.district,
      cementTypes: li.cementTypes,
      jobType: li.jobType,
      weight: li.weight,
      qty: li.qty,
      allowance: li.allowance,
      tripFee: li.tripFee,
      agreedPrice: li.agreedPrice,
      fuelLiters: li.fuelLiters,
      fuelRate: li.fuelRate,
      siteContactName: li.siteContactName,
      sitePhone: li.sitePhone,
      siteCoords: li.siteCoords,
      plate: '',
    })
  })
  closeDialog()
}

// --- Dispatch flow ---
const dispatchTarget = ref<Booking | null>(null)
const dispatchForm = ref({ plate: '', driverName: '', siteContactName: '', sitePhone: '', siteCoords: '' })

const openDispatchDialog = (booking: Booking) => {
  dispatchTarget.value = booking
  dispatchForm.value = {
    plate: '',
    driverName: '',
    siteContactName: booking.siteContactName || '',
    sitePhone: booking.sitePhone || '',
    siteCoords: booking.siteCoords || '',
  }
}

const confirmDispatch = () => {
  if (!dispatchTarget.value || !dispatchForm.value.plate) return
  bookingStore.dispatchBooking(dispatchTarget.value.id, dispatchForm.value.plate, {
    driverName: dispatchForm.value.driverName || undefined,
    siteContactName: dispatchForm.value.siteContactName || undefined,
    sitePhone: dispatchForm.value.sitePhone || undefined,
    siteCoords: dispatchForm.value.siteCoords || undefined,
  })
  dispatchTarget.value = null
}

// --- Complete job flow ---
const completeTarget = ref<Booking | null>(null)
const debtAdjustments = ref<DebtAdjustment[]>([])

const openCompleteDialog = (booking: Booking) => {
  completeTarget.value = booking
  debtAdjustments.value = []
}

const addAdjustmentRow = () => {
  debtAdjustments.value.push({ id: `adj${Date.now()}${debtAdjustments.value.length}`, label: '', amount: 0 })
}

const finalAllowance = computed(() => {
  if (!completeTarget.value) return 0
  const net = debtAdjustments.value.reduce((sum, d) => sum + (d.amount || 0), 0)
  return Math.round((completeTarget.value.allowance || 0) - net)
})

const confirmComplete = () => {
  if (!completeTarget.value) return
  bookingStore.completeJob(completeTarget.value.id, debtAdjustments.value.filter((d) => d.label || d.amount))
  completeTarget.value = null
}

// --- Edit ops (น้ำมัน/ข้อมูลหน้างาน) แก้ไขได้ทุกสถานะงาน ---
const editOpsTarget = ref<Booking | null>(null)
const editOpsForm = ref({ fuelLiters: 0, fuelRate: 0, siteContactName: '', sitePhone: '', siteCoords: '' })

const openEditOps = (booking: Booking) => {
  editOpsTarget.value = booking
  editOpsForm.value = {
    fuelLiters: booking.fuelLiters || 0,
    fuelRate: booking.fuelRate || 0,
    siteContactName: booking.siteContactName || '',
    sitePhone: booking.sitePhone || '',
    siteCoords: booking.siteCoords || '',
  }
}

const confirmEditOps = () => {
  if (!editOpsTarget.value) return
  bookingStore.updateBookingOps(editOpsTarget.value.id, editOpsForm.value)
  editOpsTarget.value = null
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

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.animate-fade {
  animation: tmsfade 0.2s ease both;
}

.animate-slide {
  animation: tmsslide 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

@keyframes tmsfade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes tmsslide {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
