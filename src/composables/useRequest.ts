import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

/**
 * 三态请求封装 composable。
 *
 * 设计要点：
 * - 消除业务侧每个列表页都在重复写的 loading/error 模板代码
 * - 错误归一为 Error（业务侧统一处理；详细错误码走 http.ts 拦截器已 toast）
 * - isEmpty 计算属性：non-loading + non-error + data===null 时为 true
 *   配合 AsyncState 组件使用，避免业务侧重复写判定逻辑
 * - deps 模式：参数变化时自动重新执行（典型场景：搜索关键词变化重新拉列表）
 * - refresh 是 execute 的别名，语义更直观
 *
 * @example 立即执行（默认）
 * ```ts
 * const { data, loading, error, isEmpty, refresh } = useRequest(
 *   () => equipmentApi.getList({ page: 1, pageSize: 20 })
 * )
 * ```
 *
 * @example 手动触发
 * ```ts
 * const { execute, loading, data } = useRequest(
 *   () => equipmentApi.getList(filters.value),
 *   { immediate: false }
 * )
 * ```
 *
 * @example 关键词变化自动重拉
 * ```ts
 * const keyword = ref('')
 * useRequest(
 *   () => equipmentApi.getList({ keyword: keyword.value }),
 *   { deps: [keyword] }
 * )
 * ```
 */

export interface UseRequestOptions<T, P extends unknown[]> {
  /** 是否立即执行（默认 true） */
  immediate?: boolean
  /** 成功回调 */
  onSuccess?: (data: T, ...args: P) => void
  /** 失败回调 */
  onError?: (err: Error) => void
  /** 依赖项：值变化时自动重新执行 */
  deps?: Ref<unknown>[] | unknown[]
}

export interface UseRequestReturn<T, P extends unknown[]> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  /** non-loading + non-error + data===null 时为 true */
  isEmpty: ComputedRef<boolean>
  execute: (...args: P) => Promise<void>
  /** execute 的语义化别名（业务侧代码更可读） */
  refresh: (...args: P) => Promise<void>
}

export function useRequest<T, P extends unknown[] = []>(
  fetcher: (...args: P) => Promise<T>,
  options: UseRequestOptions<T, P> = {}
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
      const result = await fetcher(...args)
      data.value = result
      options.onSuccess?.(result, ...args)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err
      options.onError?.(err)
    } finally {
      loading.value = false
    }
  }

  // 初始执行
  if (options.immediate !== false) execute(...([] as unknown as P))

  // deps 监听：值变化时重新执行（仅响应式 ref 生效）
  if (options.deps && options.deps.length > 0) {
    const reactiveDeps = options.deps.filter(
      (d): d is Ref<unknown> => typeof d === 'object' && d !== null && 'value' in d
    ) as Ref<unknown>[]
    if (reactiveDeps.length > 0) {
      watch(
        () => reactiveDeps.map((d) => d.value),
        () => {
          void execute(...([] as unknown as P))
        }
      )
    }
  }

  return {
    data,
    loading,
    error,
    isEmpty,
    execute,
    refresh: execute,
  }
}
