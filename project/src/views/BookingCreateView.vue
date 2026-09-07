<template>
  <div class="space-y-4 pb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-end gap-3">
        <div>
          <label class="field-label">เลขที่ใบปล่อยรถ</label>
          <div class="flex items-center h-9 px-2 rounded-lg bg-surface-2 text-sm text-muted font-mono">{{ nextReleaseNoPreview }}</div>
        </div>
        <div>
          <label class="field-label">วันที่สร้างงาน</label>
          <input v-model="header.jobDate" type="date" class="input-field h-9 px-2 text-sm" />
        </div>
        <div class="text-xs text-muted pb-2">{{ isCements ? 'Fleet Cements' : 'Fleet Ceramics' }}</div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="goBack" class="btn-secondary">ยกเลิก</button>
        <button @click="openImportModal" class="btn-secondary">
          <span class="material-symbols-rounded text-base">upload_file</span>
          นำเข้า Excel
        </button>
        <button @click="saveAllItems" :disabled="!canSave" class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          <span class="material-symbols-rounded text-base">save</span>
          บันทึกงาน ({{ lineItems.length }} รายการ)
        </button>
      </div>
    </div>

    <div
      v-if="fuelDataMissingForCreate"
      class="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between gap-3 flex-wrap"
    >
      <span>ไม่สามารถสร้างงานได้ เนื่องจากยังไม่มีข้อมูลน้ำมันสำหรับปลายทางนี้</span>
      <button type="button" @click="goToFuelSettings" class="btn-secondary shrink-0 whitespace-nowrap">
        <span class="material-symbols-rounded text-base">local_gas_station</span>
        ตั้งค่าน้ำมัน
      </button>
    </div>

    <!-- ข้อมูลทั่วไปของงาน -->
    <div class="card-lg space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-3">
          <div>
            <label class="field-label">ชื่อลูกค้า</label>
            <input v-model="header.customer" list="customerNameOptions" placeholder="ชื่อลูกค้า (พิมพ์ใหม่ได้ หรือเลือกจากสมุดรายชื่อ)" class="input-field w-full" />
            <datalist id="customerNameOptions">
              <option v-for="c in customerStore.customers" :key="c.name" :value="c.name" />
            </datalist>
            <div v-if="selectedCustomerRecord" class="flex items-center gap-2 mt-1.5">
              <span
                class="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-surface-2 text-text"
              >
                <span
                  v-if="selectedCustomerRecord.color"
                  :style="{ background: selectedCustomerRecord.color }"
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                ></span>
                {{ selectedCustomerRecord.code || '-' }}
              </span>
            </div>
          </div>
          <div class="w-full sm:w-1/2">
            <ContactPickerField :customer-id="selectedCustomerId" v-model="header.contactId" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="field-label">ใบสั่งงาน (PO)</label>
              <input v-model="header.po" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">วันที่ลงงาน <span class="font-normal text-[10px]">(ไม่บังคับ)</span></label>
              <input v-model="header.loadingDate" type="date" class="input-field w-full" />
            </div>
            <div>
              <label class="field-label">
                เวลา <span class="font-normal text-[10px]">(ช่วงเวลา ไม่บังคับ)</span>
              </label>
              <div class="flex items-center gap-2">
                <input v-model="header.loadingTime" type="time" class="input-field w-full" />
                <span class="text-muted text-sm">-</span>
                <input v-model="header.loadingTimeEnd" type="time" class="input-field w-full" />
              </div>
            </div>
            <!-- ซ่อนตาม Requirement เดิม: วันที่ขนส่ง/วันที่กลับ/ทะเบียนรถ/คนขับ — คง field ใน data model ไว้ (ดู
                 header/defaultHeader/saveAllItems) จัดรถ/คนขับย้ายไปทำที่ Booking List แทน (ดู BookingView.vue) —
                 วันที่ลงงาน/เวลา (loadingDate/loadingTime) แสดงแล้วตาม Requirement ใหม่ (Customer/Job Information) -->
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex justify-end">
            <DocumentActionBar :disabled="!canSave" @print="printAction" @download="toolbarNotReady" @share="toolbarNotReady" @envelope="toolbarNotReady" @history="toolbarNotReady" @settings="toolbarNotReady" />
          </div>
          <div>
            <label class="field-label">
              รูปแบบคิดราคา
              <span class="font-normal text-[10px]">(เลือกก่อนเพิ่มรายการสินค้า)</span>
            </label>
            <div class="flex gap-2 flex-wrap">
              <button
                type="button"
                @click="header.pricingMode = 'SINGLE_DESTINATION'"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                  header.pricingMode === 'SINGLE_DESTINATION' ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                ]"
              >
                รวมทั้งเที่ยว (ปลายทางเดียว)
              </button>
              <button
                type="button"
                @click="header.pricingMode = 'MULTI_DESTINATION'"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                  header.pricingMode === 'MULTI_DESTINATION' ? 'bg-primary text-white' : 'bg-surface text-text border border-border hover:bg-border',
                ]"
              >
                แยกค่าเที่ยวตามปลายทาง
              </button>
            </div>
          </div>
          <div>
            <label class="field-label">
              ค่าเที่ยว (บาท)
              <span class="font-normal text-[10px]">{{ header.pricingMode === 'MULTI_DESTINATION' ? '(รวมจากรายการด้านล่าง)' : '(รวมทั้งเที่ยว)' }}</span>
            </label>
            <input v-if="header.pricingMode !== 'MULTI_DESTINATION'" v-model.number="header.tripFee" type="number" placeholder="0" class="input-field w-full" />
            <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(multiTripFeeTotal) }} (อัตโนมัติ)</div>
          </div>
          <!-- ซ่อนตาม Requirement: ราคาที่ตกลงกับลูกค้า/ส่วนลด/VAT — คง field ใน data model ไว้ (agreedPrice fallback
               เป็น tripFee, discountMode default 'percent'/0, vatRate default จาก documentSettingsStore เหมือนเดิม) -->
          <div>
            <label class="field-label">เบี้ยเลี้ยงคนขับ</label>
            <input v-if="isCements" v-model.number="header.allowance" type="number" placeholder="0" class="input-field w-full" />
            <div v-else class="flex items-center h-10 px-3 rounded-lg bg-surface-2 text-sm text-text font-semibold">{{ formatBaht(headerCalculatedAllowance) }} (อัตโนมัติ)</div>
          </div>
        </div>
      </div>

      <!-- เลขชิพเม้น / เลขที่อ้างอิง / รายละเอียด — ซ่อนเส้นทาง/ต้นทางตาม Requirement (คง field ไว้ใน data model) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-border">
        <div>
          <label class="field-label">เลขชิพเม้น</label>
          <input v-model="header.shipmentNo" placeholder="เลขที่ Shipment" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">เลขที่อ้างอิง</label>
          <input v-model="header.reference" class="input-field w-full" />
        </div>
        <div>
          <label class="field-label">รายละเอียด</label>
          <input v-model="header.description" class="input-field w-full" />
        </div>
      </div>

      <div>
        <label class="field-label">หมายเหตุ</label>
        <textarea v-model="header.note" rows="3" class="input-field w-full" />
      </div>
    </div>

    <!-- รายการขนส่ง -->
    <div class="card-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-text">รายการขนส่ง ({{ lineItems.length }} รายการ)</h3>
        <button @click="openAddItem" class="btn-secondary">
          <span class="material-symbols-rounded text-base">add</span>
          เพิ่มรายการ
        </button>
      </div>
      <div v-if="lineItems.length === 0" class="border border-border rounded-lg px-4 py-6 text-center text-muted text-sm">
        ยังไม่มีรายการ กด "เพิ่มรายการ" เพื่อเริ่มกรอกสินค้า/ปลายทาง
      </div>
      <template v-else>
        <div v-if="hasIncompleteDestination" class="text-xs text-amber-600 flex items-center gap-1 mb-2">
          <span class="material-symbols-rounded text-sm">info</span>
          เติมสินค้า/จำนวนจากใบเสนอราคาให้แล้ว แต่ยังไม่มีปลายทาง — กด "แก้ไข" ที่แต่ละรายการเพื่อกรอกสถานที่ส่งสินค้า/จังหวัด/อำเภอก่อนบันทึกงาน
        </div>
        <div class="overflow-x-auto border border-border rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-surface-2 border-b border-border">
              <tr>
                <th class="text-left px-3 py-2 font-semibold text-muted">สินค้า</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">จำนวน</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ปลายทาง</th>
                <th class="text-left px-3 py-2 font-semibold text-muted">ข้อมูลติดต่อ</th>
                <th class="text-right px-3 py-2 font-semibold text-muted">น้ำมันมาตรฐาน</th>
                <template v-if="header.pricingMode === 'MULTI_DESTINATION'">
                  <th class="text-right px-3 py-2 font-semibold text-muted">ค่าเที่ยว/เที่ยว</th>
                  <th class="text-right px-3 py-2 font-semibold text-muted">รวม</th>
                </template>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(li, idx) in lineItems" :key="li.id" class="border-b border-border last:border-0">
                <td class="px-3 py-2 text-text">
                  {{ li.product }} <span v-if="li.jobType" class="text-muted">({{ li.jobType }})</span>
                  <div v-for="(ep, epIdx) in li.extraProducts || []" :key="epIdx" class="text-[11px] text-muted">
                    + สินค้าอื่น: {{ ep.product }} {{ ep.qty }} {{ ep.unit }}
                  </div>
                </td>
                <td class="px-3 py-2 text-right text-text">{{ li.qty }} {{ li.unit }}</td>
                <td class="px-3 py-2 text-text">
                  <span v-if="li.siteName">
                    {{ li.siteName }} <span class="text-muted">({{ li.province }} / {{ li.district }})</span>
                  </span>
                  <span v-else class="text-amber-600 text-xs">ยังไม่ได้กรอกปลายทาง</span>
                  <span v-if="idx === 0 && header.pricingMode === 'SINGLE_DESTINATION'" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">รายการหลัก</span>
                </td>
                <td class="px-3 py-2 text-muted">{{ li.siteContactName || '-' }} {{ li.sitePhone ? `(${li.sitePhone})` : '' }}</td>
                <td class="px-3 py-2 text-right text-muted">{{ fuelRateStore.findRate(li.province, li.district)?.liters ?? '-' }}</td>
                <template v-if="header.pricingMode === 'MULTI_DESTINATION'">
                  <td class="px-3 py-2 text-right text-text">{{ formatBaht(li.tripFee || 0) }} x {{ li.tripCount || 1 }}</td>
                  <td class="px-3 py-2 text-right font-semibold text-text">{{ formatBaht((li.tripFee || 0) * (li.tripCount || 1)) }}</td>
                </template>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button @click="openEditItem(idx)" class="text-muted hover:text-text mr-2">
                    <span class="material-symbols-rounded text-base">edit</span>
                  </button>
                  <button @click="removeLineItem(idx)" class="text-red-500 hover:text-red-700">
                    <span class="material-symbols-rounded text-base">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="header.pricingMode === 'MULTI_DESTINATION' && lineItems.length">
              <tr class="bg-surface-2 font-semibold text-text">
                <td colspan="6" class="px-3 py-2 text-right">รวมค่าเที่ยวทั้งงาน</td>
                <td class="px-3 py-2 text-right">{{ formatBaht(multiTripFeeTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </template>
    </div>

    <!-- สรุปงาน -->
    <div class="card-lg">
      <h3 class="font-semibold text-text mb-3">สรุปงาน</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-muted text-xs">จำนวนรายการ</div>
          <div class="font-semibold text-text">{{ lineItems.length }} รายการ</div>
        </div>
        <div>
          <div class="text-muted text-xs">ปลายทาง</div>
          <div class="font-semibold text-text">{{ destinationSummary }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">น้ำมันมาตรฐานรวม</div>
          <div v-if="!hasUnconfiguredDistrict" class="font-semibold text-text">{{ computedFuel }} ล.</div>
          <template v-else-if="fuelLiterLocked">
            <div class="font-semibold text-text">-</div>
            <div class="text-[10px] text-amber-600 mt-0.5">ยังไม่มีการกำหนดราคาน้ำมันสำหรับพื้นที่นี้ และไม่มีสิทธิ์กำหนดเอง</div>
          </template>
          <template v-else>
            <input v-model.number="fuelLitersOverride" type="number" placeholder="0" class="input-field h-8 w-24 px-2 text-sm" />
            <div class="text-[10px] text-amber-600 mt-0.5">ปลายทางนี้ยังไม่ได้ตั้งค่าน้ำมันไว้ล่วงหน้า กรอกเองได้ (เฉพาะงานนี้)</div>
          </template>
        </div>
        <div>
          <div class="text-muted text-xs">ค่าเที่ยวรวม</div>
          <div class="font-semibold text-text">{{ formatBaht(header.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal : header.tripFee) }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">ราคาที่ตกลงกับลูกค้า</div>
          <div class="font-semibold text-text">{{ formatBaht(header.agreedPrice || (header.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal : header.tripFee)) }}</div>
        </div>
        <div>
          <div class="text-muted text-xs">เบี้ยเลี้ยงคนขับ</div>
          <div class="font-semibold text-text">{{ formatBaht(isCements ? header.allowance || 0 : headerCalculatedAllowance) }}</div>
        </div>
      </div>
    </div>

    <!-- สรุปยอดเอกสาร -->
    <div class="card-lg">
      <h3 class="font-semibold text-text mb-3">สรุปยอดเอกสาร</h3>
      <div class="bg-surface-2 rounded-xl p-4 space-y-1.5 text-sm max-w-sm ml-auto">
        <div class="flex justify-between">
          <span class="text-muted">รวมเป็นเงิน</span>
          <span>{{ formatBaht(docSubtotal) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">ส่วนลดรวม</span>
          <span>{{ formatBaht(docDiscountTotal) }}</span>
        </div>
        <div class="flex justify-between font-semibold border-t border-border pt-1.5">
          <span>ราคาหลังหักส่วนลด</span>
          <span>{{ formatBaht(docAfterDiscount) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">ภาษีมูลค่าเพิ่ม</span>
          <span>{{ formatBaht(docVatTotal) }}</span>
        </div>
        <div class="flex justify-between font-bold text-primary border-t border-border pt-1.5">
          <span>จำนวนเงินรวมทั้งสิ้น</span>
          <span>{{ formatBaht(docGrandTotal) }}</span>
        </div>
      </div>
    </div>

    <JobItemEditorModal
      :open="itemEditorOpen"
      :item="editingIndex !== null ? lineItems[editingIndex] : null"
      :pricing-mode="header.pricingMode"
      :locked-destination="lockedDestination"
      :product-options="productOptionsForFleet"
      :is-cements="isCements"
      :customer-name="header.customer"
      :other-items="editingIndex !== null ? lineItems.filter((_, i) => i !== editingIndex) : lineItems"
      @save="onItemSave"
      @close="closeItemEditor"
    />

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
              <div class="bg-surface-2 rounded-lg p-3 text-sm flex items-center gap-4 flex-wrap">
                <span class="font-semibold text-text">อ่านได้ {{ importRows.length }} แถว</span>
                <span class="text-green-600">จะสร้าง {{ importableGroups.length }} งาน</span>
                <span v-if="importSkippedRowCount" class="text-red-600">ข้าม {{ importSkippedRowCount }} แถว (ข้อมูลไม่ครบ/ไม่มีข้อมูลน้ำมัน)</span>
              </div>

              <div class="overflow-x-auto border border-border rounded-lg max-h-72">
                <table class="w-full text-xs">
                  <thead class="bg-surface-2 sticky top-0">
                    <tr>
                      <th class="text-left px-2 py-1.5">แถว</th>
                      <th class="text-left px-2 py-1.5">กลุ่มงาน</th>
                      <th class="text-left px-2 py-1.5">ลูกค้า</th>
                      <th class="text-left px-2 py-1.5">ปลายทาง</th>
                      <th class="text-left px-2 py-1.5">สินค้า</th>
                      <th class="text-right px-2 py-1.5">ปริมาณ</th>
                      <th class="text-left px-2 py-1.5">หน่วย</th>
                      <th class="text-left px-2 py-1.5">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in importRows" :key="row.rowNumber" class="border-t border-border" :class="row.error ? 'bg-red-50' : ''">
                      <td class="px-2 py-1.5">{{ row.rowNumber }}</td>
                      <td class="px-2 py-1.5">{{ row.groupKey.startsWith('__row_') ? '-' : row.groupKey }}</td>
                      <td class="px-2 py-1.5">{{ row.customer || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.siteName || '-' }}</td>
                      <td class="px-2 py-1.5">{{ row.product || '-' }}</td>
                      <td class="px-2 py-1.5 text-right">{{ row.qty }}</td>
                      <td class="px-2 py-1.5">{{ row.unit || '-' }}</td>
                      <td class="px-2 py-1.5">
                        <span v-if="row.error" class="text-red-600">ข้าม — {{ row.error }}</span>
                        <span v-else class="text-green-600">พร้อมสร้าง</span>
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
              :disabled="!importableGroups.length"
              class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-rounded text-base">save</span>
              ยืนยันสร้างงาน ({{ importableGroups.length }} งาน)
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
import { useDriversStore } from '@/stores/drivers'
import { useVehiclesStore } from '@/stores/vehicles'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customers'
import { useContactStore } from '@/stores/contacts'
import ContactPickerField from '@/components/shared/ContactPickerField.vue'
import { useFuelRateStore } from '@/stores/fuelRates'
import { useAuthStore } from '@/stores/auth'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentPrefillStore } from '@/stores/documentPrefill'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import type { Booking, BookingCategory, BookingJobType, BookingStatus, JobItem, PricingMode } from '@/types'
import { parseGpsInput } from '@/utils/gps'
import JobItemEditorModal, { type JobItemDraft } from '@/components/booking/JobItemEditorModal.vue'
import DocumentActionBar from '@/components/shared/DocumentActionBar.vue'
import { computeRowAmount, computeRowVat, computeRowDiscountBaht } from '@/utils/documentTotals'
import { salesOrderLineDescription } from '@/utils/salesOrderDescription'
import * as XLSX from 'xlsx'
import { exportRowsToExcel } from '@/utils/exportExcel'

const props = defineProps<{ fleet: BookingCategory }>()

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const driversStore = useDriversStore()
const vehiclesStore = useVehiclesStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const contactStore = useContactStore()
const fuelRateStore = useFuelRateStore()
const authStore = useAuthStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentPrefillStore = useDocumentPrefillStore()
const documentSettingsStore = useDocumentSettingsStore()
const fixedCustomer = bookingStore.fixedCustomer

const discountModeOptions = [
  { value: 'percent', label: '%' },
  { value: 'fixed', label: 'บาท' },
]

/** หาคนขับจากชื่อเต็ม รองรับทั้งแบบมีคำนำหน้าและไม่มี (เดิมเคยอยู่ใน driversStore.findDriverByVehicle) */
const findDriverByName = (name: string) => driversStore.drivers.find((d) => driversStore.fullName(d) === name || `${d.firstName} ${d.lastName}` === name)

const isCements = computed(() => props.fleet === 'cements')
const selectedCustomerRecord = computed(() => customerStore.customers.find((c) => c.name === header.value.customer))
const selectedCustomerId = computed(() => selectedCustomerRecord.value?.id)
const productOptionsForFleet = computed(() => inventoryStore.products.filter((p) => p.category === props.fleet))
const vehicleOptions = computed(() => vehiclesStore.vehicles.map((v) => vehiclesStore.fullPlate(v)))
const nextReleaseNoPreview = computed(() => bookingStore.nextReleaseNo())

// --- ป้ายกำกับคนขับใน dropdown: บอกว่าว่างหรือกำลังวิ่งเที่ยวที่เท่าไหร่ (ซ้ำกับ BookingView.vue เพราะฟอร์มสร้างงานแยกไฟล์แล้ว) ---
const driverOptions = computed(() => driversStore.drivers.filter((d) => d.employmentStatus === 'active').map((d) => `${d.firstName} ${d.lastName}`))
const ACTIVE_STATUSES: BookingStatus[] = ['ASSIGNED', 'ACCEPTED', 'FUEL_RECEIVED', 'LOADING', 'LOADED', 'IN_TRANSIT', 'DELIVERING']
const isSameCalendarDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const bookingDayKey = (b: Booking) => new Date(b.shipDate || b.createdAt)
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
const activeBookingForDriver = (name: string) =>
  bookingStore.bookings
    .filter((b) => b.driverName === name && ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.dispatchedAt || b.createdAt).getTime() - new Date(a.dispatchedAt || a.createdAt).getTime())[0]
const driverOptionLabel = (name: string) => {
  const activeBooking = activeBookingForDriver(name)
  if (!activeBooking) return `${name} — ว่าง`
  const tripNo = driverTripNumberForBooking(activeBooking)
  return `${name} — กำลังวิ่งเที่ยวที่ ${tripNo} (${activeBooking.docNo})`
}

/**
 * รับ query params จากปุ่ม "สร้างใบสั่งงาน" (ทางลัดจากใบเสนอราคา) หรือ "สร้างใบสั่งสินค้า"/"สร้างใหม่"
 * (สะพานข้าม Sales → Operations) — ใบเสนอราคาไม่มีโครงสร้างข้อมูลตรงกับ JobItem (ไม่มีปลายทาง/จังหวัด/อำเภอ)
 * จึง sync ได้แค่ระดับหัวเอกสาร ส่วนรายการขนส่งจริงยังต้องให้ผู้ใช้กรอกเองผ่าน "เพิ่มรายการ" ตามปกติ
 */
const prefill = route.query
/** ทุกงานที่บันทึกสำเร็จ (ไม่ว่ามาจากช่องทางไหน) ต้องสร้างระเบียนใบสั่งสินค้าที่ผูกกับงานนี้อัตโนมัติเสมอ
 * ดูฟังก์ชัน createSalesOrderForBooking ใน salesDocuments.ts */
/** ถ้ามาจากใบเสนอราคา (ทั้งทางลัด "สร้างใบสั่งงาน" และ "สร้างใบสั่งสินค้า") ให้ผูกอ้างอิงกลับไปเพื่อดูย้อนหลังได้ */
const sourceQuotationId = typeof prefill.quotationId === 'string' ? prefill.quotationId : undefined
const defaultHeader = () => ({
  po: (prefill.po as string) || bookingStore.nextPoNo(),
  shipDate: (prefill.shipDate as string) || new Date().toISOString().slice(0, 10),
  loadingDate: '',
  loadingTime: '',
  /** เวลาสิ้นสุดของช่วงเวลา (ไม่บังคับ) — form-only state ไม่ใช่ field ของ Booking โดยตรง รวมกับ loadingTime เป็น
   *  ข้อความช่วงเวลาเดียว "HH:mm - HH:mm" ก่อนบันทึกจริง (ดู saveAllItems) — ไม่เพิ่ม field ใหม่ใน data model */
  loadingTimeEnd: '',
  jobDate: new Date().toISOString().slice(0, 10),
  returnDate: '',
  customer: (prefill.customer as string) || (isCements.value ? '' : fixedCustomer),
  contactId: undefined as string | undefined,
  plate: '',
  driverName: '',
  shipmentNo: '',
  route: (prefill.route as string) || '',
  origin: (prefill.origin as string) || '',
  reference: '',
  description: '',
  note: '',
  tripFee: prefill.amount ? Number(prefill.amount) : 0,
  agreedPrice: prefill.amount ? Number(prefill.amount) : 0,
  discountMode: 'percent' as 'percent' | 'fixed',
  discountPercent: 0,
  discountAmount: 0,
  vatRate: documentSettingsStore.settings.vatRate,
  allowance: 0,
  pricingMode: 'SINGLE_DESTINATION' as PricingMode,
})
const header = ref(defaultHeader())

/**
 * รายการในใบเสนอราคามีแค่ชื่อสินค้า+จำนวน ไม่มีปลายทาง/จังหวัด/อำเภอที่ JobItem ต้องใช้ จึงเติมให้ได้แค่บางส่วน
 * (สินค้า+จำนวน+หน่วย) ส่วนปลายทางเว้นว่างไว้ให้ผู้ใช้กดแก้ไขรายการเพื่อกรอกเองก่อนบันทึกงานจริง
 */
const quotationItemsPrefill = documentPrefillStore.consumePrefill(['QUOTATION'])
const lineItems = ref<JobItem[]>(
  quotationItemsPrefill && quotationItemsPrefill.sourceId === sourceQuotationId
    ? quotationItemsPrefill.items.map((item, idx) => ({
        id: `item${Date.now()}${idx}${Math.random().toString(36).slice(2, 4)}`,
        productId: item.productId,
        product: item.description,
        qty: item.qty,
        unit: item.unit,
        siteName: '',
        province: '',
        district: '',
      }))
    : []
)

const hasIncompleteDestination = computed(() => lineItems.value.some((i) => !i.siteName))

/** รวมลิตรน้ำมันมาตรฐานของงานนี้ ตาม pricingMode (SINGLE_DESTINATION คิดจากรายการหลักเพียงครั้งเดียว, MULTI_DESTINATION รวมทุกรายการ) */
const computedFuel = computed(() => fuelRateStore.standardFuelLiters(lineItems.value, header.value.pricingMode))

/** ปลายทางใดในงานนี้ยังไม่มี Configuration ลิตรมาตรฐานตั้งไว้ล่วงหน้าบ้าง — ถ้ามี ต้องเป็นบัญชีที่มีสิทธิ์ผู้จัดการ
 *  (canOverrideFuelRate) เท่านั้นที่กรอกค่าน้ำมันของงานนี้เองได้ (ตัวเดียวกับ Logic ที่ BookingEditView.vue ใช้อยู่แล้ว) */
const hasUnconfiguredDistrict = computed(() => lineItems.value.some((li) => li.siteName && !fuelRateStore.findRate(li.province, li.district)))
const fuelLiterLocked = computed(() => hasUnconfiguredDistrict.value && !authStore.currentUser?.canOverrideFuelRate)
/** ค่าที่ผู้มีสิทธิ์กรอกเองเมื่อปลายทางยังไม่มี Configuration — ใช้เฉพาะ Booking นี้ ไม่เขียนกลับไปที่ Configuration กลาง (fuelRateStore) เลย */
const fuelLitersOverride = ref<number | null>(null)
/** ค่าน้ำมันจริงที่จะบันทึกลง Booking — ถ้าปลายทางมี Configuration ครบใช้ค่าตาม Configuration เสมอ (ผู้ใช้แก้ไม่ได้)
 *  ถ้าไม่มี Configuration และผู้ใช้มีสิทธิ์ ใช้ค่าที่กรอกเอง (fuelLitersOverride) ถ้ายังไม่ได้กรอกถือเป็น 0 */
const finalFuelLiters = computed(() => (hasUnconfiguredDistrict.value ? fuelLitersOverride.value ?? 0 : computedFuel.value))
/** Requirement: ปลายทาง+ข้อมูลน้ำมัน ต้องมีก่อนสร้างงานได้เท่านั้น — เดิม fuelLiterLocked/ข้อความเตือนสีเหลืองข้างบนเป็นแค่
 *  warning เฉยๆ ไม่ได้ block การกด "บันทึกงาน" จริง (ปลายทางไม่มี config + ไม่มีสิทธิ์ override จะเงียบๆ บันทึกด้วย
 *  fuelLiters=0) ตัวนี้ reuse hasUnconfiguredDistrict/finalFuelLiters เดิมที่มีอยู่แล้ว ไม่สร้าง logic คำนวณน้ำมันซ้ำ:
 *  true เมื่อมีปลายทางที่ยัง config น้ำมันไม่ครบ และค่าที่จะบันทึกจริงยังเป็น 0 (ไม่มีสิทธิ์ override หรือมีสิทธิ์แต่ยังไม่กรอก) */
const fuelDataMissingForCreate = computed(() => hasUnconfiguredDistrict.value && finalFuelLiters.value <= 0)
const goToFuelSettings = () => router.push('/settings/fuel')

const headerCalculatedAllowance = computed(() => {
  const fee = header.value.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal.value : header.value.tripFee || 0
  return Math.round(fee * 0.99 * 0.62 - finalFuelLiters.value * fuelRateStore.settings.todayPricePerLiter)
})

/** รวมค่าเที่ยวจากทุกรายการ (tripFee * tripCount) — ใช้เฉพาะงาน MULTI_DESTINATION เป็น booking.tripFee โดยอัตโนมัติ */
const multiTripFeeTotal = computed(() => lineItems.value.reduce((sum, i) => sum + (i.tripFee || 0) * (i.tripCount || 1), 0))

/** ค่าเที่ยวที่ใช้จริงตาม pricingMode — ใช้ทั้งเป็น input ให้ documentTotals engine และตอนบันทึกงาน (แทนที่จะคำนวณซ้ำใน saveAllItems) */
const resolvedTripFee = computed(() => (header.value.pricingMode === 'MULTI_DESTINATION' ? multiTripFeeTotal.value : header.value.tripFee))

/** แถวสังเคราะห์ 1 แถวสำหรับงานนี้ทั้งก้อน (qty=1) ป้อนเข้า documentTotals.ts engine เดียวกับเอกสารขาย — ไม่เขียนสูตรคำนวณใหม่ */
const pricingRow = computed(() => ({
  qty: 1,
  unitPrice: resolvedTripFee.value,
  discountMode: header.value.discountMode,
  discountPercent: header.value.discountPercent,
  discountAmount: header.value.discountAmount,
  vatRate: header.value.vatRate,
}))
const docSubtotal = computed(() => pricingRow.value.unitPrice)
const docDiscountTotal = computed(() => computeRowDiscountBaht(pricingRow.value))
const docAfterDiscount = computed(() => computeRowAmount(pricingRow.value))
const docVatTotal = computed(() => computeRowVat(pricingRow.value))
const docGrandTotal = computed(() => docAfterDiscount.value + docVatTotal.value)

const destinationSummary = computed(() => {
  if (!lineItems.value.length) return '-'
  if (header.value.pricingMode === 'SINGLE_DESTINATION') return lineItems.value[0].siteName
  const names = [...new Set(lineItems.value.map((i) => i.siteName))]
  return names.length > 1 ? `${names[0]} +${names.length - 1} ที่อื่น` : names[0]
})

// กรอกช่องคนขับ หรือทะเบียนรถ ให้ดึงข้อมูลคู่กันแบบเดียวกับหน้าส่งงาน โดยอ้างอิงความสัมพันธ์รถ-คนขับจาก vehiclesStore เสมอ
watch(
  () => header.value.driverName,
  (name) => {
    if (!name) return
    const driver = findDriverByName(name)
    if (!driver) return
    const vehicle = vehiclesStore.vehicleForDriver(driver.code)
    if (vehicle) header.value.plate = vehiclesStore.fullPlate(vehicle)
  }
)
watch(
  () => header.value.plate,
  (plateText) => {
    if (!plateText) return
    const vehicle = vehiclesStore.findByFullPlate(plateText)
    if (!vehicle?.driverCode) return
    const driver = driversStore.drivers.find((d) => d.code === vehicle.driverCode)
    if (driver) header.value.driverName = `${driver.firstName} ${driver.lastName}`
  }
)
/** เปลี่ยนลูกค้า -> preselect ผู้ติดต่อหลัก (Primary Contact) ของลูกค้ารายใหม่ให้อัตโนมัติ ผู้ใช้ยังเปลี่ยนเองได้ที่ picker */
watch(
  () => header.value.customer,
  (name) => {
    const customer = customerStore.customers.find((c) => c.name === name)
    header.value.contactId = customer?.id ? contactStore.primaryContactFor(customer.id)?.id : undefined
  },
  { immediate: true }
)

// --- Item editor modal state ---
const itemEditorOpen = ref(false)
const editingIndex = ref<number | null>(null)

/** SINGLE_DESTINATION: รายการที่ 2 เป็นต้นไปต้องใช้ปลายทางเดียวกับรายการหลัก (รายการแรก) จึงล็อกฟิลด์ปลายทางไว้เสมอ ยกเว้นตอนแก้ไขรายการหลักเอง */
const lockedDestination = computed(() => {
  if (header.value.pricingMode !== 'SINGLE_DESTINATION') return null
  if (lineItems.value.length === 0) return null
  if (editingIndex.value === 0) return null
  const primary = lineItems.value[0]
  return {
    siteName: primary.siteName,
    province: primary.province,
    district: primary.district,
    gpsInput: primary.mapUrl || '',
    pickupOriginName: primary.pickupOriginName || '',
  }
})

const openAddItem = () => {
  editingIndex.value = null
  itemEditorOpen.value = true
}
const openEditItem = (idx: number) => {
  editingIndex.value = idx
  itemEditorOpen.value = true
}
const closeItemEditor = () => {
  itemEditorOpen.value = false
  editingIndex.value = null
}

const draftToItem = (draft: JobItemDraft, existingId?: string): JobItem => {
  const isMulti = header.value.pricingMode === 'MULTI_DESTINATION'
  const gps = parseGpsInput(draft.gpsInput)
  return {
    id: existingId || `item${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    siteName: draft.siteName,
    province: draft.province,
    district: draft.district,
    siteContactName: draft.siteContactName || undefined,
    sitePhone: draft.sitePhone || undefined,
    latitude: gps.latitude,
    longitude: gps.longitude,
    mapUrl: draft.gpsInput || undefined,
    pickupOriginName: draft.pickupOriginName || undefined,
    productId: draft.productId || undefined,
    product: draft.product,
    qty: draft.qty,
    unit: draft.unit,
    jobType: isCements.value ? draft.jobType : undefined,
    tripFee: isMulti ? draft.tripFee : undefined,
    tripCount: isMulti ? draft.tripCount || 1 : undefined,
    extraProducts: draft.extraProducts.length ? draft.extraProducts : undefined,
    loadingDate: draft.loadingDate ? new Date(draft.loadingDate) : undefined,
    loadingTime: draft.loadingTime || undefined,
  }
}

const onItemSave = (draft: JobItemDraft) => {
  const isSingle = header.value.pricingMode === 'SINGLE_DESTINATION'
  if (editingIndex.value === null) {
    const newItem = draftToItem(draft)
    if (isSingle && lineItems.value.length > 0) {
      const primary = lineItems.value[0]
      newItem.siteName = primary.siteName
      newItem.province = primary.province
      newItem.district = primary.district
      newItem.mapUrl = primary.mapUrl
      newItem.latitude = primary.latitude
      newItem.longitude = primary.longitude
      newItem.pickupOriginName = primary.pickupOriginName
    }
    lineItems.value.push(newItem)
  } else {
    const idx = editingIndex.value
    const updated = draftToItem(draft, lineItems.value[idx].id)
    lineItems.value[idx] = updated
    if (isSingle && idx === 0) {
      for (let i = 1; i < lineItems.value.length; i++) {
        lineItems.value[i] = {
          ...lineItems.value[i],
          siteName: updated.siteName,
          province: updated.province,
          district: updated.district,
          mapUrl: updated.mapUrl,
          latitude: updated.latitude,
          longitude: updated.longitude,
          pickupOriginName: updated.pickupOriginName,
        }
      }
    }
  }
  closeItemEditor()
}

const removeLineItem = (idx: number) => {
  lineItems.value.splice(idx, 1)
}

const formatBaht = (value: number) => `฿${Math.round(value || 0).toLocaleString('th-TH')}`

/**
 * Requirement: หน้านี้ทำหน้าที่ "จอง/ล็อครถให้ลูกค้า" — เลือก Feed (props.fleet) + เลือกลูกค้าแล้วสร้างงานได้ทันที
 * ห้ามใช้ "ไม่มีสินค้า" เป็น Blocker (items=[] ต้องสร้างได้) เพิ่มรายการ/รายละเอียดทีหลังได้เสมอผ่านหน้าแก้ไขงาน
 * ยังตรวจความถูกต้องของรายการที่มีอยู่จริงเท่านั้น (ถ้าเลือกโหมด MULTI_DESTINATION และมีรายการแล้ว ต้องกรอกค่าเที่ยว/
 * จำนวนเที่ยวให้ครบก่อนจึงบันทึกได้ — กันข้อมูลพังตั้งแต่ต้น ไม่ใช่ Blocker ของการไม่มีรายการเลย)
 */
const canSave = computed(() => {
  if (!header.value.customer) return false
  if (fuelDataMissingForCreate.value) return false
  if (header.value.pricingMode === 'MULTI_DESTINATION' && lineItems.value.length > 0) {
    return lineItems.value.every((i) => (i.tripFee || 0) > 0 && Number.isInteger(i.tripCount) && (i.tripCount || 0) >= 1)
  }
  return true
})

const goBack = () => router.push(`/booking/${props.fleet}`)

const printAction = () => window.print()
const toolbarNotReady = () => window.alert('ฟีเจอร์นี้ยังไม่พร้อมใช้งาน')

/** รวมเวลาเริ่ม/สิ้นสุดเป็นข้อความช่วงเวลาเดียว "HH:mm - HH:mm" ก่อนบันทึกลง booking.loadingTime (ยังเป็น string
 *  field เดิม ไม่เพิ่ม field ใหม่) — กรอกแค่เวลาเริ่มอย่างเดียวก็เก็บแค่เวลานั้น (ความเข้ากันได้กับพฤติกรรมเดิม) */
const combineLoadingTime = (start: string, end: string): string | undefined => {
  if (start && end) return `${start} - ${end}`
  return start || undefined
}

const saveAllItems = () => {
  if (!canSave.value) return
  const shipDate = header.value.shipDate ? new Date(header.value.shipDate) : undefined
  const loadingDate = header.value.loadingDate ? new Date(header.value.loadingDate) : undefined
  const returnDate = header.value.returnDate ? new Date(header.value.returnDate) : undefined
  const createdAt = header.value.jobDate ? new Date(header.value.jobDate) : undefined
  const selectedDriver = header.value.driverName ? findDriverByName(header.value.driverName) : undefined
  const newBooking = bookingStore.addBooking({
    category: props.fleet,
    docNo: bookingStore.nextDocNo(props.fleet),
    releaseNo: bookingStore.nextReleaseNo(),
    po: header.value.po || undefined,
    sourceDocumentId: sourceQuotationId,
    shipDate,
    loadingDate,
    loadingTime: combineLoadingTime(header.value.loadingTime, header.value.loadingTimeEnd),
    returnDate,
    createdAt,
    shipmentNo: header.value.shipmentNo || undefined,
    route: header.value.route || undefined,
    origin: header.value.origin || undefined,
    reference: header.value.reference || undefined,
    description: header.value.description || undefined,
    note: header.value.note || undefined,
    customer: header.value.customer,
    items: lineItems.value,
    allowance: isCements.value ? header.value.allowance || 0 : headerCalculatedAllowance.value,
    tripFee: resolvedTripFee.value,
    agreedPrice: header.value.agreedPrice || resolvedTripFee.value,
    discountMode: header.value.discountMode,
    discountPercent: header.value.discountPercent || undefined,
    discountAmount: header.value.discountAmount || undefined,
    vatRate: header.value.vatRate || undefined,
    pricingMode: header.value.pricingMode,
    fuelLiters: finalFuelLiters.value,
    fuelRate: fuelRateStore.settings.todayPricePerLiter,
    plate: header.value.plate || '',
    driverName: header.value.driverName || undefined,
    driverId: selectedDriver?.id,
  })
  // ทุกงานที่สร้าง (ไม่ว่าจะมาจากช่องทางไหน) ต้องมีระเบียนใบสั่งสินค้าคู่กันเสมอ ไม่ใช่แค่ตอนมาจากใบเสนอราคา/หน้าใบสั่งสินค้า
  const salesOrderDoc = salesDocumentsStore.createSalesOrderForBooking({
    bookingId: newBooking.id,
    customer: newBooking.customer,
    amount: resolvedTripFee.value,
    reference: newBooking.po,
    quotationId: sourceQuotationId,
    contactId: header.value.contactId,
    items: [
      {
        description: salesOrderLineDescription(lineItems.value),
        qty: 1,
        unit: 'เที่ยว',
        unitPrice: resolvedTripFee.value,
        amount: resolvedTripFee.value,
        discountMode: header.value.discountMode,
        discountPercent: header.value.discountPercent || undefined,
        discountAmount: header.value.discountAmount || undefined,
        vatRate: header.value.vatRate || undefined,
      },
    ],
  })
  newBooking.sourceDocumentId = salesOrderDoc.id
  // ปรับคนขับประจำของรถให้ตรงกับที่เลือกไว้ในงานนี้ เพื่อให้ทุกหน้าที่ใช้รถเห็นคนขับล่าสุด
  if (header.value.plate && selectedDriver) {
    const vehicle = vehiclesStore.findByFullPlate(header.value.plate)
    if (vehicle) vehiclesStore.assignDriver(vehicle.id, selectedDriver.code)
  }
  goBack()
}

// --- นำเข้า Booking หลายงานจากไฟล์ Excel (Requirement: "Import Excel เพื่อสร้างงาน") ---
// 1 แถว Excel = 1 JobItem เสมอ ไม่ merge/dedup — แถวที่มี "กลุ่มงาน" เดียวกันจะถูกรวมเป็น Item หลายรายการของ Booking
// เดียวกัน (เพราะ 1 Booking รองรับหลาย items[] อยู่แล้วตาม schema ปัจจุบัน) แถวที่ไม่กรอกกลุ่มงานเลย = แยกเป็นคนละ
// Booking ต่อแถว ทุกแถวยังต้องผ่าน validation ปลายทาง+น้ำมันเดียวกับข้อ 2 (fuelRateStore.findRate) ก่อนเสมอ
const IMPORT_HEADERS = {
  group: 'กลุ่มงาน',
  customer: 'ลูกค้า',
  po: 'PO',
  siteName: 'ปลายทาง',
  province: 'จังหวัด',
  district: 'อำเภอ',
  product: 'สินค้า',
  qty: 'ปริมาณ',
  unit: 'หน่วย',
  jobType: 'ประเภทงาน',
  contactName: 'ผู้ติดต่อหน้างาน',
  phone: 'เบอร์โทรหน้างาน',
} as const

interface ImportRowResult {
  rowNumber: number
  groupKey: string
  customer: string
  po: string
  siteName: string
  province: string
  district: string
  product: string
  qty: number
  unit: string
  jobType: BookingJobType
  siteContactName: string
  sitePhone: string
  error: string | null
}

const importModalOpen = ref(false)
const importRows = ref<ImportRowResult[]>([])
const importFileName = ref('')

const openImportModal = () => {
  importRows.value = []
  importFileName.value = ''
  importModalOpen.value = true
}
const closeImportModal = () => {
  importModalOpen.value = false
}

/** สร้างไฟล์ตัวอย่างคอลัมน์ที่ระบบรองรับจริง (ไม่เดาคอลัมน์เอง — ตรงกับ IMPORT_HEADERS ที่ parse จริงด้านล่าง) */
const downloadImportTemplate = () => {
  exportRowsToExcel('Booking_Import_Template', [
    {
      [IMPORT_HEADERS.group]: 'GRP001',
      [IMPORT_HEADERS.customer]: 'ตัวอย่าง บริษัท จำกัด',
      [IMPORT_HEADERS.po]: '',
      [IMPORT_HEADERS.siteName]: 'ชื่อหน้างาน',
      [IMPORT_HEADERS.province]: '',
      [IMPORT_HEADERS.district]: '',
      [IMPORT_HEADERS.product]: '',
      [IMPORT_HEADERS.qty]: 0,
      [IMPORT_HEADERS.unit]: '',
      [IMPORT_HEADERS.jobType]: 'ลงมือ',
      [IMPORT_HEADERS.contactName]: '',
      [IMPORT_HEADERS.phone]: '',
    },
  ])
}

const VALID_JOB_TYPES: BookingJobType[] = ['ลงมือ', 'พาเลทโรงงาน', 'พาเลทฟรี']

/** ตรวจแถวเดียวจาก Excel — เคารพ validation ปลายทาง+น้ำมันข้อ 2 ด้วย (fuelRateStore.findRate) ถ้าไม่ผ่านข้อไหนก็ตาม
 *  ให้ error ไม่ใช่ null แถวนั้นจะถูกข้ามไปตอนสร้าง Booking (ไม่ throw ไม่หยุดทั้งไฟล์) */
const validateImportRow = (raw: Record<string, unknown>, rowNumber: number): ImportRowResult => {
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())
  const customer = str(raw[IMPORT_HEADERS.customer])
  const siteName = str(raw[IMPORT_HEADERS.siteName])
  const province = str(raw[IMPORT_HEADERS.province])
  const district = str(raw[IMPORT_HEADERS.district])
  const product = str(raw[IMPORT_HEADERS.product])
  const unit = str(raw[IMPORT_HEADERS.unit])
  const qtyRaw = raw[IMPORT_HEADERS.qty]
  const qty = typeof qtyRaw === 'number' ? qtyRaw : Number(str(qtyRaw))
  const jobTypeRaw = str(raw[IMPORT_HEADERS.jobType]) as BookingJobType
  const jobType = VALID_JOB_TYPES.includes(jobTypeRaw) ? jobTypeRaw : 'ลงมือ'
  const groupKey = str(raw[IMPORT_HEADERS.group]) || `__row_${rowNumber}`

  let error: string | null = null
  if (!customer) error = 'ไม่มีชื่อลูกค้า'
  else if (!siteName) error = 'ไม่มีปลายทาง (ชื่อหน้างาน)'
  else if (!province || !district) error = 'ไม่มีจังหวัด/อำเภอของปลายทาง'
  else if (!product) error = 'ไม่มีชื่อสินค้า'
  else if (!unit) error = 'ไม่มีหน่วย'
  else if (!Number.isFinite(qty) || qty <= 0) error = 'ปริมาณต้องเป็นตัวเลขมากกว่า 0'
  else if (!fuelRateStore.findRate(province, district)) error = 'ไม่มีข้อมูลน้ำมันสำหรับปลายทางนี้'

  return {
    rowNumber,
    groupKey,
    customer,
    po: str(raw[IMPORT_HEADERS.po]),
    siteName,
    province,
    district,
    product,
    qty: Number.isFinite(qty) ? qty : 0,
    unit,
    jobType,
    siteContactName: str(raw[IMPORT_HEADERS.contactName]),
    sitePhone: str(raw[IMPORT_HEADERS.phone]),
    error,
  }
}

const handleImportFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importFileName.value = file.name
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  importRows.value = raw.map((r, idx) => validateImportRow(r, idx + 2)) // แถว Excel จริง (1 = header, ข้อมูลเริ่มแถว 2)
  input.value = ''
}

interface ImportGroup {
  groupKey: string
  customer: string
  po: string
  rows: ImportRowResult[]
  items: JobItem[]
  fuelLiters: number
  skipReason: string | null
}

/** จัดกลุ่มแถวที่ผ่าน validation แล้วเท่านั้นเป็นคนละ Booking ตาม "กลุ่มงาน" — ภายในกลุ่มเดียวกันแต่ละแถวยังเป็น
 *  JobItem อิสระของตัวเอง (id ไม่ซ้ำ ไม่ merge/dedup) กลุ่มที่คำนวณน้ำมันมาตรฐานได้ 0 (เคารพ validation ข้อ 2:
 *  ปลายทาง+น้ำมัน ห้ามสร้างงานเด็ดขาด) จะถูกข้ามทั้งกลุ่ม ไม่สร้าง Booking นั้นเลย — reuse fuelRateStore.standardFuelLiters
 *  ตัวเดียวกับที่ computedFuel ด้านบนใช้ ไม่สร้าง logic คำนวณน้ำมันซ้ำ */
const importGroups = computed<ImportGroup[]>(() => {
  const validRows = importRows.value.filter((r) => !r.error)
  const byGroup = new Map<string, ImportRowResult[]>()
  validRows.forEach((r) => {
    const list = byGroup.get(r.groupKey) || []
    list.push(r)
    byGroup.set(r.groupKey, list)
  })
  return [...byGroup.entries()].map(([groupKey, rows], groupIdx) => {
    const items: JobItem[] = rows.map((r, itemIdx) => ({
      id: `item${Date.now()}${groupIdx}${itemIdx}${Math.random().toString(36).slice(2, 4)}`,
      product: r.product,
      qty: r.qty,
      unit: r.unit,
      jobType: r.jobType,
      siteName: r.siteName,
      province: r.province,
      district: r.district,
      siteContactName: r.siteContactName || undefined,
      sitePhone: r.sitePhone || undefined,
    }))
    const fuelLiters = fuelRateStore.standardFuelLiters(items, 'SINGLE_DESTINATION')
    return {
      groupKey,
      customer: rows[0].customer,
      po: rows[0].po,
      rows,
      items,
      fuelLiters,
      skipReason: fuelLiters <= 0 ? 'ไม่มีข้อมูลน้ำมันสำหรับปลายทางนี้' : null,
    }
  })
})

const importableGroups = computed(() => importGroups.value.filter((g) => !g.skipReason))
const importSkippedRowCount = computed(() => importRows.value.filter((r) => r.error).length)

/** สร้าง Booking จริงทีละกลุ่ม — payload/ขั้นตอนเดียวกับ saveAllItems ทุกประการ (รวมใบสั่งสินค้าคู่กันเสมอ ตาม
 *  invariant เดิมของระบบ) ต่างกันแค่ราคา/ค่าเที่ยว/เบี้ยเลี้ยงที่ Excel ไม่มีคอลัมน์ให้ ตั้งเป็น 0 ไว้ก่อน (แก้ไขได้
 *  อิสระตอน WAITING_DISPATCH เหมือน Booking ที่สร้างด้วยมือทุกงาน) */
const confirmImport = () => {
  if (!importableGroups.value.length) return
  importableGroups.value.forEach((group) => {
    const newBooking = bookingStore.addBooking({
      category: props.fleet,
      docNo: bookingStore.nextDocNo(props.fleet),
      releaseNo: bookingStore.nextReleaseNo(),
      po: group.po || undefined,
      customer: group.customer,
      items: group.items,
      allowance: 0,
      tripFee: 0,
      agreedPrice: 0,
      vatRate: documentSettingsStore.settings.vatRate,
      pricingMode: 'SINGLE_DESTINATION',
      fuelLiters: group.fuelLiters,
      fuelRate: fuelRateStore.settings.todayPricePerLiter,
      plate: '',
    })
    const salesOrderDoc = salesDocumentsStore.createSalesOrderForBooking({
      bookingId: newBooking.id,
      customer: newBooking.customer,
      amount: 0,
      reference: newBooking.po,
      items: [
        {
          description: salesOrderLineDescription(group.items),
          qty: 1,
          unit: 'เที่ยว',
          unitPrice: 0,
          amount: 0,
          discountMode: 'percent',
        },
      ],
    })
    newBooking.sourceDocumentId = salesOrderDoc.id
  })
  closeImportModal()
  goBack()
}
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-muted mb-1;
}
</style>
