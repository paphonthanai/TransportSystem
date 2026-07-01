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

  const setFieldValue = (field: keyof T, value: any) => {
    values[field] = value
    touched[field] = true
  }

  const setFieldError = (field: keyof T, error: string) => {
    errors[field] = error
  }

  const resetForm = () => {
    Object.keys(values).forEach((key) => {
      values[key as keyof T] = initialValues[key as keyof T]
    })
    Object.keys(errors).forEach((key) => {
      delete errors[key as keyof T]
    })
    Object.keys(touched).forEach((key) => {
      delete touched[key as keyof T]
    })
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!isValid.value) return

    isSubmitting.value = true
    try {
      await onSubmit(values)
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
