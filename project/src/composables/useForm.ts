import { ref, reactive, computed } from 'vue'

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) {
  const values = reactive<T>({ ...initialValues })
  const errors = reactive<Partial<Record<keyof T, string>>>({})
  const touched = reactive<Partial<Record<keyof T, boolean>>>({})
  const isSubmitting = ref(false)

  const isValid = computed(() => Object.keys(errors).length === 0)
  const isDirty = computed(() => Object.keys(touched).length > 0)

  /** reactive<T>()/reactive<Partial<Record<keyof T,...>>>() ของ Vue ไม่รองรับการ index ด้วย `keyof T` ทั่วไปตรงๆ
   *  (ข้อจำกัดที่รู้จักของ Vue's reactivity types ต่อ generic T — ไม่ใช่ปัญหาของโค้ดนี้) cast ผ่าน Record ธรรมดาเฉพาะ
   *  จุด index เพื่อผ่าน type-check เท่านั้น ไม่เปลี่ยนพฤติกรรม runtime ใดๆ */
  const setFieldValue = (field: keyof T, value: any) => {
    ;(values as Record<keyof T, any>)[field] = value
    ;(touched as Record<keyof T, boolean>)[field] = true
  }

  const setFieldError = (field: keyof T, error: string) => {
    ;(errors as Record<keyof T, string>)[field] = error
  }

  const resetForm = () => {
    Object.keys(values).forEach((key) => {
      ;(values as Record<keyof T, any>)[key as keyof T] = initialValues[key as keyof T]
    })
    Object.keys(errors).forEach((key) => {
      delete (errors as Record<keyof T, string>)[key as keyof T]
    })
    Object.keys(touched).forEach((key) => {
      delete (touched as Record<keyof T, boolean>)[key as keyof T]
    })
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!isValid.value) return

    isSubmitting.value = true
    try {
      await onSubmit(values as T)
      resetForm()
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setFieldValue,
    setFieldError,
    resetForm,
    handleSubmit,
  }
}
