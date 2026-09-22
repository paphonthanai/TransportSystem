<template>
  <div class="space-y-6">
    <!-- Create Button -->
    <div class="flex justify-end gap-2">
      <button
        @click="openReconcileModal"
        class="btn-secondary"
        title="อัปโหลดไฟล์ Excel ต้นฉบับ จับคู่กับงานที่มีอยู่แล้ว แล้วเติมค่าเที่ยว/เบี้ยเลี้ยง/น้ำมัน/จำนวนตันที่ยังว่าง/เป็น 0 ให้"
      >
        <span class="material-symbols-rounded text-base">build</span>
        ซ่อมค่าเที่ยวงาน Import
      </button>
      <button @click="openImportModal" class="btn-secondary">
        <span class="material-symbols-rounded text-base">upload_file</span>
        นำเข้า Excel
      </button>
      <button @click="router.push(`/booking/${props.fleet}/new`)" class="btn-primary">
        <span class="material-symbols-rounded">add</span>
        สร้างงาน
      </button>
    </div>

    <!-- Search -->
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
    </div>

    <!-- In-progress Table -->
    <div>
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div class="font-bold text-text">
          งานที่กำลังดำเนินการ ({{ inProgressBookings.length }})
        </div>
        <button
          v-if="isAdmin && selectedInProgressIds.length > 0"
          @click="bulkDeleteSelectedInProgress"
          :disabled="bulkDeletingInProgress"
          class="btn-sm !border-red-200 !bg-red-50 !text-red-700 disabled:opacity-50"
        >
          <span class="material-symbols-rounded text-base">delete_forever</span>
          ลบถาวรที่เลือกไว้ ({{ selectedInProgressIds.length }})
        </button>
      </div>
      <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th v-if="isAdmin" class="px-4 py-3 w-8">
                <input type="checkbox" :checked="allInProgressSelected" @change="toggleSelectAllInProgress" />
              </th>
              <th class="text-left px-4 py-3 font-semibold text-muted">เที่ยวที่</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">พขร.</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">คอนเฟิร์ม</th>
              <th class="text-center px-4 py-3 font-semibold text-muted">เช็คตั๋ว</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ลงงาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">เวลา</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานที่ส่ง</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">อำเภอ/จังหวัด</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะขนส่ง</th>
              <th class="px-4 py-3"></th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in inProgressBookings"
              :key="booking.id"
              :style="customerRowStyle(booking)"
              class="border-b border-border hover:bg-surface-2 transition-colors"
            >
              <td v-if="isAdmin" class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="!!selectedInProgress[booking.id]"
                  @change="(e) => (selectedInProgress[booking.id] = (e.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="px-4 py-3 text-text">{{ driverTripNumberForBooking(booking) }}</td>
              <td class="px-4 py-3 text-text">{{ booking.driverName || '-' }}</td>
              <td class="px-4 py-3 text-text font-semibold">{{ booking.plate || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  @click="bookingStore.toggleTicketChecked(booking.id)"
                  :class="[
                    'w-7 h-7 rounded-md border flex items-center justify-center mx-auto',
                    booking.ticketChecked ? 'bg-green-600 border-green-600 text-white' : 'bg-surface border-border text-transparent',
                  ]"
                  title="เช็คตั๋ว"
                >
                  <span class="material-symbols-rounded text-base">check</span>
                </button>
              </td>
              <td class="px-4 py-3 text-text">
                <span class="inline-flex items-center gap-1.5" :title="booking.customer">
                  <span
                    v-if="customerRecordFor(booking)?.color"
                    :style="{ background: customerRecordFor(booking)!.color }"
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  ></span>
                  {{ customerRecordFor(booking)?.code || booking.customer }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.loadingDate) }}</td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ booking.loadingTime || '-' }}</td>
              <td class="px-4 py-3 text-text">
                <div class="font-semibold">{{ destinationLabel(booking) }}</div>
                <div v-if="booking.items.length" class="flex flex-wrap gap-3 text-[11px] text-muted leading-tight mt-0.5">
                  <div v-for="col in productColumns(booking)" :key="col.key" class="border-l border-border pl-2 first:border-l-0 first:pl-0">
                    <div>{{ col.product || '-' }}</div>
                    <div>{{ col.qty }} {{ col.unit }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ districtProvinceLabel(booking) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <button v-if="booking.note" @click="noteTarget = booking" class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center" title="ดูหมายเหตุ">
                  !
                </button>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button v-if="booking.status === 'WAITING_DISPATCH'" @click="openDispatchDialog(booking)" class="btn-sm text-primary">
                    <span class="material-symbols-rounded text-base">local_shipping</span>
                    จัดรถ / ส่งงาน
                  </button>
                  <button v-else @click="openDispatchDialog(booking)" class="btn-sm text-amber-700">
                    <span class="material-symbols-rounded text-base">sync_alt</span>
                    เปลี่ยนรถ / คนขับ
                  </button>
                  <button v-if="booking.status === 'ASSIGNED'" @click="adminAcceptDispatch(booking)" class="btn-sm text-green-700" title="รับงานแทนคนขับ (ไม่ต้องรอกดในแอป)">
                    <span class="material-symbols-rounded text-base">how_to_reg</span>
                    ✓ คนขับตอบรับงาน
                  </button>
                  <BookingActionMenu
                    :booking="booking"
                    :can-hard-delete="isAdmin"
                    @view="router.push(`/job/${booking.id}`)"
                    @edit="router.push(`/booking/${props.fleet}/${booking.id}/edit`)"
                    @start-transit="bookingStore.startTransit(booking.id)"
                    @complete="openCompleteDialog(booking)"
                    @delete="deleteBooking(booking)"
                    @cancel="onCancelDispatch(booking)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="inProgressBookings.length === 0">
              <td :colspan="isAdmin ? 13 : 12" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>

    <!-- In-transit Table -->
    <div>
      <div class="font-bold text-text mb-3">
        งานที่กำลังขนส่ง ({{ inTransitBookings.length }})
      </div>
      <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เที่ยวที่</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">พขร.</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">คอนเฟิร์ม</th>
              <th class="text-center px-4 py-3 font-semibold text-muted">เช็คตั๋ว</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ลงงาน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">เวลา</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานที่ส่ง</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">อำเภอ/จังหวัด</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะขนส่ง</th>
              <th class="px-4 py-3"></th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in inTransitBookings"
              :key="booking.id"
              :style="customerRowStyle(booking)"
              class="border-b border-border hover:bg-surface-2 transition-colors"
            >
              <td class="px-4 py-3 text-text">{{ driverTripNumberForBooking(booking) }}</td>
              <td class="px-4 py-3 text-text">{{ booking.driverName || '-' }}</td>
              <td class="px-4 py-3 text-text font-semibold">{{ booking.plate || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  @click="bookingStore.toggleTicketChecked(booking.id)"
                  :class="[
                    'w-7 h-7 rounded-md border flex items-center justify-center mx-auto',
                    booking.ticketChecked ? 'bg-green-600 border-green-600 text-white' : 'bg-surface border-border text-transparent',
                  ]"
                  title="เช็คตั๋ว"
                >
                  <span class="material-symbols-rounded text-base">check</span>
                </button>
              </td>
              <td class="px-4 py-3 text-text">
                <span class="inline-flex items-center gap-1.5" :title="booking.customer">
                  <span
                    v-if="customerRecordFor(booking)?.color"
                    :style="{ background: customerRecordFor(booking)!.color }"
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  ></span>
                  {{ customerRecordFor(booking)?.code || booking.customer }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.loadingDate) }}</td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ booking.loadingTime || '-' }}</td>
              <td class="px-4 py-3 text-text">
                <div class="font-semibold">{{ destinationLabel(booking) }}</div>
                <div v-if="booking.items.length" class="flex flex-wrap gap-3 text-[11px] text-muted leading-tight mt-0.5">
                  <div v-for="col in productColumns(booking)" :key="col.key" class="border-l border-border pl-2 first:border-l-0 first:pl-0">
                    <div>{{ col.product || '-' }}</div>
                    <div>{{ col.qty }} {{ col.unit }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ districtProvinceLabel(booking) }}</td>
              <td class="px-4 py-3">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
              </td>
              <td class="px-4 py-3">
                <button v-if="booking.note" @click="noteTarget = booking" class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center" title="ดูหมายเหตุ">
                  !
                </button>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="openDispatchDialog(booking)" class="btn-sm text-amber-700">
                    <span class="material-symbols-rounded text-base">sync_alt</span>
                    เปลี่ยนรถ / คนขับ
                  </button>
                  <BookingActionMenu
                    :booking="booking"
                    :can-hard-delete="isAdmin"
                    @view="router.push(`/job/${booking.id}`)"
                    @edit="router.push(`/booking/${props.fleet}/${booking.id}/edit`)"
                    @start-transit="bookingStore.startTransit(booking.id)"
                    @complete="openCompleteDialog(booking)"
                    @delete="deleteBooking(booking)"
                    @cancel="onCancelDispatch(booking)"
                  />
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
    </div>

    <!-- Dispatch Dialog -->
    <Teleport to="body" v-if="dispatchTarget">
      <div @click="dispatchTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-lg bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">
              {{ isReassignDispatch ? 'เปลี่ยนคนขับ/รถ' : 'ส่งงาน' }} {{ dispatchTitle(dispatchTarget) }}
            </div>
            <button @click="dispatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                ทะเบียนรถ *
                <span class="text-[10px] font-normal text-muted">(แสดงเฉพาะรถที่วิ่ง Feed นี้ได้)</span>
              </label>
              <select v-model="dispatchForm.plate" class="input-field w-full">
                <option value="">เลือกทะเบียนรถ...</option>
                <option
                  v-for="v in availableVehiclesForDispatch"
                  :key="v.id"
                  :value="vehiclesStore.fullPlate(v)"
                  :style="{ backgroundColor: vehicleOptionColor(v) }"
                >
                  {{ vehicleOptionLabel(v) }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">คนขับ</label>
              <select v-model="dispatchForm.driverName" class="input-field w-full">
                <option value="">เลือกคนขับ...</option>
                <option
                  v-for="name in driverOptions"
                  :key="name"
                  :value="name"
                  :style="{ backgroundColor: driverOptionColor(name) }"
                >
                  {{ driverOptionLabel(name) }}
                </option>
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
                    <div v-if="dispatchTarget?.pricingMode === 'MULTI_DESTINATION'" class="text-xs text-muted">
                      ค่าเที่ยว: {{ formatBaht((li.tripFee || 0) * (li.tripCount || 1)) }} ({{ formatBaht(li.tripFee || 0) }} x {{ li.tripCount || 1 }})
                    </div>
                  </div>
                  <button v-if="canEditDispatchItems" @click="removeDispatchItem(idx)" class="text-red-500 hover:text-red-700 flex-shrink-0">
                    <span class="material-symbols-rounded text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="!canEditDispatchItems" class="text-xs text-muted">
              งานถูกตอบรับไปแล้ว แก้ไขรายการปลายทางไม่ได้ — เปลี่ยนได้เฉพาะรถ/คนขับ
            </div>
            <button v-else-if="!showAddDispatchItem" type="button" @click="showAddDispatchItem = true" class="btn-secondary w-full justify-center">
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
              <div v-if="dispatchItemCorridorWarning" class="text-xs text-amber-600">
                ⚠ ปลายทางนี้อยู่คนละสาย/เส้นทางกับรายการอื่นในงานนี้ ตรวจสอบว่าต้องการรวมในงานเดียวกันจริงหรือไม่
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
              <template v-if="dispatchTarget?.pricingMode === 'MULTI_DESTINATION'">
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <input v-model.number="dispatchItemDraft.tripFee" type="number" placeholder="ค่าเที่ยวรายการนี้" class="input-field w-full" />
                  <input v-model.number="dispatchItemDraft.tripCount" type="number" min="1" placeholder="จำนวนเที่ยว (คิดราคา)" class="input-field w-full" />
                </div>
                <div class="text-[11px] text-muted mt-1">สำหรับคำนวณราคาเท่านั้น ไม่ใช่จำนวนเที่ยวที่รถวิ่งจริง</div>
              </template>
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
              {{ isReassignDispatch ? 'ยืนยันเปลี่ยนคนขับ/รถ' : 'ส่งงาน' }}
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

    <!-- Note Viewer — เปิดอ่านหมายเหตุจากปุ่ม "!" ใน Booking List -->
    <Teleport to="body" v-if="noteTarget">
      <div @click="noteTarget = null" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-md bg-surface rounded-2xl shadow-2xl animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <div class="font-bold text-text">หมายเหตุ {{ noteTarget.docNo }}</div>
            <button @click="noteTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 text-sm text-text whitespace-pre-wrap">{{ noteTarget.note }}</div>
        </div>
      </div>
    </Teleport>

    <!-- นำเข้า Booking จาก Excel -->
    <Teleport to="body" v-if="importModalOpen">
      <div @click="closeImportModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">นำเข้างานขนส่งจาก Excel</div>
            <button @click="closeImportModal" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="flex items-center gap-2 flex-wrap">
              <label class="btn-secondary cursor-pointer">
                <span class="material-symbols-rounded text-base">folder_open</span>
                เลือกไฟล์ Excel
                <input type="file" accept=".xlsx,.xls" class="hidden" @change="handleImportFile" />
              </label>
              <span v-if="importFileName" class="text-sm text-muted">{{ importFileName }}</span>
              <button type="button" @click="downloadImportTemplate" class="btn-secondary ml-auto">
                <span class="material-symbols-rounded text-base">download</span>
                ดาวน์โหลด Template
              </button>
            </div>

            <div v-if="importRows.length === 0" class="text-sm text-muted text-center py-6">
              ยังไม่ได้เลือกไฟล์ — เลือกไฟล์ Excel ที่มีคอลัมน์ตาม Template ด้านบน
            </div>

            <template v-else>
              <div class="rounded-lg p-3 text-sm flex items-center gap-2" :class="importShipDate ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'">
                <span class="material-symbols-rounded text-base">event</span>
                <span v-if="importShipDate">วันที่ลงงานที่จับได้จากหัวไฟล์: <strong>{{ formatShortDate(importShipDate) }}</strong> (ใช้กับทุกงานในไฟล์นี้)</span>
                <span v-else>ไม่พบวันที่ส่งงานใน Row แรกของไฟล์ — ข้ามไป สร้างงานตามปกติโดยไม่ใส่วันที่ลงงาน</span>
              </div>
              <div class="bg-surface-2 rounded-lg p-3 text-sm flex items-center gap-4 flex-wrap">
                <span class="font-semibold text-text">อ่านได้ {{ importableRows.length }} แถว</span>
                <span class="text-green-600">จะสร้าง {{ importableRows.length }} งาน</span>
                <span v-if="importWarningRowCount" class="text-amber-600">{{ importWarningRowCount }} แถวมีข้อมูลไม่ครบ — จะสร้างงานให้ก่อนแล้วแปะหมายเหตุไว้ให้กรอกเพิ่ม</span>
              </div>

              <div class="overflow-x-auto border border-border rounded-lg max-h-72">
                <table class="w-full text-xs">
                  <thead class="bg-surface-2 sticky top-0">
                    <tr>
                      <th class="text-left px-2 py-1.5">แถว</th>
                      <th class="text-left px-2 py-1.5">พขร.</th>
                      <th class="text-left px-2 py-1.5">คอนเฟิร์ม</th>
                      <th class="text-left px-2 py-1.5">ลูกค้า</th>
                      <th class="text-left px-2 py-1.5">สถานที่ส่ง</th>
                      <th class="text-left px-2 py-1.5">ชนิดปูน</th>
                      <th class="text-right px-2 py-1.5">ตัน</th>
                      <th class="text-left px-2 py-1.5">สถานะ</th>
                      <th class="text-left px-2 py-1.5">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in importableRows" :key="row.rowNumber" class="border-t border-border" :class="row.warnings.length ? 'bg-amber-50' : ''">
                      <td class="px-2 py-1.5">{{ row.rowNumber }}</td>
                      <td class="px-2 py-1.5">{{ row.driverName || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.plate || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.customer || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.siteName || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.product || '-' }}</td>
                      <td class="px-2 py-1.5 text-right">{{ row.qty }}</td>
                      <td class="px-2 py-1.5">{{ bookingStatusLabel[row.status] }}</td>
                      <td class="px-2 py-1.5">
                        <span v-if="row.warnings.length" class="text-amber-700">{{ row.warnings.join(', ') }}</span>
                        <span v-else class="text-green-600">ครบถ้วน</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
          <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface">
            <button @click="closeImportModal" class="btn-secondary">ยกเลิก</button>
            <button
              @click="confirmImport"
              :disabled="!importableRows.length"
              class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">save</span>
              ยืนยันสร้างงาน ({{ importableRows.length }} งาน)
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ซ่อมค่าเที่ยวงาน Import จากไฟล์ Excel ต้นฉบับ -->
    <Teleport to="body" v-if="reconcileModalOpen">
      <div @click="closeReconcileModal" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6">
        <div @click.stop class="w-full max-w-4xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">ซ่อมค่าเที่ยวงาน Import จากไฟล์ Excel</div>
            <button @click="closeReconcileModal" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="text-xs text-muted">
              อัปโหลดไฟล์ Excel ต้นฉบับที่เคยใช้ import งานเข้าระบบ — ระบบจะจับคู่แต่ละแถวกับงานที่มีอยู่แล้วโดยเทียบ
              วันที่/ลูกค้า/ทะเบียนรถ/สินค้า/คนขับ (ต้องตรงกันอย่างน้อย 4 จาก 5 อย่าง) แล้วเติมเฉพาะช่องที่ยังว่าง/เป็น 0
              อยู่เท่านั้น — <strong>ไม่เขียนทับข้อมูลที่มีอยู่แล้ว</strong> ไม่ว่าจะตรงกับไฟล์หรือไม่ก็ตาม
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="btn-secondary cursor-pointer">
                <span class="material-symbols-rounded text-base">folder_open</span>
                เลือกไฟล์ Excel
                <input type="file" accept=".xlsx,.xls" class="hidden" @change="handleReconcileFile" />
              </label>
              <span v-if="reconcileFileName" class="text-sm text-muted">{{ reconcileFileName }}</span>
            </div>

            <div v-if="reconcileRows.length === 0" class="text-sm text-muted text-center py-6">
              ยังไม่ได้เลือกไฟล์
            </div>

            <template v-else>
              <div class="rounded-lg p-3 text-sm flex items-center gap-2" :class="reconcileShipDate ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'">
                <span class="material-symbols-rounded text-base">event</span>
                <span v-if="reconcileShipDate">วันที่ลงงานที่จับได้จากหัวไฟล์: <strong>{{ formatShortDate(reconcileShipDate) }}</strong></span>
                <span v-else>ไม่พบวันที่ส่งงานใน Row แรกของไฟล์ — จะไม่ใช้วันที่เป็นเงื่อนไขจับคู่</span>
              </div>
              <div class="bg-surface-2 rounded-lg p-3 text-sm flex items-center gap-4 flex-wrap">
                <span class="font-semibold text-text">อ่านได้ {{ reconcileRows.length }} แถว</span>
                <span class="text-primary">จับคู่กับงานที่มีอยู่ได้ {{ reconcileMatchedCount }} แถว</span>
                <span class="text-green-600">จะซ่อมข้อมูล {{ reconcilePatchableCount }} งาน</span>
              </div>

              <div class="overflow-x-auto border border-border rounded-lg max-h-72">
                <table class="w-full text-xs">
                  <thead class="bg-surface-2 sticky top-0">
                    <tr>
                      <th class="text-left px-2 py-1.5">แถว</th>
                      <th class="text-left px-2 py-1.5">ลูกค้า</th>
                      <th class="text-left px-2 py-1.5">ทะเบียนรถ</th>
                      <th class="text-left px-2 py-1.5">สินค้า</th>
                      <th class="text-left px-2 py-1.5">คนขับ</th>
                      <th class="text-left px-2 py-1.5">ตรงกัน (วันที่/ลูกค้า/ทะเบียน/สินค้า/คนขับ)</th>
                      <th class="text-left px-2 py-1.5">จับคู่กับงาน</th>
                      <th class="text-left px-2 py-1.5">จะซ่อม</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="preview in reconcilePreview" :key="preview.row.rowNumber" class="border-t border-border">
                      <td class="px-2 py-1.5">{{ preview.row.rowNumber }}</td>
                      <td class="px-2 py-1.5">{{ preview.row.customer || '-' }}</td>
                      <td class="px-2 py-1.5">{{ preview.row.plate || '-' }}</td>
                      <td class="px-2 py-1.5">{{ preview.row.product || '-' }}</td>
                      <td class="px-2 py-1.5">{{ preview.row.driverName || '-' }}</td>
                      <td class="px-2 py-1.5">
                        <span v-if="preview.breakdown" class="inline-flex gap-1">
                          <span
                            v-for="key in (['date', 'customer', 'plate', 'product', 'driver'] as const)"
                            :key="key"
                            :class="preview.breakdown[key] ? 'text-green-600' : 'text-red-400'"
                            :title="reconcileBreakdownLabel[key]"
                          >
                            {{ preview.breakdown[key] ? '✓' : '✗' }}
                          </span>
                        </span>
                        <span v-else class="text-muted">-</span>
                      </td>
                      <td class="px-2 py-1.5">
                        <select
                          :value="reconcileManualPick[preview.row.rowNumber] ?? ''"
                          @change="reconcileManualPick[preview.row.rowNumber] = ($event.target as HTMLSelectElement).value"
                          class="input-field !h-7 !text-xs w-44"
                        >
                          <option value="">
                            {{ preview.isManual ? 'ไม่จับคู่เลย' : preview.booking ? `อัตโนมัติ: ${preview.booking.docNo} (${preview.matchScore}/5)` : 'ไม่พบข้อมูลที่ตรงกัน' }}
                          </option>
                          <option v-for="c in preview.topCandidates" :key="c.booking.id" :value="c.booking.id">
                            {{ c.booking.docNo }} ({{ c.score }}/5{{ c.score >= 4 ? ' — auto' : '' }})
                          </option>
                        </select>
                      </td>
                      <td class="px-2 py-1.5">
                        <span v-if="preview.patches.length" class="text-green-600">
                          {{ preview.patches.map((p) => `${p.field}: ${p.from}→${p.to}`).join(', ') }}
                        </span>
                        <span v-else-if="preview.booking" class="text-muted">ไม่มีอะไรต้องซ่อม (ข้อมูลครบแล้ว)</span>
                        <span v-else class="text-muted">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="text-[11px] text-muted">
                คอลัมน์ "จับคู่กับงาน" เลือกตัวเลือกแรกสุด (ไม่ระบุ) เพื่อใช้ผลอัตโนมัติ หรือเลือกงานจากรายการเองได้ถ้ามั่นใจว่าใช่
                แม้คะแนนจะไม่ถึง 4/5 (เช่น ไฟล์ไม่มีคอลัมน์ "ทะเบียนรถ" ทำให้เทียบทะเบียนไม่ได้)
              </div>
            </template>
          </div>
          <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface">
            <button @click="closeReconcileModal" class="btn-secondary">ยกเลิก</button>
            <button
              @click="confirmReconcile"
              :disabled="!reconcilePatchableCount || reconciling"
              class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">save</span>
              {{ reconciling ? 'กำลังซ่อม...' : `ยืนยันซ่อมข้อมูล (${reconcilePatchableCount} งาน)` }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useOriginsStore } from '@/stores/origins'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, DebtAdjustment, JobItem, Vehicle } from '@/types'
import { bookingTitle } from '@/utils/bookingTitle'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import { parseGpsInput } from '@/utils/gps'
import { salesOrderLineDescription } from '@/utils/salesOrderDescription'
import { exportRowsToExcel } from '@/utils/exportExcel'
import { findReconcileMatches, computeReconcilePatches, RECONCILE_MIN_MATCH, type ReconcileMatchBreakdown } from '@/utils/importReconciliation'
import * as XLSX from 'xlsx'
import BookingActionMenu from '@/components/booking/BookingActionMenu.vue'

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const bookingStore = useBookingStore()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const fuelRateStore = useFuelRateStore()
const originsStore = useOriginsStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const authStore = useAuthStore()

/** เฉพาะ ADMIN เท่านั้นที่เห็นปุ่ม "ลบถาวร" (Hard Delete Booking) — ซ่อนที่ UI ชั้นแรก บังคับสิทธิ์ซ้ำอีกชั้นที่
 *  bookingStore.hardDeleteBooking() และอีกชั้นที่ Firestore Rules (ดู firestore.rules's /bookings allow delete) */
const isAdmin = computed(() => authStore.role === 'ADMIN')

/** หาคนขับจากชื่อเต็ม รองรับทั้งแบบมีคำนำหน้าและไม่มี (เดิมเคยอยู่ใน driversStore.findDriverByVehicle) */
const findDriverByName = (name: string) => driversStore.drivers.find((d) => driversStore.fullName(d) === name || `${d.firstName} ${d.lastName}` === name)

/** หาคนขับจาก "ชื่อเล่น" (ใช้เฉพาะตอนนำเข้า Excel — ไฟล์จัดคิวจริงกรอกชื่อเล่นแทนชื่อจริงเสมอ ต่างจาก findDriverByName
 *  ด้านบนที่จับคู่ชื่อเต็ม) ต้องเชื่อมกับทะเบียนรถที่ประจำคนขับคนนั้นด้วยเสมอกันชื่อเล่นซ้ำกัน — ถ้าเจอชื่อเล่นตรงกันคนเดียว
 *  และไม่มีทะเบียนรถมาเทียบเลย ก็ยังเชื่อชื่อเล่นได้ (ไม่มีอะไรให้ขัดแย้ง) แต่ถ้ามีทะเบียนรถมาด้วย ต้องตรงกับรถที่ประจำ
 *  คนขับคนนั้นจริงเท่านั้น ไม่งั้นถือว่าข้อมูลไม่ตรงกับที่ผูกในระบบ คืน undefined (ให้ผู้เรียกเว้นว่างไว้ ไม่เดาสุ่ม) */
const matchDriverForImport = (nickname: string, plate: string) => {
  // (d.nickname || '') กันพัง — คนขับที่บันทึกไว้ก่อนฟีเจอร์นี้มีอยู่ใน Firestore จริงโดยไม่มี field นี้เลย (undefined
  // ไม่ใช่ '') เพราะ driverRepository.getAll() ไม่ได้ผ่าน sanitizeDriver() (ต่างจากตอนแก้ไขผ่านฟอร์มที่ผ่านเสมอ)
  const candidates = driversStore.drivers.filter((d) => (d.nickname || '').trim() === nickname.trim())
  if (candidates.length === 0) return undefined
  const plateTrimmed = plate.trim()
  if (candidates.length === 1) {
    if (!plateTrimmed) return candidates[0]
    const vehicle = vehiclesStore.vehicleForDriver(candidates[0].code)
    return vehicle && vehicle.plate.trim() === plateTrimmed ? candidates[0] : undefined
  }
  if (!plateTrimmed) return undefined
  return candidates.find((d) => {
    const vehicle = vehiclesStore.vehicleForDriver(d.code)
    return vehicle && vehicle.plate.trim() === plateTrimmed
  })
}

const searchQuery = ref('')

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))

const jobTypeOptions: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

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

/** งาน (ทั้งหมด ไม่ใช่แค่ล่าสุด) ที่ "คนขับคนนี้" กำลังวิ่งอยู่ (ยังไม่ DELIVERED) ไม่รวมตัว Booking ที่กำลังจัดรถอยู่นี้
 *  เอง (เหมือน activeBookingsForVehicle ทุกประการ — Requirement: dropdown คนขับใช้เกณฑ์สี/ป้ายชื่อแบบเดียวกับรถ) */
const activeBookingsForDriver = (name: string) =>
  bookingStore.bookings
    .filter((b) => b.driverName === name && b.id !== dispatchTarget.value?.id && ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.dispatchedAt || b.createdAt).getTime() - new Date(a.dispatchedAt || a.createdAt).getTime())

/** ป้าย dropdown คนขับ — เดิมโชว์ "กำลังวิ่งเที่ยวที่ N (docNo)" เปลี่ยนเป็นจำนวนเที่ยว+ปลายทางของเที่ยวล่าสุดแทน
 *  ให้ตรงรูปแบบเดียวกับ vehicleOptionLabel เป๊ะ (Requirement ใหม่) */
const driverOptionLabel = (name: string) => {
  const active = activeBookingsForDriver(name)
  if (!active.length) return `${name} — ว่าง`
  return `${name} — ${active.length} เที่ยว — ${destinationLabel(active[0])}`
}

/** สีพื้นหลังของแต่ละ <option> คนขับตามจำนวนเที่ยวที่มีอยู่ — เกณฑ์เดียวกับ vehicleOptionColor เป๊ะ
 *  (0 เที่ยว=ขาว, 1 เที่ยว=เขียว, 2 เที่ยวขึ้นไป=แดง) ไม่เปลี่ยน Booking Status/logic จัดรถ/workflow มอบหมายงานใดๆ */
const driverOptionColor = (name: string) => {
  const count = activeBookingsForDriver(name).length
  if (count >= 2) return '#fecaca'
  if (count === 1) return '#bbf7d0'
  return '#ffffff'
}

const formatShortDate = (date?: Date) =>
  date ? new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

/** งาน (ทั้งหมด ไม่ใช่แค่ล่าสุด) ที่ "รถคันนี้" กำลังวิ่งอยู่ (ยังไม่ DELIVERED) — Requirement ข้อ 3 เดิม: ผูกสถานะกับรถ
 *  ไม่ใช่คนขับ ไม่รวมตัว Booking ที่กำลังจัดรถอยู่นี้เอง (กันจัดรถซ้ำ/แก้ไขรถเดิม) เรียงล่าสุดก่อน — ใช้ทั้งนับจำนวนเที่ยว
 *  (ตาม Requirement ใหม่: แสดงสีตามจำนวนเที่ยว) และหาปลายทางของเที่ยวล่าสุดไปแสดงในป้าย dropdown */
const activeBookingsForVehicle = (plate: string) =>
  bookingStore.bookings
    .filter((b) => b.plate === plate && b.id !== dispatchTarget.value?.id && ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.dispatchedAt || b.createdAt).getTime() - new Date(a.dispatchedAt || a.createdAt).getTime())

/** รถที่วิ่ง Feed ของงานนี้ได้เท่านั้น (ดู vehiclesStore.availableFor + Vehicle.allowedCategories) — Requirement ข้อ 3:
 *  จัดรถแสดงเฉพาะรถที่ประเภทตรงกับ Feed ของ Booking รถที่ไม่ตรงไม่แสดงเลย ไม่ใช่แค่เตือน */
const availableVehiclesForDispatch = computed(() => (dispatchTarget.value ? vehiclesStore.availableFor(dispatchTarget.value.category) : []))

/** ป้าย dropdown รถ — เดิมโชว์สถานะ+เลข Booking (เข้าใจยาก) เปลี่ยนเป็นจำนวนเที่ยว+ปลายทางของเที่ยวล่าสุดแทน ตาม
 *  Requirement ใหม่ ("จัดรถ/สร้างงาน — ปรับการแสดงรถที่มีงานอยู่") — นับเที่ยวด้วย activeBookingsForVehicle เดิมที่มีอยู่
 *  แล้ว (ของเดิมแค่หยิบตัวล่าสุดตัวเดียว [0] ตอนนี้ใช้ .length ด้วย) ไม่สร้าง logic นับเที่ยวใหม่ซ้ำ */
const vehicleOptionLabel = (v: Vehicle) => {
  const full = vehiclesStore.fullPlate(v)
  const active = activeBookingsForVehicle(full)
  if (!active.length) return `${full} — ว่าง`
  return `${full} — ${active.length} เที่ยว — ${destinationLabel(active[0])}`
}

/** สีพื้นหลังของแต่ละ <option> ตามจำนวนเที่ยวที่รถคันนี้มีอยู่ — เป็นแค่ UI ช่วยแยกสถานะการใช้งานรถให้มองเห็นง่าย
 *  (0 เที่ยว=ขาว, 1 เที่ยว=เขียว, 2 เที่ยวขึ้นไป=แดง) ไม่เปลี่ยน Booking Status/logic จัดรถ/workflow มอบหมายงานใดๆ */
const vehicleOptionColor = (v: Vehicle) => {
  const count = activeBookingsForVehicle(vehiclesStore.fullPlate(v)).length
  if (count >= 2) return '#fecaca'
  if (count === 1) return '#bbf7d0'
  return '#ffffff'
}

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
        b.status !== 'ACCEPTED' &&
        b.status !== 'IN_TRANSIT' &&
        b.status !== 'DELIVERING' &&
        (!q || matchesSearch(b, q))
    )
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status]
      if (rankDiff !== 0) return rankDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

// งานที่คนขับกำลังขนส่ง/กำลังส่งของอยู่ (เดิมเคยรวมอยู่ในตารางเดียวกับ "กำลังดำเนินการ" แยกออกมาให้เห็นชัดว่ากำลังวิ่งอยู่)
// ไม่กรองตามวันที่ขนส่งอีกต่อไป (ดู Phase 1 ข้อ 3) — แสดงงานทั้งหมดในระบบ รวมงานล่วงหน้าและงานที่เสร็จแล้ว
const inTransitBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter((b) => (b.status === 'ACCEPTED' || b.status === 'IN_TRANSIT' || b.status === 'DELIVERING') && (!q || matchesSearch(b, q)))
    .sort((a, b) => new Date(b.transitStartedAt || 0).getTime() - new Date(a.transitStartedAt || 0).getTime())
})

const productLabel = (booking: Booking) => {
  const names = [...new Set(booking.items.map((i) => i.product).filter(Boolean))]
  return names.length ? names.join(', ') : '-'
}

/** หัวข้อ Dialog "ส่งงาน"/"เปลี่ยนคนขับ/รถ" — reuse bookingTitle() ตัวเดียวกับที่ฝั่งคนขับใช้ (ดู utils/bookingTitle.ts) */
const dispatchTitle = (booking: Booking | null) => (booking ? bookingTitle(booking) : '')

const destinationLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

/** อำเภอ/จังหวัด ของปลายทางแรก — ตัวย่อ + สีลูกค้าใน Requirement นี้อ้างอิงปลายทางแรกเสมอ (เหมือน destinationLabel เดิม) */
const districtProvinceLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const { district, province } = booking.items[0]
  return `${district || '-'} / ${province || '-'}`
}

/** คอลัมน์สินค้าต่อ Item ใต้ "สถานที่ส่ง" — งานจริงส่วนใหญ่ใช้ "สินค้าอื่นในรายการนี้" (JobItem.extraProducts)
 *  แทนการเพิ่ม Item แยกใน Booking.items[] ทำให้ items.length มักเหลือ 1 แม้มีหลายสินค้าจริง จึงต้อง flatten
 *  extraProducts เข้ามาเป็นคอลัมน์ของตัวเองด้วย (เหมือนที่ JobDocumentView.vue ทำกับ Row ใน JobDetail) ไม่ merge/
 *  รวม qty ของแต่ละคอลัมน์เข้าด้วยกัน แต่ละคอลัมน์ยังเป็นรายการอิสระของตัวเอง */
const productColumns = (booking: Booking) => {
  const cols: { key: string; product: string; qty: number; unit: string }[] = []
  booking.items.forEach((item) => {
    cols.push({ key: item.id, product: item.product, qty: item.qty, unit: item.unit })
    ;(item.extraProducts || []).forEach((ep, idx) => {
      cols.push({ key: `${item.id}-extra-${idx}`, product: ep.product, qty: ep.qty, unit: ep.unit })
    })
  })
  return cols
}

/** ตัวย่อ 3 ตัว + สีประจำลูกค้า (Requirement ข้อ 2/5) — หา CustomerRecord จากชื่อลูกค้าที่ผูกกับ Booking (ไม่มี id
 *  บน Booking โดยตรง เหมือนจุดอื่นๆ ที่ join ด้วยชื่อลูกค้าอยู่แล้วในระบบนี้) */
const customerRecordFor = (booking: Booking) => customerStore.customers.find((c) => c.name === booking.customer)

/** สีพื้นหลังทั้งแถวตามสีที่ตั้งไว้ให้ลูกค้ารายนั้น (CustomerRecord.color) — ใช้ค่าเดียวกับจุดสี/ตัวย่อ 3 ตัวที่มีอยู่แล้ว
 *  แค่ผสม alpha ~15% ไม่ใช้สีเต็มความเข้ม กันตัวหนังสือ (text-text/text-muted เดิม) อ่านไม่ออกไม่ว่าจะเลือกสีเข้มแค่ไหน */
const customerRowStyle = (booking: Booking) => {
  const color = customerRecordFor(booking)?.color
  return color ? { backgroundColor: `${color}26` } : {}
}

/** เปิดดูหมายเหตุแบบเต็มจากปุ่ม "!" ท้ายแถวใน Booking List (Requirement ข้อ 2) */
const noteTarget = ref<Booking | null>(null)

/** รวมจำนวนสินค้าทั้งงาน แยกกลุ่มตามหน่วยนับ (Phase 1 ข้อ 2) — ใช้แสดงผลใน List เท่านั้น ไม่แตะ/ไม่ลบรายการ
 *  สินค้าย่อยเดิม (M1/M2 ฯลฯ) ที่ยังต้องแสดงครบใน Booking Detail/Document เหมือนเดิม */
const totalQtyLabel = (booking: Booking) => {
  const byUnit = new Map<string, number>()
  booking.items.forEach((i) => byUnit.set(i.unit, (byUnit.get(i.unit) || 0) + (i.qty || 0)))
  const parts = [...byUnit.entries()].map(([unit, qty]) => `${qty} ${unit}`)
  return parts.length ? parts.join(', ') : '-'
}

const fuelLitersLabel = (booking: Booking) => (booking.fuelLiters ? `${booking.fuelLiters} ล.` : '-')

const deliveredItemCount = (booking: Booking) => booking.items.filter((i) => i.deliveryStatus === 'DELIVERED').length

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`


// --- Dispatch flow ---
const dispatchTarget = ref<Booking | null>(null)
const dispatchForm = ref({
  plate: '',
  driverName: '',
  odometerBefore: 0,
})

/** งานที่ถูกจัดรถไปแล้ว (ไม่ใช่ครั้งแรก) — เปิด dialog นี้ซ้ำได้ทุกสถานะก่อนส่งของสำเร็จเพื่อ "เปลี่ยนรถ/คนขับ" */
const isReassignDispatch = computed(() => !!dispatchTarget.value && dispatchTarget.value.status !== 'WAITING_DISPATCH')
/** แก้ไขรายการปลายทางในงานได้เฉพาะก่อนคนขับตอบรับ เพื่อไม่ให้ปนกับความคืบหน้าที่ทำไปแล้ว (รับสินค้า/ส่งของ) */
const canEditDispatchItems = computed(
  () => dispatchTarget.value?.status === 'WAITING_DISPATCH' || dispatchTarget.value?.status === 'ASSIGNED'
)

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
  tripFee: 0,
  tripCount: 1,
})
const dispatchItemDraft = ref(defaultDispatchItemDraft())

const dispatchItemStandardLiters = computed(
  () => fuelRateStore.findRate(dispatchItemDraft.value.province, dispatchItemDraft.value.district)?.liters ?? 0
)
const dispatchItemGps = computed(() => parseGpsInput(dispatchItemDraft.value.gpsInput))
/** เตือน (ไม่บล็อก) เมื่อปลายทางที่กำลังจะเพิ่มอยู่คนละสายกับรายการอื่นในงาน MULTI_DESTINATION นี้ */
const dispatchItemCorridorWarning = computed(() => {
  if (!dispatchTarget.value || dispatchTarget.value.pricingMode !== 'MULTI_DESTINATION') return false
  return fuelRateStore.isDifferentCorridor(dispatchItemDraft.value.province, dispatchItemDraft.value.district, dispatchTarget.value.items)
})

watch(
  () => dispatchItemDraft.value.product,
  (name) => {
    const match = inventoryStore.products.find((p) => p.name === name)
    dispatchItemDraft.value.unit = match?.unit || ''
  }
)

const canAddDispatchItem = computed(
  () =>
    !!dispatchItemDraft.value.siteName &&
    !!dispatchItemDraft.value.district &&
    !!dispatchItemDraft.value.product &&
    dispatchItemDraft.value.qty > 0 &&
    (dispatchTarget.value?.pricingMode !== 'MULTI_DESTINATION' || dispatchItemDraft.value.tripFee > 0)
)

/** เมื่อรายการในงานนี้เปลี่ยน (เพิ่ม/ลบระหว่างจัดรถ) คำนวณน้ำมันมาตรฐานรวมใหม่ตาม pricingMode (SINGLE_DESTINATION คิดจากรายการหลักเพียงครั้งเดียว, MULTI_DESTINATION รวมทุกรายการ) */
const recomputeDispatchFuel = () => {
  if (!dispatchTarget.value) return
  dispatchTarget.value.fuelLiters = fuelRateStore.standardFuelLiters(dispatchTarget.value.items, dispatchTarget.value.pricingMode)
}

/** เมื่อรายการงาน MULTI_DESTINATION เปลี่ยนระหว่างจัดรถ คำนวณ tripFee รวมใหม่จาก tripFee*tripCount ทุกรายการ (งาน SINGLE_DESTINATION ไม่ต้องเรียก เพราะ tripFee เป็นค่าคงที่ระดับงาน) */
const recomputeDispatchTripFee = () => {
  if (!dispatchTarget.value || dispatchTarget.value.pricingMode !== 'MULTI_DESTINATION') return
  dispatchTarget.value.tripFee = dispatchTarget.value.items.reduce(
    (sum, i) => sum + (i.tripFee || 0) * (i.tripCount || 1),
    0
  )
}

const confirmAddDispatchItem = () => {
  if (!dispatchTarget.value || !canAddDispatchItem.value) return
  const d = dispatchItemDraft.value
  const gps = parseGpsInput(d.gpsInput)
  const isMulti = dispatchTarget.value.pricingMode === 'MULTI_DESTINATION'
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
    tripFee: isMulti ? d.tripFee : undefined,
    tripCount: isMulti ? d.tripCount || 1 : undefined,
  })
  dispatchItemDraft.value = defaultDispatchItemDraft()
  showAddDispatchItem.value = false
  recomputeDispatchFuel()
  recomputeDispatchTripFee()
}

const removeDispatchItem = (idx: number) => {
  if (!dispatchTarget.value) return
  dispatchTarget.value.items.splice(idx, 1)
  recomputeDispatchFuel()
  recomputeDispatchTripFee()
}

/** กันไม่ให้ watcher autofill รถ<->คนขับ ทำงานตอนเปิด dialog ใหม่ (โหลดข้อมูลเดิมของงาน) — ให้ทำงานเฉพาะตอนผู้ใช้แก้ไขฟิลด์เองเท่านั้น */
const suppressDispatchAutofill = ref(false)

const openDispatchDialog = (booking: Booking) => {
  dispatchTarget.value = booking
  showAddDispatchItem.value = false
  suppressDispatchAutofill.value = true
  dispatchForm.value = {
    plate: booking.plate || '',
    driverName: booking.driverName || '',
    odometerBefore: booking.odometerBefore || 0,
  }
  if (!dispatchForm.value.odometerBefore && dispatchForm.value.plate) {
    const prevOdometer = latestOdometerForPlate(dispatchForm.value.plate, booking.id)
    if (prevOdometer) dispatchForm.value.odometerBefore = prevOdometer.odometerAfter || 0
  }
  nextTick(() => {
    suppressDispatchAutofill.value = false
  })
}

// กรอกช่องคนขับ หรือทะเบียนรถ แค่ช่องใดช่องหนึ่ง (หรือเปลี่ยนภายหลัง) ให้ดึงข้อมูลคู่กันจากความสัมพันธ์รถ-คนขับใน vehiclesStore อัตโนมัติเสมอ
watch(
  () => dispatchForm.value.driverName,
  (name) => {
    if (suppressDispatchAutofill.value || !name) return
    const driver = findDriverByName(name)
    if (!driver) return
    const vehicle = vehiclesStore.vehicleForDriver(driver.code)
    if (vehicle) dispatchForm.value.plate = vehiclesStore.fullPlate(vehicle)
  }
)
watch(
  () => dispatchForm.value.plate,
  (plateText) => {
    if (suppressDispatchAutofill.value || !plateText) return
    const vehicle = vehiclesStore.findByFullPlate(plateText)
    if (vehicle?.driverCode) {
      const driver = driversStore.drivers.find((d) => d.code === vehicle.driverCode)
      if (driver) dispatchForm.value.driverName = `${driver.firstName} ${driver.lastName}`
    }
    // เลือกรถแล้ว ถ้ายังไม่ได้กรอกเลขไมล์เริ่มต้นเอง ดึงเลขไมล์สิ้นสุดของเที่ยวก่อนหน้าของรถคันนี้มาให้อัตโนมัติ
    if (!dispatchForm.value.odometerBefore && dispatchTarget.value) {
      const prevOdometer = latestOdometerForPlate(plateText, dispatchTarget.value.id)
      if (prevOdometer) dispatchForm.value.odometerBefore = prevOdometer.odometerAfter || 0
    }
  }
)

const confirmDispatch = () => {
  if (!dispatchTarget.value || !dispatchForm.value.plate) return
  const selectedDriver = dispatchForm.value.driverName ? findDriverByName(dispatchForm.value.driverName) : undefined
  bookingStore.dispatchBooking(dispatchTarget.value.id, dispatchForm.value.plate, {
    driverName: dispatchForm.value.driverName || undefined,
    driverId: selectedDriver?.id,
    driverFirstName: selectedDriver?.firstName,
    driverLastName: selectedDriver?.lastName,
    odometerBefore: dispatchForm.value.odometerBefore,
  })
  // ปรับคนขับประจำของรถให้ตรงกับที่เลือกจ่ายงานจริง เพื่อให้ทุกหน้าที่ใช้รถเห็นคนขับล่าสุด
  if (selectedDriver) {
    const vehicle = vehiclesStore.findByFullPlate(dispatchForm.value.plate)
    if (vehicle) vehiclesStore.assignDriver(vehicle.id, selectedDriver.code)
  }
  dispatchTarget.value = null
}

/** งานฝั่ง Admin กด "✓ คนขับตอบรับงาน" แทนคนขับได้ทันที ไม่ต้องรอกดรับในแอปคนขับ (Phase 1 ข้อ 4)
 *  ใช้ acceptDispatch เดิมตัวเดียวกับที่ Driver Mobile เรียก ไม่มี logic คำนวณใหม่ ไม่แตะ D1-D7 */
const adminAcceptDispatch = (booking: Booking) => {
  bookingStore.acceptDispatch(booking.id)
}

/**
 * Hard Delete Booking — ลบถาวร เฉพาะ ADMIN เท่านั้น (บังคับสิทธิ์ซ้ำที่นี่ แม้ปุ่มจะซ่อนจาก UI ไปแล้วสำหรับ role อื่น
 * ดู isAdmin/BookingActionMenu.vue's canHardDelete — ชั้นจริงที่บังคับสิทธิ์คือ bookingStore.hardDeleteBooking()
 * และ Firestore Rules)
 *
 * เดิมฟังก์ชันนี้ "บล็อก" การลบถ้ามีเอกสารบัญชีอ้างอิงงานนี้อยู่ (ต้องไปยกเลิกเอกสารเองก่อน) — ตาม Requirement ใหม่
 * (Hard Delete Booking) เปลี่ยนเป็น "อนุญาตให้ลบพร้อม Cascade เอกสารที่อ้างอิงทั้งหมด" แทน โดยแจ้งผลกระทบให้ชัดเจน
 * ใน Confirmation ก่อนเสมอ (ดู bookingStore.hardDeleteBooking ที่ทำการลบจริงแบบ atomic ผ่าน Firestore batch)
 *
 * ยังคงคืนสต๊อกที่ตัดไปแล้ว (ถ้ามีรายการที่กดรับสินค้าไปแล้ว) ด้วย reverseDeliveryMovement ตัวเดิมเหมือนเดิมทุกประการ
 * (reuse ของเดิม ไม่สร้าง/ไม่แก้ logic คืนสต๊อก) แต่ย้ายมาทำ "หลัง" ลบสำเร็จจริงเท่านั้น กันคืนสต๊อกไปแล้วทั้งที่ลบไม่สำเร็จ
 */
const deleteBooking = async (booking: Booking) => {
  if (!isAdmin.value) return
  const refs = salesDocumentsStore.documentsReferencingBooking(booking.id)

  const confirmMessage =
    refs.length === 0
      ? `⚠️ ลบ Booking ถาวร\n\nBooking: ${booking.docNo}\nลูกค้า: ${booking.customer}\n\nการลบเป็นการลบถาวร ไม่สามารถกู้คืนได้`
      : `⚠️ ลบ Booking ถาวร\n\nBooking: ${booking.docNo}\nลูกค้า: ${booking.customer}\n\nพบเอกสารที่เกี่ยวข้อง ${refs.length} รายการ:\n` +
        refs.map((d) => `- ${d.number} (${d.type})`).join('\n') +
        `\n\nการดำเนินการนี้จะ:\n- ลบ Booking\n- ลบเอกสารที่อ้างอิง Booking\n- ลบรายการสินค้าในเอกสารที่เกี่ยวข้อง\n\nข้อมูลทั้งหมดจะถูกลบถาวรและไม่สามารถกู้คืนได้`

  if (!confirm(confirmMessage)) return

  const result = await bookingStore.hardDeleteBooking(booking.id)
  if (!result.ok) {
    alert(result.message || 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    return
  }
  // ลบสำเร็จจริงแล้วเท่านั้นถึงจะคืนสต๊อกที่ตัดไปแล้ว (ถ้ามีรายการที่กดรับสินค้าไปแล้ว) — reuse ของเดิมทุกประการ
  const pickedItems = booking.items.filter((i) => i.pickupStatus === 'PICKED_UP')
  if (pickedItems.length) inventoryStore.reverseDeliveryMovement(booking, pickedItems)
  alert(`ลบงาน ${booking.docNo} ถาวรสำเร็จแล้ว`)
}

// --- เลือกหลายรายการ + ลบถาวรพร้อมกัน (เฉพาะ ADMIN) — เหมือน CompletedJobsView.vue's selected/bulkDeleteSelected
// ทุกประการ แต่แยกตัวแปร/ฟังก์ชันเป็นชุดของตัวเอง (selectedInProgress/bulkDeleteSelectedInProgress) เพราะทำงานกับ
// inProgressBookings คนละรายการกับ completedBookings คนละหน้า
const selectedInProgress = ref<Record<string, boolean>>({})
const selectedInProgressIds = computed(() => Object.keys(selectedInProgress.value).filter((id) => selectedInProgress.value[id]))
const allInProgressSelected = computed(
  () => inProgressBookings.value.length > 0 && inProgressBookings.value.every((b) => selectedInProgress.value[b.id])
)
const toggleSelectAllInProgress = () => {
  const next = !allInProgressSelected.value
  inProgressBookings.value.forEach((b) => {
    selectedInProgress.value[b.id] = next
  })
}

const bulkDeletingInProgress = ref(false)
const bulkDeleteSelectedInProgress = async () => {
  if (!isAdmin.value || bulkDeletingInProgress.value) return
  const targets = inProgressBookings.value.filter((b) => selectedInProgress.value[b.id])
  if (!targets.length) return

  const preview = targets.slice(0, 20).map((b) => `- ${b.docNo} (${b.customer || '-'})`).join('\n')
  const more = targets.length > 20 ? `\n...และอีก ${targets.length - 20} รายการ` : ''
  const confirmed = confirm(
    `⚠️ ลบ Booking ถาวร ${targets.length} รายการ\n\n${preview}${more}\n\nการลบเป็นการลบถาวร ไม่สามารถกู้คืนได้ (รวมเอกสารที่อ้างอิงทุกรายการด้วย)`
  )
  if (!confirmed) return

  bulkDeletingInProgress.value = true
  let ok = 0
  const failed: string[] = []
  for (const booking of targets) {
    const result = await bookingStore.hardDeleteBooking(booking.id)
    if (result.ok) {
      ok++
      delete selectedInProgress.value[booking.id]
      const pickedItems = booking.items.filter((i) => i.pickupStatus === 'PICKED_UP')
      if (pickedItems.length) inventoryStore.reverseDeliveryMovement(booking, pickedItems)
    } else {
      failed.push(`${booking.docNo}: ${result.message || 'ไม่ทราบสาเหตุ'}`)
    }
  }
  bulkDeletingInProgress.value = false
  alert(`ลบสำเร็จ ${ok}/${targets.length} รายการ` + (failed.length ? `\n\nรายการที่ลบไม่สำเร็จ:\n${failed.join('\n')}` : ''))
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

const onCancelDispatch = (booking: Booking) => {
  if (!confirm(`ยกเลิกการจ่ายงาน ${booking.docNo} และคืนกลับไปที่ตารางจองงาน?`)) return
  bookingStore.declineDispatch(booking.id)
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
  const standardFuelLiters = fuelRateStore.standardFuelLiters(booking.items, booking.pricingMode) || null
  const fuelCompensation = standardFuelLiters !== null ? Math.round((standardFuelLiters - (booking.fuelLiters || 0)) * (booking.fuelRate || 0)) : null
  return { distanceKm, cumulativeKm, avgKmPerLiter, standardFuelLiters, fuelCompensation }
})

const confirmComplete = () => {
  if (!completeTarget.value) return
  const bookingId = completeTarget.value.id
  bookingStore.completeJob(
    bookingId,
    debtAdjustments.value.filter((d) => d.label || d.amount),
    completeOdometerAfter.value || undefined
  )
  /** Phase 2: เลิกสร้างใบวางบิลอัตโนมัติตอนจบงาน — Booking ต้องไม่เป็น Trigger ของ Billing อีกต่อไป
   *  ผู้ใช้ต้องไปสร้างใบวางบิลเองที่หน้า "ใบวางบิล" (รวมหลายงาน) หรือปุ่ม "ออกใบวางบิล" ที่หน้าใบสั่งสินค้า (เดี่ยว) */
  completeTarget.value = null
}

// --- นำเข้า Booking จากไฟล์ Excel งานจริง (Requirement: "Import Excel เพื่อสร้างงาน" ตามคอลัมน์ที่หน้างานใช้อยู่จริง) ---
// 1 แถว Excel = 1 Booking เสมอ (ไม่มีคอลัมน์กลุ่มงานแล้วเหมือนเทมเพลตเดิม) — เจตนาของฟีเจอร์นี้เปลี่ยนจาก "สร้างงานใหม่
// จากข้อมูลที่ครบถ้วน" เป็น "นำข้อมูลงานจริง (ที่อาจกรอกไม่ครบ/มีสถานะไปไกลแล้ว) เข้าระบบให้ได้ก่อน" ตามที่ตกลงกันไว้:
// ห้ามข้าม/บล็อกแถวเด็ดขาดแม้ข้อมูลน้ำมัน/ปลายทาง/ราคาจะไม่ครบ ให้สร้างงานได้เสมอแล้วแปะหมายเหตุ (note) ไว้ให้ไปกรอกเพิ่มทีหลัง
const IMPORT_HEADERS = {
  driverName: 'พขร.',
  vehicleRegistration: 'ทะเบียนรถ',
  plate: 'คอนเฟิร์ม',
  docRef: 'เลขที่เอกสาร',
  customer: 'บมจ./บจก./ร้าน/หจก.',
  ticketChecked: 'เช็คตั๋ว',
  time: 'time',
  siteName: 'สถานที่ส่งสินค้า',
  districtProvince: 'อำเภอ/จังหวัด',
  phone: 'เบอร์',
  product: 'ชนิดปูน',
  qty: 'จำนวนตัน',
  allowance: 'เบี้ยเลี้ยง',
  price: 'ราคาปูน',
  fuel: 'น้ำมัน',
  status: 'สถานะขนส่งสินค้า',
  note: 'หมายเหตุ',
} as const

interface ImportRowResult {
  rowNumber: number
  isEmpty: boolean
  driverName: string
  driverId?: string
  plate: string
  docRef: string
  customer: string
  ticketChecked: boolean
  time: string
  siteName: string
  district: string
  province: string
  siteContactName: string
  phone: string
  product: string
  /** แยกจาก product ด้วยเครื่องหมาย "+" (เช่น "23 + 52" → ["23","52"]) — กรณีแถวเดียวมีหลายชนิดสินค้าปนกัน
   *  ตัวแรกใช้เป็นสินค้าหลักของ Item เดิม ตัวที่เหลือไปเป็น extraProducts (ดู confirmImport) */
  productCodes: string[]
  /** สินค้าแต่ละชนิดคู่กับจำนวนตันของตัวเอง (จับคู่ตามตำแหน่งกับคอลัมน์จำนวนตันที่แยกด้วย + เหมือนกัน) — ใช้สร้าง
   *  extraProducts ตอน confirmImport แทนการเดาแบ่ง qty รวมเท่าๆ กันทุกชนิด */
  productQtyPairs: { product: string; qty: number }[]
  qty: number
  allowance: number
  price: number
  fuelLiters: number
  status: BookingStatus
  statusRaw: string
  deliveredAt?: Date
  note: string
  warnings: string[]
}

const importModalOpen = ref(false)
const importRows = ref<ImportRowResult[]>([])
const importFileName = ref('')
/** วันที่ลงงาน (booking.loadingDate) ของทุกแถวในไฟล์นี้ — ดึงมาจาก Row แรกของไฟล์ (แถวหัวเรื่องเหนือแถวหัวคอลัมน์)
 *  เช่น "ตารางงานจัดงานปูน ส่งวันที่ 19-09-69 (ศุกร์ >> เสาร์)" เอาเฉพาะวันที่แรกที่เจอ ไม่ใช่ช่วงวันทั้งหมด */
const importShipDate = ref<Date | undefined>()

const openImportModal = () => {
  importRows.value = []
  importFileName.value = ''
  importShipDate.value = undefined
  importModalOpen.value = true
}
const closeImportModal = () => {
  importModalOpen.value = false
}

/** ซ่อมค่าเที่ยวงาน Import โดยอ้างอิงไฟล์ Excel ต้นฉบับจริง — คนละเครื่องมือกับ backfillImportedTripFee (ที่ทำงานอัตโนมัติ
 *  อยู่แล้วเบื้องหลัง อาศัยยอดจากใบสั่งสินค้าที่มีอยู่) เครื่องมือนี้ใช้สำหรับเคสที่ใบสั่งสินค้าเองก็ผิดไปด้วย (เช่น
 *  จำนวนตันเขียนแบบ "0.40 + 9.60" ทำให้ parse พลาดตั้งแต่ตอน import ครั้งแรก) จึงต้องย้อนไปเทียบกับไฟล์ต้นฉบับจริงแทน
 *  จับคู่ด้วยการเทียบ วันที่/ลูกค้า/ทะเบียนรถ/สินค้า/คนขับ (ต้องตรงกันอย่างน้อย 4 ใน 5 อย่าง กันจับคู่ผิดงาน) แล้วเติม
 *  เฉพาะ field ที่ยังว่าง/เป็น 0 อยู่เท่านั้น ไม่เขียนทับข้อมูลที่มีอยู่แล้วไม่ว่ากรณีใด */
const reconcileModalOpen = ref(false)
const reconcileFileName = ref('')
const reconcileRows = ref<ImportRowResult[]>([])
const reconcileShipDate = ref<Date | undefined>()
const reconciling = ref(false)

const openReconcileModal = () => {
  reconcileFileName.value = ''
  reconcileRows.value = []
  reconcileShipDate.value = undefined
  reconcileManualPick.value = {}
  reconcileModalOpen.value = true
}
const closeReconcileModal = () => {
  reconcileModalOpen.value = false
}

const handleReconcileFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  reconcileFileName.value = file.name
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const firstCell = String(allRows[0]?.[0] ?? '').trim()
  const hasTitleRow = firstCell !== IMPORT_HEADER_MARKER
  reconcileShipDate.value = hasTitleRow ? parseShipDateFromTitle((allRows[0] || []).join(' ')) : undefined
  const headerRowIndex = hasTitleRow ? 1 : 0
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', range: headerRowIndex })
  reconcileRows.value = raw.map((r, idx) => parseImportRow(r, idx + headerRowIndex + 2, reconcileShipDate.value)).filter((r) => !r.isEmpty)
  reconcileManualPick.value = {}
  input.value = ''
}

/** ผู้ใช้เลือกงานเองแทนผลจับคู่อัตโนมัติ ต่อแถว (key = rowNumber, value = booking id หรือ '' = ไม่จับคู่เลย) — ใช้ตอน
 *  จับคู่อัตโนมัติได้คะแนนไม่ถึงเกณฑ์ (เช่น ไฟล์ไม่มีคอลัมน์ "ทะเบียนรถ" ทำให้ทะเบียน/คนขับเทียบไม่ตรง) แต่ผู้ใช้ดู
 *  ข้อมูลอื่นแล้วมั่นใจว่าเป็นงานเดียวกันจริง */
const reconcileManualPick = ref<Record<number, string>>({})

const reconcileBreakdownLabel: Record<keyof ReconcileMatchBreakdown, string> = {
  date: 'วันที่',
  customer: 'ลูกค้า',
  plate: 'ทะเบียนรถ',
  product: 'สินค้า',
  driver: 'คนขับ',
}

const reconcilePreview = computed(() =>
  reconcileRows.value.map((row) => {
    const candidates = findReconcileMatches(row, bookingStore.bookings, reconcileShipDate.value)
    const topCandidates = candidates.slice(0, 5)
    const autoBooking = candidates[0] && candidates[0].score >= RECONCILE_MIN_MATCH ? candidates[0].booking : undefined
    const manualPick = reconcileManualPick.value[row.rowNumber]
    const booking =
      manualPick === undefined ? autoBooking : manualPick === '' ? undefined : candidates.find((c) => c.booking.id === manualPick)?.booking
    const patches = booking ? computeReconcilePatches(row, booking) : []
    return {
      row,
      booking,
      topCandidates,
      matchScore: candidates[0]?.score ?? 0,
      breakdown: candidates[0]?.breakdown,
      isManual: manualPick !== undefined,
      patches,
    }
  })
)
const reconcileMatchedCount = computed(() => reconcilePreview.value.filter((r) => r.booking).length)
const reconcilePatchableCount = computed(() => reconcilePreview.value.filter((r) => r.patches.length > 0).length)

const confirmReconcile = () => {
  if (!reconcilePatchableCount.value || reconciling.value) return
  reconciling.value = true
  try {
    const details: string[] = []
    reconcilePreview.value.forEach(({ booking, patches }) => {
      if (!booking || patches.length === 0) return
      const patch: { tripFee?: number; allowance?: number; fuelLiters?: number; itemQty?: number } = {}
      patches.forEach((p) => {
        if (p.field === 'ค่าเที่ยว') patch.tripFee = p.to
        if (p.field === 'เบี้ยเลี้ยง') patch.allowance = p.to
        if (p.field === 'น้ำมัน (ลิตร)') patch.fuelLiters = p.to
        if (p.field === 'จำนวนตัน') patch.itemQty = p.to
      })
      const applied = bookingStore.applyImportReconciliation(booking.id, patch)
      if (applied.length) details.push(`- ${booking.docNo}: ${applied.join(', ')}`)
    })
    alert(details.length ? `ซ่อมข้อมูลให้ ${details.length} งานแล้ว:\n${details.join('\n')}` : 'ไม่พบงานที่จับคู่ได้และมีข้อมูลว่าง/0 ให้ซ่อม')
    closeReconcileModal()
  } finally {
    reconciling.value = false
  }
}

/** คอลัมน์แรกสุดของชีทงานจริงเสมอ (ทั้งไฟล์ที่มี Row หัวเรื่อง+วันที่ และไฟล์ที่ไม่มี) ใช้เช็คใน handleImportFile ว่า
 *  Row แรกของไฟล์ที่อัปโหลดเป็นหัวคอลัมน์เลย (ไม่มีหัวเรื่อง) หรือเป็นหัวเรื่อง/วันที่ส่งงานที่ต้องข้ามไปอีก 1 แถว */
const IMPORT_HEADER_MARKER = 'ลำดับ'

/** ลำดับคอลัมน์ทั้งหมดของชีทงานจริง รวมคอลัมน์ที่ไม่ได้ใช้เก็บข้อมูล (ลำดับ/เที่ยวที่ — เที่ยวที่คำนวณสดเสมอ ดู
 *  driverTripNumberForBooking) ไว้ด้วย เพื่อให้ Template ที่ดาวน์โหลดหน้าตาตรงกับไฟล์งานจริงเป๊ะ และ Row แรกของ
 *  Template ขึ้นต้นด้วย "ลำดับ" เหมือนไฟล์จริงที่ไม่มีหัวเรื่อง (ดู IMPORT_HEADER_MARKER) */
const IMPORT_COLUMN_ORDER = [
  IMPORT_HEADER_MARKER,
  'เที่ยวที่',
  IMPORT_HEADERS.driverName,
  IMPORT_HEADERS.vehicleRegistration,
  IMPORT_HEADERS.plate,
  IMPORT_HEADERS.docRef,
  IMPORT_HEADERS.customer,
  IMPORT_HEADERS.ticketChecked,
  IMPORT_HEADERS.time,
  IMPORT_HEADERS.siteName,
  IMPORT_HEADERS.districtProvince,
  IMPORT_HEADERS.phone,
  IMPORT_HEADERS.product,
  IMPORT_HEADERS.qty,
  IMPORT_HEADERS.allowance,
  IMPORT_HEADERS.price,
  IMPORT_HEADERS.fuel,
  IMPORT_HEADERS.status,
  IMPORT_HEADERS.note,
]

/** สร้างไฟล์ตัวอย่างคอลัมน์ตรงกับชีทงานจริงที่ใช้อยู่ทุกคอลัมน์ (รวมคอลัมน์ที่ไม่ได้ใช้จริงด้วย ดู IMPORT_COLUMN_ORDER)
 *  ไม่มีแถวหัวเรื่อง/วันที่ส่งงาน — ถ้าอยากได้แบบมีวันที่ ให้เพิ่มแถวนั้นเองเหนือแถวหัวคอลัมน์นี้ (ระบบรองรับทั้ง 2 แบบ) */
const downloadImportTemplate = () => {
  const sampleRow = [
    1,
    '',
    '',
    '',
    '',
    '',
    'ตัวอย่าง บริษัท จำกัด',
    '',
    '',
    'ชื่อหน้างาน',
    'อำเภอ/จังหวัด',
    '',
    '',
    0,
    0,
    0,
    '',
    bookingStatusLabel.WAITING_DISPATCH,
    '',
  ]
  const worksheet = XLSX.utils.aoa_to_sheet([IMPORT_COLUMN_ORDER, sampleRow])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, 'Booking_Import_Template.xlsx')
}

/** อ่านวันที่แรกที่เจอในข้อความหัวเรื่อง รูปแบบ DD-MM-YY/YYYY (พ.ศ.) เช่น "19-09-69" หรือ "19/09/2569" — เอาแค่วันที่แรก
 *  แม้หัวเรื่องจะมีช่วงวันที่ (เช่น "(ศุกร์ >> เสาร์)") ต่อท้ายก็ตาม ปีที่กรอก 2 หลักถือเป็น พ.ศ. ย่อ (69 = 2569) */
const parseShipDateFromTitle = (text: string): Date | undefined => {
  const match = text.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{2,4})/)
  if (!match) return undefined
  const day = Number(match[1])
  const month = Number(match[2])
  const beYear = Number(match[3]) < 100 ? Number(match[3]) + 2500 : Number(match[3])
  const date = new Date(beYear - 543, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** แปลงแถว Excel ดิบเป็นข้อมูลที่ใช้สร้าง Booking ได้ทันที — ไม่มี error ที่บล็อกการสร้างงานอีกต่อไป (ตามที่ตกลง)
 *  ข้อมูลส่วนไหนขาด/จับคู่ไม่ได้ (คนขับไม่พบในทะเบียน, น้ำมัน/ปลายทางไม่มีเรท, สถานะไม่ตรง ฯลฯ) จะถูกสะสมไว้ใน warnings
 *  แล้วต่อท้ายเข้า note ของ Booking ให้ออฟฟิศไปตรวจ/กรอกเพิ่มทีหลัง แถวที่ไม่มีข้อมูลอะไรเลย (isEmpty) จะถูกข้ามตอนสร้างจริง
 *  เพราะถือเป็นแถวว่างท้ายชีท ไม่ใช่ข้อมูลที่ตั้งใจกรอก */
/** ดึงช่วง/จุดเวลา (เช่น "08.00 - 17.00" หรือ "07:14") ออกจากข้อความที่อาจมีข้อความอื่นปนมาด้วย (เช่น "ย้ำ!! ตราประทับ")
 *  คืนทั้งเวลาที่เจอ (ถ้ามี) และข้อความส่วนที่เหลือ (ไม่รวมเวลา) ไว้ไปต่อเป็นหมายเหตุแทนการทิ้งไป */
const extractTimeAndText = (raw: string): { time: string; text: string } => {
  const match = raw.match(/\d{1,2}[.:]\d{2}(?:\s*-\s*\d{1,2}[.:]\d{2})?/)
  const time = match ? match[0].replace(/\s+/g, '') : ''
  const text = (match ? raw.replace(match[0], '') : raw).replace(/[\r\n]+/g, ' ').trim()
  return { time, text }
}

/** แยกชื่อผู้ติดต่อออกจากเบอร์โทร ในกรณีที่ Excel กรอกปนกันมาในช่องเดียว (เช่น "ผรม.กรวีวัลย์ โฮมเวิร์ค\nช่างจอม 086-3347315")
 *  เก็บเบอร์แรกที่เจอไว้ที่ sitePhone (ไว้ใช้กดโทรได้ตรงๆ) ส่วน contactName เก็บข้อความเต็มทั้งหมด (ขึ้นบรรทัดใหม่แทนด้วย ", ")
 *  ไว้เผื่อมีมากกว่า 1 ชื่อ/เบอร์ในช่องเดียว — ไม่ทิ้งข้อมูลไหนไป แค่แยกเบอร์แรกออกมาเป็นฟิลด์ที่ใช้งานง่ายเพิ่ม */
const splitContactPhone = (raw: string): { contactName: string; phone: string } => {
  const phoneMatch = raw.match(/0[\d\-\s]{7,}\d/)
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s-]+/g, '') : ''
  const contactName = raw.replace(/[\r\n]+/g, ', ').trim()
  return { contactName, phone }
}

const parseImportRow = (raw: Record<string, unknown>, rowNumber: number, shipDateOverride?: Date): ImportRowResult => {
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(str(v))
    return Number.isFinite(n) ? n : 0
  }

  const driverName = str(raw[IMPORT_HEADERS.driverName])
  // ทะเบียนรถ = เลขทะเบียนจริง (มักยังไม่กรอกตอนจัดคิวล่วงหน้า), คอนเฟิร์ม = รหัสรถที่ใช้ยืนยันคิวเบื้องต้น —
  // ใช้ทะเบียนรถก่อนถ้ามี ไม่งั้น fallback ไปโค้ดในคอนเฟิร์ม เพราะ Booking มีที่เก็บได้แค่ช่องเดียว (plate)
  const plate = str(raw[IMPORT_HEADERS.vehicleRegistration]) || str(raw[IMPORT_HEADERS.plate])
  const docRef = str(raw[IMPORT_HEADERS.docRef])
  const customer = str(raw[IMPORT_HEADERS.customer])
  // คอลัมน์ "time" ในไฟล์จริงมักมีข้อความอื่นปนมากับเวลา (เช่น "ย้ำ!! ตราประทับ") — แยกเวลาไว้ใช้เป็น loadingTime
  // จริงๆ ส่วนข้อความที่เหลือไปต่อแถวหมายเหตุแทนที่จะทิ้ง
  const { time, text: timeExtraText } = extractTimeAndText(str(raw[IMPORT_HEADERS.time]))
  const siteName = str(raw[IMPORT_HEADERS.siteName])
  // คอลัมน์ "เบอร์" มักกรอกชื่อผู้ติดต่อ+เบอร์โทรปนกันมาในช่องเดียว — แยกเบอร์ออกมาเป็น field ใช้งานง่าย
  // (sitePhone) ส่วนข้อความเต็มเก็บไว้ที่ siteContactName ไม่ให้ข้อมูลหาย
  const { contactName: siteContactName, phone } = splitContactPhone(str(raw[IMPORT_HEADERS.phone]))
  const product = str(raw[IMPORT_HEADERS.product])
  // "23 + 52" หรือ "52 + 13 + 23" หมายถึงหลายชนิดสินค้าปนมาในเที่ยวเดียว ไม่ใช่ชื่อสินค้าชื่อเดียวที่มีเครื่องหมาย +
  // อยู่ในชื่อ — แยกออกเป็นรายการเดี่ยวๆ ไปแสดงแบบคอลัมน์ (ดู productColumns + JobItem.extraProducts) ยืนยันจากไฟล์จริง
  // แล้วว่า "จำนวนตัน" ก็แยกด้วย + คู่กันตำแหน่งต่อตำแหน่งเช่นกัน (เช่น "23 + 13" คู่กับ "0.40 + 9.60")
  const productCodes = product
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  // เดิม num() พาร์สค่าดิบทั้งก้อนตรงๆ ("0.40 + 9.60") ได้ NaN แล้ว fallback เป็น 0 เงียบๆ — เป็นสาเหตุจริงที่ทำให้
  // งานที่มีสินค้าหลายชนิดในเที่ยวเดียว (จำนวนตันเขียนแบบ "0.40 + 9.60") ได้ tripFee/ยอดใบสั่งสินค้าเป็น 0 ทั้งที่ราคา
  // ปูนกรอกมาถูกต้อง (ไม่มีคำเตือนราคาให้สังเกตด้วย) — แก้ด้วยการแยกตามเครื่องหมาย + แล้วรวมยอดจริงแทน (ค่าปกติที่ไม่มี +
  // เลยก็ยังพาร์สได้ผลลัพธ์เดิมทุกประการ เพราะ split บนสตริงไม่มี + ได้ array 1 ตัวเท่ากับค่าเดิม)
  const qtyStr = str(raw[IMPORT_HEADERS.qty])
  const qtyParts = qtyStr
    .split('+')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
  const qty = qtyParts.length ? Math.round(qtyParts.reduce((sum, n) => sum + n, 0) * 100) / 100 : 0
  /** จับคู่สินค้ากับจำนวนตันเป็นรายชนิด — ใช้ได้เฉพาะตอนจำนวนชิ้นตรงกันเป๊ะ (กรณีปกติ) ถ้าจำนวนไม่ตรงกัน (ข้อมูลกรอกมา
   *  ไม่สมบูรณ์ เช่น เขียนโค้ดสินค้าปนเครื่องหมาย "-" จนแยกจำนวนชนิดผิด) ให้ยกยอดรวมทั้งหมดไปไว้ที่สินค้าตัวแรกก่อน
   *  แทนการเดาแบ่งเอง แล้วเตือนให้ไปตรวจสอบเอง (ดู warnings ด้านล่าง) */
  const productQtyPairs =
    productCodes.length > 0 && productCodes.length === qtyParts.length
      ? productCodes.map((p, i) => ({ product: p, qty: qtyParts[i] }))
      : productCodes.map((p, i) => ({ product: p, qty: i === 0 ? qty : 0 }))
  const allowance = num(raw[IMPORT_HEADERS.allowance])
  const price = num(raw[IMPORT_HEADERS.price])
  const noteRaw = str(raw[IMPORT_HEADERS.note])
  const statusRaw = str(raw[IMPORT_HEADERS.status])

  const [districtRaw, provinceRaw] = str(raw[IMPORT_HEADERS.districtProvince]).split('/')
  const district = (districtRaw || '').trim()
  const province = (provinceRaw || '').trim()

  const isEmpty = !driverName && !customer && !siteName && !product

  const warnings: string[] = []

  const matchedDriver = driverName ? matchDriverForImport(driverName, plate) : undefined
  if (driverName && !matchedDriver) warnings.push(`ชื่อเล่นคนขับ "${driverName}" ไม่ตรงกับที่ผูกไว้ในระบบ (เทียบกับทะเบียนรถแล้ว) — เว้นคนขับว่างไว้ก่อน`)

  if (!allowance) warnings.push('ต้องกรอกเพิ่ม: เบี้ยเลี้ยง')
  if (!price) warnings.push('ต้องกรอกเพิ่ม: ราคาปูน')
  // เดิมไม่เช็คว่าขาดจำนวนตันเลย — งานที่ Excel ไม่กรอกจำนวนตันมาจะเงียบๆ กลายเป็น 0 ตันโดยไม่มีคำเตือนใดๆ
  // (ต่างจากราคา/เบี้ยเลี้ยงที่เตือนอยู่แล้ว) ทำให้ผู้ใช้งงว่าทำไมน้ำหนัก/ราคาเป็น 0 ทั้งที่สินค้ากรอกมาถูกต้อง
  if (!qty) warnings.push('ต้องกรอกเพิ่ม: จำนวนตัน')
  if (productCodes.length > 1 && productCodes.length !== qtyParts.length) {
    warnings.push(`สินค้าหลายชนิดในเที่ยวเดียว (${productCodes.join(' + ')}) แต่จำนวนตันแยกไม่ตรงกับจำนวนชนิดสินค้า — ยกยอดรวมไปไว้ที่ "${productCodes[0]}" ก่อน ตรวจสอบแยกจำนวนตันต่อชนิดเองภายหลัง`)
  }

  const fuelFromExcel = num(raw[IMPORT_HEADERS.fuel])
  const configuredFuelRate = province && district ? fuelRateStore.findRate(province, district)?.liters : undefined
  let fuelLiters = fuelFromExcel || configuredFuelRate || 0
  if (!fuelLiters || !province || !district) {
    warnings.push('ตรวจสอบข้อมูลน้ำมัน/ปลายทาง')
  } else if (fuelFromExcel && configuredFuelRate && fuelFromExcel !== configuredFuelRate) {
    // น้ำมันจาก Excel ไม่ตรงกับเรทที่ตั้งค่าไว้สำหรับปลายทางนี้ — ยังใช้ค่าจาก Excel ตามเดิม (ไม่ใช้เรทตั้งค่าทับ) แค่เตือนให้ตรวจสอบ
    warnings.push(`น้ำมันจาก Excel (${fuelFromExcel} ล.) ไม่ตรงกับเรทที่ตั้งไว้สำหรับ ${district}/${province} (${configuredFuelRate} ล.)`)
  }

  // "สถานะขนส่งสินค้า" บางไฟล์กรอกเป็นเวลาที่ส่งของเสร็จ (เช่น "07:14") แทนสถานะข้อความ — ถือว่าจบงานแล้ว (DELIVERED)
  // ที่เวลานั้น ยังคงพยายาม match กับป้ายสถานะข้อความปกติก่อนเสมอ (ของเดิม) แล้วค่อย fallback มาเช็คว่าเป็นเวลาไหม
  const matchedStatusEntry = Object.entries(bookingStatusLabel).find(([, label]) => label === statusRaw)
  const statusTimeMatch = statusRaw.match(/(\d{1,2})[:.](\d{2})/)
  let status: BookingStatus = 'WAITING_DISPATCH'
  let deliveredAt: Date | undefined
  if (matchedStatusEntry) {
    status = matchedStatusEntry[0] as BookingStatus
  } else if (statusTimeMatch) {
    status = 'DELIVERED'
    const shipDate = shipDateOverride ?? importShipDate.value
    if (shipDate) {
      deliveredAt = new Date(shipDate)
      deliveredAt.setHours(Number(statusTimeMatch[1]), Number(statusTimeMatch[2]), 0, 0)
    } else {
      warnings.push(`ส่งของสำเร็จเวลา ${statusRaw} (ไม่มีวันที่จากไฟล์ ระบุเวลาส่งของให้ไม่ได้ครบ)`)
    }
  } else if (statusRaw) {
    warnings.push(`สถานะจาก Excel ไม่ตรงกับระบบ: "${statusRaw}"`)
  }

  const note = [timeExtraText, noteRaw, ...warnings].filter(Boolean).join(' | ')

  return {
    rowNumber,
    isEmpty,
    // ถ้าจับคู่ชื่อเล่น+ทะเบียนรถไม่ได้ ให้เว้นชื่อคนขับว่างไว้เลย (ไม่ใช้ชื่อเล่นดิบจากไฟล์ตรงๆ เพราะ driverName ของ
    // Booking ใช้คำนวณเงินเดือนจริง ต้องเป็นชื่อ-นามสกุลที่ยืนยันแล้วเท่านั้น) — ชื่อเล่นดิบยังอยู่ใน warnings/note ด้านบน
    driverName: matchedDriver ? driversStore.fullName(matchedDriver) : '',
    driverId: matchedDriver?.id,
    plate,
    docRef,
    customer,
    ticketChecked: !!str(raw[IMPORT_HEADERS.ticketChecked]),
    time,
    siteName,
    district,
    province,
    siteContactName,
    phone,
    product,
    productCodes,
    productQtyPairs,
    qty,
    allowance,
    price,
    fuelLiters,
    status,
    statusRaw,
    deliveredAt,
    note,
    warnings,
  }
}

/** รองรับไฟล์ทั้ง 2 แบบ: (1) Row แรกเป็นหัวคอลัมน์เลย (ไม่มีหัวเรื่อง/วันที่) และ (2) Row แรกเป็นหัวเรื่อง+วันที่ส่งงาน
 *  แล้ว Row ที่สองถึงเป็นหัวคอลัมน์จริง — เช็คจากคอลัมน์แรกสุดของ Row แรก: ถ้าไม่ใช่ "ลำดับ" (IMPORT_HEADER_MARKER)
 *  ถือว่าเป็นหัวเรื่อง ต้องข้ามไปอีก 1 แถวถึงจะถึงหัวคอลัมน์จริง (เดิม fix ค่า range=1 ตายตัวเสมอ ทำให้ไฟล์แบบ (1)
 *  ถูกอ่านหัวคอลัมน์ผิดแถวไปเป็นข้อมูลแถวแรกแทน แล้วสร้างงานไม่ได้เลยเพราะ mapping ทุกคอลัมน์เพี้ยนหมด) */
const handleImportFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importFileName.value = file.name
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const firstCell = String(allRows[0]?.[0] ?? '').trim()
  const hasTitleRow = firstCell !== IMPORT_HEADER_MARKER
  importShipDate.value = hasTitleRow ? parseShipDateFromTitle((allRows[0] || []).join(' ')) : undefined
  const headerRowIndex = hasTitleRow ? 1 : 0
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', range: headerRowIndex })
  importRows.value = raw.map((r, idx) => parseImportRow(r, idx + headerRowIndex + 2))
  input.value = ''
}

const importableRows = computed(() => importRows.value.filter((r) => !r.isEmpty))
const importWarningRowCount = computed(() => importableRows.value.filter((r) => r.warnings.length > 0).length)

/** สร้าง Booking จริงทีละแถว — เลขที่เอกสาร/ใบปล่อยรถยังออกอัตโนมัติตามปกติเสมอ (ไม่ใช้เลขจาก Excel ตรงๆ กันชนกับ
 *  เลขที่ระบบเคยออกไปแล้ว) ส่วนเลขที่เอกสารจาก Excel เก็บไว้ที่ booking.reference เพื่ออ้างอิงย้อนหลังเท่านั้น
 *  สถานะงาน (status) เซ็ตตรงจากที่ import มาได้เลยเพราะ addBooking บังคับ WAITING_DISPATCH เสมอ (ดู stores/booking.ts) —
 *  จึงต้องเซ็ตทับหลังสร้างเสร็จ ไม่ backfill timestamp อื่น (dispatchedAt/completedAt ฯลฯ) ให้เพราะเป็นข้อมูลนำเข้า ไม่ใช่
 *  งานที่เดินผ่าน flow จริง */
const confirmImport = () => {
  if (!importableRows.value.length) return
  importableRows.value.forEach((row) => {
    // "23 + 52" ฯลฯ = หลายชนิดสินค้าในเที่ยวเดียว — ตัวแรกเป็นสินค้าหลักของ Item เดิม ตัวที่เหลือไปเป็น extraProducts
    // (แสดงแบบคอลัมน์แยกกัน ดู productColumns) ใช้จำนวนตันแยกตามชนิดจริงจาก productQtyPairs (ไม่ใช่ยอดรวมซ้ำทุกชนิด)
    const [mainPair, ...otherPairs] = row.productQtyPairs.length ? row.productQtyPairs : [{ product: row.product, qty: row.qty }]
    const items: JobItem[] = [
      {
        id: `item${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        product: mainPair.product,
        qty: mainPair.qty,
        unit: 'ตัน',
        siteName: row.siteName,
        province: row.province,
        district: row.district,
        siteContactName: row.siteContactName || undefined,
        sitePhone: row.phone || undefined,
        deliveryStatus: row.status === 'DELIVERED' ? 'DELIVERED' : undefined,
        deliveredAt: row.deliveredAt,
        extraProducts: otherPairs.length ? otherPairs.map((p) => ({ product: p.product, qty: p.qty, unit: 'ตัน' })) : undefined,
      },
    ]
    const amount = row.qty * row.price
    const newBooking = bookingStore.addBooking({
      category: props.fleet,
      docNo: bookingStore.nextDocNo(props.fleet),
      releaseNo: bookingStore.nextReleaseNo(),
      // เดิมไม่เคยเซ็ต po เลยสำหรับงาน import ต่างจากสร้างงานด้วยมือที่ auto-gen ให้เสมอ (BookingCreateView.vue) —
      // ทำให้เอกสารที่พิมพ์ออกมาช่อง "ใบสั่งงาน (PO)" ว่างเป็น "-" เสมอสำหรับงาน import ทุกงาน
      po: bookingStore.nextPoNo(),
      reference: row.docRef || undefined,
      customer: row.customer,
      items,
      allowance: row.allowance,
      /** เดิม hardcode เป็น 0 เสมอ ทำให้ booking.tripFee ว่างสำหรับงาน import ทุกแถวไม่ว่า Excel จะมีราคาปูนมาหรือไม่ —
       *  กระทบยอดวางบิล/รายได้คนขับ-รถร่วมจริงเพราะจุดเหล่านั้นอ่านจาก tripFee ตรงๆ (ไม่ได้อ่านจากรายการในใบสั่งสินค้า)
       *  ต้องเซ็ตให้ตรงกับ amount เดียวกับที่ใช้สร้างใบสั่งสินค้าด้านล่างเสมอ ส่วน agreedPrice ไม่ใช่ field ที่ import
       *  รองรับตั้งแต่แรก คงไว้ที่ 0 เหมือนเดิม (ไม่ใช่ตัวที่ยอดวางบิล/รายได้อ่านอยู่ดี) */
      tripFee: amount,
      agreedPrice: 0,
      vatRate: documentSettingsStore.settings.vatRate,
      pricingMode: 'SINGLE_DESTINATION',
      fuelLiters: row.fuelLiters,
      fuelRate: fuelRateStore.settings.todayPricePerLiter,
      plate: row.plate || undefined,
      driverName: row.driverName || undefined,
      driverId: row.driverId,
      loadingDate: importShipDate.value,
      loadingTime: row.time || undefined,
      ticketChecked: row.ticketChecked || undefined,
      note: row.note || undefined,
    })
    newBooking.status = row.status
    if (row.status === 'DELIVERED' && row.deliveredAt) newBooking.completedAt = row.deliveredAt
    const salesOrderDoc = salesDocumentsStore.createSalesOrderForBooking({
      bookingId: newBooking.id,
      customer: newBooking.customer,
      amount,
      reference: newBooking.reference,
      items: [
        {
          description: salesOrderLineDescription(items),
          qty: row.qty,
          unit: 'ตัน',
          unitPrice: row.price,
          amount,
          discountMode: 'percent',
        },
      ],
    })
    newBooking.sourceDocumentId = salesOrderDoc.id
  })
  closeImportModal()
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
