/**
 * 时间窗口内同参请求合并（去重）。可插拔：业务侧按需选择三种接入方式。
 *
 * 设计要点：
 * - 默认只对 GET / HEAD 合并（读操作无副作用）
 * - 写操作（POST/PUT/PATCH/DELETE/OPTIONS）默认不合并，避免掩盖真实失败链路
 * - 调用方可显式传 `merge: 'never' | 'auto' | number` 覆盖窗口时长
 * - 窗口期内同 key 的请求共享 Promise，结果统一 resolve/reject
 *
 * @example 三种接入方式（按使用场景选）
 *
 * ```ts
 * import { request } from './http'
 * import { withMerge } from './request-merger'
 *
 * // 1. 模块级预包装：所有该模块的 GET 请求自动合并
 * //    适合：批量拉取（如仪表盘统计 + 用户列表都在 onMounted 并发触发）
 * const mergedRequest = withMerge(request)
 * const users = await mergedRequest<Pagination<UserItem>>({
 *   url: '/user/list',
 *   method: 'get',
 *   params: { page: 1 },
 * })
 *
 * // 2. 单次调用包装：仅本次启用合并
 * //    适合：明确知道某个接口会并发触发
 * const data = await withMerge(request)({
 *   url: '/dashboard/stats',
 *   method: 'get',
 * })
 *
 * // 3. 单次配置 directive：不开包装，临时调整窗口或关闭
 * //    适合：写请求强制开启短窗口去重（如幂等的 PUT）或显式禁用
 * await request({ url: '/user/1', method: 'put', data, merge: 20 })   // 20ms 合并
 * await request({ url: '/user/1', method: 'get', merge: 'never' })    // 临时禁用
 * ```
 *
 * 与现有架构的关系：
 * - `request<T>` 本身不带合并逻辑，保持简单；
 * - 业务侧 `import { withMerge }` 后按需包装，零侵入；
 * - 合并桶在模块加载期常驻（进程生命周期），无需手动清理；
 *   测试场景下用 `_resetMerger()` 清空避免用例间污染。
 */
import type { AxiosRequestConfig } from 'axios'

const DEFAULT_MERGE_METHODS = new Set(['get', 'head'])
const DEFAULT_WINDOW_MS = 50

export interface MergeOptions {
  /** 时间窗口毫秒数，默认 50；设 0 等价于关闭 */
  windowMs?: number
  /** 允许合并的方法集合（小写）；默认 ['get','head'] */
  methods?: ReadonlySet<string> | string[]
}

export type MergeDirective = 'auto' | 'never' | number

export interface MergeableConfig extends AxiosRequestConfig {
  /** 'auto' 走默认白名单；'never' 关闭；number 强制指定窗口毫秒数 */
  merge?: MergeDirective
}

/**
 * 构造请求的合并 key：method + url + params + data 序列化。
 * null/undefined 字段剔除，避免 { a: 1 } 与 { a: 1, b: undefined } 视为不同。
 */
export function mergeKey(config: MergeableConfig): string {
  const method = (config.method ?? 'get').toLowerCase()
  const url = config.url ?? ''
  const params = config.params ? JSON.stringify(sortKeys(config.params)) : ''
  const data = config.data ? JSON.stringify(sortKeys(config.data)) : ''
  return `${method}|${url}|${params}|${data}`
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((value as Record<string, unknown>)[k])
        return acc
      }, {})
  }
  return value
}

/**
 * 判断该请求是否应参与合并。
 */
export function shouldMerge(config: MergeableConfig, options: MergeOptions = {}): number {
  const directive = config.merge
  if (directive === 'never') return 0
  if (typeof directive === 'number') return Math.max(0, directive)

  const methods = new Set(
    Array.isArray(options.methods)
      ? options.methods.map((m) => m.toLowerCase())
      : options.methods
        ? Array.from(options.methods).map((m) => m.toLowerCase())
        : Array.from(DEFAULT_MERGE_METHODS)
  )
  const method = (config.method ?? 'get').toLowerCase()
  if (!methods.has(method)) return 0

  return Math.max(0, options.windowMs ?? DEFAULT_WINDOW_MS)
}

interface Bucket {
  promise: Promise<unknown>
  abort: AbortController
}

const buckets = new Map<string, Bucket>()

/**
 * 包装一个请求函数，按窗口合并同参请求。
 *
 * @param fn   原始请求函数（一般是 `request<T>` 或其派生）
 * @param options  全局配置（窗口时长 / 允许合并的方法集）
 * @returns 包装后的函数：调用方传入 config，自动按 method + url + params + data
 *          归一化 key 在窗口期内共享同一个 Promise
 *
 * @example
 *   const mergedRequest = withMerge(request)
 *   const [a, b] = await Promise.all([
 *     mergedRequest({ url: '/x', method: 'get' }),
 *     mergedRequest({ url: '/x', method: 'get' }),
 *   ])  // 实际只发一次 HTTP 请求
 */
export function withMerge<T>(
  fn: (config: MergeableConfig) => Promise<T>,
  options: MergeOptions = {}
): (config: MergeableConfig) => Promise<T> {
  return (config: MergeableConfig) => {
    const windowMs = shouldMerge(config, options)
    if (windowMs === 0) return fn(config)

    const key = mergeKey(config)
    const existing = buckets.get(key)
    if (existing) return existing.promise as Promise<T>

    const controller = new AbortController()
    const promise = fn({ ...config, signal: controller.signal }).finally(() => {
      // window 后清掉桶，让下一窗口重新发起
      setTimeout(() => buckets.delete(key), windowMs)
    })
    buckets.set(key, { promise, abort: controller })
    return promise
  }
}

/** 测试用：清空合并桶。 */
export function _resetMerger(): void {
  buckets.clear()
}
