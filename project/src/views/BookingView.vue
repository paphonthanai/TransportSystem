<template>
  <div class="space-y-6">
    <!-- Create Button -->
    <div class="flex justify-end">
      <button @click="router.push(`/booking/${props.fleet}/new`)" class="btn-primary">
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
    <div>
      <div class="font-bold text-text mb-3">
        งานที่กำลังดำเนินการ ({{ inProgressBookings.length }})
        <span class="font-normal text-xs text-muted">{{ dateFilterLabel }}</span>
      </div>
      <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">{{ isCements ? 'ชนิดปูน' : 'สินค้า' }}</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">น้ำหนัก/จำนวน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">รถ / คนขับ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ขนส่ง</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">ราคา</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in inProgressBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
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
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.shipDate) }}</td>
              <td class="px-4 py-3 text-right text-text font-semibold">{{ formatBaht(booking.agreedPrice || booking.tripFee) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                  <span v-if="booking.status === 'ASSIGNED'" class="text-[11px] text-muted">
                    เหลือ {{ formatCountdown(remainingAcceptSeconds(booking)) }}
                  </span>
                </div>
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
                  <BookingActionMenu
                    :booking="booking"
                    @view="router.push(`/job/${booking.id}`)"
                    @edit="router.push(`/booking/${props.fleet}/${booking.id}/edit`)"
                    @start-transit="bookingStore.startTransit(booking.id)"
                    @complete="openCompleteDialog(booking)"
                  />
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
    </div>

    <!-- In-transit Table -->
    <div>
      <div class="font-bold text-text mb-3">
        งานที่กำลังขนส่ง ({{ inTransitBookings.length }})
        <span class="font-normal text-xs text-muted">{{ dateFilterLabel }}</span>
      </div>
      <div class="card-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-muted">เลขที่เอกสาร</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">ปลายทาง</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">{{ isCements ? 'ชนิดปูน' : 'สินค้า' }}</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">น้ำหนัก/จำนวน</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">รถ / คนขับ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">วันที่ขนส่ง</th>
              <th class="text-right px-4 py-3 font-semibold text-muted">ราคา</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">สถานะ</th>
              <th class="text-left px-4 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in inTransitBookings" :key="booking.id" class="border-b border-border hover:bg-surface-2 transition-colors">
              <td class="px-4 py-3 font-bold text-primary">{{ booking.docNo }}</td>
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
              <td class="px-4 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.shipDate) }}</td>
              <td class="px-4 py-3 text-right text-text font-semibold">{{ formatBaht(booking.agreedPrice || booking.tripFee) }}</td>
              <td class="px-4 py-3">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button @click="openDispatchDialog(booking)" class="btn-sm text-amber-700">
                    <span class="material-symbols-rounded text-base">sync_alt</span>
                    เปลี่ยนรถ / คนขับ
                  </button>
                  <BookingActionMenu
                    :booking="booking"
                    @view="router.push(`/job/${booking.id}`)"
                    @edit="router.push(`/booking/${props.fleet}/${booking.id}/edit`)"
                    @start-transit="bookingStore.startTransit(booking.id)"
                    @complete="openCompleteDialog(booking)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="inTransitBookings.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา</td>
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
              {{ isReassignDispatch ? 'เปลี่ยนคนขับ/รถ' : 'ส่งงาน' }} {{ dispatchTarget.docNo }}
            </div>
            <button @click="dispatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">ทะเบียนรถ *</label>
              <input v-model="dispatchForm.plate" list="dispatchVehicleOptions" placeholder="เช่น 82-4417 กรุงเทพ" class="input-field w-full" />
              <datalist id="dispatchVehicleOptions">
                <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="vehiclesStore.fullPlate(v)" />
              </datalist>
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useOriginsStore } from '@/stores/origins'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, DebtAdjustment, JobItem } from '@/types'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import { parseGpsInput } from '@/utils/gps'
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

/** หาคนขับจากชื่อเต็ม รองรับทั้งแบบมีคำนำหน้าและไม่มี (เดิมเคยอยู่ใน driversStore.findDriverByVehicle) */
const findDriverByName = (name: string) => driversStore.drivers.find((d) => driversStore.fullName(d) === name || `${d.firstName} ${d.lastName}` === name)

const searchQuery = ref('')

const isCements = computed(() => props.fleet === 'cements')
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))

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
  bookingStore.dispatchBooking(dispatchTarget.value.id, dispatchForm.value.plate, {
    driverName: dispatchForm.value.driverName || undefined,
    odometerBefore: dispatchForm.value.odometerBefore,
  })
  // ปรับคนขับประจำของรถให้ตรงกับที่เลือกจ่ายงานจริง เพื่อให้ทุกหน้าที่ใช้รถเห็นคนขับล่าสุด
  if (dispatchForm.value.driverName) {
    const vehicle = vehiclesStore.findByFullPlate(dispatchForm.value.plate)
    const driver = findDriverByName(dispatchForm.value.driverName)
    if (vehicle && driver) vehiclesStore.assignDriver(vehicle.id, driver.code)
  }
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
  /** ส่งของสำเร็จแล้ว -> สร้างใบวางบิลอัตโนมัติทันที ไม่ต้องรอผู้ใช้กด "สร้างใบวางบิล" เอง
   *  เรียก createBillingFromBookings ตัวเดียวกับที่ปุ่มสร้างใบวางบิลด้วยมือใช้อยู่แล้ว ไม่มี logic คำนวณใหม่ */
  salesDocumentsStore.createBillingFromBookings([bookingId])
  completeTarget.value = null
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
