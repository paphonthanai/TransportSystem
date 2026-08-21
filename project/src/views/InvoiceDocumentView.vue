<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3 no-print">
      <button @click="router.back()" class="btn-secondary">
        <span class="material-symbols-rounded text-base">arrow_back</span>
        กลับ
      </button>
      <div v-if="docExists" class="flex items-center gap-2">
        <button v-if="activeDoc?.batchId" @click="router.push(`/billing?batch=${activeDoc.batchId}`)" class="btn-secondary">
          <span class="material-symbols-rounded text-base">receipt_long</span>
          ดูรายการวางบิล
        </button>
        <button v-if="activeDoc?.parentDocumentId" @click="router.push(`/documents/${activeDoc.parentDocumentId}`)" class="btn-secondary">
          <span class="material-symbols-rounded text-base">request_page</span>
          {{ parentDocLabel }}
        </button>
        <div v-if="legacyDoc" class="flex rounded-lg border border-border overflow-hidden">
          <button
            @click="docMode = 'invoice'"
            :class="['h-10 px-4 text-sm font-semibold', docMode === 'invoice' ? 'bg-primary text-white' : 'bg-surface text-text']"
          >
            ใบกำกับภาษี / ใบแจ้งหนี้
          </button>
          <button
            @click="docMode = 'receipt'"
            :disabled="!legacyDoc.receiptNumber"
            :class="['h-10 px-4 text-sm font-semibold', docMode === 'receipt' ? 'bg-primary text-white' : 'bg-surface text-text', !legacyDoc.receiptNumber && 'opacity-40 cursor-not-allowed']"
          >
            ใบเสร็จรับเงิน
          </button>
        </div>
        <button @click="printDoc" class="btn-primary">
          <span class="material-symbols-rounded text-base">print</span>
          พิมพ์เอกสาร
        </button>
      </div>
    </div>

    <div v-if="!docExists" class="card-lg text-center text-muted py-12">ไม่พบเอกสาร</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
      <div id="print-area">
        <div
          v-for="(label, idx) in copyLabels"
          :key="idx"
          class="print-sheet bg-white text-black rounded-xl shadow-default border border-border p-10 max-w-3xl mx-auto relative mb-4 last:mb-0"
          :class="idx < copyLabels.length - 1 && 'print-page-break'"
        >
          <div v-if="showCornerFlag" class="corner-flag" :class="docMode === 'receipt' ? 'corner-flag-green' : 'corner-flag-blue'"></div>
          <div v-if="showCornerFlag" class="absolute top-2.5 right-3 text-white text-xs font-bold z-10">{{ idx + 1 }}</div>

          <div class="flex items-start justify-between mb-6">
            <div class="max-w-[55%] space-y-4">
              <div class="flex items-start gap-3">
                <img v-if="documentSettingsStore.settings.company.logo" :src="documentSettingsStore.settings.company.logo" class="w-12 h-12 object-contain flex-shrink-0" />
                <div>
                  <div class="text-base font-bold">{{ documentSettingsStore.settings.company.name }}</div>
                  <div v-if="documentSettingsStore.settings.company.phone" class="text-xs text-gray-600">โทร. {{ documentSettingsStore.settings.company.phone }}</div>
                </div>
              </div>
              <div>
                <div class="text-xs font-bold text-primary mb-0.5">{{ docMode === 'billing' ? 'เรียกเก็บเงิน' : 'ลูกค้า' }}</div>
                <div class="font-bold text-sm">{{ activeDoc?.customer }}</div>
                <div class="text-xs leading-relaxed text-gray-700">{{ customer.address }}{{ customer.zipCode ? ' ' + customer.zipCode : '' }}</div>
                <div class="text-xs text-gray-700">เลขประจำตัวผู้เสียภาษี {{ customer.taxId || '-' }}</div>
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <div class="text-2xl font-bold text-primary">{{ docModeLabel[docMode].th }}</div>
              <div class="text-xs text-gray-500">{{ label }}</div>
              <div v-if="statusStampLabel" class="status-stamp">{{ statusStampLabel }}</div>
              <div class="doc-meta-box text-left text-xs w-64">
                <div class="flex justify-between gap-4">
                  <span class="text-gray-500">เลขที่</span>
                  <span class="font-semibold">{{ activeDoc?.number }}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-gray-500">วันที่</span>
                  <span class="font-semibold">{{ formatDate(activeDoc?.date) }}</span>
                </div>
                <div v-if="activeDoc?.creditDays !== undefined && !isInvoiceOrReceipt" class="flex justify-between gap-4">
                  <span class="text-gray-500">เครดิต</span>
                  <span class="font-semibold">{{ activeDoc.creditDays }} วัน</span>
                </div>
                <div v-if="activeDoc?.dueDate" class="flex justify-between gap-4">
                  <span class="text-gray-500">ครบกำหนด</span>
                  <span class="font-semibold">{{ formatDate(activeDoc.dueDate) }}</span>
                </div>
                <div v-if="activeDoc?.salesperson" class="flex justify-between gap-4">
                  <span class="text-gray-500">ผู้ขาย</span>
                  <span class="font-semibold">{{ activeDoc.salesperson }}</span>
                </div>
                <div v-if="activeDoc?.reference" class="flex justify-between gap-4">
                  <span class="text-gray-500">เลขที่อ้างอิง</span>
                  <span class="font-semibold text-right max-w-[60%] truncate">{{ activeDoc.reference }}</span>
                </div>
                <template v-if="!isInvoiceOrReceipt">
                  <div class="border-t border-gray-300 my-1.5"></div>
                  <div class="flex justify-between gap-4">
                    <span class="text-gray-500">ผู้ติดต่อ</span>
                    <span class="font-semibold">{{ contactPerson }}</span>
                  </div>
                  <div v-if="contactPosition" class="flex justify-between gap-4">
                    <span class="text-gray-500">ตำแหน่ง</span>
                    <span class="font-semibold">{{ contactPosition }}</span>
                  </div>
                  <div v-if="contactPhone" class="flex justify-between gap-4">
                    <span class="text-gray-500">เบอร์โทร</span>
                    <span class="font-semibold">{{ contactPhone }}</span>
                  </div>
                  <div v-if="contactEmail" class="flex justify-between gap-4">
                    <span class="text-gray-500">อีเมล</span>
                    <span class="font-semibold truncate max-w-[150px]">{{ contactEmail }}</span>
                  </div>
                </template>
              </div>
              <!-- "ชื่องาน" — ใบกำกับภาษี/ใบเสร็จรับเงินเท่านั้นที่แสดงคำอธิบายสรุปเป็นฟิลด์มีป้ายกำกับใต้เมตาบ็อกซ์ (ตรงกับ
                   ฟอร์แมตเอกสารจริงของบริษัท) เอกสารประเภทอื่นแสดงเป็นบรรทัดเต็มความกว้างเหนือตารางเหมือนเดิม (ดูด้านล่าง) -->
              <div v-if="isInvoiceOrReceipt && jobNameLabel" class="doc-meta-box text-left text-xs w-64 mt-2">
                <div class="text-xs font-bold text-primary mb-0.5">ชื่องาน</div>
                <div class="font-semibold whitespace-pre-line">{{ jobNameLabel }}</div>
              </div>
            </div>
          </div>

          <!-- รายละเอียดเอกสาร (คำอธิบายสรุประดับเอกสาร) — เช่น "รายการขนส่งสินค้าห้วงระหว่างวันที่ ... จำนวน N เที่ยว"
               สำหรับใบวางบิล แยกจากตารางรายการรายเที่ยวด้านล่าง เอกสารที่ไม่มีค่านี้ไม่แสดงส่วนนี้เลย (ใบกำกับภาษี/ใบเสร็จ
               รับเงินย้ายไปแสดงเป็น "ชื่องาน" ใต้เมตาบ็อกซ์แทนแล้ว ดูด้านบน) -->
          <div v-if="activeDoc?.description && !isInvoiceOrReceipt" class="text-sm font-medium mb-3">{{ activeDoc.description }}</div>

          <!-- ตารางรายเที่ยว — ใบวางบิล/ใบแจ้งหนี้/ใบเสร็จที่มีรายการมาจากงานขนส่งโดยตรง (รวมใบเสร็จที่แตกรายการจากเอกสาร
               ต้นทางแล้ว ดู receiptItemRowsFromSourceDocs) ให้ตรงกับฟอร์แมตเอกสารจริงของบริษัท เช็คก่อนตารางอ้างอิงเอกสาร
               ต้นทางด้านล่าง เพื่อให้ใบเสร็จที่มีข้อมูลเที่ยวจริงแสดง table structure เดียวกับใบวางบิลเป๊ะ -->
          <table v-if="hasTripColumns" class="w-full text-sm border border-gray-400 mb-4">
            <thead class="bg-gray-100">
              <tr>
                <th class="border border-gray-400 px-2 py-1 text-left w-8">#</th>
                <th class="border border-gray-400 px-2 py-1 text-left w-20">วันที่ส่ง</th>
                <th class="border border-gray-400 px-2 py-1 text-left w-20">ทะเบียนรถ</th>
                <th class="border border-gray-400 px-2 py-1 text-left w-28">อ้างถึงเอกสาร</th>
                <th class="border border-gray-400 px-2 py-1 text-left w-28">ใบขนส่ง</th>
                <th class="border border-gray-400 px-2 py-1 text-left">รายการ</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-16">{{ qtyColumnLabel }}</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-20">หน่วยละ</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-24">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, ridx) in docRows"
                :key="ridx"
                :class="row.onClick ? 'cursor-pointer hover:bg-gray-50' : ''"
                @click="row.onClick && row.onClick()"
              >
                <td class="border border-gray-400 px-2 py-1">{{ ridx + 1 }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ row.shipDate ? formatDateShort(row.shipDate) : '-' }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ row.plate || '-' }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ row.referenceDoc || '-' }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ row.deliveryNo || '-' }}</td>
                <td class="border border-gray-400 px-2 py-1 whitespace-pre-line">{{ row.description }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ commonRowUnit ? row.qty : `${row.qty} ${row.unit}` }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.unitPrice) }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.amount) }}</td>
              </tr>
              <tr v-for="n in fillerRows" :key="'filler' + n">
                <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
              </tr>
            </tbody>
          </table>

          <!-- ใบเสร็จรุ่นเก่าที่อ้างอิงใบแจ้งหนี้/ใบวางบิลต้นทาง (sourceDocumentIds) แต่ไม่มีรายการ (items) ของตัวเองเลย — เอกสาร
               ที่มี items จริง (ทั้งเก่าและใหม่) ให้แสดงตารางแบบย่อ/สรุปด้านล่างแทนเสมอ ตรงกับฟอร์แมตเอกสารจริงของบริษัท -->
          <table v-else-if="receiptSourceRows.length && printRows.length === 0" class="w-full text-sm border border-gray-400 mb-4">
            <thead class="bg-gray-100">
              <tr>
                <th class="border border-gray-400 px-2 py-1 text-left w-8">#</th>
                <th class="border border-gray-400 px-2 py-1 text-left">เลขที่เอกสาร</th>
                <th class="border border-gray-400 px-2 py-1 text-left w-24">วันที่เอกสาร</th>
                <th class="border border-gray-400 px-2 py-1 text-left w-24">วันครบกำหนด</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-28">ยอดรวมตามเอกสาร</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-24">หัก ณ ที่จ่าย</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-28">ยอดชำระ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ridx) in receiptSourceRows" :key="ridx">
                <td class="border border-gray-400 px-2 py-1">{{ ridx + 1 }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ row.number }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ formatDate(row.date) }}</td>
                <td class="border border-gray-400 px-2 py-1">{{ formatDate(row.dueDate) }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.amount) }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.whtAmount) }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.netPayable) }}</td>
              </tr>
              <tr v-for="n in Math.max(0, 4 - receiptSourceRows.length)" :key="'rfiller' + n">
                <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
              </tr>
            </tbody>
          </table>

          <!-- ตารางรายการทั่วไป — ใบกำกับภาษี/ใบเสร็จรับเงินใช้คอลัมน์แบบย่อ (#/รายละเอียด/จำนวน/ราคาต่อหน่วย/ยอดรวม) ไม่มี
               คอลัมน์ส่วนลด/ภาษีต่อรายการ ตรงกับฟอร์แมตเอกสารจริงของบริษัท — เอกสารประเภทอื่นคงคอลัมน์เดิมไว้ครบ -->
          <table v-else class="w-full text-sm border border-gray-400 mb-4">
            <thead class="bg-gray-100">
              <tr>
                <th class="border border-gray-400 px-2 py-1 text-left w-8">#</th>
                <th class="border border-gray-400 px-2 py-1 text-left">รายละเอียด</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-24">{{ qtyColumnLabel }}</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-24">{{ docMode === 'sales_order' ? 'ราคาต่อเที่ยว' : 'ราคาต่อหน่วย' }}</th>
                <th v-if="!isInvoiceOrReceipt" class="border border-gray-400 px-2 py-1 text-right w-16">ส่วนลด</th>
                <th v-if="!isInvoiceOrReceipt" class="border border-gray-400 px-2 py-1 text-right w-16">ภาษี</th>
                <th class="border border-gray-400 px-2 py-1 text-right w-28">{{ isInvoiceOrReceipt ? 'ยอดรวม' : 'มูลค่า' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, ridx) in printRows"
                :key="ridx"
                :class="row.onClick ? 'cursor-pointer hover:bg-gray-50' : ''"
                @click="row.onClick && row.onClick()"
              >
                <td class="border border-gray-400 px-2 py-1">{{ ridx + 1 }}</td>
                <td class="border border-gray-400 px-2 py-1 whitespace-pre-line">{{ row.description }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ commonRowUnit ? row.qty : row.unit ? `${row.qty} ${row.unit}` : row.qty }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.unitPrice) }}</td>
                <td v-if="!isInvoiceOrReceipt" class="border border-gray-400 px-2 py-1 text-right">{{ formatDiscount(row) }}</td>
                <td v-if="!isInvoiceOrReceipt" class="border border-gray-400 px-2 py-1 text-right">{{ formatPercent(row.vatRate) }}</td>
                <td class="border border-gray-400 px-2 py-1 text-right">{{ formatBaht(row.amount) }}</td>
              </tr>
              <tr v-for="n in fillerRows" :key="'filler' + n">
                <td class="border border-gray-400 px-2 py-1 h-7">&nbsp;</td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
                <td v-if="!isInvoiceOrReceipt" class="border border-gray-400 px-2 py-1"></td>
                <td v-if="!isInvoiceOrReceipt" class="border border-gray-400 px-2 py-1"></td>
                <td class="border border-gray-400 px-2 py-1"></td>
              </tr>
            </tbody>
          </table>

          <div class="flex justify-between items-start mb-6">
            <div class="text-sm">
              <div class="text-gray-600 text-xs">จำนวนเงินเป็นตัวอักษร</div>
              <div class="font-semibold">({{ bahtText(netPayable) }})</div>
            </div>
            <div class="w-72 text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-600">รวมเป็นเงิน</span>
                <span>{{ formatBaht(subtotal) }}</span>
              </div>
              <div v-if="showDiscountRow" class="flex justify-between">
                <span class="text-gray-600">ส่วนลดรวม</span>
                <span>-{{ formatBaht(discountAmount) }}</span>
              </div>
              <template v-if="showVatBreakdownRows">
                <div class="flex justify-between">
                  <span class="text-gray-600">มูลค่าที่ไม่มี/ยกเว้นภาษี</span>
                  <span>{{ formatBaht(exemptAmount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">มูลค่าที่คำนวณภาษี</span>
                  <span>{{ formatBaht(taxableAmount) }}</span>
                </div>
              </template>
              <div v-if="showVatRow" class="flex justify-between">
                <span class="text-gray-600">ภาษีมูลค่าเพิ่ม {{ activeDoc?.vatRate ?? documentSettingsStore.settings.vatRate }}%</span>
                <span>{{ formatBaht(vatAmount) }}</span>
              </div>
              <div class="flex justify-between font-bold border-t border-black pt-1">
                <span>จำนวนเงินรวมทั้งสิ้น</span>
                <span>{{ formatBaht(grandTotal) }}</span>
              </div>
              <template v-if="!isInvoiceOrReceipt">
                <div v-if="showWhtRow" class="flex justify-between text-red-600">
                  <span>หักภาษี ณ ที่จ่าย {{ documentSettingsStore.settings.whtRate }}%</span>
                  <span>-{{ formatBaht(whtAmount) }}</span>
                </div>
                <div class="flex justify-between font-bold border-t border-black pt-1 text-base">
                  <span>ยอดชำระ</span>
                  <span>{{ formatBaht(netPayable) }}</span>
                </div>
              </template>
            </div>
          </div>

          <div v-if="hasPaymentInfo && !isInvoiceOrReceipt" class="text-xs border border-gray-300 rounded p-3 mb-6 max-w-sm">
            <div class="font-semibold mb-1">ข้อมูลการรับชำระ</div>
            <div v-if="documentSettingsStore.settings.payment.bankName">ธนาคาร: {{ documentSettingsStore.settings.payment.bankName }}</div>
            <div v-if="documentSettingsStore.settings.payment.accountName">ชื่อบัญชี: {{ documentSettingsStore.settings.payment.accountName }}</div>
            <div v-if="documentSettingsStore.settings.payment.accountNumber">เลขที่บัญชี: {{ documentSettingsStore.settings.payment.accountNumber }}</div>
            <div v-if="documentSettingsStore.settings.payment.promptPay">พร้อมเพย์: {{ documentSettingsStore.settings.payment.promptPay }}</div>
            <div v-if="documentSettingsStore.settings.payment.note" class="mt-1 text-gray-600">{{ documentSettingsStore.settings.payment.note }}</div>
          </div>

          <!-- ข้อมูลการชำระเงิน — แสดงเฉพาะใบเสร็จรับเงินเท่านั้น (ใบกำกับภาษี/ใบแจ้งหนี้ไม่แสดง แม้จะบันทึกการชำระเงินไว้แล้วก็ตาม —
               ข้อมูลยังเก็บอยู่ใน SalesDocument ของใบแจ้งหนี้ตามเดิมทุกประการ แค่ UI หน้านี้ไม่ render เท่านั้น ดู isSourceDocEligible/
               recordTaxInvoicePayment ที่ยังเขียนลงใบแจ้งหนี้เหมือนเดิม) ใบเสร็จดึงวิธีชำระ/ธนาคาร/เลขที่รายการมาจากใบแจ้งหนี้ต้นทาง
               ที่บันทึกไว้ (sourceTaxInvoiceForReceipt) — ใบเสร็จเองไม่เคยมีฟิลด์พวกนี้เป็นของตัวเอง ยกเว้นใบเสร็จกรอกเอง (createReceiptManual)
               ที่มี paymentMethod ของตัวเองอยู่แล้ว จึงเช็คค่าของใบเสร็จเองก่อนเป็นอันดับแรก -->
          <div v-if="docMode === 'receipt'" class="text-xs mb-6 space-y-2">
            <div class="flex items-center flex-wrap gap-x-2 gap-y-2">
              <span>การชำระเงินจะสมบูรณ์เมื่อบริษัทได้รับเงินเรียบร้อยแล้ว</span>
              <label v-for="opt in paymentMethodChecks" :key="opt.value" class="flex items-center gap-1">
                <span class="payment-checkbox" :class="receiptPaymentMethod === opt.value && 'payment-checkbox-checked'"></span>
                {{ opt.label }}
              </label>
            </div>
            <div class="flex items-center flex-wrap gap-2">
              <span>ธนาคาร</span>
              <span v-if="receiptPaymentBankName" class="font-semibold">{{ receiptPaymentBankName }}</span>
              <span v-else class="flex-1 border-b border-gray-400 h-4 min-w-[70px]"></span>
              <span>เลขที่</span>
              <span v-if="receiptPaymentReference" class="font-semibold">{{ receiptPaymentReference }}</span>
              <span v-else class="flex-1 border-b border-gray-400 h-4 min-w-[70px]"></span>
              <span>วันที่</span>
              <span class="font-semibold">{{ formatDate(receiptPaidDate) }}</span>
            </div>
            <div class="flex items-center flex-wrap gap-x-4 gap-y-1">
              <span>จำนวนเงิน: <span class="font-semibold">{{ formatBaht(grandTotal) }}</span></span>
              <span v-if="receiptWhtAmount > 0">หักภาษี ณ ที่จ่าย: <span class="font-semibold text-red-600">-{{ formatBaht(receiptWhtAmount) }}</span></span>
              <span>ยอดที่รับจริง: <span class="font-semibold">{{ formatBaht(receiptNetAfterWht) }}</span></span>
            </div>
          </div>

          <div v-if="docNote" class="text-xs text-gray-600 mb-6">{{ docNote }}</div>

          <div class="grid grid-cols-2 gap-8 text-sm mt-16">
            <div>
              <div class="font-semibold mb-8">ในนาม {{ activeDoc?.customer }}</div>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div class="border-t border-gray-500 pt-2">{{ signatureLabels.customer }}</div>
                <div class="border-t border-gray-500 pt-2">วันที่</div>
              </div>
            </div>
            <div class="relative">
              <img
                v-if="documentSettingsStore.settings.company.stamp"
                :src="documentSettingsStore.settings.company.stamp"
                class="w-14 h-14 object-contain absolute right-6 -top-12 opacity-90"
              />
              <div class="font-semibold mb-8">ในนาม {{ documentSettingsStore.settings.company.name }}</div>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div class="border-t border-gray-500 pt-2">{{ signatureLabels.company }}</div>
                <div class="border-t border-gray-500 pt-2">วันที่</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="no-print space-y-4 sticky top-4">
        <div class="card-lg space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-text font-medium">ต้นฉบับ</span>
            <input type="number" min="0" v-model.number="originalCount" class="spin-input" />
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-text font-medium">สำเนา</span>
            <input type="number" min="0" v-model.number="copyCount" class="spin-input" />
          </div>
          <button @click="goPaymentSettings" class="text-xs text-primary font-medium hover:underline flex items-center gap-1 pt-1">
            <span class="material-symbols-rounded text-sm">settings</span>
            ตั้งค่าข้อมูลการรับชำระ
          </button>
          <div class="pt-2 border-t border-border">
            <label class="text-xs font-semibold text-muted mb-1 block">ภาษาเอกสาร</label>
            <select class="input-field w-full h-9 text-sm">
              <option>ไทย</option>
            </select>
          </div>
          <button @click="printDoc" class="btn-primary w-full justify-center mt-2">
            <span class="material-symbols-rounded text-base">print</span>
            พิมพ์
          </button>
        </div>
      </div>
    </div>

    <div v-if="documentTrace" class="card-lg no-print">
      <div class="font-bold text-text mb-3">เอกสารต้นทาง (Source Chain)</div>
      <div class="space-y-3 text-sm">
        <div v-if="documentTrace.salesOrders.length">
          <div class="text-xs font-semibold text-muted mb-1">ใบสั่งสินค้า</div>
          <RouterLink v-for="d in documentTrace.salesOrders" :key="d.id" :to="`/documents/${d.id}`" class="block text-primary hover:underline">{{ d.number }}</RouterLink>
        </div>
        <div v-if="documentTrace.billingNotes.length">
          <div class="text-xs font-semibold text-muted mb-1">ใบวางบิล</div>
          <RouterLink v-for="d in documentTrace.billingNotes" :key="d.id" :to="`/documents/${d.id}`" class="block text-primary hover:underline">{{ d.number }}</RouterLink>
        </div>
        <div v-if="documentTrace.taxInvoices.length">
          <div class="text-xs font-semibold text-muted mb-1">ใบแจ้งหนี้/ใบกำกับภาษี</div>
          <RouterLink v-for="d in documentTrace.taxInvoices" :key="d.id" :to="`/documents/${d.id}`" class="block text-primary hover:underline">{{ d.number }}</RouterLink>
        </div>
        <div v-if="documentTrace.receipts.length">
          <div class="text-xs font-semibold text-muted mb-1">ใบเสร็จรับเงิน</div>
          <RouterLink v-for="d in documentTrace.receipts" :key="d.id" :to="`/documents/${d.id}`" class="block text-primary hover:underline">{{ d.number }}</RouterLink>
        </div>
        <div v-if="documentTrace.bookings.length">
          <div class="text-xs font-semibold text-muted mb-1">งานขนส่ง (Booking)</div>
          <RouterLink v-for="b in documentTrace.bookings" :key="b.id" :to="`/job/${b.id}`" class="block text-primary hover:underline">{{ b.docNo }}</RouterLink>
        </div>
        <div
          v-if="!documentTrace.salesOrders.length && !documentTrace.billingNotes.length && !documentTrace.taxInvoices.length && !documentTrace.receipts.length && !documentTrace.bookings.length"
          class="text-muted text-xs"
        >
          -
        </div>
      </div>
    </div>

    <div v-if="docExists" class="card-lg no-print">
      <div class="font-bold text-text mb-3">ประวัติเอกสาร</div>
      <EntityTimeline :doc-id="route.params.docId as string" />
    </div>

    <DocumentSettingsPanel
      :open="settingsOpen"
      :number="activeDoc?.number || ''"
      v-model="settingsToggles"
      @close="settingsOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'
import { useDocumentSettingsStore } from '@/stores/documentSettings'
import { useCustomerStore } from '@/stores/customers'
import { bahtText } from '@/utils/companyInfo'
import { salesDocumentStatusLabel } from '@/utils/salesDocumentStatus'
import { categoryFeedLabel } from '@/utils/bookingStatus'
import { traceDocumentChain } from '@/utils/documentTrace'
import EntityTimeline from '@/components/shared/EntityTimeline.vue'
import DocumentSettingsPanel, { type DocumentSettingsToggles } from '@/components/shared/DocumentSettingsPanel.vue'
import type { Booking } from '@/types'

type DocMode = 'invoice' | 'receipt' | 'quotation' | 'cash_sale' | 'billing' | 'purchase_order' | 'sales_order'

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const salesDocumentsStore = useSalesDocumentsStore()
const documentSettingsStore = useDocumentSettingsStore()
const customerStore = useCustomerStore()

// เอกสารเดิม (ใบแจ้งหนี้/ใบเสร็จ) ยังอยู่ใน bookingStore จนกว่าจะย้ายที่ Step 5 (migration)
const legacyDoc = computed(() => bookingStore.documents.find((d) => d.id === route.params.docId))
// ใบเสนอราคา/ขายเงินสด (และใบแจ้งหนี้ที่แปลงมาจากใบเสนอราคา) อยู่ใน store ใหม่
const newDoc = computed(() => salesDocumentsStore.documents.find((d) => d.id === route.params.docId))
const docExists = computed(() => !!legacyDoc.value || !!newDoc.value)

const docModeLabel: Record<DocMode, { th: string; en: string }> = {
  invoice: { th: 'ใบกำกับภาษี / ใบแจ้งหนี้', en: 'TAX INVOICE' },
  receipt: { th: 'ใบเสร็จรับเงิน', en: 'RECEIPT' },
  quotation: { th: 'ใบเสนอราคา', en: 'QUOTATION' },
  cash_sale: { th: 'ใบกำกับภาษีอย่างย่อ / ขายเงินสด', en: 'CASH SALE' },
  billing: { th: 'ใบวางบิล', en: 'BILLING NOTE' },
  purchase_order: { th: 'ใบสั่งซื้อ', en: 'PURCHASE ORDER' },
  sales_order: { th: 'ใบสั่งสินค้า', en: 'SALES ORDER' },
}

/** ปุ่ม "ดูเอกสารต้นทาง" ต้องบอกชื่อเอกสารต้นทางให้ถูกตามประเภทจริง (ใบเสนอราคา/ใบสั่งสินค้า/ใบวางบิล) ไม่ใช่เหมาว่าเป็นใบเสนอราคาเสมอ */
const parentDocLabel = computed(() => {
  const parent = salesDocumentsStore.documents.find((d) => d.id === activeDoc.value?.parentDocumentId)
  const labelByType: Partial<Record<string, string>> = {
    QUOTATION: 'ดูใบเสนอราคาต้นทาง',
    SALES_ORDER: 'ดูใบสั่งสินค้าต้นทาง',
    BILLING: 'ดูใบวางบิลต้นทาง',
  }
  return (parent && labelByType[parent.type]) || 'ดูเอกสารต้นทาง'
})

const newDocModeMap: Partial<Record<string, DocMode>> = {
  CASH_SALE: 'cash_sale',
  QUOTATION: 'quotation',
  BILLING: 'billing',
  PURCHASE_ORDER: 'purchase_order',
  SALES_ORDER: 'sales_order',
  RECEIPT: 'receipt',
}

const docMode = ref<DocMode>('invoice')

watch(
  [legacyDoc, newDoc],
  ([legacy, fresh]) => {
    if (legacy) {
      docMode.value = 'invoice'
    } else if (fresh) {
      docMode.value = newDocModeMap[fresh.type] || 'invoice'
    }
  },
  { immediate: true }
)

/** มุมมองรวมฟิลด์ที่ใช้พิมพ์เอกสาร ไม่ว่าเอกสารจะมาจาก store เดิมหรือ store ใหม่ */
const activeDoc = computed(() => {
  if (legacyDoc.value) {
    const d = legacyDoc.value
    return {
      customer: d.customer,
      number: docMode.value === 'receipt' ? d.receiptNumber : d.number,
      date: docMode.value === 'receipt' ? d.paidDate : d.date,
      creditDays: d.creditDays,
      dueDate: d.dueDate,
      reference: d.reference,
      amount: d.amount,
      vatRate: d.vatRate,
      vatAmount: d.vatAmount,
      whtAmount: d.whtAmount,
      batchId: d.batchId,
      parentDocumentId: undefined as string | undefined,
      salesperson: undefined as string | undefined,
      paidDate: undefined as Date | undefined,
      paymentMethod: undefined as string | undefined,
      paymentBankName: undefined as string | undefined,
      paymentReference: undefined as string | undefined,
    }
  }
  if (newDoc.value) {
    const d = newDoc.value
    return {
      customer: d.customer,
      number: d.number,
      date: d.date,
      creditDays: d.creditDays,
      dueDate: d.dueDate,
      reference: d.reference,
      description: d.description,
      amount: d.amount,
      vatRate: d.vatRate,
      vatAmount: d.vatAmount,
      whtAmount: d.whtAmount,
      batchId: d.batchId,
      parentDocumentId: d.parentDocumentId,
      salesperson: d.salesperson,
      contactId: d.contactId,
      contactName: d.contactName,
      contactPosition: d.contactPosition,
      contactPhone: d.contactPhone,
      contactEmail: d.contactEmail,
      paidDate: d.paidDate,
      paymentMethod: d.paymentMethod,
      paymentBankName: d.paymentBankName,
      paymentReference: d.paymentReference,
    }
  }
  return null
})

const customer = computed(() => customerStore.lookupCustomer(activeDoc.value?.customer || ''))

interface PrintRow {
  description: string
  qty: number
  unit: string
  unitPrice: number
  amount: number
  discountMode?: 'percent' | 'fixed'
  discountPercent?: number
  discountAmount?: number
  vatRate?: number
  onClick?: () => void
  /** มีเฉพาะรายการที่มาจากงานขนส่งโดยตรง (Billing/Tax Invoice ที่สร้างจาก Booking) — ใช้แสดงตารางแบบรายเที่ยว
   *  ให้ตรงกับฟอร์แมตเอกสารจริงของบริษัท ดู tripColumnRows ด้านล่าง */
  shipDate?: Date
  plate?: string
  referenceDoc?: string
  deliveryNo?: string
}

const destinationLabel = (booking: Booking) => {
  if (!booking.items.length) return '-'
  const first = booking.items[0].siteName
  return booking.items.length > 1 ? `${first} +${booking.items.length - 1} ที่อื่น` : first
}

const bookingTotal = (booking: Booking) => {
  const extras = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0)
  return (booking.tripFee || 0) + extras
}

const docRows = computed<PrintRow[]>(() => {
  if (legacyDoc.value) {
    return bookingStore.bookings
      .filter((b) => legacyDoc.value!.bookingIds.includes(b.id))
      .map((booking) => ({
        description: `${booking.docNo} · ${destinationLabel(booking)} - ${formatDate(booking.completedAt)}`,
        qty: 1,
        unit: 'เที่ยว',
        unitPrice: bookingTotal(booking),
        amount: bookingTotal(booking),
        onClick: () => router.push(`/job/${booking.id}`),
      }))
  }
  if (newDoc.value) {
    return salesDocumentsStore.itemsForDocument(newDoc.value.id).map((item) => ({
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.amount,
      discountMode: item.discountMode,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      vatRate: item.vatRate,
      shipDate: item.shipDate,
      plate: item.plate,
      referenceDoc: item.referenceDoc,
      deliveryNo: item.deliveryNo,
    }))
  }
  return []
})

/** ตารางแบบรายเที่ยว (คอลัมน์ วันที่ส่ง/ทะเบียนรถ/อ้างถึงเอกสาร/ใบขนส่ง) ใช้กับใบวางบิล/ใบแจ้งหนี้/ใบเสร็จที่มีรายการ
 *  มาจากงานขนส่งโดยตรง (รายการมี shipDate/plate/deliveryNo ติดมาด้วย) — ให้ทั้ง 3 เอกสารใช้ table structure/column
 *  structure เดียวกันเป๊ะ (ใบเสร็จรวมอยู่ด้วยเพื่อความเสมอภาคของ layout แม้ปัจจุบันใบเสร็จจะยังไม่มีรายการที่มีฟิลด์
 *  พวกนี้จริงๆ ก็ตาม — ดู receiptItemRowsFromSourceDocs ใน salesDocuments.ts) เอกสารกรอกเอง/จากใบเสนอราคา (ไม่มีข้อมูล
 *  เที่ยวรถ) ยังคงใช้ตารางแบบเดิม (รายละเอียด/ส่วนลด/ภาษี) เหมือนเดิมทุกประการ */
/** ใบกำกับภาษี/ใบเสร็จรับเงินตามฟอร์แมตเอกสารจริงของบริษัท (ดูภาพอ้างอิง) ไม่แสดงตารางแบบรายเที่ยว — สรุปเป็นบรรทัดเดียว
 *  ต่อเอกสารแทน (ดู aggregatedSummaryRow) มีแค่ใบวางบิลเท่านั้นที่แสดงตารางแบบรายเที่ยวจริง */
const hasTripColumns = computed(() => docMode.value === 'billing' && docRows.value.length > 0 && docRows.value.every((r) => r.shipDate || r.plate || r.deliveryNo))

/** วันที่แบบ วว/ดด/ปปปป (พ.ศ. เต็ม 4 หลัก) ใช้เฉพาะบรรทัด "งวดวันที่..." ที่ generate สดตอนแสดงผล (ดู feedGroupedRows)
 *  คนละรูปแบบกับ formatDateShort (พ.ศ. 2 หลัก ใช้กับคอลัมน์วันที่ส่งในตารางรายเที่ยวของใบวางบิล) โดยเจตนา */
const formatDateSlashFullYear = (date: Date) => {
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear() + 543}`
}

/** "Feed" ของรายการหนึ่งแถว = booking.category ของงานขนส่งต้นทาง (Cement/Ceramic) หาโดย join กลับไปที่ Booking ผ่าน
 *  deliveryNo (=booking.docNo เสมอ ดู createBillingFromBookings/createTaxInvoiceFromBookings) — "ห้าม" ใช้ productId/
 *  JobItem.product แทน เพราะเป็น free text ต่อปลายทาง/รหัสงาน (เช่น เลขที่ Site) ไม่ใช่ตัวแบ่งกลุ่มรายได้ที่แท้จริง — หา
 *  Booking ไม่เจอ (เช่น รายการกรอกเอง ไม่มี deliveryNo) ถือว่าไม่ทราบ Feed (ดู categoryFeedLabel ใน utils/bookingStatus.ts) */
const feedForRow = (row: PrintRow): string => {
  if (!row.deliveryNo) return ''
  const booking = bookingStore.bookings.find((b) => b.docNo === row.deliveryNo)
  return booking ? categoryFeedLabel[booking.category] : ''
}

interface FeedGroup {
  feed: string
  dateLabel: string
  qty: number
  unitPrice: number
  amount: number
}

/**
 * ใบกำกับภาษี/ใบเสร็จรับเงินที่มาจากงานขนส่ง: จัดกลุ่มรายการตาม Feed แล้วยุบแต่ละกลุ่มเหลือกลุ่มเดียว — Generate สดจาก
 * รายการต้นทางตอนแสดงผลทุกครั้ง ไม่มีการเก็บข้อความนี้ซ้ำใน Firestore (ห้ามเพิ่ม field ใหม่) ตามหลักการที่ใบวางบิลต้องมี
 * สินค้า Feed เดียวเสมออยู่แล้วตั้งแต่ขั้นตอนสร้าง (บังคับที่ createBillingFromBookings/BillingCreateFromBookingsView.vue)
 * จึงมักได้แค่ 1 กลุ่มเสมอ — เก็บ logic แบบ "หลายกลุ่ม" ไว้เป็น fallback ให้เอกสารเก่าก่อนมีการบังคับ Feed เดียว/ที่ยังไม่ผ่าน
 * การแยก Feed แสดงผลถูกต้องด้วย ไม่ใช่ปัดตกทั้งเอกสาร — หา Feed ไม่ได้แม้แต่แถวเดียว (เอกสารกรอกเอง/จากใบเสนอราคา ไม่มี
 * Booking ผูกอยู่) → คืนอาเรย์ว่าง ให้ printRows/jobNameLabel ไป fallback ที่ docRows/newDoc.description ตรงๆ
 */
const feedGroups = computed<FeedGroup[]>(() => {
  if (docMode.value !== 'invoice' && docMode.value !== 'receipt') return []
  if (docRows.value.length === 0) return []
  const withFeed = docRows.value.map((row) => ({ row, feed: feedForRow(row) }))
  if (withFeed.some(({ feed }) => !feed)) return []
  const order: string[] = []
  const groups = new Map<string, PrintRow[]>()
  withFeed.forEach(({ row, feed }) => {
    if (!groups.has(feed)) {
      groups.set(feed, [])
      order.push(feed)
    }
    groups.get(feed)!.push(row)
  })
  return order.map((feed) => {
    const rows = groups.get(feed)!
    const dates = rows
      .map((r) => r.shipDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())
    const start = dates[0]
    const end = dates[dates.length - 1]
    const dateLabel = start ? (end && end.toDateString() !== start.toDateString() ? `${formatDateSlashFullYear(start)} - ${formatDateSlashFullYear(end)}` : formatDateSlashFullYear(start)) : ''
    const qty = rows.length
    const amount = Math.round(rows.reduce((sum, r) => sum + r.amount, 0))
    /** ราคาต่อหน่วย = ราคาจริงถ้าทุกเที่ยวในกลุ่มเดียวกันเท่ากันหมด (กรณีปกติ) ไม่งั้นเฉลี่ยจาก amount/qty (กรณีราคาไม่เท่ากัน
     *  ในบางเที่ยว) — คงค่า "จำนวน × ราคาต่อหน่วย = ยอดรวม" ให้ตรงเป๊ะเมื่อราคาสม่ำเสมอ (กรณีส่วนใหญ่) */
    const uniquePrices = new Set(rows.map((r) => r.unitPrice))
    const unitPrice = uniquePrices.size === 1 ? rows[0].unitPrice : Math.round(amount / qty)
    return { feed, dateLabel, qty, unitPrice, amount }
  })
})

/** บรรทัดตารางรายการ "ค่าขนส่ง [Feed] [วันที่เริ่มต้น] - [วันที่สิ้นสุด]" — ไม่มีคำว่า "งวดวันที่" (คนละข้อความกับ "ชื่องาน"
 *  ด้านล่างที่มีคำนี้) */
const feedGroupedRows = computed<PrintRow[]>(() => feedGroups.value.map((g) => ({ description: `ค่าขนส่ง ${g.feed} ${g.dateLabel}`, qty: g.qty, unit: 'เที่ยว', unitPrice: g.unitPrice, amount: g.amount })))

/** เอกสารเก่าที่ยังไม่มีข้อมูล deliveryNo ให้จับกลุ่ม Feed ได้ (สร้างก่อนแก้บั๊กนี้) — fallback เป็นบรรทัดสรุปเดียวแบบเดิม
 *  จากคำอธิบายที่เก็บไว้ตอนสร้างเอกสาร (newDoc.description) เพื่อไม่ให้เอกสารเก่าที่ออกไปแล้วแสดงผลว่างเปล่า/ผิดเพี้ยน */
const aggregatedSummaryRow = computed<PrintRow | null>(() => {
  if (docMode.value !== 'invoice' && docMode.value !== 'receipt') return null
  if (!newDoc.value || !newDoc.value.bookingIds.length || !newDoc.value.description) return null
  return { description: newDoc.value.description, qty: 1, unit: '', unitPrice: subtotal.value, amount: subtotal.value }
})
const printRows = computed<PrintRow[]>(() => {
  if (feedGroupedRows.value.length > 0) return feedGroupedRows.value
  if (aggregatedSummaryRow.value) return [aggregatedSummaryRow.value]
  return docRows.value
})

/** "ชื่องาน" ในเมตาบ็อกซ์ — "[Feed] วางบิลรอบวันที่ [เริ่มต้น] - [สิ้นสุด] ([จำนวนเที่ยว] เที่ยว)" มีแค่กรณีจับกลุ่ม Feed ได้
 *  ครบ 1 กลุ่มเดียวเท่านั้น (กรณีปกติของเอกสารที่ผ่านการแยก Feed แล้ว) — หลายกลุ่ม/จับกลุ่มไม่ได้เลย fallback ไปใช้คำอธิบาย
 *  ที่เก็บไว้ตอนสร้างเอกสาร (newDoc.description) เหมือนเดิม */
const jobNameLabel = computed(() => {
  if (feedGroups.value.length === 1) {
    const g = feedGroups.value[0]
    return `${g.feed} วางบิลรอบวันที่ ${g.dateLabel} (${g.qty} เที่ยว)`
  }
  return activeDoc.value?.description || ''
})

const fillerRows = computed(() => Math.max(0, 4 - (hasTripColumns.value ? docRows.value.length : printRows.value.length)))

/**
 * Phase 6 — เอาหน่วยออกจากทุกแถว ย้ายไปโชว์ที่หัวคอลัมน์แทน ("จำนวน (ตัน)") เฉพาะ Billing/ใบกำกับภาษี/ใบเสร็จ
 * (เอกสารประเภทอื่น เช่น ใบเสนอราคา/ใบสั่งซื้อ ที่อาจมีสินค้าหลายหน่วยในเอกสารเดียวกัน ไม่แตะ ใช้รูปแบบเดิม)
 * ถ้าทุกแถวใช้หน่วยเดียวกันจริง (กรณีปกติของ 3 เอกสารนี้) ค่อยย้ายหน่วยขึ้นหัวตาราง — ถ้าหน่วยไม่ตรงกันทุกแถว (กรณีหายาก
 * ของใบเสร็จที่พิมพ์รายการเองหลายสินค้าคนละหน่วย) fallback กลับไปโชว์หน่วยต่อแถวเหมือนเดิม กันข้อมูลแสดงผลผิด
 */
const unitInHeaderDocModes: DocMode[] = ['billing', 'invoice', 'receipt']
const commonRowUnit = computed(() => {
  if (!unitInHeaderDocModes.includes(docMode.value)) return null
  const units = new Set(docRows.value.map((r) => r.unit).filter(Boolean))
  return units.size === 1 ? [...units][0] : null
})
const qtyColumnLabel = computed(() => (commonRowUnit.value ? `จำนวน (${commonRowUnit.value})` : 'จำนวน'))

interface ReceiptSourceRow {
  number: string
  date: Date
  dueDate?: Date
  amount: number
  whtAmount: number
  netPayable: number
}

/** ตารางรายการเอกสารต้นทาง — มีค่าเฉพาะใบเสร็จที่ถูกสร้าง/แก้ไขจากใบแจ้งหนี้หรือใบวางบิลตรง (sourceDocumentIds) เท่านั้น ใบเสร็จกรอกเองคืนอาเรย์ว่าง (ใช้ docRows ตามปกติ) */
const receiptSourceRows = computed<ReceiptSourceRow[]>(() => {
  if (!newDoc.value || newDoc.value.type !== 'RECEIPT' || !newDoc.value.sourceDocumentIds?.length) return []
  return salesDocumentsStore.documents
    .filter((d) => (d.type === 'TAX_INVOICE' || d.type === 'BILLING') && newDoc.value!.sourceDocumentIds!.includes(d.id))
    .map((d) => {
      /** "ยอดรวมตามเอกสาร" ต้องเป็นยอดรวมทั้งสิ้นของใบแจ้งหนี้ (รวม VAT แล้ว) ไม่ใช่แค่ subtotal ก่อน VAT — ให้ตรงกับที่บล็อกสรุปยอดด้านล่างของใบเสร็จเอง (ซึ่งเอา receipt.amount + receipt.vatAmount มาบวกกันตามธรรมเนียมเอกสารทุกประเภทในระบบ) */
      const grandTotal = d.amount + (d.vatAmount || 0)
      return {
        number: d.number,
        date: d.date,
        dueDate: d.dueDate,
        amount: grandTotal,
        whtAmount: d.whtAmount || 0,
        netPayable: grandTotal - (d.whtAmount || 0),
      }
    })
})

/** สายอ้างอิงเอกสารทั้งสาย (SalesOrder ↔ BillingNote ↔ TaxInvoice ↔ Receipt ↔ Booking) — ใช้ได้กับเอกสารระบบปัจจุบัน
 * ทั้ง 4 ประเภท (เดิมมีแค่ RECEIPT) เอกสารระบบเดิม (legacyDoc/QUOTATION/CASH_SALE/PURCHASE_ORDER) เป็น null ไม่แสดงพาแนล */
const documentTrace = computed(() => {
  if (!newDoc.value || !(['SALES_ORDER', 'BILLING', 'TAX_INVOICE', 'RECEIPT'] as const).includes(newDoc.value.type as any)) return null
  return traceDocumentChain(newDoc.value, salesDocumentsStore.documents, bookingStore.bookings)
})

const subtotal = computed(() => activeDoc.value?.amount || 0)
const settingsToggles = ref<DocumentSettingsToggles>({ vat: true, wht: true, discount: true })
/** ยกเลิกการจำกัดเฉพาะโหมดใบแจ้งหนี้/ใบเสร็จ — เอกสารทุกประเภทแสดงสรุปภาษีแบบเดียวกัน ตามฟอร์แมตต้นแบบที่ผู้ใช้แนบมา */
const showVatRow = computed(() => settingsToggles.value.vat && documentSettingsStore.settings.calcMode.sales.vat !== 'included')
const vatAmount = computed(() => (showVatRow.value ? activeDoc.value?.vatAmount ?? 0 : 0))
const discountAmount = computed(() => newDoc.value?.discountTotal ?? 0)
const showDiscountRow = computed(() => settingsToggles.value.discount && discountAmount.value > 0)
/** มูลค่าที่ไม่มี/ยกเว้นภาษี + มูลค่าที่คำนวณภาษี คำนวณจากอัตราภาษีรายบรรทัด — เอกสารเดิม (bookingStore) ไม่มีข้อมูลนี้ราย
 *  บรรทัด จึงถือว่าทั้งยอดเป็นมูลค่าที่คำนวณภาษีเมื่อมีการแสดงภาษี (สอดคล้องกับพฤติกรรมเดิมของใบแจ้งหนี้/ใบเสร็จ)
 *  ใบกำกับภาษี/ใบเสร็จรับเงินไม่แสดงบรรทัดนี้อีกต่อไป (ดู showVatBreakdownRows) — ตรงกับฟอร์แมตเอกสารจริงของบริษัท */
const exemptAmount = computed(() => {
  if (newDoc.value) return docRows.value.filter((r) => !r.vatRate).reduce((sum, r) => sum + r.amount, 0)
  return 0
})
const taxableAmount = computed(() => {
  if (newDoc.value) return docRows.value.filter((r) => (r.vatRate || 0) > 0).reduce((sum, r) => sum + r.amount, 0)
  return showVatRow.value ? subtotal.value : 0
})
const grandTotal = computed(() => subtotal.value + vatAmount.value)

/** ใบกำกับภาษี/ใบเสร็จรับเงินตามฟอร์แมตเอกสารจริงของบริษัท (ดูภาพอ้างอิง): เมตาบ็อกซ์ไม่มีแถว "เครดิต"/ผู้ติดต่อ, ตารางไม่มี
 *  บรรทัดย่อยมูลค่าที่ไม่มี-ยกเว้นภาษี/คำนวณภาษี และไม่มีบรรทัด "หักภาษี ณ ที่จ่าย"/"ยอดชำระ" แยก (ใบเสร็จย้ายยอดหลังหัก
 *  ณ ที่จ่ายไปแสดงในกล่องยืนยันการชำระเงินแทน ดู paymentMethodChecks) — เอกสารประเภทอื่นคงพฤติกรรมเดิมทุกประการ */
const isInvoiceOrReceipt = computed(() => docMode.value === 'invoice' || docMode.value === 'receipt')
const showVatBreakdownRows = computed(() => showVatRow.value && !isInvoiceOrReceipt.value)
const showWhtRow = computed(
  () => !isInvoiceOrReceipt.value && settingsToggles.value.wht && documentSettingsStore.settings.calcMode.sales.wht !== 'included' && (activeDoc.value?.whtAmount ?? 0) > 0
)
const whtAmount = computed(() => (showWhtRow.value ? activeDoc.value?.whtAmount ?? 0 : 0))
const netPayable = computed(() => grandTotal.value - whtAmount.value)
/** ยอดชำระหลังหัก ณ ที่จ่าย ของใบเสร็จรับเงินโดยเฉพาะ — ไม่ผ่าน showWhtRow/whtAmount ด้านบน (ซึ่งปิดไว้เสมอสำหรับใบเสร็จ
 *  เพราะไม่แสดงเป็นบรรทัดแยกในตารางสรุปยอดแล้ว) แต่ยังต้องคำนวณเพื่อไปแสดงในกล่องยืนยันการชำระเงินแทน (ดู template) */
const receiptNetAfterWht = computed(() => grandTotal.value - (activeDoc.value?.whtAmount ?? 0))

/** กล่องยืนยันการชำระเงินท้ายใบเสร็จ (checkbox วิธีชำระ + ธนาคาร/เลขที่รายการ/หัก ณ ที่จ่าย/ยอดที่รับจริง) — เฉพาะใบเสร็จ
 *  รับเงินเท่านั้น ตรงกับฟอร์แมตเอกสารจริงของบริษัท (ใบกำกับภาษี/เอกสารอื่นไม่แสดงข้อมูลการชำระเงินเลย แม้จะบันทึกการชำระเงิน
 *  ไว้แล้วก็ตาม — ข้อมูลยังเก็บอยู่ใน SalesDocument ของใบแจ้งหนี้เหมือนเดิมทุกประการ ดู recordTaxInvoicePayment เพียงแต่ UI
 *  หน้าใบแจ้งหนี้ไม่ render เท่านั้น) */
const paymentMethodChecks: Array<{ value: string; label: string }> = [
  { value: 'เงินสด', label: 'เงินสด' },
  { value: 'เช็ค', label: 'เช็ค' },
  { value: 'โอนเงิน', label: 'โอนเงิน' },
  { value: 'บัตรเครดิต', label: 'บัตรเครดิต' },
]
const receiptPaidDate = computed(() => (newDoc.value?.type === 'RECEIPT' ? newDoc.value.paidDate : undefined))

/** ใบแจ้งหนี้ต้นทางของใบเสร็จนี้ (ถ้ามี) — ใบเสร็จที่สร้างจากเอกสารต้นทาง (createReceiptFromSourceDocs) ไม่เคยมีวิธีชำระ/
 *  ธนาคาร/เลขที่รายการเป็นของตัวเองเลย ข้อมูลเหล่านี้ถูกบันทึกไว้ที่ใบแจ้งหนี้ต้นทางตอนกด "บันทึกการชำระเงิน" (recordTaxInvoicePayment)
 *  ใบเสร็จจึงต้องดึงมาแสดงแทน (ดูคอมเมนต์ paymentMethodChecks ด้านบน) */
const sourceTaxInvoiceForReceipt = computed(() => {
  if (!newDoc.value || newDoc.value.type !== 'RECEIPT') return null
  const sourceId = (newDoc.value.sourceDocumentIds || [])[0]
  if (!sourceId) return null
  return salesDocumentsStore.documents.find((d) => d.id === sourceId && d.type === 'TAX_INVOICE') || null
})
/** วิธีชำระ/ธนาคาร/เลขที่รายการที่จะแสดงบนใบเสร็จ — เช็คค่าของใบเสร็จเองก่อน (ใบเสร็จกรอกเอง createReceiptManual มีฟิลด์
 *  พวกนี้เป็นของตัวเองอยู่แล้ว) ถ้าไม่มีจึง fallback ไปดึงจากใบแจ้งหนี้ต้นทางที่บันทึกการชำระเงินไว้ */
const receiptPaymentMethod = computed(() => newDoc.value?.paymentMethod || sourceTaxInvoiceForReceipt.value?.paymentMethod)
const receiptPaymentBankName = computed(() => newDoc.value?.paymentBankName || sourceTaxInvoiceForReceipt.value?.paymentBankName)
const receiptPaymentReference = computed(() => newDoc.value?.paymentReference || sourceTaxInvoiceForReceipt.value?.paymentReference)
const receiptWhtAmount = computed(() => activeDoc.value?.whtAmount || 0)

/** ป้ายกำกับช่องเซ็นชื่อ — ต่างกันตามประเภทเอกสาร ให้ตรงกับฟอร์แมตเอกสารจริงของบริษัท (ใบวางบิลคงป้ายเดิมไว้ ไม่แตะ) */
const signatureLabels = computed(() => {
  if (docMode.value === 'invoice') return { customer: 'ผู้รับสินค้า / บริการ', company: 'ผู้อนุมัติ' }
  if (docMode.value === 'receipt') return { customer: 'ผู้จ่ายเงิน', company: 'ผู้รับเงิน' }
  return { customer: 'ผู้รับวางบิล / ผู้รับเงิน', company: 'ผู้มีอำนาจลงนาม' }
})

/** จำนวนชุดที่จะพิมพ์ — ผู้ใช้ปรับจำนวนต้นฉบับ/สำเนาได้จากแถบด้านข้าง (ไม่มีผลต่อข้อมูลเอกสาร แค่จำนวนชุดที่พิมพ์) */
const originalCount = ref(1)
const copyCount = ref(0)

/** สถานะเอกสารพิมพ์บนกระดาษด้วย — เฉพาะเอกสารระบบใหม่ (newDoc) เท่านั้น เอกสารระบบเดิม (legacyDoc) ไม่มี SalesDocumentStatus ให้ map */
/** มุมสีที่หัวเอกสาร (ต้นฉบับ/สำเนา) — ใบกำกับภาษี/ใบแจ้งหนี้และใบเสร็จรับเงินเท่านั้นที่มี ใบวางบิลตามฟอร์แมตจริงของ
 *  บริษัทไม่มีมุมนี้ (ดูภาพอ้างอิงเอกสารวางบิลค่าบรรทุกสินค้า) */
const showCornerFlag = computed(() => docMode.value === 'invoice' || docMode.value === 'receipt')

const statusStampLabel = computed(() => (newDoc.value ? salesDocumentStatusLabel(newDoc.value.type, newDoc.value.status) : null))
const copyLabels = computed(() => {
  const labels: string[] = []
  for (let i = 0; i < originalCount.value; i++) labels.push('ต้นฉบับ')
  for (let i = 0; i < copyCount.value; i++) labels.push('สำเนา')
  return labels.length ? labels : ['ต้นฉบับ']
})

const goPaymentSettings = () => router.push('/settings/documents/payment')

const settingsOpen = ref(route.query.settings === '1')

const hasPaymentInfo = computed(() => {
  const p = documentSettingsStore.settings.payment
  return !!(p.bankName || p.accountName || p.accountNumber || p.promptPay || p.note)
})

const docNote = computed(() => {
  if (docMode.value === 'invoice' || docMode.value === 'receipt') return documentSettingsStore.settings.notes[docMode.value]
  return ''
})

const formatBaht = (value: number) =>
  `${documentSettingsStore.settings.currency.symbol}${Math.round(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
const formatDate = (date?: Date) => (date ? new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-')
/** วันที่ส่งในตารางรายเที่ยว ใช้รูปแบบย่อ วว/ดด/ปป (พ.ศ. 2 หลัก) เช่น "14/08/69" ตาม Requirement ล่าสุด — คนละรูปแบบ
 *  กับ formatDate (เต็ม) ที่ใช้กับวันที่หัวเอกสาร/ครบกำหนด ซึ่งยังคงรูปแบบเดิมไว้ */
const formatDateShort = (date?: Date) => {
  if (!date) return '-'
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String((d.getFullYear() + 543) % 100).padStart(2, '0')
  return `${dd}/${mm}/${yy}`
}
const formatPercent = (value?: number) => (value === undefined ? '-' : `${value}%`)
const formatDiscount = (row: PrintRow) =>
  row.discountMode === 'fixed' ? (row.discountAmount ? formatBaht(row.discountAmount) : '-') : formatPercent(row.discountPercent)

/** "ผู้ติดต่อ" บนเอกสาร = ผู้ติดต่อของลูกค้า (Customer Contact) ที่ Snapshot ไว้บนเอกสาร ณ ตอนสร้าง (activeDoc.contactName
 * ฯลฯ ดู stores/salesDocuments.ts: resolveContactSnapshot) — ตั้งใจไม่ใช้ authStore/ผู้ใช้ที่ login อยู่แทนค่านี้อีก
 * ต่อไป เพราะเป็นคนละ Entity กัน (ผู้ใช้ระบบ vs ผู้ติดต่อของลูกค้า) เอกสารเก่าที่ออกก่อนมี field นี้ หรือลูกค้าที่ยัง
 * ไม่มีผู้ติดต่อ Primary ตั้งไว้ จะแสดง "-" แทน ไม่เดา/ไม่ auto-fill จากที่อื่น */
const contactPerson = computed(() => activeDoc.value?.contactName || '-')
const contactPosition = computed(() => activeDoc.value?.contactPosition || '')
const contactPhone = computed(() => activeDoc.value?.contactPhone || '')
const contactEmail = computed(() => activeDoc.value?.contactEmail || '')

const printDoc = () => window.print()
</script>

<style scoped>
.btn-primary {
  @apply h-10 px-4 rounded-lg border-0 bg-primary text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md;
}

.btn-secondary {
  @apply h-10 px-3 rounded-lg border border-border bg-surface text-text font-medium text-sm flex items-center gap-2 cursor-pointer hover:bg-surface-2;
}

.card-lg {
  @apply bg-surface border border-border rounded-xl shadow-default p-5;
}

.input-field {
  @apply px-3 border border-border rounded-lg bg-surface text-text text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20 transition-all;
}

.spin-input {
  @apply w-16 h-8 px-2 border border-border rounded-lg bg-surface text-text text-sm font-medium text-center focus:outline-none focus:border-primary;
}

.status-stamp {
  @apply inline-block text-[11px] font-bold px-2 py-0.5 rounded border border-primary text-primary mt-1 mb-3;
}

.corner-flag {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 56px 56px 0;
}

/** สีมุมเอกสารตามประเภท ให้ตรงกับฟอร์แมตเอกสารจริงของบริษัท — น้ำเงินสำหรับใบกำกับภาษี/ใบแจ้งหนี้, เขียวสำหรับใบเสร็จรับเงิน
 *  (ใบวางบิลไม่มีมุมนี้เลย ดู showCornerFlag) */
.corner-flag-blue {
  border-color: transparent #2563eb transparent transparent;
}

.corner-flag-green {
  border-color: transparent #16a34a transparent transparent;
}

.doc-meta-box {
  @apply border border-gray-300 rounded-lg p-3 space-y-1;
}

.payment-checkbox {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid #6b7280;
  border-radius: 2px;
}

.payment-checkbox-checked {
  background-color: #111827;
  border-color: #111827;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-sheet {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
  .print-page-break {
    page-break-after: always;
  }
}
</style>
