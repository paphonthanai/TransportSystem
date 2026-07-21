<template>
  <div class="space-y-6">
    <!-- Create Button -->
    <div class="flex justify-end">
      <button @click="openDialog" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        สร้างงาน
      </button>
    </div>

    <!-- Search + Ship Date Filter -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-sm">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาเลขที่เอกสาร, PO, ลูกค้า, ชื่อหน้างาน, ทะเบียนรถ..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="material-symbols-rounded text-muted text-lg">calendar_month</span>
        <input v-model="shipDateFilter" type="date" :disabled="showAllDates" class="input-field disabled:opacity-40" />
      </div>
      <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
        <input v-model="showAllDates" type="checkbox" class="w-4 h-4" />
        แสดงทุกวัน
      </label>
    </div>

    <!-- In-progress Table -->
    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">
        งานที่กำลังดำเนินการ ({{ inProgressBookings.length }})
        <span class="font-normal text-xs text-muted">{{ dateFilterLabel }}</span>
      </div>
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
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่สร้างงาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ขนส่ง</th>
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
                <div class="text-xs text-muted flex items-center gap-1">
                  {{ booking.driverName || '-' }}
                  <span
                    v-if="booking.driverName && driverTripNumberForBooking(booking) > 1"
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"
                  >
                    เที่ยวที่ {{ driverTripNumberForBooking(booking) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.createdAt) }}</td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.shipDate) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                  <span v-if="booking.status === 'PENDING_ACCEPT'" class="text-[11px] text-muted">
                    เหลือ {{ formatCountdown(remainingAcceptSeconds(booking)) }}
                  </span>
                </div>
                <div v-if="driverStepLabel(booking)" class="text-[11px] text-muted mt-0.5">{{ driverStepLabel(booking) }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <button @click="router.push(`/job/${booking.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button @click="openEditBooking(booking)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                  <button v-if="booking.status === 'WAITING_DISPATCH'" @click="openDispatchDialog(booking)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">local_shipping</span>
                    กรอกทะเบียน / ส่งงาน
                  </button>
                  <button v-else-if="booking.status === 'PENDING_ACCEPT'" @click="openDispatchDialog(booking)" class="btn-sm text-amber-700">
                    <span class="material-symbols-rounded text-base">sync_alt</span>
                    เปลี่ยนคนขับ/รถ
                  </button>
                  <button v-else-if="booking.status === 'DISPATCHED'" @click="bookingStore.startTransit(booking.id)" class="btn-sm text-indigo-700">
                    <span class="material-symbols-rounded text-base">directions</span>
                    เริ่มขนส่ง
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="inProgressBookings.length === 0">
              <td colspan="12" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- In-transit Table -->
    <div class="card-lg overflow-hidden">
      <div class="font-bold text-text mb-3">
        งานที่กำลังขนส่ง ({{ inTransitBookings.length }})
        <span class="font-normal text-xs text-muted">{{ dateFilterLabel }}</span>
      </div>
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
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่สร้างงาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ขนส่ง</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in inTransitBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.po || '-' }}</td>
              <td class="px-4 py-3 text-text">{{ booking.customer }}</td>
              <td class="px-4 py-3 font-semibold text-text">{{ booking.siteName }}</td>
              <td class="px-4 py-3 text-muted">{{ booking.district }}</td>
              <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ weightQtyLabel(booking) }}</td>
              <td class="px-4 py-3 text-text">
                <div class="font-semibold">{{ booking.plate || '-' }}</div>
                <div class="text-xs text-muted flex items-center gap-1">
                  {{ booking.driverName || '-' }}
                  <span
                    v-if="booking.driverName && driverTripNumberForBooking(booking) > 1"
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"
                  >
                    เที่ยวที่ {{ driverTripNumberForBooking(booking) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.createdAt) }}</td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.shipDate) }}</td>
              <td class="px-4 py-3">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                <div v-if="driverStepLabel(booking)" class="text-[11px] text-muted mt-0.5">{{ driverStepLabel(booking) }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <button @click="router.push(`/job/${booking.id}`)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">visibility</span>
                    ดูรายละเอียด
                  </button>
                  <button @click="openEditBooking(booking)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                  <button @click="openCompleteDialog(booking)" class="btn-sm text-green-700">
                    <span class="material-symbols-rounded text-base">task_alt</span>
                    จบงาน
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="inTransitBookings.length === 0">
              <td colspan="12" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
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
                  <label class="block text-xs font-semibold text-muted mb-1">เลขที่ใบปล่อยรถ</label>
                  <div class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-muted font-medium">
                    {{ nextReleaseNoPreview }} (อัตโนมัติ)
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่สร้างงาน</label>
                  <input v-model="header.jobDate" type="date" class="input-field w-full" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-muted mb-1">ชื่อลูกค้า</label>
                  <input
                    v-model="header.customer"
                    list="customerNameOptions"
                    placeholder="ชื่อลูกค้า (พิมพ์ใหม่ได้ หรือเลือกจากสมุดรายชื่อ)"
                    class="input-field w-full"
                  />
                  <datalist id="customerNameOptions">
                    <option v-for="c in customerStore.customers" :key="c.name" :value="c.name" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ใบสั่งงาน (PO)</label>
                  <input v-model="header.po" placeholder="เลขที่ PO (ระบบแนะนำให้เมื่อเลือกลูกค้า)" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่ขนส่ง</label>
                  <input v-model="header.shipDate" type="date" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ <span class="font-normal text-[10px]">(กรอกทีหลังได้)</span></label>
                  <input v-model="header.plate" list="headerVehicleOptions" placeholder="เช่น 82-4417 กรุงเทพ" class="input-field w-full" />
                  <datalist id="headerVehicleOptions">
                    <option v-for="v in vehicleOptions" :key="v" :value="v" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">คนขับ <span class="font-normal text-[10px]">(กรอกทีหลังได้)</span></label>
                  <select v-model="header.driverName" class="input-field w-full">
                    <option value="">เลือกคนขับ...</option>
                    <option v-for="name in driverOptions" :key="name" :value="name">{{ driverOptionLabel(name) }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">วันที่กลับ <span class="font-normal text-[10px]">(แก้ไขทีหลังได้)</span></label>
                  <input v-model="header.returnDate" type="date" class="input-field w-full" />
                </div>
              </div>
            </div>

            <!-- Line Item Sub-form: กรอกทีละรายการสินค้า/หน้างาน แล้วกดยืนยันเพิ่มลงตาราง -->
            <div class="border border-border rounded-xl p-4 bg-surface-2">
              <h3 class="font-semibold text-text mb-1">เพิ่มรายการสินค้า</h3>
              <div class="text-xs font-bold text-muted uppercase tracking-wide mb-3">รายละเอียดขาไป</div>

              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted bg-surface rounded-lg px-3 py-2 border border-border mb-3">
                <div>รหัสลูกค้า: <span class="font-semibold text-text">{{ customerCodeForHeader || '-' }}</span></div>
                <div>ใบสั่งงาน (PO): <span class="font-semibold text-text">{{ header.po || '-' }}</span></div>
                <div>วันที่ขน: <span class="font-semibold text-text">{{ header.shipDate || '-' }}</span></div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
                  <input v-model="item.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">อำเภอ (พิกัดหน้างาน)</label>
                  <input v-model="item.district" placeholder="อำเภอ" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้น</label>
                  <input v-model="item.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เส้นทาง</label>
                  <input v-model="item.route" placeholder="เช่น กรุงเทพ-นครสวรรค์" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
                  <input v-model="item.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-muted mb-1">สินค้า (เพิ่มได้หลายรายการต่อเที่ยว)</label>
                  <div class="flex gap-2">
                    <input
                      v-model="productDraft"
                      list="productNameOptions"
                      placeholder="พิมพ์หรือเลือกชื่อสินค้า แล้วกดเพิ่ม"
                      class="input-field flex-1"
                      @keydown.enter.prevent="addProductToItem"
                    />
                    <button type="button" @click="addProductToItem" class="btn-secondary">
                      <span class="material-symbols-rounded text-base">add</span>
                      เพิ่ม
                    </button>
                  </div>
                  <datalist id="productNameOptions">
                    <option v-for="p in productOptionsForFleet" :key="p.id" :value="p.name" />
                  </datalist>
                  <div v-if="item.cementTypes.filter(Boolean).length" class="flex flex-wrap gap-2 mt-2">
                    <span
                      v-for="(p, idx) in item.cementTypes.filter(Boolean)"
                      :key="idx"
                      class="inline-flex items-center gap-1 text-xs font-semibold pl-3 pr-1 py-1 rounded-full bg-primary-soft text-primary"
                    >
                      {{ p }}
                      <button type="button" @click="removeProductFromItem(idx)" class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50">
                        <span class="material-symbols-rounded text-sm">close</span>
                      </button>
                    </span>
                  </div>
                </div>
                <template v-if="isCements">
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
                <label class="block text-xs font-semibold text-muted mb-1">ปริมาณสินค้า (ไม่บังคับ ใช้เพื่อบันทึก/ตัดสต๊อก ไม่กระทบราคา)</label>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">น้ำหนัก (ตัน)</label>
                    <input v-model.number="item.weight" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">จำนวน (ชิ้น)</label>
                    <input v-model.number="item.qty" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว (บาท)</label>
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

            <!-- Trip Fee / Fuel Sub-form: แยก container ไว้ด้านล่างสุด กรอกเบี้ยเลี้ยง/ข้อมูลติดต่อหน้างานของรายการที่กำลังจะเพิ่ม (กรอกก่อนหรือหลังกดยืนยันด้านบนก็ได้ เพราะยังเป็นข้อมูลของรายการถัดไปที่ยังไม่ได้ยืนยัน) -->
            <!-- น้ำมัน/ปลายทาง ย้ายไปกรอกตอนจัดรถแทน (หน้าจัดรถ) เพราะออกได้หลายเที่ยวแต่เติมน้ำมันครั้งเดียว ไม่ต้องกรอกซ้ำทุกเที่ยวตอนสร้างงาน -->
            <div class="border border-border rounded-xl p-4 bg-surface-2">
              <h3 class="font-semibold text-text mb-1">รายละเอียดขากลับ</h3>
              <div class="text-xs text-muted mb-3">ตารางกรอกเบี้ยเลี้ยง และข้อมูลผู้ติดต่อหน้างาน (น้ำมัน/ปลายทางกรอกตอนจัดรถ)</div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    {{ formatBaht(itemCalculatedAllowance) }} (ประมาณการ ยังไม่หักค่าน้ำมัน จะคำนวณใหม่ตอนจัดรถ)
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
            <div class="font-bold text-text">
              {{ dispatchTarget.status === 'PENDING_ACCEPT' ? 'เปลี่ยนคนขับ/รถ' : 'ส่งงาน' }} {{ dispatchTarget.docNo }}
            </div>
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
                <option v-for="name in driverOptions" :key="name" :value="name">{{ driverOptionLabel(name) }}</option>
              </select>
            </div>
            <div class="text-xs font-semibold text-muted pt-2 border-t border-border">
              น้ำมัน (กรอกครั้งเดียวใช้ได้กับหลายเที่ยวของคนขับคนนี้)
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">น้ำมัน (ลิตร)</label>
                <input v-model.number="dispatchForm.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร วันนั้น)</label>
                <input v-model.number="dispatchForm.fuelRate" type="number" placeholder="0" class="input-field w-full" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ปลายทาง</label>
              <input v-model="dispatchForm.destination" placeholder="จุดส่งสินค้า" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                เลขไมล์เริ่มต้น (กม.)
                <span class="text-[10px] font-normal text-muted">(ดึงจากเลขไมล์สิ้นสุดเที่ยวก่อนของรถคันนี้ให้อัตโนมัติ)</span>
              </label>
              <input v-model.number="dispatchForm.odometerBefore" type="number" placeholder="0" class="input-field w-full" />
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
              {{ dispatchTarget?.status === 'PENDING_ACCEPT' ? 'ยืนยันเปลี่ยนคนขับ/รถ' : 'ส่งงาน' }}
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
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                เลขไมล์สิ้นสุด (กม.)
                <span class="text-[10px] font-normal text-muted">(เมื่อรถกลับถึง ใช้คำนวณระยะทาง/อัตราสิ้นเปลืองน้ำมัน)</span>
              </label>
              <input v-model.number="completeOdometerAfter" type="number" placeholder="0" class="input-field w-full" />
            </div>
            <div v-if="completeMileageSummary" class="grid grid-cols-2 gap-2 text-xs bg-surface-2 rounded-lg p-3 border border-border">
              <div>ระยะทางเที่ยวนี้: <span class="font-semibold text-text">{{ completeMileageSummary.distanceKm }} กม.</span></div>
              <div>สะสม: <span class="font-semibold text-text">{{ completeMileageSummary.cumulativeKm }} กม.</span></div>
              <div>เฉลี่ย: <span class="font-semibold text-text">{{ completeMileageSummary.avgKmPerLiter ?? '-' }} กม./ลิตร</span></div>
              <div>น้ำมันที่กำหนด: <span class="font-semibold text-text">{{ completeMileageSummary.standardFuelLiters ?? '-' }} ล.</span></div>
              <div class="col-span-2">
                ชดเชยน้ำมัน:
                <span :class="['font-semibold', (completeMileageSummary.fuelCompensation ?? 0) >= 0 ? 'text-green-700' : 'text-red-700']">
                  {{ completeMileageSummary.fuelCompensation !== null ? formatBaht(completeMileageSummary.fuelCompensation) : '-' }}
                </span>
                <span class="text-muted"> (บวก = คนขับใช้น้ำมันน้อยกว่ากำหนด, ลบ = ใช้เกินกำหนด)</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm pt-2 border-t border-border">
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

    <!-- Edit Booking Dialog (แก้ไขได้ทุกสถานะงาน ใช้ฟอร์มเดียวกับตอนสร้างงาน) -->
    <Teleport to="body" v-if="editTarget">
      <div @click="editTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">แก้ไขงาน {{ editTarget.docNo }}</div>
            <button @click="editTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-6">
            <div class="text-xs text-muted">แก้ไขได้ทุกสถานะงาน ไม่จำกัดสิทธิ์ ใช้ฟอร์มเดียวกับตอนสร้างงาน</div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ใบสั่งงาน (PO)</label>
                <input v-model="editForm.po" placeholder="เลขที่ PO" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">วันที่ขนส่ง</label>
                <input v-model="editForm.shipDate" type="date" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">วันที่กลับ</label>
                <input v-model="editForm.returnDate" type="date" class="input-field w-full" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
                <input v-model="editForm.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">อำเภอ (พิกัดหน้างาน)</label>
                <input v-model="editForm.district" placeholder="อำเภอ" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้น</label>
                <input v-model="editForm.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เส้นทาง</label>
                <input v-model="editForm.route" placeholder="เช่น กรุงเทพ-นครสวรรค์" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
                <input v-model="editForm.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ปลายทาง</label>
                <input v-model="editForm.destination" placeholder="จุดส่งสินค้า" class="input-field w-full" />
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-muted mb-1">สินค้า (เพิ่มได้หลายรายการต่อเที่ยว)</label>
                <div class="flex gap-2">
                  <input
                    v-model="editProductDraft"
                    list="editProductNameOptions"
                    placeholder="พิมพ์หรือเลือกชื่อสินค้า แล้วกดเพิ่ม"
                    class="input-field flex-1"
                    @keydown.enter.prevent="addProductToEdit"
                  />
                  <button type="button" @click="addProductToEdit" class="btn-secondary">
                    <span class="material-symbols-rounded text-base">add</span>
                    เพิ่ม
                  </button>
                  <datalist id="editProductNameOptions">
                    <option v-for="p in productOptionsForFleet" :key="p.id" :value="p.name" />
                  </datalist>
                </div>
                <div v-if="editForm.cementTypes.filter(Boolean).length" class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-for="(p, idx) in editForm.cementTypes.filter(Boolean)"
                    :key="idx"
                    class="inline-flex items-center gap-1 text-xs font-semibold pl-3 pr-1 py-1 rounded-full bg-primary-soft text-primary"
                  >
                    {{ p }}
                    <button type="button" @click="removeProductFromEdit(idx)" class="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50">
                      <span class="material-symbols-rounded text-sm">close</span>
                    </button>
                  </span>
                </div>
              </div>
              <template v-if="isCements">
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-muted mb-1">ประเภทงาน</label>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="jt in jobTypeOptions"
                      :key="jt"
                      @click="editForm.jobType = jt"
                      :class="[
                        'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                        editForm.jobType === jt ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                      ]"
                    >
                      {{ jt }}
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ปริมาณสินค้า (ไม่บังคับ ใช้เพื่อบันทึก/ตัดสต๊อก ไม่กระทบราคา)</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">น้ำหนัก (ตัน)</label>
                  <input v-model.number="editForm.weight" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">จำนวน (ชิ้น)</label>
                  <input v-model.number="editForm.qty" type="number" placeholder="0" class="input-field w-full" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว (บาท)</label>
                  <input v-model.number="editForm.ratePerTrip" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">
                    ราคาที่ตกลงกับลูกค้า (บาท)
                    <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยวที่คำนวณได้)</span>
                  </label>
                  <input v-model.number="editForm.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
                </div>
              </div>
              <div class="text-sm text-text mt-3">
                ค่าเที่ยว <span class="font-bold">{{ formatBaht(editComputedTripFee) }}</span>
                <span class="text-muted"> · ค่าน้ำมัน {{ formatBaht(editFuelCost) }}</span>
              </div>
            </div>

            <div class="border border-border rounded-xl p-4 bg-surface-2">
              <h3 class="font-semibold text-text mb-3">น้ำมัน / เบี้ยเลี้ยง / ข้อมูลติดต่อหน้างาน</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">น้ำมัน (ลิตร)</label>
                  <input v-model.number="editForm.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร)</label>
                  <input v-model.number="editForm.fuelRate" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
                  <input
                    v-if="isCements"
                    v-model.number="editForm.allowance"
                    type="number"
                    placeholder="0"
                    class="input-field w-full"
                  />
                  <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface text-sm text-text font-semibold">
                    {{ formatBaht(editCalculatedAllowance) }} (อัตโนมัติ)
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน</label>
                  <input v-model="editForm.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน</label>
                  <input v-model="editForm.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">พิกัดหน้างาน</label>
                  <input v-model="editForm.siteCoords" placeholder="โลเคชั่นหน้างาน" class="input-field w-full" />
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="editTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmEditBooking" class="btn-primary">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDriversStore } from '@/stores/drivers'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, DebtAdjustment } from '@/types'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'

interface CommittedLineItem {
  siteName: string
  district: string
  shipmentNo?: string
  route?: string
  origin?: string
  destination?: string
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
const driversStore = useDriversStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const fixedCustomer = bookingStore.fixedCustomer

const showDialog = ref(false)
const searchQuery = ref('')

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))
const customerCodeForHeader = computed(() => customerStore.lookupCustomer(header.value.customer).code)
const vehicleOptions = computed(() => driversStore.drivers.map((d) => d.vehicle).filter(Boolean))
const nextReleaseNoPreview = computed(() => bookingStore.nextReleaseNo())

const jobTypeOptions: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

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

const driverOptions = computed(() =>
  driversStore.drivers.filter((d) => d.employmentStatus === 'active').map((d) => `${d.firstName} ${d.lastName}`)
)

const ACTIVE_STATUSES: BookingStatus[] = ['PENDING_ACCEPT', 'DISPATCHED', 'IN_TRANSIT']

const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** ใช้ตัดสินว่า "วันเดียวกัน" ของงานนี้คือวันไหน สำหรับนับเที่ยวที่ N และกรองตามวันขนส่ง: ใช้วันที่ขนส่งเป็นหลัก ถ้าไม่มีค่อย fallback เป็นวันที่สร้างงาน */
const bookingDayKey = (b: Booking) => new Date(b.shipDate || b.createdAt)

/** เรียงงานทั้งหมด (ทุก fleet) ของคนขับคนนี้ในวันเดียวกับ refDate ตามเวลาที่จ่ายงาน เพื่อนับว่าเป็นเที่ยวที่เท่าไหร่ */
const driverBookingsForDay = (driverName: string, refDate: Date) =>
  bookingStore.bookings
    .filter((b) => b.driverName === driverName && isSameCalendarDay(bookingDayKey(b), refDate))
    .sort((a, b) => new Date(a.dispatchedAt || a.createdAt).getTime() - new Date(b.dispatchedAt || b.createdAt).getTime())

const driverTripNumberForBooking = (booking: Booking) => {
  if (!booking.driverName) return 1
  const list = driverBookingsForDay(booking.driverName, bookingDayKey(booking))
  const idx = list.findIndex((b) => b.id === booking.id)
  return idx === -1 ? 1 : idx + 1
}

/** งานล่าสุดที่คนขับคนนี้กำลังวิ่งอยู่ (ยังไม่ DELIVERED) ถ้ามี ใช้บอกสถานะว่าง/ไม่ว่างตอนเลือกคนขับ */
const activeBookingForDriver = (name: string) =>
  bookingStore.bookings
    .filter((b) => b.driverName === name && ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.dispatchedAt || b.createdAt).getTime() - new Date(a.dispatchedAt || a.createdAt).getTime())[0]

/** ป้ายชื่อคนขับใน dropdown บอกว่าว่างหรือกำลังวิ่งเที่ยวที่เท่าไหร่ เพื่อให้จัดคิวเที่ยวถัดไปล่วงหน้าได้อย่างตั้งใจ */
const driverOptionLabel = (name: string) => {
  const activeBooking = activeBookingForDriver(name)
  if (!activeBooking) return `${name} — ว่าง`
  const tripNo = driverTripNumberForBooking(activeBooking)
  return `${name} — กำลังวิ่งเที่ยวที่ ${tripNo} (${activeBooking.docNo})`
}

// --- กรองรายการงานตามวันที่ขนส่ง (shipDate) ค่าเริ่มต้นคือวันนี้ เพื่อรองรับการจองคิวเที่ยวถัดไปล่วงหน้าโดยไม่ปนกับงานวันอื่น ---
const shipDateFilter = ref(new Date().toISOString().slice(0, 10))
const showAllDates = ref(false)

const matchesDateFilter = (b: Booking) => {
  if (showAllDates.value || !shipDateFilter.value) return true
  return isSameCalendarDay(bookingDayKey(b), new Date(shipDateFilter.value))
}

const dateFilterLabel = computed(() => {
  if (showAllDates.value) return '(แสดงทุกวัน)'
  if (!shipDateFilter.value) return ''
  return `· ${new Date(shipDateFilter.value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
})

const formatShortDate = (date?: Date) =>
  date ? new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

/** สถานะย่อยของคนขับระหว่าง DISPATCHED/IN_TRANSIT (รับน้ำมัน/ลงของ) ให้ dispatcher เห็นความคืบหน้าโดยไม่ต้องเปลี่ยนสถานะหลัก */
const driverStepLabel = (booking: Booking) => {
  if (booking.status === 'DISPATCHED') return booking.fuelReceivedAt ? 'รับน้ำมันแล้ว รอออกเดินทาง' : 'รอรับน้ำมัน'
  if (booking.status === 'IN_TRANSIT') return booking.unloadedAt ? 'ลงของแล้ว รอจบงาน' : 'กำลังเดินทาง'
  return ''
}

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
    .filter(
      (b) => b.status !== 'DELIVERED' && b.status !== 'IN_TRANSIT' && matchesDateFilter(b) && (!q || matchesSearch(b, q))
    )
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status]
      if (rankDiff !== 0) return rankDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

// งานที่คนขับกำลังขนส่งอยู่ (เดิมเคยรวมอยู่ในตารางเดียวกับ "กำลังดำเนินการ" แยกออกมาให้เห็นชัดว่ากำลังวิ่งอยู่)
const inTransitBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter((b) => b.status === 'IN_TRANSIT' && matchesDateFilter(b) && (!q || matchesSearch(b, q)))
    .sort((a, b) => new Date(b.transitStartedAt || 0).getTime() - new Date(a.transitStartedAt || 0).getTime())
})

// --- Header info: ใช้ร่วมกันทุกรายการสินค้าที่เพิ่มในเซสชันนี้ ---
const defaultHeader = () => ({
  po: '',
  shipDate: new Date().toISOString().slice(0, 10),
  jobDate: new Date().toISOString().slice(0, 10),
  returnDate: '',
  customer: isCements.value ? '' : fixedCustomer,
  plate: '',
  driverName: '',
})
const header = ref(defaultHeader())

// กรอกช่องคนขับ หรือทะเบียนรถ (จะกรอกตอนสร้างงานเลย หรือเว้นว่างไปกรอกทีหลังตอนส่งงานก็ได้) ให้ดึงข้อมูลคู่กันแบบเดียวกับหน้าส่งงาน
watch(
  () => header.value.driverName,
  (name) => {
    if (!name) return
    const vehicle = driversStore.findVehicleByDriverName(name)
    if (vehicle) header.value.plate = vehicle
  }
)
watch(
  () => header.value.plate,
  (plate) => {
    if (!plate) return
    const driver = driversStore.findDriverByVehicle(plate)
    if (driver) header.value.driverName = `${driver.firstName} ${driver.lastName}`
  }
)

// เลือกลูกค้าที่มีรหัสผู้ติดต่อในสมุดรายชื่อ และยังไม่ได้กรอกเลข PO เอง -> แนะนำเลข PO ให้อัตโนมัติ (ไม่ทับเลข PO จริงที่กรอกไว้แล้ว)
watch(
  () => header.value.customer,
  (name) => {
    if (!name) return
    if (!header.value.po) {
      const now = new Date()
      const todaysJobCount = bookingStore.bookings.filter((b) => {
        if (b.customer !== name) return false
        const d = new Date(b.createdAt)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
      }).length
      const suggestion = customerStore.suggestPoNumber(name, todaysJobCount)
      if (suggestion) header.value.po = suggestion
    }
    // เลือกลูกค้าปุ๊บ ดึงผู้ติดต่อ/เบอร์โทรจากสมุดรายชื่อลูกค้ามาให้ทันที (ถ้าช่องยังว่างอยู่) ไม่ต้องรอพิมพ์ชื่อหน้างานซ้ำ
    const customer = customerStore.lookupCustomer(name)
    if (!item.value.siteContactName) item.value.siteContactName = customer.contact || ''
    if (!item.value.sitePhone) item.value.sitePhone = customer.phone || ''
  }
)

// --- Line item sub-form: กรอกทีละรายการ แล้วกดยืนยันเพิ่มลงตาราง ---
const defaultItem = () => ({
  siteName: '',
  district: '',
  shipmentNo: '',
  route: '',
  origin: '',
  destination: '',
  cementTypes: [] as string[],
  jobType: undefined as BookingJobType | undefined,
  weight: 0,
  qty: 0,
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

const productDraft = ref('')
const addProductToItem = () => {
  const val = productDraft.value.trim()
  if (!val) return
  item.value.cementTypes.push(val)
  productDraft.value = ''
}
const removeProductFromItem = (idx: number) => {
  item.value.cementTypes.splice(idx, 1)
}

const lineItems = ref<CommittedLineItem[]>([])

// พิมพ์ชื่อหน้างานที่เคยส่งของให้ลูกค้าคนนี้มาก่อน -> ดึงผู้ติดต่อ/เบอร์โทร/พิกัดหน้างานจากงานล่าสุดที่ตรงกันมาให้อัตโนมัติ (แม่นกว่าข้อมูลลูกค้าทั่วไป)
// override เฉพาะช่องที่ยังว่าง หรือยังเป็นค่า default ที่ดึงมาจากสมุดรายชื่อลูกค้าตอนเลือกลูกค้า (ไม่ทับค่าที่ผู้ใช้พิมพ์เองไว้แล้ว)
watch(
  () => item.value.siteName,
  (siteName) => {
    if (!siteName) return
    const customer = customerStore.lookupCustomer(header.value.customer)
    const match = bookingStore.bookings
      .filter((b) => b.customer === header.value.customer && b.siteName.trim().toLowerCase() === siteName.trim().toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    if (match) {
      if (!item.value.siteContactName || item.value.siteContactName === customer.contact) {
        item.value.siteContactName = match.siteContactName || item.value.siteContactName
      }
      if (!item.value.sitePhone || item.value.sitePhone === customer.phone) {
        item.value.sitePhone = match.sitePhone || item.value.sitePhone
      }
      if (!item.value.siteCoords) item.value.siteCoords = match.siteCoords || ''
      return
    }
    if (!item.value.siteContactName) item.value.siteContactName = customer.contact || ''
    if (!item.value.sitePhone) item.value.sitePhone = customer.phone || ''
  }
)

// น้ำมันย้ายไปกรอกตอนจัดรถแทน (ดู openDispatchDialog) ไม่ตั้งค่าตอนสร้างงานแล้ว เพราะออกได้หลายเที่ยวแต่เติมน้ำมันครั้งเดียว

const itemComputedTripFee = computed(() => item.value.ratePerTrip || 0)

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
    shipmentNo: it.shipmentNo || undefined,
    route: it.route || undefined,
    origin: it.origin || undefined,
    destination: it.destination || undefined,
    cementTypes: it.cementTypes.filter(Boolean),
    jobType: isCements.value ? it.jobType : undefined,
    weight: it.weight || undefined,
    qty: it.qty || undefined,
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

const canSave = computed(() => !!header.value.customer && lineItems.value.length > 0)

const lineItemProductLabel = (li: CommittedLineItem) => {
  const types = (li.cementTypes || []).filter(Boolean)
  return types.length ? types.join(', ') : '-'
}

const lineItemWeightQtyLabel = (li: { weight?: number; qty?: number }) => {
  if (li.weight) return `${li.weight} ตัน`
  if (li.qty) return `${li.qty} ชิ้น`
  return '-'
}

const productLabel = (booking: Booking) => {
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
  const returnDate = header.value.returnDate ? new Date(header.value.returnDate) : undefined
  const createdAt = header.value.jobDate ? new Date(header.value.jobDate) : undefined
  lineItems.value.forEach((li) => {
    bookingStore.addBooking({
      category: props.fleet,
      docNo: bookingStore.nextDocNo(props.fleet),
      releaseNo: bookingStore.nextReleaseNo(),
      po: header.value.po || undefined,
      shipDate,
      returnDate,
      createdAt,
      customer: header.value.customer,
      siteName: li.siteName,
      district: li.district,
      shipmentNo: li.shipmentNo,
      route: li.route,
      origin: li.origin,
      destination: li.destination,
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
      plate: header.value.plate || '',
      driverName: header.value.driverName || undefined,
    })
  })
  closeDialog()
}

// --- Dispatch flow ---
const dispatchTarget = ref<Booking | null>(null)
const dispatchForm = ref({
  plate: '',
  driverName: '',
  siteContactName: '',
  sitePhone: '',
  siteCoords: '',
  destination: '',
  fuelLiters: 0,
  fuelRate: 0,
  odometerBefore: 0,
})

/** เลขไมล์สิ้นสุดล่าสุดของรถคันนี้ (จากเที่ยวก่อนหน้าที่จบงานแล้ว) เอาไว้ตั้งเป็นเลขไมล์เริ่มต้นของเที่ยวใหม่ให้อัตโนมัติ */
const latestOdometerForPlate = (plate: string, excludeId: string) =>
  bookingStore.bookings
    .filter((b) => b.plate === plate && b.id !== excludeId && b.odometerAfter !== undefined)
    .sort((a, b) => new Date(b.completedAt || b.dispatchedAt || 0).getTime() - new Date(a.completedAt || a.dispatchedAt || 0).getTime())[0]

/** เที่ยวล่าสุดของคนขับคนนี้ที่จ่ายงานไปวันนี้แล้ว (เอาไว้ดึงค่าน้ำมันที่กรอกไว้แล้วมาเติมให้ ไม่ต้องกรอกซ้ำทุกเที่ยว) */
const latestFuelForDriverToday = (driverName: string, excludeId: string) => {
  const today = new Date()
  return bookingStore.bookings
    .filter(
      (b) =>
        b.driverName === driverName &&
        b.id !== excludeId &&
        (b.fuelLiters || b.fuelRate) &&
        b.dispatchedAt &&
        isSameCalendarDay(new Date(b.dispatchedAt), today)
    )
    .sort((a, b) => new Date(b.dispatchedAt || 0).getTime() - new Date(a.dispatchedAt || 0).getTime())[0]
}

/**
 * แนะนำค่าน้ำมันให้ตอนจัดรถ: ลำดับความสำคัญคือ (1) น้ำมันที่คนขับคนนี้กรอกไว้แล้ววันนี้ (กรอกครั้งเดียวใช้ได้หลายเที่ยว)
 * (2) ถ้ายังไม่เคยกรอก ใช้ลิตรมาตรฐานของอำเภอปลายทาง + ราคาน้ำมันวันนี้ (ถ้าตั้งค่าไว้)
 */
const suggestFuel = (driverName: string, excludeId: string, district: string) => {
  const prevFuel = driverName ? latestFuelForDriverToday(driverName, excludeId) : undefined
  if (prevFuel) return { fuelLiters: prevFuel.fuelLiters || 0, fuelRate: prevFuel.fuelRate || 0 }
  const districtRate = fuelRateStore.findRateByDistrict(district)
  if (districtRate) return { fuelLiters: districtRate.liters, fuelRate: fuelRateStore.settings.todayPricePerLiter }
  return null
}

const openDispatchDialog = (booking: Booking) => {
  dispatchTarget.value = booking
  dispatchForm.value = {
    plate: booking.plate || '',
    driverName: booking.driverName || '',
    siteContactName: booking.siteContactName || '',
    sitePhone: booking.sitePhone || '',
    siteCoords: booking.siteCoords || '',
    destination: booking.destination || '',
    fuelLiters: booking.fuelLiters || 0,
    fuelRate: booking.fuelRate || 0,
    odometerBefore: booking.odometerBefore || 0,
  }
  if (!dispatchForm.value.fuelLiters && !dispatchForm.value.fuelRate) {
    const suggestion = suggestFuel(dispatchForm.value.driverName, booking.id, booking.district)
    if (suggestion) {
      dispatchForm.value.fuelLiters = suggestion.fuelLiters
      dispatchForm.value.fuelRate = suggestion.fuelRate
    }
  }
  if (!dispatchForm.value.odometerBefore && dispatchForm.value.plate) {
    const prevOdometer = latestOdometerForPlate(dispatchForm.value.plate, booking.id)
    if (prevOdometer) dispatchForm.value.odometerBefore = prevOdometer.odometerAfter || 0
  }
}

// กรอกช่องคนขับ หรือทะเบียนรถ แค่ช่องใดช่องหนึ่ง (หรือเปลี่ยนภายหลัง) ให้ดึงข้อมูลคู่กันจากที่ตั้งค่าไว้ในสมุดรายชื่อคนขับอัตโนมัติเสมอ
watch(
  () => dispatchForm.value.driverName,
  (name) => {
    if (!name) return
    const vehicle = driversStore.findVehicleByDriverName(name)
    if (vehicle) dispatchForm.value.plate = vehicle
    // เลือกคนขับแล้ว ถ้ายังไม่ได้กรอกน้ำมันเอง ลองดึงน้ำมันที่กรอกไว้แล้วของคนขับคนนี้วันนี้มาเติมให้ (กรอกครั้งเดียวใช้ได้หลายเที่ยว)
    if (!dispatchForm.value.fuelLiters && !dispatchForm.value.fuelRate && dispatchTarget.value) {
      const suggestion = suggestFuel(name, dispatchTarget.value.id, dispatchTarget.value.district)
      if (suggestion) {
        dispatchForm.value.fuelLiters = suggestion.fuelLiters
        dispatchForm.value.fuelRate = suggestion.fuelRate
      }
    }
  }
)
watch(
  () => dispatchForm.value.plate,
  (plate) => {
    if (!plate) return
    const driver = driversStore.findDriverByVehicle(plate)
    if (driver) dispatchForm.value.driverName = `${driver.firstName} ${driver.lastName}`
    // เลือกรถแล้ว ถ้ายังไม่ได้กรอกเลขไมล์เริ่มต้นเอง ดึงเลขไมล์สิ้นสุดของเที่ยวก่อนหน้าของรถคันนี้มาให้อัตโนมัติ
    if (!dispatchForm.value.odometerBefore && dispatchTarget.value) {
      const prevOdometer = latestOdometerForPlate(plate, dispatchTarget.value.id)
      if (prevOdometer) dispatchForm.value.odometerBefore = prevOdometer.odometerAfter || 0
    }
  }
)

const confirmDispatch = () => {
  if (!dispatchTarget.value || !dispatchForm.value.plate) return
  bookingStore.dispatchBooking(dispatchTarget.value.id, dispatchForm.value.plate, {
    driverName: dispatchForm.value.driverName || undefined,
    siteContactName: dispatchForm.value.siteContactName || undefined,
    sitePhone: dispatchForm.value.sitePhone || undefined,
    siteCoords: dispatchForm.value.siteCoords || undefined,
    destination: dispatchForm.value.destination || undefined,
    fuelLiters: dispatchForm.value.fuelLiters,
    fuelRate: dispatchForm.value.fuelRate,
    odometerBefore: dispatchForm.value.odometerBefore,
  })
  dispatchTarget.value = null
}

// --- Complete job flow ---
const completeTarget = ref<Booking | null>(null)
const debtAdjustments = ref<DebtAdjustment[]>([])
const completeOdometerAfter = ref(0)

const openCompleteDialog = (booking: Booking) => {
  completeTarget.value = booking
  debtAdjustments.value = []
  completeOdometerAfter.value = booking.odometerAfter || 0
}

const addAdjustmentRow = () => {
  debtAdjustments.value.push({ id: `adj${Date.now()}${debtAdjustments.value.length}`, label: '', amount: 0 })
}

const finalAllowance = computed(() => {
  if (!completeTarget.value) return 0
  const net = debtAdjustments.value.reduce((sum, d) => sum + (d.amount || 0), 0)
  return Math.round((completeTarget.value.allowance || 0) - net)
})

/** สรุประยะทาง/อัตราสิ้นเปลืองน้ำมัน/ชดเชยน้ำมัน เมื่อกรอกเลขไมล์สิ้นสุดแล้ว (เทียบกับน้ำมันที่กรอกไว้ตอนจัดรถ + ลิตรมาตรฐานของอำเภอ) */
const completeMileageSummary = computed(() => {
  const booking = completeTarget.value
  if (!booking || !completeOdometerAfter.value || !booking.odometerBefore) return null
  const distanceKm = completeOdometerAfter.value - booking.odometerBefore
  if (distanceKm <= 0) return null
  const cumulativeKm =
    bookingStore.bookings
      .filter((b) => b.plate === booking.plate && b.id !== booking.id && b.odometerBefore !== undefined && b.odometerAfter !== undefined)
      .reduce((sum, b) => sum + ((b.odometerAfter || 0) - (b.odometerBefore || 0)), 0) + distanceKm
  const avgKmPerLiter = booking.fuelLiters ? Math.round((distanceKm / booking.fuelLiters) * 100) / 100 : null
  const districtRate = fuelRateStore.findRateByDistrict(booking.district)
  const standardFuelLiters = districtRate ? districtRate.liters : null
  const fuelCompensation = standardFuelLiters !== null ? Math.round((standardFuelLiters - (booking.fuelLiters || 0)) * (booking.fuelRate || 0)) : null
  return { distanceKm, cumulativeKm, avgKmPerLiter, standardFuelLiters, fuelCompensation }
})

const confirmComplete = () => {
  if (!completeTarget.value) return
  bookingStore.completeJob(
    completeTarget.value.id,
    debtAdjustments.value.filter((d) => d.label || d.amount),
    completeOdometerAfter.value || undefined
  )
  completeTarget.value = null
}

// --- Edit booking แบบเต็ม (ใช้ฟอร์มเดียวกับตอนสร้างงาน) แก้ไขได้ทุกสถานะงาน ---
const editTarget = ref<Booking | null>(null)
const editForm = ref({
  po: '',
  shipDate: '',
  returnDate: '',
  siteName: '',
  district: '',
  shipmentNo: '',
  route: '',
  origin: '',
  destination: '',
  cementTypes: [] as string[],
  jobType: undefined as BookingJobType | undefined,
  weight: 0,
  qty: 0,
  ratePerTrip: 0,
  agreedPrice: 0,
  fuelLiters: 0,
  fuelRate: 0,
  allowance: 0,
  siteContactName: '',
  sitePhone: '',
  siteCoords: '',
})

const editComputedTripFee = computed(() => editForm.value.ratePerTrip || 0)
const editFuelCost = computed(() => (editForm.value.fuelLiters || 0) * (editForm.value.fuelRate || 0))
const editCalculatedAllowance = computed(() => Math.round(editComputedTripFee.value * 0.99 * 0.62 - editFuelCost.value))
const editDisplayedAllowance = computed(() => (isCements.value ? editForm.value.allowance || 0 : editCalculatedAllowance.value))

const toDateInput = (d?: Date) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const openEditBooking = (booking: Booking) => {
  editTarget.value = booking
  editForm.value = {
    po: booking.po || '',
    shipDate: toDateInput(booking.shipDate),
    returnDate: toDateInput(booking.returnDate),
    siteName: booking.siteName,
    district: booking.district,
    shipmentNo: booking.shipmentNo || '',
    route: booking.route || '',
    origin: booking.origin || '',
    destination: booking.destination || '',
    cementTypes: [...(booking.cementTypes || [])].filter(Boolean),
    jobType: booking.jobType,
    weight: booking.weight || 0,
    qty: booking.qty || 0,
    ratePerTrip: booking.tripFee,
    agreedPrice: booking.agreedPrice,
    fuelLiters: booking.fuelLiters || 0,
    fuelRate: booking.fuelRate || 0,
    allowance: booking.allowance || 0,
    siteContactName: booking.siteContactName || '',
    sitePhone: booking.sitePhone || '',
    siteCoords: booking.siteCoords || '',
  }
  editProductDraft.value = ''
}

const editProductDraft = ref('')
const addProductToEdit = () => {
  const val = editProductDraft.value.trim()
  if (!val) return
  editForm.value.cementTypes.push(val)
  editProductDraft.value = ''
}
const removeProductFromEdit = (idx: number) => {
  editForm.value.cementTypes.splice(idx, 1)
}

const confirmEditBooking = () => {
  if (!editTarget.value) return
  const f = editForm.value
  bookingStore.updateBookingFull(editTarget.value.id, {
    po: f.po || undefined,
    shipDate: f.shipDate ? new Date(f.shipDate) : undefined,
    returnDate: f.returnDate ? new Date(f.returnDate) : undefined,
    siteName: f.siteName,
    district: f.district,
    shipmentNo: f.shipmentNo || undefined,
    route: f.route || undefined,
    origin: f.origin || undefined,
    destination: f.destination || undefined,
    cementTypes: f.cementTypes.filter(Boolean),
    jobType: isCements.value ? f.jobType : undefined,
    weight: f.weight || undefined,
    qty: f.qty || undefined,
    tripFee: editComputedTripFee.value,
    agreedPrice: f.agreedPrice || editComputedTripFee.value,
    allowance: editDisplayedAllowance.value,
    fuelLiters: f.fuelLiters,
    fuelRate: f.fuelRate,
    siteContactName: f.siteContactName || undefined,
    sitePhone: f.sitePhone || undefined,
    siteCoords: f.siteCoords || undefined,
  })
  editTarget.value = null
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
