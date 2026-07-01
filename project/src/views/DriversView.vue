<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 flex-wrap">
      <h2 class="text-lg font-bold">คนขับ</h2>
      <button class="btn-primary">
        <span class="material-symbols-rounded">person_add</span>
        เพิ่มคนขับ
      </button>
    </div>

    <div class="card-lg overflow-x-auto">
      <table class="min-w-[820px] w-full text-sm border-separate border-spacing-0">
        <thead class="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-semibold">คนขับ</th>
            <th class="px-4 py-3 font-semibold">เบอร์</th>
            <th class="px-4 py-3 font-semibold">รถประจำ</th>
            <th class="px-4 py-3 font-semibold">สถานะ</th>
            <th class="px-4 py-3 font-semibold">ค่าตอบแทน</th>
            <th class="px-4 py-3 font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="driver in drivers" :key="driver.code" class="border-t border-border hover:bg-surface-2 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div :style="{ background: driver.avatarBg }" class="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold">{{ driver.initial }}</div>
                <div>
                  <div class="font-semibold text-text">{{ driver.name }}</div>
                  <div class="text-xs text-muted">{{ driver.code }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-muted">{{ driver.phone }}</td>
            <td class="px-4 py-3 text-text">{{ driver.vehicle }}</td>
            <td class="px-4 py-3"><span :class="['text-xs font-semibold px-2 py-1 rounded-full', driver.statusClass]">{{ driver.status }}</span></td>
            <td class="px-4 py-3 text-text">{{ driver.payType }}</td>
            <td class="px-4 py-3 text-right"><button class="btn-sm">ดูรายละเอียด</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const drivers = [
  { name: 'สมชาย ทองดี', code: 'DRV-001', phone: '081-234-5678', vehicle: '70-8821', status: 'ว่าง', statusClass: 'bg-green-100 text-green-700', payType: 'ค่าเที่ยว', avatarBg: '#3b82f6', initial: 'ส' },
  { name: 'ประเสริฐ มั่นคง', code: 'DRV-002', phone: '089-555-1212', vehicle: '82-4417', status: 'กำลังวิ่ง', statusClass: 'bg-blue-100 text-blue-700', payType: 'เปอร์เซ็นต์', avatarBg: '#10b981', initial: 'ป' },
  { name: 'วิรัตน์ ใจกล้า', code: 'DRV-003', phone: '086-777-9090', vehicle: '71-3390', status: 'กำลังวิ่ง', statusClass: 'bg-blue-100 text-blue-700', payType: 'ระยะทาง', avatarBg: '#2563eb', initial: 'ว' },
  { name: 'อภิชาติ แสนดี', code: 'DRV-004', phone: '082-101-2020', vehicle: '83-1102', status: 'ลางาน', statusClass: 'bg-amber-100 text-amber-700', payType: 'ค่าเที่ยว', avatarBg: '#8b5cf6', initial: 'อ' },
  { name: 'สมหมาย เพียรงาน', code: 'DRV-005', phone: '087-345-6767', vehicle: '72-6628', status: 'กำลังวิ่ง', statusClass: 'bg-blue-100 text-blue-700', payType: 'ค่าเที่ยว', avatarBg: '#ec4899', initial: 'ม' },
  { name: 'ธีรพงษ์ ขยันยิ่ง', code: 'DRV-006', phone: '090-888-3434', vehicle: '70-9954', status: 'ว่าง', statusClass: 'bg-green-100 text-green-700', payType: 'เปอร์เซ็นต์', avatarBg: '#f97316', initial: 'ท' },
]
</script>
