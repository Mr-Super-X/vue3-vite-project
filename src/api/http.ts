// 设计要点：
// - 单一来源：所有 API url 都不带 /api 前缀，由 baseURL 统一拼装（避免 /api/api 双拼）
// - 拦截器职责单一：响应只管副作用（toast + 401 跳转）+ 抛 ApiError
// - 业务码解包与 data 提取下沉到 request<T>()，拦截器签名天然满足 AxiosInterceptorFulfilled 类型
//   （AxiosResponse -> AxiosResponse），避免使用 `as any` / `as never` 逃类型
// - token 来源统一走 utils/storage.ts 的 Session，与项目命名空间约定一致；
//   Session.get('token') 在生产环境自动 secure + sameSite=lax
// - 所有抛出错误归一为 ApiError，调用方 `err instanceof ApiError` 即可 narrowing
// - 可选能力（cancel/retry/merge/pageAdapter/cache/request-id）拆到独立模块，request<T> 保持简单，业务层零迁移

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type GenericAbortSignal,
} from 'axios'
import { ElMessage } from 'element-plus'
import { BusinessCode } from '@/enums/httpEnum'
import { Session, clearCookies } from '@/utils/storage'
import type { ApiResponse } from './types/api.d'
import { ApiError } from './types/error'
import { resolveHttpStatusMessage } from './http-errors'
import { globalAbort, chainSignals } from './global-abort'
import {
  buildBackendPageQuery,
  adaptBackendPage,
  _getRequestFieldMap,
  _getResponseFieldMap,
} from './page-adapter'
import { generateRequestId, REQUEST_ID_HEADER } from './request-id'
import { cacheGet, cacheSet, buildCacheKey } from './cache'

/**
 * 扩展 AxiosRequestConfig：标记分页列表请求 / 内存缓存（一次性的可插拔能力）。
 *
 * 设计要点：
 * - 业务模块调用 request<T> 时，对列表接口加 usePageAdapter: true 即可
 * - http.ts 请求拦截器自动从 params 抽 page/pageSize 调 buildBackendPageQuery 注入
 * - http.ts request<T> 自动把后端响应包装为 Pagination<T>
 * - 对 GET 接口加 cache: { ttl } 可启用内存缓存（TTL 内相同请求不重复发）
 * - 默认（不传标记）行为零变化
 *
 * 字段映射由 page-adapter.ts 模块级 configurePaginationAdapter() 配置，
 * 一次设置全局生效，零业务改动。
 *
 * @example 列表请求（自动转换）
 * ```ts
 * const page = await request<Pagination<EquipmentItem>>({
 *   url: '/equipment/list',
 *   method: 'get',
 *   params: { page: 1, pageSize: 20, keyword: 'x' },
 *   usePageAdapter: true,
 * })
 * ```
 *
 * @example GET 缓存
 * ```ts
 * const page = await request<Pagination<EquipmentItem>>({
 *   url: '/equipment/list',
 *   method: 'get',
 *   params: { page: 1, pageSize: 20 },
 *   usePageAdapter: true,
 *   cache: { ttl: 30 },  // 30 秒内不重复请求
 * })
 * ```
 *
 * @example 非列表请求（不传标记，行为不变）
 * ```ts
 * const user = await request<User>({ url: '/user/1', method: 'get' })
 * ```
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * 标记为分页列表请求（仅对列表接口生效）。
     * 设为 true 后请求/响应自动按 page-adapter 约定转换；非列表请求不传此字段。
     */
    usePageAdapter?: boolean
    /**
     * GET 请求内存缓存（TTL 毫秒）。
     * 仅 GET 方法生效；POST/PUT/PATCH/DELETE 不缓存。
     * 可选自定义 key（默认按 method + url + params 生成）。
     */
    cache?: {
      ttl: number
      key?: string
    }
  }
}

const getAPIBaseURL = () => import.meta.env.VITE_API_BASE_URL

const instance: AxiosInstance = axios.create({
  baseURL: getAPIBaseURL(),
  timeout: 15000,
})

// ────────────────────────────────────────────────────────────────────
// 请求拦截器辅助函数（按职责拆分；interceptor 本身只做编排）
// ────────────────────────────────────────────────────────────────────

/**
 * 注入 Bearer Token：从 Session 读取 token 写入 Authorization 头。
 * Session.get('token') 在生产环境自动 secure + sameSite=lax，
 * 与 utils/storage.ts 的 token 存储约定一致。
 *
 * headers 可能是 AxiosHeaders 实例或 plain object，分别处理：
 * - AxiosHeaders：有 set() 方法
 * - plain object：直接属性赋值
 */
function applyAuthHeader(config: AxiosRequestConfig): void {
  const token = Session.get<string>('token')
  if (typeof token !== 'string' || token.length === 0 || !config.headers) return
  const value = `Bearer ${token}`
  const headers = config.headers as { set?: unknown }
  // AxiosHeaders 实例有 set() 方法；plain object 走属性赋值
  if (typeof headers.set === 'function') {
    ;(headers as { set: (k: string, v: string) => void }).set('Authorization', value)
  } else {
    ;(config.headers as Record<string, string>)['Authorization'] = value
  }
}

/**
 * 合并请求 signal 与 globalAbort signal：logout 时 globalAbort.abort() 会取消所有在途请求。
 * 类型 cast：axios 的 GenericAbortSignal 是 AbortSignal 的结构子集，
 * 运行时 AbortSignal 完全兼容 GenericAbortSignal，仅 TS 类型层不可推导。
 */
function applyAbortSignal(config: AxiosRequestConfig): void {
  config.signal = chainSignals(
    config.signal as unknown as AbortSignal | undefined,
    globalAbort.signal as AbortSignal | undefined
  ) as GenericAbortSignal
}

/**
 * 分页请求自动转换：抽出 page/pageSize 调 buildBackendPageQuery 注入，
 * 业务侧 params 中其他过滤字段原样保留。
 * 字段映射由 configurePaginationAdapter 全局控制，零业务改动。
 */
function applyPageAdapterParams(config: AxiosRequestConfig): void {
  if (!config.usePageAdapter || !config.params || typeof config.params !== 'object') {
    return
  }
  const rawParams = config.params as Record<string, unknown>
  const page = typeof rawParams.page === 'number' ? rawParams.page : undefined
  const pageSize = typeof rawParams.pageSize === 'number' ? rawParams.pageSize : undefined
  const { page: _p, pageSize: _ps, ...rest } = rawParams
  // 条件 spread：仅在 page/pageSize 有值时透传，
  // 避免 `undefined` 触发 exactOptionalPropertyTypes 报错
  config.params = {
    ...buildBackendPageQuery(
      {
        ...(page !== undefined ? { page } : {}),
        ...(pageSize !== undefined ? { pageSize } : {}),
      },
      _getRequestFieldMap()
    ),
    ...rest,
  }
}

/**
 * 注入 X-Request-ID header：用于前后端日志串联。
 * 在 config 上挂载 requestId，响应拦截器读取后端回传值用于日志。
 */
function applyRequestIdHeader(config: AxiosRequestConfig): void {
  if (!config.headers) return
  const id = generateRequestId()
  ;(config as AxiosRequestConfig & { requestId?: string }).requestId = id
  const headers = config.headers as { set?: unknown }
  if (typeof headers.set === 'function') {
    ;(headers as { set: (k: string, v: string) => void }).set(REQUEST_ID_HEADER, id)
  } else {
    ;(config.headers as Record<string, string>)[REQUEST_ID_HEADER] = id
  }
}

instance.interceptors.request.use((config) => {
  applyAuthHeader(config)
  applyAbortSignal(config)
  applyPageAdapterParams(config)
  applyRequestIdHeader(config)
  return config
})

// 响应拦截器：副作用 + 抛 ApiError，不做数据解包。
// 签名是 AxiosResponse -> AxiosResponse，天然满足 axios 类型约束，
// 解包责任下沉到 request<T>() 的 .then，避免拦截器里逃类型。

/**
 * 构造 ApiError：body 缺失时走 fallback（code=-1, message=fallback）。
 */
const buildApiError = (
  body: ApiResponse<unknown> | null | undefined,
  response: AxiosResponse<ApiResponse<unknown>>,
  fallbackMessage: string
): ApiError =>
  new ApiError({
    code: body?.code ?? -1,
    message: body?.message || fallbackMessage,
    url: response.config.url,
  })

/**
 * 401 业务码：清 token + 跳登录页。
 */
function handleUnauthorized(
  body: ApiResponse<unknown>,
  response: AxiosResponse<ApiResponse<unknown>>
): never {
  const message = body.message || '登录已过期，请重新登录'
  ElMessage.error(message)
  Session.remove('token')
  clearCookies()
  window.location.href = '/login'
  throw buildApiError(body, response, message)
}

/**
 * 其他业务错误：toast 提示 + 抛 ApiError。
 */
function handleGenericError(
  body: ApiResponse<unknown> | null | undefined,
  response: AxiosResponse<ApiResponse<unknown>>
): never {
  const message = body?.message || '请求失败'
  ElMessage.error(message)
  throw buildApiError(body, response, message)
}

// 业务码 → 副作用处理器查表。
// 命中：调对应 handler；未命中：走 handleGenericError。
// 新增业务码处理时只需在此追加一行（与 HTTP status 策略表对称）。
const BUSINESS_CODE_HANDLERS: Record<
  number,
  (body: ApiResponse<unknown>, response: AxiosResponse<ApiResponse<unknown>>) => never
> = {
  [BusinessCode.UNAUTHORIZED]: handleUnauthorized,
}

const onResponseFulfilled = (
  response: AxiosResponse<ApiResponse<unknown>>
): AxiosResponse<ApiResponse<unknown>> => {
  const body = response.data
  // 成功条件：HTTP 200 + 业务码 200（与后端 v2 约定对齐）
  if (response.status === 200 && body?.code === BusinessCode.SUCCESS) return response
  const handler = BUSINESS_CODE_HANDLERS[body?.code ?? -1]
  if (handler) return handler(body, response)
  return handleGenericError(body, response)
}

const onResponseRejected = (error: {
  response?: AxiosResponse
  config?: { url?: string }
  message?: string
}): never => {
  const status = error.response?.status
  const message = resolveHttpStatusMessage(status)
  ElMessage.error(message)
  throw new ApiError({
    code: status ?? -1,
    message,
    status,
    url: error.config?.url,
    cause: error,
  })
}

instance.interceptors.response.use(onResponseFulfilled, onResponseRejected)

/**
 * 基础请求：返回 `body.data` 字段对应的强类型 T，错误归一为 ApiError。
 * 业务侧 modules/*.ts 通过此函数调用，零迁移成本。
 *
 * 分页请求：传 `usePageAdapter: true` 后自动转换入参 + 适配响应为 Pagination<T>。
 * GET 缓存：传 `cache: { ttl }` 后 TTL 内同 key 请求不重复发。
 *
 * @example 非列表请求（默认行为）
 * ```ts
 * const user = await request<User>({ url: '/user/1', method: 'get' })
 * ```
 *
 * @example 列表请求（自动转换）
 * ```ts
 * const page = await request<Pagination<EquipmentItem>>({
 *   url: '/equipment/list',
 *   method: 'get',
 *   params: { page: 1, pageSize: 20, keyword: 'x' },
 *   usePageAdapter: true,  // ← 入参自动转 pageIndex/pageSize + 响应自动包装为 Pagination<T>
 * })
 * // page 类型为 Pagination<EquipmentItem>，业务侧直接用
 * ```
 *
 * @example GET 缓存
 * ```ts
 * const page = await request<Pagination<EquipmentItem>>({
 *   url: '/equipment/list',
 *   method: 'get',
 *   params: { page: 1, pageSize: 20 },
 *   usePageAdapter: true,
 *   cache: { ttl: 30_000 },  // 30 秒内相同请求不重复发
 * })
 * ```
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const method = (config.method ?? 'get').toLowerCase()

  // 缓存命中：直接返回（仅 GET）
  if (config.cache && method === 'get') {
    const key = config.cache.key ?? buildCacheKey(method, config.url ?? '', config.params)
    const cached = cacheGet<T>(key)
    if (cached !== null) return cached
  }

  const res = await instance.request<ApiResponse<unknown>, AxiosResponse<ApiResponse<unknown>>>(
    config
  )
  let data = res.data.data
  if (config.usePageAdapter) {
    // 分页响应自动适配为 Pagination<T>
    data = adaptBackendPage(data as Record<string, unknown>, _getResponseFieldMap()) as unknown
  }

  // 缓存写入（仅 GET）
  if (config.cache && method === 'get') {
    const key = config.cache.key ?? buildCacheKey(method, config.url ?? '', config.params)
    cacheSet(key, data, config.cache.ttl)
  }

  return data as T
}

/**
 * axios 原始实例导出：仅供需要自定义拦截器或流式进度的特殊场景。
 * 普通业务应使用 request<T>()。
 */
export default instance
