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
              <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
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
              <td class="px-4 py-3 font-semibold text-text">
                {{ destinationLabel(booking) }}
                <span class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-2 text-muted">{{ booking.items.length }} เที่ยว</span>
                <span
                  v-if="booking.status === 'IN_TRANSIT' || booking.status === 'DELIVERING'"
                  class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                >
                  ส่งแล้ว {{ deliveredItemCount(booking) }}/{{ booking.items.length }}
                </span>
              </td>
              <td class="px-4 py-3 text-text">{{ productLabel(booking) }}</td>
              <td class="px-4 py-3 text-right text-text">{{ weightQtyLabel(booking) }}</td>
              <td class="px-4 py-3 text-text">
                <div class="font-semibold">{{ booking.plate || '-' }}</div>
                <div class="text-xs text-muted flex items-center gap-1">
                  {{ booking.driverName || '-' }}
                </div>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.createdAt) }}</td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.shipDate) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                  <span v-if="booking.status === 'ASSIGNED'" class="text-[11px] text-muted">
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
                  <button @click="openEditBooking(booking)" class="btn-sm">
                    <span class="material-symbols-rounded text-base">edit</span>
                    แก้ไข
                  </button>
                  <button v-if="booking.status === 'WAITING_DISPATCH'" @click="openDispatchDialog(booking)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">local_shipping</span>
                    กรอกทะเบียน / ส่งงาน
                  </button>
                  <button v-else-if="booking.status === 'ASSIGNED'" @click="openDispatchDialog(booking)" class="btn-sm text-amber-700">
                    <span class="material-symbols-rounded text-base">sync_alt</span>
                    เปลี่ยนคนขับ/รถ
                  </button>
                  <button v-else-if="booking.status === 'LOADED'" @click="bookingStore.startTransit(booking.id)" class="btn-sm text-indigo-700">
                    <span class="material-symbols-rounded text-base">directions</span>
                    เริ่มขนส่ง
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="inProgressBookings.length === 0">
              <td colspan="11" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
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
              <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
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
              <td class="px-4 py-3 font-semibold text-text">
                {{ destinationLabel(booking) }}
                <span class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-2 text-muted">{{ booking.items.length }} เที่ยว</span>
                <span
                  v-if="booking.status === 'IN_TRANSIT' || booking.status === 'DELIVERING'"
                  class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                >
                  ส่งแล้ว {{ deliveredItemCount(booking) }}/{{ booking.items.length }}
                </span>
              </td>
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
              <td colspan="11" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
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
                <div class="text-xs text-muted">เลขที่เอกสารจะออกให้อัตโนมัติ 1 เลขต่องาน (เพิ่มปลายทาง/สินค้าได้หลายรายการในงานเดียวกัน)</div>
              </div>
            </div>
            <button @click="closeDialog" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>

          <div class="px-6 py-6 space-y-6">
            <!-- Header Info (ใช้ร่วมกันทุกปลายทาง/สินค้าในเอกสารนี้) -->
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
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้น</label>
                  <input v-model="header.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เส้นทาง</label>
                  <input v-model="header.route" placeholder="เช่น กรุงเทพ-นครสวรรค์-เชียงใหม่" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
                  <input v-model="header.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว (บาท) <span class="font-normal text-[10px]">(รวมทั้งเที่ยว)</span></label>
                  <input v-model.number="header.tripFee" type="number" placeholder="0" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">
                    ราคาที่ตกลงกับลูกค้า (บาท)
                    <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยว)</span>
                  </label>
                  <input v-model.number="header.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบี้ยเลี้ยงคนขับ</label>
                  <input
                    v-if="isCements"
                    v-model.number="header.allowance"
                    type="number"
                    placeholder="0"
                    class="input-field w-full"
                  />
                  <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">
                    {{ formatBaht(headerCalculatedAllowance) }} (อัตโนมัติ)
                  </div>
                </div>
              </div>
            </div>

            <!-- Item Draft Sub-form: 1 แถว = 1 ปลายทาง + 1 สินค้า กรอกครบในฟอร์มเดียวแล้วยืนยันเพิ่มทีละรายการ -->
            <div class="border border-border rounded-xl p-4 bg-surface-2">
              <h3 class="font-semibold text-text mb-1">เพิ่มรายการสินค้า</h3>
              <div class="text-xs text-muted mb-3">
                รายการที่เพิ่มทั้งหมดจะรวมอยู่ในงาน/เลขที่เอกสารเดียวกัน (1 งาน = 1 เที่ยวรถ) เพิ่มได้หลายรายการ (หลายปลายทาง/หลายสินค้า) ในงานเดียวกัน
              </div>

              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted bg-surface rounded-lg px-3 py-2 border border-border mb-3">
                <div>รหัสลูกค้า: <span class="font-semibold text-text">{{ customerCodeForHeader || '-' }}</span></div>
                <div>ใบสั่งงาน (PO): <span class="font-semibold text-text">{{ header.po || '-' }}</span></div>
                <div>วันที่ขน: <span class="font-semibold text-text">{{ header.shipDate || '-' }}</span></div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
                  <input v-model="itemDraft.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">จังหวัด</label>
                  <input v-model="itemDraft.province" list="itemProvinceOptions" placeholder="จังหวัด" class="input-field w-full" />
                  <datalist id="itemProvinceOptions">
                    <option v-for="p in fuelRateStore.provincesList" :key="p" :value="p" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">
                    อำเภอ
                    <span v-if="itemDraftStandardLiters !== null" class="font-normal text-[10px]">(ลิตรมาตรฐาน: {{ itemDraftStandardLiters }} ล.)</span>
                  </label>
                  <input v-model="itemDraft.district" list="itemDistrictOptions" placeholder="อำเภอ" class="input-field w-full" />
                  <datalist id="itemDistrictOptions">
                    <option v-for="d in fuelRateStore.districtsForProvince(itemDraft.province)" :key="d" :value="d" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง/จุดรับสินค้า (ไม่บังคับ)</label>
                  <input v-model="itemDraft.pickupOriginName" list="itemOriginOptions" placeholder="ว่าง = ใช้ต้นทางของงาน" class="input-field w-full" />
                  <datalist id="itemOriginOptions">
                    <option v-for="n in originsStore.originNames" :key="n" :value="n" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน (ไม่บังคับ)</label>
                  <input v-model="itemDraft.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน (ไม่บังคับ)</label>
                  <input v-model="itemDraft.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-muted mb-1">พิกัด/ลิงก์ Google Maps หน้างาน (ไม่บังคับ)</label>
                  <input v-model="itemDraft.gpsInput" placeholder="วางลิงก์ Google Maps หรือพิกัด lat,lng" class="input-field w-full" />
                  <div v-if="itemDraftGps.latitude !== undefined" class="text-[11px] text-muted mt-1">
                    พิกัด: {{ itemDraftGps.latitude }}, {{ itemDraftGps.longitude }}
                  </div>
                  <div v-else-if="itemDraft.gpsInput" class="text-[11px] text-muted mt-1">
                    ไม่สามารถอ่านพิกัดจากข้อความนี้ได้ ใช้เป็นลิงก์อ้างอิงแทน
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">สินค้า</label>
                  <input v-model="itemDraft.product" list="productNameOptions" placeholder="พิมพ์หรือเลือกชื่อสินค้า" class="input-field w-full" />
                  <datalist id="productNameOptions">
                    <option v-for="p in productOptionsForFleet" :key="p.id" :value="p.name" />
                  </datalist>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ปริมาณ</label>
                    <input v-model.number="itemDraft.qty" type="number" placeholder="0" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">หน่วย <span class="font-normal text-[10px]">(จากสินค้า)</span></label>
                    <input :value="itemDraft.unit || '-'" disabled class="input-field w-full opacity-70" />
                  </div>
                </div>
                <template v-if="isCements">
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">ประเภทงาน</label>
                    <div class="flex gap-2 flex-wrap">
                      <button
                        v-for="jt in jobTypeOptions"
                        :key="jt"
                        type="button"
                        @click="itemDraft.jobType = jt"
                        :class="[
                          'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                          itemDraft.jobType === jt ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                        ]"
                      >
                        {{ jt }}
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <div class="flex items-center justify-end mt-4 pt-4 border-t border-border">
                <button @click="confirmAddItem" :disabled="!canAddItem" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  <span class="material-symbols-rounded text-base">playlist_add</span>
                  ยืนยันเพิ่มรายการสินค้า
                </button>
              </div>
            </div>

            <!-- Line Items Staging Table: 1 แถว = 1 ปลายทาง + 1 สินค้า -->
            <div>
              <h3 class="font-semibold text-text mb-3">รายการในงานนี้ ({{ lineItems.length }} รายการ)</h3>
              <div v-if="lineItems.length === 0" class="border border-border rounded-lg px-4 py-6 text-center text-muted text-sm">
                ยังไม่มีรายการ กรอกฟอร์มด้านบนแล้วกดยืนยันเพิ่มรายการสินค้า
              </div>
              <div v-else class="overflow-x-auto border border-border rounded-lg">
                <table class="w-full text-sm">
                  <thead class="bg-surface-2 border-b border-border">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ชื่อหน้างาน</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">อำเภอ</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ต้นทาง</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">สินค้า</th>
                      <th class="text-right px-3 py-2 font-semibold text-muted">ปริมาณ</th>
                      <th class="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(li, idx) in lineItems" :key="li.id" class="border-b border-border last:border-0">
                      <td class="px-3 py-2 font-semibold text-text">{{ li.siteName }} <span class="text-muted font-normal">({{ li.province }})</span></td>
                      <td class="px-3 py-2 text-muted">{{ li.district }}</td>
                      <td class="px-3 py-2 text-muted">{{ li.pickupOriginName || '-' }}</td>
                      <td class="px-3 py-2 text-text">{{ li.product }} <span v-if="li.jobType" class="text-muted">({{ li.jobType }})</span></td>
                      <td class="px-3 py-2 text-right text-text">{{ li.qty }} {{ li.unit }}</td>
                      <td class="px-3 py-2 text-right">
                        <button @click="removeLineItem(idx)" class="text-red-500 hover:text-red-700">
                          <span class="material-symbols-rounded text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="lineItems.length" class="text-sm text-text mt-3">
                ค่าเที่ยวของงานนี้ (1 เที่ยว): <span class="font-bold">{{ formatBaht(header.tripFee) }}</span>
                <span class="ml-3 text-muted text-xs">น้ำมันมาตรฐานรวม: {{ computedFuel }} ล.</span>
              </div>
            </div>
          </div>

          <!-- Dialog Footer -->
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border bg-surface sticky bottom-0">
            <button @click="closeDialog" class="btn-secondary">ยกเลิก</button>
            <button @click="saveAllItems" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">save</span>
              บันทึกงาน (1 เที่ยว, {{ lineItems.length }} รายการ)
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Dispatch Dialog -->
    <Teleport to="body" v-if="dispatchTarget">
      <div @click="dispatchTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">
              {{ dispatchTarget.status === 'ASSIGNED' ? 'เปลี่ยนคนขับ/รถ' : 'ส่งงาน' }} {{ dispatchTarget.docNo }}
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
            <div class="bg-surface-2 rounded-lg p-3 text-sm">
              <div class="text-xs font-semibold text-muted mb-1">น้ำมัน (คำนวณไว้ตั้งแต่ตอนสร้างงาน)</div>
              <div class="font-bold text-text">
                ต้องรับน้ำมันทั้งหมด {{ dispatchTarget?.fuelLiters || 0 }} ลิตร
                <span class="text-xs font-normal text-muted">(เรท {{ formatBaht(dispatchTarget?.fuelRate || 0) }}/ล.)</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                เลขไมล์เริ่มต้น (กม.)
                <span class="text-[10px] font-normal text-muted">(ดึงจากเลขไมล์สิ้นสุดเที่ยวก่อนของรถคันนี้ให้อัตโนมัติ)</span>
              </label>
              <input v-model.number="dispatchForm.odometerBefore" type="number" placeholder="0" class="input-field w-full" />
            </div>

            <div class="text-xs font-semibold text-muted pt-2 border-t border-border">
              รายการในงานนี้ ({{ dispatchTarget?.items.length || 0 }} รายการ)
            </div>
            <div v-if="dispatchTarget" class="space-y-2">
              <div
                v-for="(li, idx) in dispatchTarget.items"
                :key="li.id"
                class="border border-border rounded-lg p-3 text-sm"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="font-semibold text-text">{{ idx + 1 }}. {{ li.siteName }} <span class="text-muted font-normal">({{ li.province }} · {{ li.district }})</span></div>
                    <div class="text-xs text-muted mt-0.5">{{ li.product }} · {{ li.qty }} {{ li.unit }}</div>
                    <div v-if="li.siteContactName || li.sitePhone" class="text-xs text-muted">
                      {{ li.siteContactName || '-' }} {{ li.sitePhone ? '· ' + li.sitePhone : '' }}
                    </div>
                    <div class="text-xs text-muted">
                      น้ำมันมาตรฐาน: {{ fuelRateStore.findRate(li.province, li.district)?.liters ?? '-' }} ล.
                    </div>
                  </div>
                  <button @click="removeDispatchItem(idx)" class="text-red-500 hover:text-red-700 flex-shrink-0">
                    <span class="material-symbols-rounded text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>

            <button v-if="!showAddDispatchItem" type="button" @click="showAddDispatchItem = true" class="btn-secondary w-full justify-center">
              <span class="material-symbols-rounded text-base">add_location_alt</span>
              เพิ่มรายการ
            </button>
            <div v-else class="border border-border rounded-lg p-3 space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <input v-model="dispatchItemDraft.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
                <div>
                  <input v-model="dispatchItemDraft.province" list="dispatchProvinceOptions" placeholder="จังหวัด" class="input-field w-full" />
                  <datalist id="dispatchProvinceOptions">
                    <option v-for="p in fuelRateStore.provincesList" :key="p" :value="p" />
                  </datalist>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <input v-model="dispatchItemDraft.district" list="dispatchDistrictOptions" placeholder="อำเภอ" class="input-field w-full" />
                  <datalist id="dispatchDistrictOptions">
                    <option v-for="d in fuelRateStore.districtsForProvince(dispatchItemDraft.province)" :key="d" :value="d" />
                  </datalist>
                </div>
                <div class="text-xs text-muted flex items-center">
                  ลิตรมาตรฐาน: {{ dispatchItemStandardLiters }} ล.
                </div>
              </div>
              <div>
                <input v-model="dispatchItemDraft.pickupOriginName" list="dispatchOriginOptions" placeholder="ต้นทาง/จุดรับสินค้า (ไม่บังคับ)" class="input-field w-full" />
                <datalist id="dispatchOriginOptions">
                  <option v-for="n in originsStore.originNames" :key="n" :value="n" />
                </datalist>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input v-model="dispatchItemDraft.siteContactName" placeholder="ชื่อผู้ติดต่อ (ไม่บังคับ)" class="input-field w-full" />
                <input v-model="dispatchItemDraft.sitePhone" placeholder="เบอร์โทร (ไม่บังคับ)" class="input-field w-full" />
              </div>
              <div>
                <input v-model="dispatchItemDraft.gpsInput" placeholder="พิกัด/ลิงก์ Google Maps (ไม่บังคับ)" class="input-field w-full" />
                <div v-if="dispatchItemGps.latitude !== undefined" class="text-[11px] text-muted mt-1">
                  พิกัด: {{ dispatchItemGps.latitude }}, {{ dispatchItemGps.longitude }}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 border-t border-border pt-2 mt-2">
                <input v-model="dispatchItemDraft.product" list="dispatchProductNameOptions" placeholder="สินค้า" class="input-field w-full" />
                <input v-model.number="dispatchItemDraft.qty" type="number" placeholder="ปริมาณ" class="input-field w-full" />
              </div>
              <datalist id="dispatchProductNameOptions">
                <option v-for="p in productOptionsForFleet" :key="p.id" :value="p.name" />
              </datalist>
              <template v-if="isCements">
                <div class="flex gap-1 flex-wrap mt-2">
                  <button
                    v-for="jt in jobTypeOptions"
                    :key="jt"
                    type="button"
                    @click="dispatchItemDraft.jobType = jt"
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded-lg transition-all',
                      dispatchItemDraft.jobType === jt ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                    ]"
                  >
                    {{ jt }}
                  </button>
                </div>
              </template>

              <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="showAddDispatchItem = false" class="btn-secondary">ยกเลิก</button>
                <button type="button" @click="confirmAddDispatchItem" :disabled="!canAddDispatchItem" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  เพิ่ม
                </button>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button @click="dispatchTarget = null" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmDispatch" :disabled="!dispatchForm.plate" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">send</span>
              {{ dispatchTarget?.status === 'ASSIGNED' ? 'ยืนยันเปลี่ยนคนขับ/รถ' : 'ส่งงาน' }}
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

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เลขชิพเม้น</label>
                <input v-model="editForm.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เส้นทาง</label>
                <input v-model="editForm.route" placeholder="เช่น กรุงเทพ-นครสวรรค์-เชียงใหม่" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง</label>
                <input v-model="editForm.origin" placeholder="จุดขึ้นสินค้า" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">ค่าเที่ยว (บาท) <span class="font-normal text-[10px]">(รวมทั้งเที่ยว)</span></label>
                <input v-model.number="editForm.tripFee" type="number" placeholder="0" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">
                  ราคาที่ตกลงกับลูกค้า (บาท)
                  <span class="text-[10px] font-normal text-muted">(ว่างไว้ = ใช้ค่าเที่ยว)</span>
                </label>
                <input v-model.number="editForm.agreedPrice" type="number" placeholder="auto" class="input-field w-full" />
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
                <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">
                  {{ formatBaht(editCalculatedAllowance) }} (อัตโนมัติ)
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">น้ำมัน (ลิตร)</label>
                <input v-model.number="editForm.fuelLiters" type="number" placeholder="0" class="input-field w-full" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted mb-1">เรทน้ำมัน (บาท/ลิตร)</label>
                <input v-model.number="editForm.fuelRate" type="number" placeholder="0" class="input-field w-full" />
              </div>
            </div>

            <!-- รายการสินค้า/ปลายทางในงานนี้ -->
            <div>
              <h3 class="font-semibold text-text mb-3">รายการในงานนี้ ({{ editLineItems.length }} รายการ)</h3>
              <div v-if="editLineItems.length === 0" class="border border-border rounded-lg px-4 py-6 text-center text-muted text-sm mb-3">
                ยังไม่มีรายการ กรอกฟอร์มด้านล่างแล้วกดยืนยันเพิ่มรายการสินค้า
              </div>
              <div v-else class="overflow-x-auto border border-border rounded-lg mb-3">
                <table class="w-full text-sm">
                  <thead class="bg-surface-2 border-b border-border">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ชื่อหน้างาน</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">อำเภอ</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">ต้นทาง</th>
                      <th class="text-left px-3 py-2 font-semibold text-muted">สินค้า</th>
                      <th class="text-right px-3 py-2 font-semibold text-muted">ปริมาณ</th>
                      <th class="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(li, idx) in editLineItems" :key="li.id" class="border-b border-border last:border-0">
                      <td class="px-3 py-2 font-semibold text-text">{{ li.siteName }} <span class="text-muted font-normal">({{ li.province }})</span></td>
                      <td class="px-3 py-2 text-muted">{{ li.district }}</td>
                      <td class="px-3 py-2 text-muted">{{ li.pickupOriginName || '-' }}</td>
                      <td class="px-3 py-2 text-text">{{ li.product }} <span v-if="li.jobType" class="text-muted">({{ li.jobType }})</span></td>
                      <td class="px-3 py-2 text-right text-text">{{ li.qty }} {{ li.unit }}</td>
                      <td class="px-3 py-2 text-right">
                        <button @click="removeEditLineItem(idx)" class="text-red-500 hover:text-red-700">
                          <span class="material-symbols-rounded text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="border border-border rounded-xl p-4 bg-surface-2">
                <h4 class="font-semibold text-text mb-1 text-sm">เพิ่มรายการสินค้า</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">สถานที่ส่งสินค้า (ชื่อหน้างาน)</label>
                    <input v-model="editItemDraft.siteName" placeholder="ชื่อหน้างาน" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">จังหวัด</label>
                    <input v-model="editItemDraft.province" list="editProvinceOptions" placeholder="จังหวัด" class="input-field w-full" />
                    <datalist id="editProvinceOptions">
                      <option v-for="p in fuelRateStore.provincesList" :key="p" :value="p" />
                    </datalist>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">
                      อำเภอ
                      <span v-if="editItemDraftStandardLiters !== null" class="font-normal text-[10px]">(ลิตรมาตรฐาน: {{ editItemDraftStandardLiters }} ล.)</span>
                    </label>
                    <input v-model="editItemDraft.district" list="editDistrictOptions" placeholder="อำเภอ" class="input-field w-full" />
                    <datalist id="editDistrictOptions">
                      <option v-for="d in fuelRateStore.districtsForProvince(editItemDraft.province)" :key="d" :value="d" />
                    </datalist>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ต้นทาง/จุดรับสินค้า (ไม่บังคับ)</label>
                    <input v-model="editItemDraft.pickupOriginName" list="editOriginOptions" placeholder="ว่าง = ใช้ต้นทางของงาน" class="input-field w-full" />
                    <datalist id="editOriginOptions">
                      <option v-for="n in originsStore.originNames" :key="n" :value="n" />
                    </datalist>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">ชื่อผู้ติดต่อหน้างาน (ไม่บังคับ)</label>
                    <input v-model="editItemDraft.siteContactName" placeholder="ชื่อผู้ติดต่อ" class="input-field w-full" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">เบอร์โทรหน้างาน (ไม่บังคับ)</label>
                    <input v-model="editItemDraft.sitePhone" placeholder="เบอร์โทร" class="input-field w-full" />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-xs font-semibold text-muted mb-1">พิกัด/ลิงก์ Google Maps หน้างาน (ไม่บังคับ)</label>
                    <input v-model="editItemDraft.gpsInput" placeholder="วางลิงก์ Google Maps หรือพิกัด lat,lng" class="input-field w-full" />
                    <div v-if="editItemDraftGps.latitude !== undefined" class="text-[11px] text-muted mt-1">
                      พิกัด: {{ editItemDraftGps.latitude }}, {{ editItemDraftGps.longitude }}
                    </div>
                    <div v-else-if="editItemDraft.gpsInput" class="text-[11px] text-muted mt-1">
                      ไม่สามารถอ่านพิกัดจากข้อความนี้ได้ ใช้เป็นลิงก์อ้างอิงแทน
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <label class="block text-xs font-semibold text-muted mb-1">สินค้า</label>
                    <input v-model="editItemDraft.product" list="editProductNameOptions" placeholder="พิมพ์หรือเลือกชื่อสินค้า" class="input-field w-full" />
                    <datalist id="editProductNameOptions">
                      <option v-for="p in productOptionsForFleet" :key="p.id" :value="p.name" />
                    </datalist>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-xs font-semibold text-muted mb-1">ปริมาณ</label>
                      <input v-model.number="editItemDraft.qty" type="number" placeholder="0" class="input-field w-full" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-muted mb-1">หน่วย <span class="font-normal text-[10px]">(จากสินค้า)</span></label>
                      <input :value="editItemDraft.unit || '-'" disabled class="input-field w-full opacity-70" />
                    </div>
                  </div>
                  <template v-if="isCements">
                    <div class="md:col-span-2">
                      <label class="block text-xs font-semibold text-muted mb-1">ประเภทงาน</label>
                      <div class="flex gap-2 flex-wrap">
                        <button
                          v-for="jt in jobTypeOptions"
                          :key="jt"
                          type="button"
                          @click="editItemDraft.jobType = jt"
                          :class="[
                            'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                            editItemDraft.jobType === jt ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                          ]"
                        >
                          {{ jt }}
                        </button>
                      </div>
                    </div>
                  </template>
                </div>

                <div class="flex justify-end mt-4 pt-4 border-t border-border">
                  <button @click="confirmAddEditItem" :disabled="!canAddEditItem" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                    <span class="material-symbols-rounded text-base">playlist_add</span>
                    ยืนยันเพิ่มรายการสินค้า
                  </button>
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
import { useOriginsStore } from '@/stores/origins'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, DebtAdjustment, JobItem } from '@/types'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import { parseGpsInput } from '@/utils/gps'

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const bookingStore = useBookingStore()
const driversStore = useDriversStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const originsStore = useOriginsStore()
const fixedCustomer = bookingStore.fixedCustomer

const showDialog = ref(false)
const searchQuery = ref('')

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))
const customerCodeForHeader = computed(() => customerStore.lookupCustomer(header.value.customer).code)
const vehicleOptions = computed(() => driversStore.drivers.map((d) => d.vehicle).filter(Boolean))
const nextReleaseNoPreview = computed(() => bookingStore.nextReleaseNo())

const jobTypeOptions: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

// --- นาฬิกาสำหรับนับถอยหลังเวลาที่เหลือให้คนขับตอบรับงาน (ASSIGNED) ---
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

const ACTIVE_STATUSES: BookingStatus[] = ['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'DELIVERING']

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

const statusRank: Record<BookingStatus, number> = {
  WAITING_DISPATCH: 0,
  ASSIGNED: 1,
  ACCEPTED: 2,
  FUEL_RECEIVED: 3,
  LOADING: 4,
  LOADED: 5,
  IN_TRANSIT: 6,
  DELIVERING: 7,
  DELIVERED: 8,
}

// --- แยกตาราง: งานที่กำลังดำเนินการ (ยังไม่ออกเดินทาง) กับงานที่กำลังขนส่ง/ส่งของ ---
const fleetBookings = computed(() => bookingStore.bookings.filter((b) => b.category === props.fleet))

const matchesSearch = (b: Booking, q: string) =>
  b.docNo.toLowerCase().includes(q) ||
  (b.po || '').toLowerCase().includes(q) ||
  b.customer.toLowerCase().includes(q) ||
  b.items.some((i) => i.siteName.toLowerCase().includes(q)) ||
  (b.plate || '').toLowerCase().includes(q)

const inProgressBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter(
      (b) =>
        b.status !== 'DELIVERED' &&
        b.status !== 'IN_TRANSIT' &&
        b.status !== 'DELIVERING' &&
        matchesDateFilter(b) &&
        (!q || matchesSearch(b, q))
    )
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status]
      if (rankDiff !== 0) return rankDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

// งานที่คนขับกำลังขนส่ง/กำลังส่งของอยู่ (เดิมเคยรวมอยู่ในตารางเดียวกับ "กำลังดำเนินการ" แยกออกมาให้เห็นชัดว่ากำลังวิ่งอยู่)
const inTransitBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter((b) => (b.status === 'IN_TRANSIT' || b.status === 'DELIVERING') && matchesDateFilter(b) && (!q || matchesSearch(b, q)))
    .sort((a, b) => new Date(b.transitStartedAt || 0).getTime() - new Date(a.transitStartedAt || 0).getTime())
})

// --- Header info: ใช้ร่วมกันทุกปลายทาง/สินค้าในงานนี้ (1 งาน = 1 เที่ยวรถ = 1 ค่าเที่ยว) ---
const defaultHeader = () => ({
  po: '',
  shipDate: new Date().toISOString().slice(0, 10),
  jobDate: new Date().toISOString().slice(0, 10),
  returnDate: '',
  customer: isCements.value ? '' : fixedCustomer,
  plate: '',
  driverName: '',
  shipmentNo: '',
  route: '',
  origin: '',
  tripFee: 0,
  agreedPrice: 0,
  allowance: 0,
})
const header = ref(defaultHeader())

const headerCalculatedAllowance = computed(() =>
  Math.round((header.value.tripFee || 0) * 0.99 * 0.62 - computedFuel.value * fuelRateStore.settings.todayPricePerLiter)
)

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
    if (!itemDraft.value.siteContactName) itemDraft.value.siteContactName = customer.contact || ''
    if (!itemDraft.value.sitePhone) itemDraft.value.sitePhone = customer.phone || ''
  }
)

// --- Item draft (create dialog): 1 แถว = 1 ปลายทาง + 1 สินค้า กรอกครบในฟอร์มเดียวแล้วยืนยันเพิ่มทีละรายการลงตาราง ---
const defaultItemDraft = () => ({
  siteName: '',
  province: '',
  district: '',
  siteContactName: '',
  sitePhone: '',
  gpsInput: '',
  pickupOriginName: '',
  product: '',
  qty: 0,
  unit: '',
  jobType: undefined as BookingJobType | undefined,
})

const itemDraft = ref(defaultItemDraft())

const itemDraftStandardLiters = computed(
  () => fuelRateStore.findRate(itemDraft.value.province, itemDraft.value.district)?.liters ?? null
)
const itemDraftGps = computed(() => parseGpsInput(itemDraft.value.gpsInput))

// เลือกสินค้าปุ๊บ ดึงหน่วยนับจากสินค้าที่ตั้งค่าไว้มาให้อัตโนมัติเสมอ ไม่ให้พิมพ์หน่วยเอง กันตัดสต๊อกผิดหน่วย
watch(
  () => itemDraft.value.product,
  (name) => {
    const match = inventoryStore.products.find((p) => p.name === name)
    itemDraft.value.unit = match?.unit || ''
  }
)

// พิมพ์ชื่อหน้างานที่เคยส่งของให้ลูกค้าคนนี้มาก่อน -> ดึงผู้ติดต่อ/เบอร์โทร/พิกัดหน้างานจากรายการล่าสุดที่ตรงกันมาให้อัตโนมัติ (แม่นกว่าข้อมูลลูกค้าทั่วไป)
// override เฉพาะช่องที่ยังว่าง หรือยังเป็นค่า default ที่ดึงมาจากสมุดรายชื่อลูกค้าตอนเลือกลูกค้า (ไม่ทับค่าที่ผู้ใช้พิมพ์เองไว้แล้ว)
watch(
  () => itemDraft.value.siteName,
  (name) => {
    if (!name) return
    const customer = customerStore.lookupCustomer(header.value.customer)
    const match = bookingStore.bookings
      .filter((b) => b.customer === header.value.customer)
      .flatMap((b) => b.items.map((i) => ({ ...i, createdAt: b.createdAt })))
      .filter((i) => i.siteName.trim().toLowerCase() === name.trim().toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    if (match) {
      if (!itemDraft.value.siteContactName || itemDraft.value.siteContactName === customer.contact) {
        itemDraft.value.siteContactName = match.siteContactName || itemDraft.value.siteContactName
      }
      if (!itemDraft.value.sitePhone || itemDraft.value.sitePhone === customer.phone) {
        itemDraft.value.sitePhone = match.sitePhone || itemDraft.value.sitePhone
      }
      if (!itemDraft.value.gpsInput) itemDraft.value.gpsInput = match.mapUrl || ''
      return
    }
    if (!itemDraft.value.siteContactName) itemDraft.value.siteContactName = customer.contact || ''
    if (!itemDraft.value.sitePhone) itemDraft.value.sitePhone = customer.phone || ''
  }
)

const canAddItem = computed(
  () =>
    !!itemDraft.value.siteName &&
    !!itemDraft.value.province &&
    !!itemDraft.value.district &&
    !!itemDraft.value.product &&
    itemDraft.value.qty > 0
)

const lineItems = ref<JobItem[]>([])

const confirmAddItem = () => {
  if (!canAddItem.value) return
  const d = itemDraft.value
  const gps = parseGpsInput(d.gpsInput)
  lineItems.value.push({
    id: `item${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    siteName: d.siteName,
    province: d.province,
    district: d.district,
    siteContactName: d.siteContactName || undefined,
    sitePhone: d.sitePhone || undefined,
    latitude: gps.latitude,
    longitude: gps.longitude,
    mapUrl: d.gpsInput || undefined,
    pickupOriginName: d.pickupOriginName || undefined,
    product: d.product,
    qty: d.qty,
    unit: d.unit,
    jobType: isCements.value ? d.jobType : undefined,
  })
  itemDraft.value = defaultItemDraft()
}

const removeLineItem = (idx: number) => {
  lineItems.value.splice(idx, 1)
}

/** รวมลิตรน้ำมันมาตรฐานของทุกรายการในงานนี้ (นับต่อรายการ ไม่ใช่ต่อปลายทาง — สินค้าคนละชนิดที่ปลายทางเดียวกันจึงนับซ้ำได้) */
const computedFuel = computed(() =>
  lineItems.value.reduce((sum, i) => sum + (fuelRateStore.findRate(i.province, i.district)?.liters || 0), 0)
)

const canSave = computed(() => !!header.value.customer && lineItems.value.length > 0 && header.value.tripFee > 0)

const productLabel = (booking: Booking) => {
  const names = [...new Set(booking.items.map((i) => i.product).filter(Boolean))]
  return names.length ? names.join(', ') : '-'
}

const destinationLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const weightQtyLabel = (booking: Booking) => booking.items.map((i) => `${i.qty} ${i.unit}`).join(', ') || '-'

const deliveredItemCount = (booking: Booking) => booking.items.filter((i) => i.deliveryStatus === 'DELIVERED').length

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

const openDialog = () => {
  header.value = defaultHeader()
  itemDraft.value = defaultItemDraft()
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
  bookingStore.addBooking({
    category: props.fleet,
    docNo: bookingStore.nextDocNo(props.fleet),
    releaseNo: bookingStore.nextReleaseNo(),
    po: header.value.po || undefined,
    shipDate,
    returnDate,
    createdAt,
    shipmentNo: header.value.shipmentNo || undefined,
    route: header.value.route || undefined,
    origin: header.value.origin || undefined,
    customer: header.value.customer,
    items: lineItems.value,
    allowance: isCements.value ? header.value.allowance || 0 : headerCalculatedAllowance.value,
    tripFee: header.value.tripFee,
    agreedPrice: header.value.agreedPrice || header.value.tripFee,
    fuelLiters: computedFuel.value,
    fuelRate: fuelRateStore.settings.todayPricePerLiter,
    plate: header.value.plate || '',
    driverName: header.value.driverName || undefined,
  })
  closeDialog()
}

// --- Dispatch flow ---
const dispatchTarget = ref<Booking | null>(null)
const dispatchForm = ref({
  plate: '',
  driverName: '',
  odometerBefore: 0,
})

/** เลขไมล์สิ้นสุดล่าสุดของรถคันนี้ (จากเที่ยวก่อนหน้าที่จบงานแล้ว) เอาไว้ตั้งเป็นเลขไมล์เริ่มต้นของเที่ยวใหม่ให้อัตโนมัติ */
const latestOdometerForPlate = (plate: string, excludeId: string) =>
  bookingStore.bookings
    .filter((b) => b.plate === plate && b.id !== excludeId && b.odometerAfter !== undefined)
    .sort((a, b) => new Date(b.completedAt || b.dispatchedAt || 0).getTime() - new Date(a.completedAt || a.dispatchedAt || 0).getTime())[0]

const showAddDispatchItem = ref(false)
const defaultDispatchItemDraft = () => ({
  siteName: '',
  province: '',
  district: '',
  siteContactName: '',
  sitePhone: '',
  gpsInput: '',
  pickupOriginName: '',
  product: '',
  qty: 0,
  unit: '',
  jobType: undefined as BookingJobType | undefined,
})
const dispatchItemDraft = ref(defaultDispatchItemDraft())

const dispatchItemStandardLiters = computed(
  () => fuelRateStore.findRate(dispatchItemDraft.value.province, dispatchItemDraft.value.district)?.liters ?? 0
)
const dispatchItemGps = computed(() => parseGpsInput(dispatchItemDraft.value.gpsInput))

watch(
  () => dispatchItemDraft.value.product,
  (name) => {
    const match = inventoryStore.products.find((p) => p.name === name)
    dispatchItemDraft.value.unit = match?.unit || ''
  }
)

const canAddDispatchItem = computed(
  () => !!dispatchItemDraft.value.siteName && !!dispatchItemDraft.value.district && !!dispatchItemDraft.value.product && dispatchItemDraft.value.qty > 0
)

/** เมื่อรายการในงานนี้เปลี่ยน (เพิ่ม/ลบระหว่างจัดรถ) คำนวณน้ำมันมาตรฐานรวมใหม่จากทุกรายการเสมอ ใช้สูตรเดียวกับตอนสร้างงาน (computedFuel) */
const recomputeDispatchFuel = () => {
  if (!dispatchTarget.value) return
  dispatchTarget.value.fuelLiters = dispatchTarget.value.items.reduce(
    (sum, i) => sum + (fuelRateStore.findRate(i.province, i.district)?.liters || 0),
    0
  )
}

const confirmAddDispatchItem = () => {
  if (!dispatchTarget.value || !canAddDispatchItem.value) return
  const d = dispatchItemDraft.value
  const gps = parseGpsInput(d.gpsInput)
  bookingStore.addJobItem(dispatchTarget.value.id, {
    siteName: d.siteName,
    province: d.province,
    district: d.district,
    siteContactName: d.siteContactName || undefined,
    sitePhone: d.sitePhone || undefined,
    latitude: gps.latitude,
    longitude: gps.longitude,
    mapUrl: d.gpsInput || undefined,
    pickupOriginName: d.pickupOriginName || undefined,
    product: d.product,
    qty: d.qty,
    unit: d.unit,
    jobType: isCements.value ? d.jobType : undefined,
  })
  dispatchItemDraft.value = defaultDispatchItemDraft()
  showAddDispatchItem.value = false
  recomputeDispatchFuel()
}

const removeDispatchItem = (idx: number) => {
  if (!dispatchTarget.value) return
  dispatchTarget.value.items.splice(idx, 1)
  recomputeDispatchFuel()
}

const openDispatchDialog = (booking: Booking) => {
  dispatchTarget.value = booking
  showAddDispatchItem.value = false
  dispatchForm.value = {
    plate: booking.plate || '',
    driverName: booking.driverName || '',
    odometerBefore: booking.odometerBefore || 0,
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

/** สรุประยะทาง/อัตราสิ้นเปลืองน้ำมัน/ชดเชยน้ำมัน เมื่อกรอกเลขไมล์สิ้นสุดแล้ว (เทียบกับน้ำมันที่กรอกไว้ตอนจัดรถ + ลิตรมาตรฐานรวมของทุกปลายทาง) */
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
  const standardFuelLiters =
    booking.items.reduce((sum, i) => sum + (fuelRateStore.findRate(i.province, i.district)?.liters || 0), 0) || null
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
  shipmentNo: '',
  route: '',
  origin: '',
  tripFee: 0,
  agreedPrice: 0,
  allowance: 0,
  fuelLiters: 0,
  fuelRate: 0,
})
const editLineItems = ref<JobItem[]>([])

const editFuelCost = computed(() => (editForm.value.fuelLiters || 0) * (editForm.value.fuelRate || 0))
const editCalculatedAllowance = computed(() => Math.round((editForm.value.tripFee || 0) * 0.99 * 0.62 - editFuelCost.value))
const editDisplayedAllowance = computed(() => (isCements.value ? editForm.value.allowance || 0 : editCalculatedAllowance.value))

const toDateInput = (d?: Date) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const editItemDraft = ref(defaultItemDraft())

const editItemDraftStandardLiters = computed(
  () => fuelRateStore.findRate(editItemDraft.value.province, editItemDraft.value.district)?.liters ?? null
)
const editItemDraftGps = computed(() => parseGpsInput(editItemDraft.value.gpsInput))

watch(
  () => editItemDraft.value.product,
  (name) => {
    const match = inventoryStore.products.find((p) => p.name === name)
    editItemDraft.value.unit = match?.unit || ''
  }
)

const canAddEditItem = computed(
  () =>
    !!editItemDraft.value.siteName &&
    !!editItemDraft.value.province &&
    !!editItemDraft.value.district &&
    !!editItemDraft.value.product &&
    editItemDraft.value.qty > 0
)

const confirmAddEditItem = () => {
  if (!canAddEditItem.value) return
  const d = editItemDraft.value
  const gps = parseGpsInput(d.gpsInput)
  editLineItems.value.push({
    id: `item${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    siteName: d.siteName,
    province: d.province,
    district: d.district,
    siteContactName: d.siteContactName || undefined,
    sitePhone: d.sitePhone || undefined,
    latitude: gps.latitude,
    longitude: gps.longitude,
    mapUrl: d.gpsInput || undefined,
    pickupOriginName: d.pickupOriginName || undefined,
    product: d.product,
    qty: d.qty,
    unit: d.unit,
    jobType: isCements.value ? d.jobType : undefined,
  })
  editItemDraft.value = defaultItemDraft()
}

const removeEditLineItem = (idx: number) => {
  editLineItems.value.splice(idx, 1)
}

const openEditBooking = (booking: Booking) => {
  editTarget.value = booking
  editForm.value = {
    po: booking.po || '',
    shipDate: toDateInput(booking.shipDate),
    returnDate: toDateInput(booking.returnDate),
    shipmentNo: booking.shipmentNo || '',
    route: booking.route || '',
    origin: booking.origin || '',
    tripFee: booking.tripFee,
    agreedPrice: booking.agreedPrice,
    allowance: booking.allowance || 0,
    fuelLiters: booking.fuelLiters || 0,
    fuelRate: booking.fuelRate || 0,
  }
  editLineItems.value = booking.items.map((i) => ({ ...i }))
  editItemDraft.value = defaultItemDraft()
}

const confirmEditBooking = () => {
  if (!editTarget.value) return
  const f = editForm.value
  bookingStore.updateBookingFull(editTarget.value.id, {
    items: editLineItems.value,
    po: f.po || undefined,
    shipDate: f.shipDate ? new Date(f.shipDate) : undefined,
    returnDate: f.returnDate ? new Date(f.returnDate) : undefined,
    shipmentNo: f.shipmentNo || undefined,
    route: f.route || undefined,
    origin: f.origin || undefined,
    tripFee: f.tripFee,
    agreedPrice: f.agreedPrice || f.tripFee,
    allowance: editDisplayedAllowance.value,
    fuelLiters: f.fuelLiters,
    fuelRate: f.fuelRate,
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
