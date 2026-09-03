import { ref, watch, onScopeDispose, type Ref } from 'vue'
import { get } from 'lodash-es'
import type { SchemaNode, AsyncOptionsConfig } from '../types'

/**
 * AsyncOptionsState —— 异步选项节点的状态基础类型
 *
 * data / loading / error 响应式 ref；useAsyncOptions 在此基础上加 stop 控制。
 */
export interface AsyncOptionsState {
  data: Ref<unknown[]>
  loading: Ref<boolean>
  error: Ref<unknown>
}

/**
 * useAsyncOptions 返回值 —— 继承 AsyncOptionsState + stop 控制
 *
 * stop: 停止 deps watcher（schema 变化 / 组件卸载时调用，使 in-flight 请求响应失效）
 */
export interface UseAsyncOptionsReturn extends AsyncOptionsState {
  /** 停止 deps watcher */
  stop: () => void
}

/**
 * 管理单个 schema 节点的异步选项生命周期
 *
 * - immediate 默认 true：创建时立即请求
 * - deps 变化时自动重新请求
 * - source 返回值经 transform 后存入 state.data
 * - 错误时调用 onError 并写入 state.error
 * - scope disposed 后不再调用用户 onError（避免 Vue dev strict mode 双 mount 导致重复 toast）
 */
export function useAsyncOptions(
  node: SchemaNode,
  model: Ref<Record<string, unknown>>
): UseAsyncOptionsReturn {
  const cfg = node.asyncOptions
  const data = ref<unknown[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  const stops: (() => void)[] = []

  // scope  disposed 后挂起用户回调，防止 dev strict mode 下旧实例的异步错误仍弹提示
  let active = true
  onScopeDispose(() => {
    active = false
  })

  // 序号令牌：deps 快变时多个 in-flight 请求乱序返回，旧响应会覆盖新数据 ——
  // 每次发起自增序号，落地前校验，过期响应直接丢弃
  let fetchSeq = 0

  async function fetch(): Promise<void> {
    if (!cfg) return
    const mySeq = ++fetchSeq
    loading.value = true
    error.value = null
    try {
      const raw = await cfg.source()
      if (mySeq !== fetchSeq) return // 已有更新的请求发起，丢弃过期响应
      data.value = cfg.transform ? cfg.transform(raw) : raw
    } catch (err) {
      if (mySeq !== fetchSeq) return
      // ⭐ 错误时清空 data：避免下拉列表展示陈旧数据误导用户
      // 错误信息由 error.value + onError 回调同时承担
      data.value = []
      error.value = err
      if (active) {
        cfg.onError?.(err)
      }
    } finally {
      if (mySeq === fetchSeq) loading.value = false
    }
  }

  if (cfg?.immediate !== false) {
    fetch()
  }

  if (cfg?.deps) {
    const depList = Array.isArray(cfg.deps) ? cfg.deps : [cfg.deps]
    const stop = watch(() => depList.map((dep) => get(model.value, dep)), fetch, { deep: true })
    stops.push(stop)
  }

  return {
    data,
    loading,
    error,
    stop: () => {
      fetchSeq++ // 使在途请求的响应失效（stop 后不再写 state）
      stops.forEach((s) => s())
    },
  }
}

/** 根据组件名决定 asyncOptions 数据注入哪个 prop */
export function resolveAsyncOptionsProp(node: SchemaNode): string | null {
  const name = typeof node.component === 'string' ? node.component : null
  if (!name) return null
  if (name === 'TreeSelect' || name === 'ElTreeSelect') return 'data'
  if (name === 'Autocomplete' || name === 'ElAutocomplete') return null
  return 'options'
}

/**
 * 为 Autocomplete 构造 fetchSuggestions 回调
 * - source 可接收可选 query 参数
 * - 结果经 transform 后通过 cb 回传
 */
export function buildAutocompleteFetcher(
  cfg: AsyncOptionsConfig
): (queryString: string, cb: (suggestions: Array<{ value: unknown }>) => void) => void {
  return (queryString, cb) => {
    Promise.resolve(cfg.source(queryString))
      .then((raw) => {
        const data = cfg.transform ? cfg.transform(raw) : raw
        cb(data as Array<{ value: unknown }>)
      })
      .catch((err) => {
        cfg.onError?.(err)
        cb([])
      })
  }
}
