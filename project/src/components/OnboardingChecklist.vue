<template>
  <Teleport to="body">
    <div
      v-if="!onboardingStore.state.dismissed && onboardingStore.completedCount < 5"
      class="fixed bottom-6 right-6 z-40 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-primary-soft">
        <div class="flex items-center gap-2">
          <span class="material-symbols-rounded text-primary">emoji_events</span>
          <div class="font-bold text-text text-sm">ภารกิจเริ่มต้นใช้งาน</div>
        </div>
        <button @click="onboardingStore.dismiss" class="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center">
          <span class="material-symbols-rounded text-base text-muted">close</span>
        </button>
      </div>

      <div class="px-4 pt-3 pb-1">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-semibold text-text">ภารกิจของคุณ</span>
          <span class="text-muted">คุณทำภารกิจสำเร็จไปแล้ว {{ onboardingStore.completedCount }}/5</span>
        </div>
        <div class="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div class="h-full bg-primary transition-all" :style="{ width: `${(onboardingStore.completedCount / 5) * 100}%` }" />
        </div>
      </div>

      <div class="px-3 pb-3 pt-2 space-y-1.5 max-h-80 overflow-y-auto">
        <button
          v-for="task in tasks"
          :key="task.key"
          type="button"
          @click="go(task)"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
            onboardingStore.state[task.key] ? 'border-border bg-surface-2' : 'border-border hover:bg-surface-2',
          ]"
        >
          <span
            :class="[
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
              onboardingStore.state[task.key] ? 'bg-green-100 text-green-700' : 'bg-primary-soft text-primary',
            ]"
          >
            <span class="material-symbols-rounded text-base">{{ onboardingStore.state[task.key] ? 'check' : task.icon }}</span>
          </span>
          <span class="flex-1 text-sm text-text">{{ task.label }}</span>
          <span v-if="onboardingStore.state[task.key]" class="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">สำเร็จแล้ว</span>
          <span v-else class="material-symbols-rounded text-base text-muted">chevron_right</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useOnboardingStore, type OnboardingState } from '@/stores/onboarding'

const router = useRouter()
const onboardingStore = useOnboardingStore()

type TaskKey = keyof Omit<OnboardingState, 'dismissed'>

const tasks: { key: TaskKey; icon: string; label: string; route: string }[] = [
  { key: 'signedUp', icon: 'login', label: 'สมัครใช้งาน', route: '/' },
  { key: 'configuredDocumentSettings', icon: 'tune', label: 'ตั้งค่ารูปแบบเอกสารเบื้องต้น', route: '/settings/documents/function' },
  { key: 'addedVehicleOrDriver', icon: 'local_shipping', label: 'เพิ่มรถหรือคนขับของคุณ', route: '/settings/drivers' },
  { key: 'createdFirstBooking', icon: 'assignment_add', label: 'ลงงานขนส่งแรกของคุณ', route: '/booking/cements' },
  { key: 'issuedFirstInvoice', icon: 'receipt_long', label: 'ออกใบแจ้งหนี้แรกของคุณ', route: '/billing' },
]

const go = (task: (typeof tasks)[number]) => {
  if (!onboardingStore.state[task.key]) router.push(task.route)
}
</script>
