import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

const ONBOARDING_KEY = 'tms_onboarding_v1'

export interface OnboardingState {
  signedUp: boolean
  configuredDocumentSettings: boolean
  addedVehicleOrDriver: boolean
  createdFirstBooking: boolean
  issuedFirstInvoice: boolean
  dismissed: boolean
}

function defaultState(): OnboardingState {
  return {
    signedUp: false,
    configuredDocumentSettings: false,
    addedVehicleOrDriver: false,
    createdFirstBooking: false,
    issuedFirstInvoice: false,
    dismissed: false,
  }
}

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (raw) return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    // corrupt/inaccessible storage, fall back to defaults
  }
  return defaultState()
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const state = ref<OnboardingState>(loadState())

  watch(state, (val) => localStorage.setItem(ONBOARDING_KEY, JSON.stringify(val)), { deep: true })

  window.addEventListener('storage', (e) => {
    if (e.key === ONBOARDING_KEY && e.newValue) {
      state.value = { ...defaultState(), ...JSON.parse(e.newValue) }
    }
  })

  function markDone(key: keyof Omit<OnboardingState, 'dismissed'>) {
    state.value[key] = true
  }

  function dismiss() {
    state.value.dismissed = true
  }

  const completedCount = computed(
    () =>
      [
        state.value.signedUp,
        state.value.configuredDocumentSettings,
        state.value.addedVehicleOrDriver,
        state.value.createdFirstBooking,
        state.value.issuedFirstInvoice,
      ].filter(Boolean).length
  )

  return {
    state,
    completedCount,
    markDone,
    dismiss,
  }
})
