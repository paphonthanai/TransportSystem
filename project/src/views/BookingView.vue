<template>
  <!-- pb-32 กันเมนู "การจัดการ" (BookingActionMenu.vue) ของแถวท้ายตารางโดนขอบล่างจอ/taskbar บัง เผื่อพื้นที่ scroll ให้
       เลื่อนแถวขึ้นมาได้เสมอแม้ตารางจะสั้น (เหลืองานแค่ 1-2 แถว) เสริมกับ flip-up logic ใน BookingActionMenu เอง -->
  <div class="space-y-6 pb-32">
    <!-- Create Button -->
    <div class="flex justify-end gap-2">
      <!-- ซ่อมค่าเที่ยวงาน Import: ซ่อนปุ่มไว้ตามที่ตกลง (ฟังก์ชัน/ไดอะล็อกเดิมยังอยู่ครบ เปิดกลับได้โดยเปลี่ยน v-if) -->
      <button
        v-if="false"
        @click="openReconcileModal"
        class="btn-secondary"
        title="อัปโหลดไฟล์ Excel ต้นฉบับ จับคู่กับงานที่มีอยู่แล้ว แล้วเติมค่าเที่ยว/เบี้ยเลี้ยง/น้ำมัน/จำนวนตันที่ยังว่าง/เป็น 0 ให้"
      >
        <span class="material-symbols-rounded text-base">build</span>
        ซ่อมค่าเที่ยวงาน Import
      </button>
      <button
        @click="fuelPriceDialogOpen = true"
        class="btn-secondary relative"
        title="ตั้งราคาน้ำมันประจำวันก่อนนำเข้า/จ่ายงาน (กันลืมเปลี่ยนเรทน้ำมัน)"
      >
        <span class="material-symbols-rounded text-base">local_gas_station</span>
        ตั้งค่าน้ำมัน
        <span v-if="missingTodayPriceTypes.length" class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-surface"></span>
      </button>
      <button @click="router.push(`/booking/${props.fleet}/sheet`)" class="btn-secondary" title="กรอก/วางข้อมูลงานเป็นตาราง ตรวจก่อนสร้างงานหรือส่งออก Excel">
        <span class="material-symbols-rounded text-base">table_chart</span>
        ตารางลงงาน
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
      <div class="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface border border-border flex-1 max-w-md">
        <span class="material-symbols-rounded text-muted">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาเลขที่งาน, PO, ชิพเม้น, ลูกค้า, หน้างาน, ทะเบียน, คนขับ, เบอร์โทร..."
          class="border-0 outline-0 bg-transparent text-sm text-text w-full placeholder:text-muted"
        />
      </div>
      <!-- ตัวกรองราคา (ค่าเที่ยวของงาน) — ใช้กับทั้งตาราง "กำลังดำเนินการ" และ "กำลังขนส่ง" -->
      <select v-model="priceFilter" class="input-field h-10 w-auto" title="กรองตามราคา (ค่าเที่ยว)">
        <option value="all">ราคา: ทั้งหมด</option>
        <option value="none">ยังไม่ระบุราคา (จบงานไม่ได้)</option>
        <option value="has">มีราคาแล้ว</option>
      </select>
      <div class="flex items-center gap-1.5 text-sm text-muted">
        <input v-model.number="priceMin" type="number" min="0" placeholder="ราคาตั้งแต่" class="input-field h-10 w-28" />
        <span>–</span>
        <input v-model.number="priceMax" type="number" min="0" placeholder="ถึง" class="input-field h-10 w-24" />
      </div>
      <button v-if="priceFilterActive" type="button" @click="clearPriceFilter" class="btn-sm">ล้างตัวกรองราคา</button>
      <button v-if="issueFilter === 'pod'" type="button" @click="clearIssueFilter" class="btn-sm !text-indigo-700 !bg-indigo-50 !border-indigo-200" title="แสดงทุกงานอีกครั้ง">
        กรอง: งานรอตรวจ POD
        <span class="material-symbols-rounded text-base">close</span>
      </button>
    </div>

    <!-- การ์ดงานที่เลือก — กดแถวในตารางเพื่อดู ชื่อ-นามสกุลคนขับ/ทะเบียน/ชื่องาน และเรทน้ำมันของงานนั้น (ตั้ง/แก้เรทก่อนจ่ายงานได้ที่นี่) -->
    <div v-if="selectedBooking" class="card-lg border-primary/40 space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs font-semibold text-muted">งานที่เลือก {{ selectedBooking.docNo }}</div>
          <div class="font-bold text-text truncate">{{ dispatchTitle(selectedBooking) }}</div>
        </div>
        <button @click="selectedBookingId = null" class="w-8 h-8 shrink-0 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
          <span class="material-symbols-rounded text-base">close</span>
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div class="bg-surface-2 rounded-lg p-3">
          <div class="text-xs text-muted mb-0.5">ชื่อ-นามสกุล พขร.</div>
          <div class="font-semibold text-text">
            {{ selectedDriverFullName || 'ยังไม่ได้จัดคนขับ' }}
            <span v-if="selectedDriverRecord?.nickname" class="text-xs font-normal text-muted">({{ selectedDriverRecord.nickname }})</span>
          </div>
        </div>
        <div class="bg-surface-2 rounded-lg p-3">
          <div class="text-xs text-muted mb-0.5">ทะเบียนรถ</div>
          <div class="font-semibold text-text">
            {{ selectedBooking.plate || 'ยังไม่ได้จัดรถ' }}
            <span v-if="selectedVehicleType" class="text-xs font-normal text-muted">({{ selectedVehicleType }})</span>
          </div>
        </div>
        <div class="bg-surface-2 rounded-lg p-3">
          <div class="text-xs text-muted mb-0.5">ชื่องาน / ปลายทาง</div>
          <div class="font-semibold text-text">{{ destinationLabel(selectedBooking) }}</div>
        </div>
      </div>
      <div class="flex items-end gap-3 flex-wrap">
        <div>
          <label class="block text-xs font-semibold text-muted mb-1">
            เรทน้ำมัน (บาท/ลิตร) · {{ selectedBooking.fuelLiters || 0 }} ลิตร{{ selectedBooking.fuelNotRefilled ? ' (ไม่เติมน้ำมัน)' : '' }}
          </label>
          <input v-model.number="cardRateInput" type="number" min="0" step="0.01" class="input-field w-44" />
        </div>
        <button @click="saveCardRate" :disabled="!(cardRateInput > 0)" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึกเรทงานนี้
        </button>
        <button @click="resetCardRate" class="btn-secondary" title="ล้างเรทที่กรอกเอง แล้วใช้ราคาน้ำมันประจำวันของวันที่สร้างงาน">
          ใช้ราคาประจำวัน
        </button>
        <div class="text-xs text-muted pb-2">
          <template v-if="selectedBooking.fuelRateManual">เรทกรอกเอง (ระบบไม่คำนวณทับ)</template>
          <template v-else-if="selectedBooking.fuelRatePriceDate">ใช้ราคาน้ำมันประจำวันที่ {{ selectedBooking.fuelRatePriceDate }}</template>
          <span v-else class="text-amber-700 font-semibold">ยังไม่มีเรท — ตั้งราคาน้ำมันประจำวันหรือกรอกเรทเอง</span>
        </div>
      </div>
    </div>

    <!-- In-progress Table -->
    <div>
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div class="font-bold text-text">
          งานที่กำลังดำเนินการ ({{ inProgressBookings.length }})
        </div>
        <button
          v-if="canSelectDelete && selectedInProgressIds.length > 0"
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
              <th v-if="canSelectDelete" class="px-3 py-3 w-8">
                <input type="checkbox" :checked="allInProgressSelected" @change="toggleSelectAllInProgress" />
              </th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เที่ยวที่</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">พขร.</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">คอนเฟิร์ม</th>
              <th class="text-center px-3 py-3 font-semibold text-muted">เช็คตั๋ว</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">วันที่ลงงาน</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เวลา</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานที่ส่ง</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">อำเภอ/จังหวัด</th>
              <th class="text-right px-3 py-3 font-semibold text-muted">ค่าเที่ยว</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานะขนส่ง</th>
              <th class="px-3 py-3"></th>
              <th class="text-left px-3 py-3 font-semibold text-muted">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in inProgressBookings"
              :key="booking.id"
              :style="customerRowStyle(booking)"
              :id="`booking-row-${booking.id}`"
              :class="{ 'ring-2 ring-primary ring-inset': selectedBookingId === booking.id, 'ring-2 ring-green-500 ring-inset': highlightBookingId === booking.id }"
              @click="onRowClick(booking, $event)"
              class="border-b border-border hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <td v-if="canSelectDelete" class="px-3 py-3">
                <input
                  type="checkbox"
                  :checked="!!selectedInProgress[booking.id]"
                  @change="(e) => (selectedInProgress[booking.id] = (e.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="px-3 py-3 text-text">
                <!-- ระดับ 2: งานที่มีคนขับและยังไม่ส่งเสร็จ (รวมงานที่จ่ายไปแล้ว/งานเก่าที่ยังไม่มีเลขเที่ยว) เสมียนเลือกเที่ยวที่ในตารางได้เลย
                     — จ่ายเที่ยว 1/2 ลำดับไหนก็ได้ แอปคนขับเรียงตามเลขนี้ ซ้ำกับงานอื่นของคนขับวันเดียวกัน = ขอบแดง -->
                <select
                  v-if="booking.status !== 'DELIVERED' && booking.driverName"
                  :value="driverTripNumberForBooking(booking)"
                  @click.stop
                  @change="(e) => bookingStore.setTripSequence(booking.id, Number((e.target as HTMLSelectElement).value))"
                  class="input-field !py-0.5 !px-1 !text-xs w-14"
                  :class="tripSequenceClash(booking) ? '!border-red-400 !text-red-700' : ''"
                  :title="tripSequenceClash(booking) ? 'เลขเที่ยวซ้ำกับงานอื่นของคนขับคนนี้ในวันเดียวกัน' : 'เที่ยวที่ของคนขับในวันนี้ (เลือกเองได้ รวมงานที่จ่ายไปแล้ว — แอปคนขับเรียงตามเลขนี้)'"
                >
                  <option v-for="n in tripNumberChoices(booking)" :key="n" :value="n">{{ n }}</option>
                </select>
                <template v-else>{{ driverTripNumberForBooking(booking) }}</template>
              </td>
              <td class="px-3 py-3 text-text"><BookingDriverFixCell :booking="booking" /></td>
              <td class="px-3 py-3 text-text font-semibold">{{ booking.plate || '-' }}</td>
              <td class="px-3 py-3 text-center">
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
              <td class="px-3 py-3 text-text">
                <span class="inline-flex items-center gap-1.5" :title="booking.customer">
                  <span
                    v-if="customerRecordFor(booking)?.color"
                    :style="{ background: customerRecordFor(booking)!.color }"
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  ></span>
                  {{ customerRecordFor(booking)?.code || booking.customer }}
                </span>
              </td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.loadingDate) }}</td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ booking.loadingTime || '-' }}</td>
              <td class="px-3 py-3 text-text">
                <div class="font-semibold">{{ destinationLabel(booking) }}</div>
                <div v-if="booking.items.length" class="flex flex-wrap gap-3 text-[11px] text-muted leading-tight mt-0.5">
                  <div v-for="col in productColumns(booking)" :key="col.key" class="border-l border-border pl-2 first:border-l-0 first:pl-0">
                    <div>{{ col.product || '-' }}</div>
                    <div>{{ col.qty }} {{ col.unit }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ districtProvinceLabel(booking) }}</td>
              <td class="px-3 py-3 text-right whitespace-nowrap">
                <span v-if="booking.tripFee > 0" class="text-text">{{ formatBaht(booking.tripFee) }}</span>
                <span v-else class="text-xs font-semibold text-amber-700">ยังไม่ระบุราคา</span>
              </td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span :class="['text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
                </div>
              </td>
              <td class="px-3 py-3">
                <button v-if="pruneResolvedNote(booking)" @click="noteTarget = booking" class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center" title="ดูหมายเหตุ">
                  !
                </button>
              </td>
              <td class="px-3 py-3">
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
                    :can-hard-delete="bookingStore.canDeleteBooking(booking).ok"
                    :complete-blocked-reason="completeBlockedReason(booking)"
                    :confirm-blocked-reason="confirmBlockedReason(booking)"
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
              <td :colspan="canSelectDelete ? 14 : 13" class="px-3 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา/ตัวกรอง</td>
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
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานะขนส่ง</th>
              <th class="px-3 py-3"></th>
              <th class="text-left px-3 py-3 font-semibold text-muted">การจัดการ</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เที่ยวที่</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">พขร.</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">คอนเฟิร์ม</th>
              <th class="text-center px-3 py-3 font-semibold text-muted">เช็คตั๋ว</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">ลูกค้า</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">วันที่ลงงาน</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">เวลา</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">สถานที่ส่ง</th>
              <th class="text-left px-3 py-3 font-semibold text-muted">อำเภอ/จังหวัด</th>
              <th class="text-right px-3 py-3 font-semibold text-muted">ค่าเที่ยว</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in inTransitBookings"
              :key="booking.id"
              :style="customerRowStyle(booking)"
              :id="`booking-row-${booking.id}`"
              :class="{ 'ring-2 ring-primary ring-inset': selectedBookingId === booking.id, 'ring-2 ring-green-500 ring-inset': highlightBookingId === booking.id }"
              @click="onRowClick(booking, $event)"
              class="border-b border-border hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <td class="px-3 py-3">
                <span :class="['text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap', bookingStatusClass[booking.status]]">{{ bookingStatusLabel[booking.status] }}</span>
              </td>
              <td class="px-3 py-3">
                <button v-if="pruneResolvedNote(booking)" @click="noteTarget = booking" class="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center" title="ดูหมายเหตุ">
                  !
                </button>
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-2">
                  <!-- ตารางนี้ตอนนี้โชว์งาน DELIVERED ที่รอตรวจสอบ POD ค้างไว้ด้วย (ดู inTransitBookings) — "เปลี่ยนรถ/คนขับ"
                       ไม่มีความหมายกับงานที่ส่งของเสร็จแล้ว ซ่อนไว้กันกดเผลอไปจ่ายงานซ้ำ/เปลี่ยนคนขับงานที่จบไปแล้ว -->
                  <button v-if="booking.status !== 'DELIVERED'" @click="openDispatchDialog(booking)" class="btn-sm text-amber-700">
                    <span class="material-symbols-rounded text-base">sync_alt</span>
                    เปลี่ยนรถ / คนขับ
                  </button>
                  <BookingActionMenu
                    :booking="booking"
                    :can-hard-delete="bookingStore.canDeleteBooking(booking).ok"
                    :complete-blocked-reason="completeBlockedReason(booking)"
                    :confirm-blocked-reason="confirmBlockedReason(booking)"
                    @view="router.push(`/job/${booking.id}`)"
                    @edit="router.push(`/booking/${props.fleet}/${booking.id}/edit`)"
                    @start-transit="bookingStore.startTransit(booking.id)"
                    @complete="openCompleteDialog(booking)"
                    @delete="deleteBooking(booking)"
                    @cancel="onCancelDispatch(booking)"
                    @approve-pod="approvePod(booking)"
                    @edit-pod="router.push(`/job/${booking.id}`)"
                    @confirm-completion="onConfirmJobCompletion(booking)"
                  />
                </div>
              </td>
              <td class="px-3 py-3 text-text">
                <!-- ระดับ 2: งานที่มีคนขับและยังไม่ส่งเสร็จ (รวมงานที่จ่ายไปแล้ว/งานเก่าที่ยังไม่มีเลขเที่ยว) เสมียนเลือกเที่ยวที่ในตารางได้เลย
                     — จ่ายเที่ยว 1/2 ลำดับไหนก็ได้ แอปคนขับเรียงตามเลขนี้ ซ้ำกับงานอื่นของคนขับวันเดียวกัน = ขอบแดง -->
                <select
                  v-if="booking.status !== 'DELIVERED' && booking.driverName"
                  :value="driverTripNumberForBooking(booking)"
                  @click.stop
                  @change="(e) => bookingStore.setTripSequence(booking.id, Number((e.target as HTMLSelectElement).value))"
                  class="input-field !py-0.5 !px-1 !text-xs w-14"
                  :class="tripSequenceClash(booking) ? '!border-red-400 !text-red-700' : ''"
                  :title="tripSequenceClash(booking) ? 'เลขเที่ยวซ้ำกับงานอื่นของคนขับคนนี้ในวันเดียวกัน' : 'เที่ยวที่ของคนขับในวันนี้ (เลือกเองได้ รวมงานที่จ่ายไปแล้ว — แอปคนขับเรียงตามเลขนี้)'"
                >
                  <option v-for="n in tripNumberChoices(booking)" :key="n" :value="n">{{ n }}</option>
                </select>
                <template v-else>{{ driverTripNumberForBooking(booking) }}</template>
              </td>
              <td class="px-3 py-3 text-text"><BookingDriverFixCell :booking="booking" /></td>
              <td class="px-3 py-3 text-text font-semibold">{{ booking.plate || '-' }}</td>
              <td class="px-3 py-3 text-center">
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
              <td class="px-3 py-3 text-text">
                <span class="inline-flex items-center gap-1.5" :title="booking.customer">
                  <span
                    v-if="customerRecordFor(booking)?.color"
                    :style="{ background: customerRecordFor(booking)!.color }"
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  ></span>
                  {{ customerRecordFor(booking)?.code || booking.customer }}
                </span>
              </td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ formatShortDate(booking.loadingDate) }}</td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ booking.loadingTime || '-' }}</td>
              <td class="px-3 py-3 text-text">
                <div class="font-semibold">{{ destinationLabel(booking) }}</div>
                <div v-if="booking.items.length" class="flex flex-wrap gap-3 text-[11px] text-muted leading-tight mt-0.5">
                  <div v-for="col in productColumns(booking)" :key="col.key" class="border-l border-border pl-2 first:border-l-0 first:pl-0">
                    <div>{{ col.product || '-' }}</div>
                    <div>{{ col.qty }} {{ col.unit }}</div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3 text-muted whitespace-nowrap">{{ districtProvinceLabel(booking) }}</td>
              <td class="px-3 py-3 text-right whitespace-nowrap">
                <span v-if="booking.tripFee > 0" class="text-text">{{ formatBaht(booking.tripFee) }}</span>
                <span v-else class="text-xs font-semibold text-amber-700">ยังไม่ระบุราคา</span>
              </td>
            </tr>
            <tr v-if="inTransitBookings.length === 0">
              <td colspan="13" class="px-3 py-8 text-center text-muted">ไม่พบงานที่ตรงกับการค้นหา/ตัวกรอง</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>

    <!-- ป๊อปอัพ "ตั้งค่าน้ำมัน" — กรอกราคาน้ำมันประจำวันจากหน้า Booking ได้เลย (ฟอร์มเดียวกับหน้าตั้งค่าน้ำมัน) -->
    <Teleport to="body" v-if="fuelPriceDialogOpen">
      <div @click="fuelPriceDialogOpen = false" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur z-50 flex items-center justify-center p-6 animate-fade">
        <div @click.stop class="w-full max-w-3xl bg-surface rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
            <div class="font-bold text-text">ตั้งค่าน้ำมัน — ราคาน้ำมันประจำวัน</div>
            <button @click="fuelPriceDialogOpen = false" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div v-if="missingTodayPriceTypes.length" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ยังไม่มีราคาน้ำมันของวันนี้สำหรับ: {{ missingTodayPriceTypes.join(', ') }} — งานที่นำเข้า/สร้างวันนี้จะยังไม่มีเรทจนกว่าจะตั้งราคา
            </div>
            <FuelPriceForm />
            <div v-if="recentFuelPrices.length">
              <div class="text-xs font-semibold text-muted mb-1">ราคาล่าสุดที่ตั้งไว้</div>
              <table class="w-full text-sm">
                <thead class="text-xs text-muted text-left">
                  <tr>
                    <th class="py-1 font-semibold">มีผลตั้งแต่</th>
                    <th v-for="t in fuelVehicleTypes" :key="t" class="py-1 font-semibold text-right">{{ t }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in recentFuelPrices" :key="e.date" class="border-t border-border">
                    <td class="py-1.5 font-semibold text-text">{{ e.date }}</td>
                    <td v-for="t in fuelVehicleTypes" :key="t" class="py-1.5 text-right text-text">{{ e.prices[t] || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
              {{ isReassignDispatch ? 'เปลี่ยนคนขับ/รถ' : 'ส่งงาน' }} {{ dispatchTitle(dispatchTarget) }}
            </div>
            <button @click="dispatchTarget = null" class="w-9 h-9 rounded-lg border border-border bg-surface-2 flex items-center justify-center hover:bg-border">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="px-6 py-6 space-y-5">
            <!-- สรุปงานที่กำลังจัดรถ: ชื่อคนขับ/ทะเบียน/หน้างาน/ยอดเติมน้ำมัน (อัปเดตตามที่เลือกด้านล่าง) -->
            <div class="rounded-xl border border-border bg-surface-2 p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <div class="text-xs text-muted">คนขับ</div>
                <div class="font-semibold text-text">
                  {{ dispatchForm.driverName || '-' }}
                  <span v-if="dispatchDriverRecord?.nickname" class="text-xs font-normal text-muted">({{ dispatchDriverRecord.nickname }})</span>
                </div>
              </div>
              <div>
                <div class="text-xs text-muted">ทะเบียนรถ</div>
                <div class="font-semibold text-text">{{ dispatchForm.plate || '-' }}</div>
              </div>
              <div>
                <div class="text-xs text-muted">หน้างาน</div>
                <div class="font-semibold text-text">{{ destinationLabel(dispatchTarget) }}</div>
              </div>
              <div>
                <div class="text-xs text-muted">ยอดเติมน้ำมัน</div>
                <div class="font-semibold text-text">
                  {{ dispatchTarget.fuelNotRefilled ? 'ไม่เติมน้ำมัน' : `${dispatchTarget.fuelLiters || 0} ลิตร` }}
                  <span v-if="dispatchFuelRatePreview.rate > 0" class="text-xs font-normal text-muted">
                    · {{ formatBaht(dispatchFuelRatePreview.rate) }}/ล. = {{ formatBaht((dispatchTarget.fuelLiters || 0) * dispatchFuelRatePreview.rate) }}
                  </span>
                  <span v-else class="text-xs font-normal text-amber-700">· ยังไม่มีเรท</span>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1.5">
                ทะเบียนรถ *
                <span class="text-[10px] font-normal text-muted">(พิมพ์ค้นหาได้ — แสดงเฉพาะรถที่วิ่ง Feed นี้ได้)</span>
              </label>
              <SearchableSelect v-model="dispatchForm.plate" :options="dispatchPlateOptions" placeholder="เลือกหรือพิมพ์ค้นหาทะเบียนรถ..." />
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1.5">คนขับ</label>
              <SearchableSelect v-model="dispatchForm.driverName" :options="dispatchDriverOptions" placeholder="เลือกหรือพิมพ์ค้นหาชื่อคนขับ..." />
            </div>
            <div class="bg-surface-2 rounded-lg p-3 text-sm">
              <div class="text-xs font-semibold text-muted mb-1">น้ำมัน (คำนวณไว้ตั้งแต่ตอนสร้างงาน)</div>
              <div class="font-bold text-text">
                ต้องรับน้ำมันทั้งหมด {{ dispatchTarget?.fuelLiters || 0 }} ลิตร
                <span class="text-xs font-normal text-muted">
                  ({{
                    dispatchFuelRatePreview.rate > 0
                      ? `เรท ${formatBaht(dispatchFuelRatePreview.rate)}/ล. (ราคาน้ำมันวันที่ ${dispatchFuelRatePreview.priceDate})`
                      : 'ยังไม่มีเรท'
                  }})
                </span>
                <div v-if="dispatchFuelRatePreview.reason" class="text-[11px] font-normal text-amber-700 mt-0.5">{{ dispatchFuelRatePreview.reason }}</div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                เลขไมล์เริ่มต้น (กม.)
                <span class="text-[10px] font-normal text-muted">(ดึงจากเลขไมล์สิ้นสุดเที่ยวก่อนของรถคันนี้ให้อัตโนมัติ)</span>
              </label>
              <input v-model.number="dispatchForm.odometerBefore" type="number" placeholder="0" class="input-field w-full" />
            </div>

            <!-- ระดับ 3: เสมียนเลือกเที่ยวที่ตอนจัดรถ — จ่ายเที่ยว 1/เที่ยว 2 ลำดับไหนก็ได้ แอปคนขับโชว์ปุ่มยืนยันที่เที่ยวต่ำสุดก่อน -->
            <div>
              <label class="block text-xs font-semibold text-muted mb-1">
                เที่ยวที่
                <span class="text-[10px] font-normal text-muted">(เที่ยวของคนขับคนนี้ในวันเดียวกัน — คนขับจะเห็นปุ่มยืนยันที่เที่ยวแรกก่อน)</span>
              </label>
              <input v-model.number="dispatchForm.tripSequence" type="number" min="1" step="1" class="input-field w-24" />
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
            <div v-if="dispatchForm.plate && !dispatchForm.driverName" class="text-xs text-red-600 font-semibold mr-auto self-center">
              มีทะเบียนต้องมีคนขับ — รถคันนี้ยังไม่มีคนขับประจำ กรุณาเลือกคนขับ
            </div>
            <button @click="confirmDispatch" :disabled="!dispatchForm.plate || !dispatchForm.driverName" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-rounded">send</span>
              {{ isReassignDispatch ? 'ยืนยันเปลี่ยนคนขับ/รถ' : 'ส่งงาน' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Complete Job Dialog (เพิ่ม/ลดหนี้) — ไดอะล็อกร่วมกับหน้ารายละเอียดงาน -->
    <BookingCompleteDialog :booking="completeTarget" @close="completeTarget = null" />

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
          <div class="px-6 py-5 text-sm text-text whitespace-pre-wrap">{{ pruneResolvedNote(noteTarget) }}</div>
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

            <!-- ตั้งราคาน้ำมันก่อนนำเข้า จะได้ไม่ลืม — งานที่นำเข้าวันนี้ใช้ราคาน้ำมันของวันที่นำเข้า -->
            <div
              v-if="missingTodayPriceTypes.length"
              class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap"
            >
              <span class="material-symbols-rounded text-base">local_gas_station</span>
              <span class="flex-1 min-w-0">
                ยังไม่มีราคาน้ำมันของวันนี้ ({{ missingTodayPriceTypes.join(', ') }}) — งานที่นำเข้าจะยังไม่มีเรทน้ำมัน ตั้งราคาก่อนนำเข้าจะได้ไม่ลืม
              </span>
              <button type="button" @click="fuelPriceDialogOpen = true" class="btn-sm">ตั้งราคาน้ำมันวันนี้</button>
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
                <span v-if="Object.keys(importTripWarnings).length" class="text-amber-600">ตรวจเลขเที่ยว: {{ Object.entries(importTripWarnings).map(([k, v]) => `${k} ${v.join('/')}`).join(' · ') }}</span>
                <span v-if="importWarningRowCount" class="text-amber-600">{{ importWarningRowCount }} แถวมีข้อมูลไม่ครบ — จะสร้างงานให้ก่อนแล้วแปะหมายเหตุไว้ให้กรอกเพิ่ม</span>
                <span v-if="importCheckRowCount" class="text-indigo-700">{{ importCheckRowCount }} แถวมีข้อควรตรวจ (พิกัด/ลิงก์ GPS, เลขเที่ยว) — ดูคอลัมน์ "ตรวจก่อนนำเข้า"</span>
              </div>

              <div class="overflow-x-auto border border-border rounded-lg max-h-72">
                <table class="w-full text-xs">
                  <thead class="bg-surface-2 sticky top-0">
                    <tr>
                      <th class="text-left px-2 py-1.5">แถว</th>
                      <th class="text-left px-2 py-1.5">เที่ยวที่</th>
                      <th class="text-left px-2 py-1.5">พขร.</th>
                      <th class="text-left px-2 py-1.5">คอนเฟิร์ม</th>
                      <th class="text-left px-2 py-1.5">ลูกค้า</th>
                      <th class="text-left px-2 py-1.5">สถานที่ส่ง</th>
                      <th class="text-left px-2 py-1.5">ชนิดปูน</th>
                      <th class="text-left px-2 py-1.5">ลิงก์ GPS</th>
                      <th class="text-right px-2 py-1.5">ตัน</th>
                      <th class="text-left px-2 py-1.5">หมายเหตุ</th>
                      <th class="text-left px-2 py-1.5">ตรวจก่อนนำเข้า</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in importableRows" :key="row.rowNumber" class="border-t border-border" :class="row.warnings.length || importChecksFor(row).length ? 'bg-amber-50' : ''">
                      <td class="px-2 py-1.5">{{ row.rowNumber }}</td>
                      <td class="px-2 py-1.5">
                        <input
                          v-model.number="row.tripSequence"
                          type="number"
                          min="1"
                          step="1"
                          class="input-field !py-0.5 !px-1 !text-xs w-14"
                          :class="importTripWarningFor(row) ? '!border-amber-500' : ''"
                          :title="importTripWarningFor(row) || 'เที่ยวที่ของคนขับในวันนี้'"
                        />
                      </td>
                      <td class="px-2 py-1.5 min-w-[190px]">
                        <!-- ผลการ map: ชื่อเล่นใน Excel → ชื่อจริงที่จับคู่ได้ — จับคู่ไม่ได้ให้เลือกคนขับเองตรงนี้ได้เลย -->
                        <template v-if="row.driverName">
                          <div class="font-semibold text-text">{{ row.driverName }}</div>
                          <div v-if="row.driverNickname" class="text-[11px] text-green-700">Excel: "{{ row.driverNickname }}" → จับคู่แล้ว</div>
                        </template>
                        <template v-else>
                          <div v-if="row.driverNickname" class="text-[11px] font-semibold text-red-600">Excel: "{{ row.driverNickname }}" → ยังไม่ได้จับคู่</div>
                          <div v-else class="text-[11px] text-muted">ไม่ได้ระบุคนขับ</div>
                          <select
                            class="mt-1 h-7 w-full rounded-md border border-border bg-surface px-1 text-xs"
                            :class="row.driverNickname ? 'border-red-300' : ''"
                            @change="(e) => onImportPickDriver(row, (e.target as HTMLSelectElement).value)"
                          >
                            <option value="">เลือกคนขับ...</option>
                            <option v-for="d in importDriverChoices" :key="d.id" :value="d.id">{{ d.label }}</option>
                          </select>
                        </template>
                      </td>
                      <td class="px-2 py-1.5">{{ row.plate || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.customer || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.siteName || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.product || '-' }}</td>
                      <td class="px-2 py-1.5 max-w-[140px] truncate">
                        <a v-if="row.mapUrl" :href="/^https?:\/\//.test(row.mapUrl) ? row.mapUrl : undefined" target="_blank" rel="noopener" class="text-primary underline" :title="row.mapUrl">
                          {{ row.latitude !== undefined ? `${row.latitude}, ${row.longitude}` : 'มีลิงก์' }}
                        </a>
                        <span v-else class="text-muted">-</span>
                      </td>
                      <td class="px-2 py-1.5 text-right">{{ row.qty }}</td>
                      <td class="px-2 py-1.5">
                        <span v-if="row.warnings.length" class="text-amber-700">{{ row.warnings.join(', ') }}</span>
                        <span v-else class="text-green-600">ครบถ้วน</span>
                      </td>
                      <td class="px-2 py-1.5">
                        <ul v-if="importChecksFor(row).length" class="text-indigo-700 list-disc pl-4 space-y-0.5 min-w-[220px]">
                          <li v-for="(c, i) in importChecksFor(row)" :key="i">{{ c }}</li>
                        </ul>
                        <span v-else class="text-green-600">ปกติ</span>
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
                          class="input-field !h-7 !text-xs w-64"
                        >
                          <option value="">
                            {{
                              preview.isManual
                                ? 'ไม่จับคู่เลย'
                                : preview.booking
                                  ? `แนะนำ: ${reconcileCandidateLabel(preview.booking)} (${preview.matchScore}/5)`
                                  : 'ไม่พบข้อมูลที่ตรงกัน — เลือกจากรายการด้านล่างถ้ามั่นใจ'
                            }}
                          </option>
                          <option v-for="c in preview.topCandidates" :key="c.booking.id" :value="c.booking.id">
                            {{ reconcileCandidateLabel(c.booking) }} ({{ c.score }}/5)
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
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { matchesBookingSearch } from '@/utils/bookingSearch'
import { useVehiclesStore } from '@/stores/vehicles'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useOriginsStore } from '@/stores/origins'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, JobItem, Vehicle } from '@/types'
import { bookingTitle } from '@/utils/bookingTitle'
import { pruneResolvedNote } from '@/utils/bookingNote'
import { bookingStatusLabel, bookingStatusClass, billingStatusLabel, billingStatusClass } from '@/utils/bookingStatus'
import { parseGpsInput } from '@/utils/gps'
import { salesOrderLineDescription } from '@/utils/salesOrderDescription'
import { exportRowsToExcel } from '@/utils/exportExcel'
import { findReconcileMatches, computeReconcilePatches, RECONCILE_MIN_MATCH, type ReconcileMatchBreakdown } from '@/utils/importReconciliation'
import {
  IMPORT_HEADERS,
  IMPORT_HEADER_MARKER,
  parseImportRow,
  matchDriverForImport,
  matchCustomerForImport,
  parseShipDateFromTitle,
  flagPriceOutliers,
  mapImportRowToDriver,
  assignImportTripSequences,
  applySheetHyperlinks,
  type ImportRowResult,
} from '@/utils/importRowParser'
import { compareByTrip, resolveTripNumber, nextTripSequence, validateTripSequences } from '@/utils/tripSequence'
import * as XLSX from 'xlsx'
import BookingActionMenu from '@/components/booking/BookingActionMenu.vue'
import { useImportDraftStore } from '@/stores/importDraft'
import SearchableSelect, { type SearchableOption } from '@/components/booking/SearchableSelect.vue'
import BookingDriverFixCell from '@/components/booking/BookingDriverFixCell.vue'
import BookingCompleteDialog from '@/components/booking/BookingCompleteDialog.vue'
import FuelPriceForm from '@/components/fuel/FuelPriceForm.vue'
import { bangkokDay } from '@/utils/fuelPrice'
import { bookingCompletionIssues, describeCompletionIssues, STATIC_COMPLETION_CODES } from '@/utils/bookingCompletion'

const props = defineProps<{ fleet: BookingCategory }>()

const router = useRouter()
const route = useRoute()
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
/** แอดมิน + เสมียน เห็นช่องเลือกลบ — สิทธิ์จริงรายงาน (เสมียนลบได้เฉพาะงานที่ยังไม่วางบิล) ดู bookingStore.canDeleteBooking */
const canSelectDelete = computed(() => authStore.role === 'ADMIN' || authStore.role === 'STAFF')

/** หาคนขับจากชื่อเต็ม รองรับทั้งแบบมีคำนำหน้าและไม่มี (เดิมเคยอยู่ใน driversStore.findDriverByVehicle) */
const findDriverByName = (name: string) => driversStore.drivers.find((d) => driversStore.fullName(d) === name || `${d.firstName} ${d.lastName}` === name)

/** ต่อ matchDriverForImport (จาก importRowParser.ts) เข้ากับ driversStore/vehiclesStore จริง แล้วคืนแค่ {id, fullName}
 *  ให้ parseImportRow ใช้ต่อ — แยกโมดูล parser ออกไม่ให้ผูกกับ Pinia store ตรงๆ จะได้เทสแยกได้จริงโดยไม่ต้อง mock store */
const matchDriverForImportRow = (nickname: string, plate: string) => {
  const driver = matchDriverForImport(nickname, plate, driversStore.drivers, vehiclesStore.vehicleForDriver)
  if (!driver && plate) {
    // มีทะเบียนต้องมีคนขับ — ชื่อเล่นจับคู่ไม่ได้/ว่าง แต่ทะเบียนเป็นรถที่มีคนขับประจำ → ใช้คนขับประจำรถ (parseImportRow เตือนให้ตรวจ)
    const code = vehiclesStore.findByPlateLoose(plate)?.driverCode
    const byPlate = code ? driversStore.drivers.find((d) => d.code === code) : undefined
    if (byPlate) {
      return {
        id: byPlate.id,
        fullName: `${byPlate.firstName} ${byPlate.lastName}`.trim(),
        firstName: byPlate.firstName,
        lastName: byPlate.lastName,
        viaPlate: true,
      }
    }
  }
  // ชื่อเต็มรูปแบบเดียวกับตอนจัดรถ (ชื่อ นามสกุล ไม่มีคำนำหน้า) — เดิมงานนำเข้าเก็บแบบมีคำนำหน้า ("นายสมชาย ...") ทำให้คนขับคนเดียวกัน
  // ถูกนับเป็นสองชื่อในการนับเที่ยว/จัดกลุ่มตามชื่อคนขับ
  const driverVehicle = driver ? vehiclesStore.vehicleForDriver(driver.code) : undefined
  return driver
    ? {
        id: driver.id,
        fullName: `${driver.firstName} ${driver.lastName}`.trim(),
        firstName: driver.firstName,
        lastName: driver.lastName,
        // มีคนขับต้องรู้ทะเบียน — คนขับผูกกับรถประจำ ถ้าแถวไม่ได้ระบุทะเบียนใช้ทะเบียนรถประจำนี้ (parseImportRow เตือนให้ตรวจ)
        plate: driverVehicle ? vehiclesStore.fullPlate(driverVehicle) : undefined,
      }
    : undefined
}

/** ต่อ matchCustomerForImport เข้ากับ customerStore จริง — จับคู่กับรหัสผู้ติดต่อ (ชื่อย่อ) ก่อนเสมอ ไม่เจอค่อยลอง
 *  ชื่อเต็ม คืนแค่ {name} (ชื่อเต็ม) ให้ parseImportRow ใช้ต่อ */
const matchCustomerForImportRow = (raw: string) => {
  const customer = matchCustomerForImport(raw, customerStore.customers)
  return customer ? { name: customer.name } : undefined
}

const searchQuery = ref('')

// ตัวกรองราคา = ค่าเที่ยวของงาน (booking.tripFee — ตัวเดียวกับที่ใช้ตัดสินว่าจบงานได้ไหม) ไม่ใช่เรทน้ำมัน
const priceFilter = ref<'all' | 'none' | 'has'>('all')
const priceMin = ref<number | ''>('')
const priceMax = ref<number | ''>('')
/** ตัวกรองจาก Dashboard "ต้องดำเนินการ": 'pod' = เฉพาะงานรอตรวจ POD (ซ่อนตาราง "กำลังดำเนินการ") */
const issueFilter = ref<'' | 'pod'>('')
const highlightBookingId = ref<string | null>(null)
const clearIssueFilter = () => {
  issueFilter.value = ''
}
// รับตัวกรองจาก query ของลิงก์ (?price=none → ยังไม่ระบุราคา, ?issue=pod → รอตรวจ POD) — ตั้งใหม่ทุกครั้งที่ query เปลี่ยน
watch(
  () => route.query,
  (q) => {
    if (q.price === 'none') priceFilter.value = 'none'
    issueFilter.value = q.issue === 'pod' ? 'pod' : ''
    // ?highlight=<id> — กลับมาจากหน้ารายละเอียดงานหลังจบงาน/ยืนยัน POD: ไฮไลต์แถวนั้นแล้วเลื่อนไปให้เห็น
    highlightBookingId.value = typeof q.highlight === 'string' ? q.highlight : null
    if (highlightBookingId.value) {
      const id = highlightBookingId.value
      nextTick(() => document.getElementById(`booking-row-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    }
  },
  { immediate: true }
)
const priceFilterActive = computed(() => priceFilter.value !== 'all' || priceMin.value !== '' || priceMax.value !== '')
const clearPriceFilter = () => {
  priceFilter.value = 'all'
  priceMin.value = ''
  priceMax.value = ''
}
const matchesPrice = (b: Booking) => {
  const fee = b.tripFee || 0
  if (priceFilter.value === 'none' && fee > 0) return false
  if (priceFilter.value === 'has' && !(fee > 0)) return false
  if (typeof priceMin.value === 'number' && fee < priceMin.value) return false
  if (typeof priceMax.value === 'number' && fee > priceMax.value) return false
  return true
}

// --- ตั้งค่าน้ำมัน (ป๊อปอัพราคาประจำวัน) ---
const fuelPriceDialogOpen = ref(false)
const fuelVehicleTypes = ['รถบริษัท', 'รถหุ้นส่วน', 'รถร่วม', 'รถอู่เสริม'] as const
/** ประเภทรถที่ยังไม่มีราคาน้ำมันของ "วันนี้" (ตามประวัติราคา) — ใช้เตือนบนปุ่ม/ตอนนำเข้า กันลืมตั้งราคาก่อนนำเข้างาน */
const missingTodayPriceTypes = computed(() =>
  fuelVehicleTypes.filter((t) => !(fuelRateStore.fuelRateFor(t, bangkokDay(new Date())).rate > 0))
)
const recentFuelPrices = computed(() =>
  [...(fuelRateStore.settings.priceHistory || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
)

// --- การ์ดงานที่เลือก (กดแถวในตาราง) ---
const selectedBookingId = ref<string | null>(null)
const selectedBooking = computed(() => (selectedBookingId.value ? bookingStore.bookings.find((b) => b.id === selectedBookingId.value) || null : null))
const onRowClick = (booking: Booking, e: MouseEvent) => {
  // กดปุ่ม/ลิงก์/ช่องกรอก/เมนูในแถว = ไม่ใช่การเลือกแถว
  if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"]')) return
  selectedBookingId.value = selectedBookingId.value === booking.id ? null : booking.id
}
const selectedDriverRecord = computed(() => {
  const b = selectedBooking.value
  if (!b) return undefined
  return (b.driverId && driversStore.drivers.find((d) => d.id === b.driverId)) || (b.driverName ? findDriverByName(b.driverName) : undefined)
})
/** ชื่อ-นามสกุลเต็มของคนขับ (ไม่รวมชื่อเล่น) — ใช้ข้อมูลจากทะเบียนคนขับก่อน ถ้าไม่พบใช้ชื่อที่เก็บไว้ในงาน */
const selectedDriverFullName = computed(() => {
  const d = selectedDriverRecord.value
  if (d) return `${d.firstName} ${d.lastName}`.trim()
  return selectedBooking.value?.driverName || ''
})
const selectedVehicleType = computed(() => {
  const plate = selectedBooking.value?.plate
  return plate ? vehiclesStore.findByFullPlate(plate)?.department : undefined
})
const cardRateInput = ref(0)
watch(
  () => [selectedBooking.value?.id, selectedBooking.value?.fuelRate] as const,
  () => {
    cardRateInput.value = selectedBooking.value?.fuelRate || 0
  },
  { immediate: true }
)
const saveCardRate = () => {
  const b = selectedBooking.value
  if (!b || !(cardRateInput.value > 0)) return
  bookingStore.updateBookingFull(b.id, { fuelRate: cardRateInput.value })
}
const resetCardRate = () => {
  const b = selectedBooking.value
  if (!b) return
  bookingStore.updateBookingFull(b.id, { fuelRate: 0 })
}

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
    .sort(compareByTrip)

const driverTripNumberForBooking = (booking: Booking) => {
  if (!booking.driverName) return booking.tripSequence ?? 1
  const list = driverBookingsForDay(booking.driverName, bookingDayKey(booking))
  return resolveTripNumber(booking, list)
}

/** ตัวเลือก "เที่ยวที่" ของงานนี้: 1..(จำนวนงานของคนขับวันนั้น + 1) และเลขปัจจุบัน */
const tripNumberChoices = (booking: Booking) => {
  const count = booking.driverName ? driverBookingsForDay(booking.driverName, bookingDayKey(booking)).length : 1
  const max = Math.max(count + 1, driverTripNumberForBooking(booking), 2)
  return Array.from({ length: max }, (_, i) => i + 1)
}

/** เลขเที่ยวที่ตั้งไว้ซ้ำกับงานอื่นของคนขับคนเดียวกันในวันเดียวกัน (ทำให้แอปคนขับเรียงไม่ชัด) */
const tripSequenceClash = (booking: Booking) =>
  booking.tripSequence !== undefined &&
  !!booking.driverName &&
  driverBookingsForDay(booking.driverName, bookingDayKey(booking)).some((b) => b.id !== booking.id && b.tripSequence === booking.tripSequence)

/** ค่าตั้งต้นช่อง "เที่ยวที่" ตอนจัดรถ: เลขที่ระบุไว้แล้ว (import/จัดเที่ยว) ไม่งั้นเที่ยวถัดไปของคนขับวันนั้น */
const defaultTripForDispatch = (booking: Booking) => {
  if (booking.tripSequence !== undefined) return booking.tripSequence
  if (!booking.driverName) return 1
  return nextTripSequence(driverBookingsForDay(booking.driverName, bookingDayKey(booking)).filter((b) => b.id !== booking.id))
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
  // แสดงชื่อเล่นต่อท้ายชื่อ (ออฟฟิศเรียกคนขับด้วยชื่อเล่น) — ช่องค้นหาพิมพ์ชื่อเล่นก็เจอ
  const nickname = (findDriverByName(name)?.nickname || '').trim()
  const label = nickname ? `${name} (${nickname})` : name
  const active = activeBookingsForDriver(name)
  if (!active.length) return `${label} — ว่าง`
  return `${label} — ${active.length} เที่ยว — ${destinationLabel(active[0])}`
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

/** ค้นหาร่วมกับหน้าเลือกงานออกเอกสาร (ดู utils/bookingSearch.ts) + ชื่อเล่นคนขับจากทะเบียนคนขับ */
const matchesSearch = (b: Booking, q: string) => {
  const driver = b.driverId ? driversStore.drivers.find((d) => d.id === b.driverId) : undefined
  return matchesBookingSearch(b, q, [driver?.nickname, driver?.code])
}

const inProgressBookings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return fleetBookings.value
    .filter(
      (b) =>
        b.status !== 'DELIVERED' &&
        b.status !== 'ACCEPTED' &&
        b.status !== 'IN_TRANSIT' &&
        b.status !== 'DELIVERING' &&
        issueFilter.value !== 'pod' &&
        (!q || matchesSearch(b, q)) &&
        matchesPrice(b)
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
    .filter(
      (b) =>
        // งานที่คนขับกด "ดำเนินการเสร็จสิ้น" แล้ว (DELIVERED) แต่ยังไม่ผ่านทั้งตรวจสอบ POD และ "ยืนยันการจบงาน" (ขั้น
        // สุดท้ายจริง — ดู confirmJobCompletion) ต้องยังโชว์อยู่ในตารางนี้ต่อ ไม่ใช่หายไปทันที (ครอบคลุมทั้ง PENDING_REVIEW
        // และ APPROVED-แต่ยังไม่กดยืนยันจบงาน) งานที่ออฟฟิศปิดเอง (podReviewStatus undefined) ไม่เข้าเงื่อนไขนี้ หายไป
        // ทันทีเหมือนเดิม — ให้ตรงกับ isBookingConfirmedForBilling ใน utils/bookingStatus.ts พอดี
        ((b.status === 'ACCEPTED' || b.status === 'IN_TRANSIT' || b.status === 'DELIVERING') ||
          (b.status === 'DELIVERED' && !!b.podReviewStatus && !b.completionConfirmedAt)) &&
        (issueFilter.value !== 'pod' || b.podReviewStatus === 'PENDING_REVIEW') &&
        (!q || matchesSearch(b, q)) &&
        matchesPrice(b)
    )
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

const formatBaht = (value: number) => `฿${(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`


// --- Dispatch flow ---
const dispatchTarget = ref<Booking | null>(null)
const dispatchForm = ref({
  plate: '',
  driverName: '',
  odometerBefore: 0,
  tripSequence: 1,
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
/** เรทน้ำมันตามประเภทรถของทะเบียนที่กำลังเลือกในไดอะล็อก (พรีวิวก่อนกดจ่ายงาน — ค่าจริงถูกตั้งตอน dispatchBooking ด้วยสูตรเดียวกัน)
 *  ยังไม่เลือกรถ = ยังไม่มีเรท พร้อมสาเหตุ */
const dispatchFuelRatePreview = computed(() =>
  fuelRateStore.fuelRateFor(
    vehiclesStore.findByFullPlate(dispatchForm.value.plate)?.department,
    dispatchTarget.value?.createdAt
  )
)

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
    tripSequence: defaultTripForDispatch(booking),
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

/** ตัวเลือกใน SearchableSelect ของป๊อปอัพจัดรถ (ป้ายกำกับ/สีตามจำนวนเที่ยวเหมือน dropdown เดิมทุกประการ) */
const dispatchPlateOptions = computed<SearchableOption[]>(() =>
  availableVehiclesForDispatch.value.map((v) => ({
    value: vehiclesStore.fullPlate(v),
    label: vehicleOptionLabel(v),
    color: vehicleOptionColor(v),
  }))
)
const dispatchDriverOptions = computed<SearchableOption[]>(() =>
  driverOptions.value.map((name) => ({ value: name, label: driverOptionLabel(name), color: driverOptionColor(name) }))
)
const dispatchDriverRecord = computed(() => (dispatchForm.value.driverName ? findDriverByName(dispatchForm.value.driverName) : undefined))

const confirmDispatch = () => {
  if (!dispatchTarget.value || !dispatchForm.value.plate || !dispatchForm.value.driverName) return
  const selectedDriver = dispatchForm.value.driverName ? findDriverByName(dispatchForm.value.driverName) : undefined
  bookingStore.dispatchBooking(dispatchTarget.value.id, dispatchForm.value.plate, {
    driverName: dispatchForm.value.driverName || undefined,
    driverId: selectedDriver?.id,
    driverFirstName: selectedDriver?.firstName,
    driverLastName: selectedDriver?.lastName,
    odometerBefore: dispatchForm.value.odometerBefore,
    tripSequence: dispatchForm.value.tripSequence >= 1 ? dispatchForm.value.tripSequence : undefined,
  })
  // ปรับคนขับประจำของรถให้ตรงกับที่เลือกจ่ายงานจริง เพื่อให้ทุกหน้าที่ใช้รถเห็นคนขับล่าสุด
  if (selectedDriver) {
    const vehicle = vehiclesStore.findByFullPlate(dispatchForm.value.plate)
    if (vehicle) vehiclesStore.assignDriver(vehicle.id, selectedDriver.code)
  }
  dispatchTarget.value = null
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
  const permission = bookingStore.canDeleteBooking(booking)
  if (!permission.ok) {
    alert(permission.reason || 'ไม่มีสิทธิ์ลบงานนี้')
    return
  }
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
  if (!canSelectDelete.value || bulkDeletingInProgress.value) return
  const selected = inProgressBookings.value.filter((b) => selectedInProgress.value[b.id])
  const targets = selected.filter((b) => bookingStore.canDeleteBooking(b).ok)
  const skipped = selected.filter((b) => !bookingStore.canDeleteBooking(b).ok)
  if (skipped.length) {
    alert(`งานต่อไปนี้ลบไม่ได้ (วางบิลแล้ว/มีเอกสารวางบิลอ้างอิง) จะถูกข้าม:\n${skipped.map((b) => '- ' + b.docNo).join('\n')}`)
  }
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

const openCompleteDialog = (booking: Booking) => {
  completeTarget.value = booking
}

const standardFuelOf = (booking: Booking) => fuelRateStore.standardFuelLiters(booking.items, booking.pricingMode) || undefined

/** ปัญหาที่ขวางการจบงานของแถวนี้ที่ต้องไปแก้ที่หน้าแก้ไขงาน/จัดรถ (ทะเบียน/คนขับ/ค่าเที่ยว) — ปุ่ม "จบงาน" ถูกปิดพร้อมบอกเหตุผล
 *  (เลขไมล์/ลิตรน้ำมันกรอกได้ในไดอะล็อกจบงานเอง จึงไม่นับตรงนี้) */
const completeBlockedReason = (booking: Booking) =>
  describeCompletionIssues(bookingCompletionIssues(booking, { standardFuelLiters: standardFuelOf(booking), tripNumber: bookingStore.tripNumberOf(booking) }).filter((i) => STATIC_COMPLETION_CODES.includes(i.code)))

/** ปุ่ม "ยืนยันการจบงาน" (หลังตรวจ POD) — ข้อมูลไม่ครบ = กดไม่ได้ พร้อมบอกว่าขาดอะไร */
const confirmBlockedReason = (booking: Booking) =>
  describeCompletionIssues(bookingCompletionIssues(booking, { standardFuelLiters: standardFuelOf(booking), tripNumber: bookingStore.tripNumberOf(booking) }))

const onCancelDispatch = (booking: Booking) => {
  if (!confirm(`ยกเลิกการจ่ายงาน ${booking.docNo} และคืนกลับไปที่ตารางจองงาน?`)) return
  bookingStore.declineDispatch(booking.id)
}

/** ตรวจสอบ POD ที่คนขับส่งผ่านแอปแล้ว (ดู reviewPod ใน stores/booking.ts) — แค่ตรวจว่ารูปตรงกับข้อมูลในระบบไหม ไม่ใช่
 *  ขั้นปิดงาน (ดู confirmJobCompletion แยกต่างหากด้านล่าง) ย้ายมาไว้ที่ตารางนี้ด้วย (เดิมมีแค่ที่หน้า "งานเสร็จสิ้น"
 *  CompletedJobsView.vue) ให้ออฟฟิศตรวจได้จากจุดที่กำลังดูตารางขนส่งอยู่แล้ว ไม่ต้องสลับหน้า — ไม่มีปุ่ม "ตีกลับ" แยก
 *  เพราะเจตนาของขั้นนี้คือตรวจสอบแล้วแก้ไขให้ถูกต้องตรงนั้น (แนบรูปใหม่แทนที่ที่หน้ารายละเอียดงาน) ไม่ใช่ส่งกลับไปให้
 *  คนขับทำใหม่ */
/** ยืนยัน POD = ยืนยันการจบงานด้วยในคลิกเดียว (ดู bookingStore.approvePodAndConfirmCompletion) */
const approvePod = (booking: Booking) => {
  if (!confirm(`ยืนยันว่ารูป POD ของงาน ${booking.docNo} ตรงกับข้อมูลในระบบ และจบงาน? หลังยืนยันจะนำไปวางบิลได้ และงานจะย้ายไปหน้า "งานเสร็จสิ้น"`)) return
  const result = bookingStore.approvePodAndConfirmCompletion(booking.id)
  if (!result.ok && result.issues.length) alert(`ยืนยัน POD/จบงานไม่ได้ ข้อมูลยังไม่ครบ:\n- ${result.issues.map((i) => i.message).join('\n- ')}`)
}

/** เสมียนกดยืนยันการจบงาน — ขั้นตอนสุดท้ายจริงก่อนนำไปวางบิล แยกจากการตรวจสอบ POD ด้านบนโดยเจตนา (ดู
 *  bookingStore.confirmJobCompletion ใน stores/booking.ts) จบงานแล้วจะไปโผล่ที่หน้า "งานเสร็จสิ้น" แทน */
const onConfirmJobCompletion = (booking: Booking) => {
  if (!confirm(`ยืนยันการจบงาน ${booking.docNo}? หลังยืนยันจะสามารถนำไปวางบิลได้ และงานจะย้ายไปหน้า "งานเสร็จสิ้น"`)) return
  const result = bookingStore.confirmJobCompletion(booking.id)
  if (!result.ok && result.issues.length) alert(`จบงานไม่ได้ ข้อมูลยังไม่ครบ:\n- ${result.issues.map((i) => i.message).join('\n- ')}`)
}

// --- นำเข้า Booking จากไฟล์ Excel งานจริง (Requirement: "Import Excel เพื่อสร้างงาน" ตามคอลัมน์ที่หน้างานใช้อยู่จริง) ---
// การ parse แถวจริง (IMPORT_HEADERS/ImportRowResult/parseImportRow ฯลฯ) ย้ายไปอยู่ที่ src/utils/importRowParser.ts
// แล้ว (เทสแยกได้จริงโดยไม่ต้อง mock Pinia store) ไฟล์นี้เหลือแค่ state ของ modal + ต่อ deps (driversStore/
// vehiclesStore/fuelRateStore) เข้ากับ parser เท่านั้น
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
  reconcileRows.value = raw
    .map((r, idx) =>
      parseImportRow(r, idx + headerRowIndex + 2, {
        matchDriver: matchDriverForImportRow,
        matchCustomer: matchCustomerForImportRow,
        findFuelRate: (province, district) => fuelRateStore.findRate(province, district) ?? undefined,
      })
    )
    .filter((r) => !r.isEmpty)
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

/** โชว์รายละเอียดจริงของงานที่จะให้เลือก แทนการโชว์แค่เลขที่เอกสารเปล่าๆ ที่เดาไม่ออกว่าใช่งานเดียวกันไหม */
const reconcileCandidateLabel = (booking: Booking) => {
  const product = booking.items[0]?.product || '-'
  const date = booking.loadingDate ? formatShortDate(booking.loadingDate) : 'ไม่มีวันที่'
  return `${booking.docNo} · ${booking.customer} · ${booking.plate || 'ไม่มีทะเบียน'} · ${product} · ${date}`
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

/** ลำดับคอลัมน์ทั้งหมดของชีทงานจริง รวมคอลัมน์ที่ไม่ได้ใช้เก็บข้อมูล (ลำดับ/เที่ยวที่ — เที่ยวที่คำนวณสดเสมอ ดู
 *  driverTripNumberForBooking) ไว้ด้วย เพื่อให้ Template ที่ดาวน์โหลดหน้าตาตรงกับไฟล์งานจริงเป๊ะ และ Row แรกของ
 *  Template ขึ้นต้นด้วย "ลำดับ" เหมือนไฟล์จริงที่ไม่มีหัวเรื่อง (ดู IMPORT_HEADER_MARKER) — ไม่มีคอลัมน์ "ทะเบียนรถ"
 *  เพราะไฟล์จริงของลูกค้าไม่มีคอลัมน์นี้ ("คอนเฟิร์ม" คือทะเบียนรถจริงที่ใช้ยืนยันงานอยู่แล้ว ดู IMPORT_HEADERS.plate) */
const IMPORT_COLUMN_ORDER = [
  IMPORT_HEADER_MARKER,
  'เที่ยวที่',
  IMPORT_HEADERS.driverName,
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
  IMPORT_HEADERS.jobType,
  IMPORT_HEADERS.mapLink,
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
    '',
    '',
    '',
  ]
  const worksheet = XLSX.utils.aoa_to_sheet([IMPORT_COLUMN_ORDER, sampleRow])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, 'Booking_Import_Template.xlsx')
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
  // ลิงก์ GPS ที่เป็น hyperlink ฝังในเซลล์ (แสดงเป็นข้อความป้าย) ดึง URL จริงมาแทน
  applySheetHyperlinks(sheet as Record<string, any>, headerRowIndex, (allRows[headerRowIndex] || []).map((h) => String(h ?? '')), raw)
  importRows.value = raw.map((r, idx) =>
    parseImportRow(r, idx + headerRowIndex + 2, {
      matchDriver: matchDriverForImportRow,
      matchCustomer: matchCustomerForImportRow,
      findFuelRate: (province, district) => fuelRateStore.findRate(province, district) ?? undefined,
    })
  )
  // เทียบราคาต่อหน่วยของแต่ละแถวกับราคามัธยฐานของสินค้าเดียวกันในไฟล์นี้ กันกรณีกรอกราคารวมมาแทนราคาต่อหน่วย
  // (ดู flagPriceOutliers) ต้องรอให้ parse ครบทุกแถวก่อนถึงจะเทียบได้ จึงทำหลัง map เสร็จ ไม่ใช่ต่อแถวใน parseImportRow
  flagPriceOutliers(importRows.value)
  assignImportTripSequences(importRows.value)
  input.value = ''
}

/** รับแถวที่ส่งต่อมาจากหน้า "ตารางลงงาน" เข้าขั้นตอนพรีวิว/ยืนยันเดียวกับการนำเข้าไฟล์ Excel ทุกประการ */
const importDraftStore = useImportDraftStore()
onMounted(() => {
  const draft = importDraftStore.take(props.fleet)
  if (!draft) return
  importFileName.value = 'ตารางลงงาน (กรอกในระบบ)'
  const [y, m, d] = draft.shipDate.split('-').map(Number)
  importShipDate.value = y && m && d ? new Date(y, m - 1, d) : undefined
  importRows.value = draft.rows.map((r, idx) =>
    parseImportRow(r, idx + 1, {
      matchDriver: matchDriverForImportRow,
      matchCustomer: matchCustomerForImportRow,
      findFuelRate: (province, district) => fuelRateStore.findRate(province, district) ?? undefined,
    })
  )
  flagPriceOutliers(importRows.value)
  assignImportTripSequences(importRows.value)
  importModalOpen.value = true
})

const importableRows = computed(() => importRows.value.filter((r) => !r.isEmpty))
/** ระดับ 2: เตือนเลขเที่ยวซ้ำ/ข้ามเลขต่อคนขับ(หรือทะเบียน) ก่อนยืนยันสร้างงาน — เตือนเฉยๆ ไม่บล็อก */
const importTripWarnings = computed(() =>
  validateTripSequences(importableRows.value.map((r) => ({ key: r.driverName || r.plate, tripSequence: r.tripSequence })))
)
const importTripWarningFor = (row: ImportRowResult) => importTripWarnings.value[row.driverName || row.plate]?.join(' · ')
const importWarningRowCount = computed(() => importableRows.value.filter((r) => r.warnings.length > 0).length)
/** เลขเที่ยวชนกับงานเดิมของคนขับคนเดียวกันในวันที่นำเข้า (แก้เลขในพรีวิวแล้วคำนวณใหม่ทันที) */
const importTripClashFor = (row: ImportRowResult) => {
  if (!row.driverName || row.tripSequence === undefined) return undefined
  const clash = driverBookingsForDay(row.driverName, importShipDate.value ?? new Date()).find((b) => b.tripSequence === row.tripSequence)
  return clash ? `เที่ยวที่ ${row.tripSequence} ของ ${row.driverName} ซ้ำกับงาน ${clash.docNo} ที่มีอยู่แล้วในวันนั้น — แก้เลขเที่ยวในพรีวิว` : undefined
}
/** ข้อควรตรวจก่อนนำเข้าของแถว: พิกัด/ลิงก์ GPS, เลขเที่ยวอ่านไม่ได้ (row.checks) + เลขเที่ยวชนงานเดิมของวัน — ไม่ถูกแปะลง note ของงาน */
/** ชื่อเล่นใน Excel ที่ยังไม่ได้ map เป็นคนขับ (ผู้ใช้ยังไม่ได้เลือก) — ต้องตรวจก่อนสร้างงาน */
const importUnmappedDriverFor = (row: ImportRowResult) =>
  row.driverNickname && !row.driverName ? `ชื่อเล่น "${row.driverNickname}" ยังไม่ได้ map เป็นคนขับ — เลือกคนขับในคอลัมน์ พขร. ก่อน ไม่งั้นงานจะไม่มีคนขับ` : undefined
const importChecksFor = (row: ImportRowResult) =>
  [importUnmappedDriverFor(row), ...row.checks, importTripClashFor(row)].filter((c): c is string => !!c)

/** คนขับที่เลือกได้ในพรีวิวนำเข้า (ที่ยังทำงานอยู่): ชื่อ นามสกุล (ชื่อเล่น) */
const importDriverChoices = computed(() =>
  driversStore.drivers
    .filter((d) => d.employmentStatus === 'active')
    .map((d) => ({ id: d.id as string, label: `${d.firstName} ${d.lastName}${d.nickname ? ` (${d.nickname})` : ''}`.trim() }))
)
const onImportPickDriver = (row: ImportRowResult, driverId: string) => {
  const driver = driversStore.drivers.find((d) => d.id === driverId)
  if (!driver) return
  const vehicle = vehiclesStore.vehicleForDriver(driver.code)
  mapImportRowToDriver(row, {
    id: driver.id,
    firstName: driver.firstName,
    lastName: driver.lastName,
    plate: vehicle ? vehiclesStore.fullPlate(vehicle) : undefined,
  })
}
const importCheckRowCount = computed(() => importableRows.value.filter((r) => importChecksFor(r).length > 0).length)

/** สร้าง Booking จริงทีละแถว — เลขที่เอกสาร/ใบปล่อยรถยังออกอัตโนมัติตามปกติเสมอ (ไม่ใช้เลขจาก Excel ตรงๆ กันชนกับ
 *  เลขที่ระบบเคยออกไปแล้ว) ส่วนเลขที่เอกสารจาก Excel เก็บไว้ที่ booking.reference เพื่ออ้างอิงย้อนหลังเท่านั้น
 *  สถานะงาน (status) ไม่เอามาจากไฟล์ Excel เด็ดขาด — ปล่อยให้เป็น WAITING_DISPATCH ตามที่ addBooking ตั้งให้เสมอ
 *  (เดิมเคยพยายามอ่านคอลัมน์ "สถานะขนส่งสินค้า" มาตั้งสถานะให้ แต่ไฟล์จริงของลูกค้าไม่มีคอลัมน์นี้อยู่แล้ว และระบบควร
 *  เป็นคนกำหนดสถานะงานเอง ไม่ใช่ไฟล์ที่ import เข้ามา — เอาลอจิกนี้ออกทั้งหมด กันงานที่ import มาโดนตีความผิดเป็น
 *  "จบงานแล้ว" ทั้งที่ยังไม่ได้จัดรถเลย) */
const confirmImport = () => {
  if (!importableRows.value.length) return
  // ตรวจก่อนนำเข้า: มีแถวที่พิกัด/เลขเที่ยวน่าสงสัย — ให้ยืนยันอีกครั้งว่าจะสร้างต่อหรือกลับไปแก้
  const checkRows = importableRows.value.filter((r) => importChecksFor(r).length > 0)
  if (checkRows.length) {
    const sample = checkRows
      .slice(0, 5)
      .map((r) => `แถว ${r.rowNumber}: ${importChecksFor(r)[0]}`)
      .join('\n')
    const more = checkRows.length > 5 ? `\n…และอีก ${checkRows.length - 5} แถว` : ''
    if (!confirm(`มี ${checkRows.length} แถวที่ควรตรวจก่อนนำเข้า (พิกัด/ลิงก์ GPS หรือเลขเที่ยว):\n${sample}${more}\n\nสร้างงานต่อเลยไหม? (กด ยกเลิก เพื่อกลับไปแก้)`)) return
  }
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
        mapUrl: row.mapUrl,
        latitude: row.latitude,
        longitude: row.longitude,
        // ประเภทงานเป็นฟิลด์เฉพาะ Fleet Cements เท่านั้น (ดู JobItem.jobType) — เหมือน pattern เดียวกับตอนจัดรถ
        jobType: isCements.value ? row.jobType : undefined,
        extraProducts: otherPairs.length ? otherPairs.map((p) => ({ product: p.product, qty: p.qty, unit: 'ตัน' })) : undefined,
      },
    ]
    // "ราคาปูน" ในไฟล์ Excel คือราคาต่อเที่ยวอยู่แล้ว (ไม่ใช่ราคาต่อตัน) — ห้ามเอาไปคูณกับจำนวนตันอีก เดิมเคยคูณ
    // row.qty * row.price ผิด ตาม requirement ที่ยืนยันชัดเจนว่า "คิดราคาเป็นเที่ยว ไม่ใช่ตามจำนวน/ราคาสินค้า"
    // ใช้ row.price ตรงๆ เป็นยอด "รวมเป็นเงิน"/"จำนวนเงินทั้งสิ้น" เสมอ ปัดเก็บ 2 ตำแหน่งกันเศษ floating point เท่านั้น
    const amount = Math.round(row.price * 100) / 100
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
      // ไม่ auto-เซ็ต VAT ของระบบให้งาน import อีกต่อไป — ไฟล์ Excel ไม่มีคอลัมน์ภาษีเลย การเติม VAT 7% ให้เองทำให้
      // ใบสั่งงานที่พิมพ์ออกมามี VAT ติดทุกใบทั้งที่ไม่มีใครกรอก (ดู JobDocumentView.vue's showVatRow)
      pricingMode: 'SINGLE_DESTINATION',
      fuelLiters: row.fuelLiters,
      fuelUnreadable: row.fuelUnreadable,
      fuelNotRefilled: row.fuelNotRefilled,
      // เรทจริงตั้งโดย bookingStore.addBooking ตามประเภทรถของทะเบียน (ไม่รู้ประเภท = 0 + หมายเหตุสาเหตุ)
      fuelRate: 0,
      plate: row.plate || undefined,
      driverName: row.driverName || undefined,
      driverId: row.driverId,
      driverFirstName: row.driverFirstName,
      driverLastName: row.driverLastName,
      tripSequence: row.tripSequence,
      // เดิมเซ็ตแค่ loadingDate จากวันที่หัวไฟล์ ไม่เคยเซ็ต shipDate เลย ทำให้หน้าเลือกวางบิล/ใบวางบิล/
      // ใบกำกับภาษีของงาน import ทุกงานขึ้น "วันที่ส่งงาน" เป็น "-" และช่วงวันที่ในคำอธิบายรายการว่างไปด้วย —
      // ต้องเซ็ตทั้งคู่เหมือนหน้าสร้าง/แก้ไขงานด้วยมือ (BookingCreateView.vue/BookingEditView.vue)
      shipDate: importShipDate.value,
      loadingDate: importShipDate.value,
      loadingTime: row.time || undefined,
      ticketChecked: row.ticketChecked || undefined,
      note: row.note || undefined,
    })
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
