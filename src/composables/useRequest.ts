import { ref, computed, type Ref, type ComputedRef } from 'vue'

interface UseRequestOptions {
  immediate?: boolean
  onError?: (e: Error) => void
}

interface UseRequestReturn<T, P extends unknown[]> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  isEmpty: ComputedRef<boolean>
  execute: (...args: P) => Promise<void>
}

// 三态请求封装：loading / error / data，配合 AsyncState 组件使用
export function useRequest<T, P extends unknown[] = []>(
  fetcher: (...args: P) => Promise<T>,
  options: UseRequestOptions = {},
): UseRequestReturn<T, P> {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  // isEmpty 仅在非 loading、非 error 时基于 data === null 判定
  const isEmpty = computed(() => !loading.value && !error.value && data.value === null)

  async function execute(...args: P): Promise<void> {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher(...args)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      options.onError?.(error.value)
    } finally {
      loading.value = false
    }
  }

  if (options.immediate !== false) execute(...([] as unknown as P))
  return { data, loading, error, isEmpty, execute }
}
