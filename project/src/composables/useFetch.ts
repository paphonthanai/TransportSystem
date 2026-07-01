import { ref, computed } from 'vue'

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options?: {
    immediate?: boolean
    onError?: (error: Error) => void
  }
) {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const execute = async () => {
    loading.value = true
    error.value = null
    try {
      data.value = await fetchFn()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      options?.onError?.(error.value)
    } finally {
      loading.value = false
    }
  }

  if (options?.immediate !== false) {
    execute()
  }

  return {
    data: computed(() => data.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    execute,
  }
}
