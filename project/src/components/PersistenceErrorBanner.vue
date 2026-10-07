<template>
  <div v-if="visibleMessage" class="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-gray-800" role="alert">
    <span class="material-symbols-rounded text-red-600">error</span>
    <div class="flex-1">
      <div class="font-semibold text-red-700">บันทึกข้อมูลขึ้นระบบไม่สำเร็จ — ข้อมูลที่เพิ่งทำอาจไม่ปรากฏบนเครื่องอื่น</div>
      <div class="mt-0.5 break-words">{{ visibleMessage }}</div>
      <div class="mt-0.5 text-muted">ถ้าขึ้นว่า permission/insufficient ให้แจ้งผู้ดูแลระบบตรวจสิทธิ์ของบัญชีนี้ (บทบาท/สถานะใช้งาน)</div>
    </div>
    <button type="button" class="border-0 bg-transparent text-muted cursor-pointer" @click="dismissed = visibleMessage" aria-label="ปิดข้อความ">
      <span class="material-symbols-rounded">close</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useSalesDocumentsStore } from '@/stores/salesDocuments'

/**
 * การบันทึกขึ้น Firestore ของ booking/เอกสารขายเป็น watcher ที่ .catch ไว้ ถ้าถูกปฏิเสธ (เช่น สิทธิ์ของ role ไม่พอ) หน้าจอ
 * เครื่องตัวเองยังเห็นข้อมูลปกติ แต่เครื่องอื่นไม่เห็นเลย — แสดงแถบนี้เพื่อไม่ให้ความผิดพลาดเงียบหาย
 */
const bookingStore = useBookingStore()
const salesDocumentsStore = useSalesDocumentsStore()
const dismissed = ref<string | null>(null)

const message = computed(() => bookingStore.bookingsError || salesDocumentsStore.error || null)
const visibleMessage = computed(() => (message.value && message.value !== dismissed.value ? message.value : null))
</script>
