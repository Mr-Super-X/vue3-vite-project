// 设计要点：
// - 单一来源：所有 API url 都不带 /api 前缀，由 baseURL 统一拼装（避免 /api/api 双拼）
// - 拦截器职责单一：响应只管副作用（toast + 401 跳转）+ 抛 ApiError
// - 业务码解包与 data 提取下沉到 request<T>()，拦截器签名天然满足 AxiosInterceptorFulfilled 类型
//   （AxiosResponse -> AxiosResponse），避免使用 `as any` / `as never` 逃类型
// - token 来源统一走 utils/storage.ts 的 Session，与项目命名空间约定一致；
//   Session.get('token') 在生产环境自动 secure + sameSite=lax
// - 所有抛出错误归一为 ApiError，调用方 `err instanceof ApiError` 即可 narrowing
// - 可选能力（cancel/retry/merge/pageAdapter/cache/request-id/token-refresh）拆到独立模块，request<T> 保持简单，业务层零迁移

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
import { getValidToken, _getCurrentConfig } from './token-refresh'

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
     * GET 请求内存缓存（TTL 秒）。
     * 设计：单位为秒，与 Redis EXPIRE / HTTP cache-control 一致。
     */
    cache?: {
      ttl: number
      key?: string
    }
    /**
     * 内部标记：token-refresh 重试机制使用，避免无限循环。
     * 业务模块不应设置此字段。
     */
    _retried?: boolean
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
 */
function applyAuthHeader(config: AxiosRequestConfig): void {
  const token = Session.get<string>('token')
  if (typeof token !== 'string' || token.length === 0 || !config.headers) return
  const value = `Bearer ${token}`
  const headers = config.headers as { set?: unknown }
  if (typeof headers.set === 'function') {
    ;(headers as { set: (k: string, v: string) => void }).set('Authorization', value)
  } else {
    ;(config.headers as Record<string, string>)['Authorization'] = value
  }
}

/**
 * 合并请求 signal 与 globalAbort signal：logout 时 globalAbort.abort() 会取消所有在途请求。
 */
function applyAbortSignal(config: AxiosRequestConfig): void {
  config.signal = chainSignals(
    config.signal as unknown as AbortSignal | undefined,
    globalAbort.signal as AbortSignal | undefined
  ) as GenericAbortSignal
}

/**
 * 分页请求自动转换：抽出 page/pageSize 调 buildBackendPageQuery 注入。
 */
function applyPageAdapterParams(config: AxiosRequestConfig): void {
  if (!config.usePageAdapter || !config.params || typeof config.params !== 'object') {
    return
  }
  const rawParams = config.params as Record<string, unknown>
  const page = typeof rawParams.page === 'number' ? rawParams.page : undefined
  const pageSize = typeof rawParams.pageSize === 'number' ? rawParams.pageSize : undefined
  const { page: _p, pageSize: _ps, ...rest } = rawParams
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
 * 注入 X-Request-ID header。
 */
function applyRequestIdHeader(config: AxiosRequestConfig): void {
  if (!config.headers) return
  const id = generateRequestId()
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
  // dev 模式调试日志（2026-07-24 审计补齐）：拦截器链逐步追踪，
  // 排查"哪个阶段抛错 / 是否注入 token / pageAdapter 是否正确转换"
  if (import.meta.env.DEV) {
    console.debug('[HTTP][req]', {
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url,
      params: config.params,
      usePageAdapter: config.usePageAdapter,
      cache: config.cache,
      signal: !!config.signal,
    })
  }
  return config
})

// ────────────────────────────────────────────────────────────────────
// 响应拦截器辅助函数
// ────────────────────────────────────────────────────────────────────

/**
 * 构造 ApiError：body 缺失时走 fallback。
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
 * 401 业务码：纯抛 ApiError；不做 toast/logout/redirect。
 *
 * 副作用由 request<T>() 包裹层统一处理：
 * - 成功 refresh + retry → 静默重发
 * - refresh 失败 → performLogout() + 抛出原 ApiError
 *
 * 这样能避免"直接调用 handleUnauthorized 时与 retry 流程副作用不一致"。
 */
function handleUnauthorized(
  body: ApiResponse<unknown>,
  response: AxiosResponse<ApiResponse<unknown>>
): never {
  throw buildApiError(body, response, body.message || '登录已过期')
}

/**
 * 其他业务错误：toast + 抛 ApiError。
 */
function handleGenericError(
  body: ApiResponse<unknown> | null | undefined,
  response: AxiosResponse<ApiResponse<unknown>>
): never {
  const message = body?.message || '请求失败'
  ElMessage.error(message)
  throw buildApiError(body, response, message)
}

/**
 * 登出副作用：toast + 清 token + 跳登录页。
 * 由 refresh 失败流程调用。
 */
function performLogout(): void {
  ElMessage.error('登录已过期，请重新登录')
  Session.remove('token')
  clearCookies()
  window.location.href = '/login'
}

// 业务码 → 副作用处理器查表。
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
  // dev 模式调试日志（2026-07-24 审计补齐）：记录网络/超时/状态码异常
  if (import.meta.env.DEV) {
    console.debug('[HTTP][resp][error]', {
      url: error.config?.url,
      status,
      message,
    })
  }
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

// ────────────────────────────────────────────────────────────────────
// request<T>()：业务侧统一入口（含 token-refresh 重试 + 缓存 + 分页适配）
// ────────────────────────────────────────────────────────────────────

/**
 * 检查 URL 是否指向 refresh 端点（避免 refresh 自身 401 触发循环）。
 */
function isRefreshRequestUrl(url: string | undefined): boolean {
  if (!url) return false
  const refreshUrl = _getCurrentConfig().url
  return url.endsWith(refreshUrl) || url.includes(refreshUrl)
}

/**
 * 基础请求：返回 `body.data` 字段对应的强类型 T，错误归一为 ApiError。
 *
 * 包含以下自动能力：
 * - 401 自动 refresh + retry（除非 refresh 端点本身）
 * - GET 缓存（TTL 秒内同 key 请求不重复发）
 * - 分页自动适配（usePageAdapter: true）
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const method = (config.method ?? 'get').toLowerCase()

  // 缓存命中：直接返回（仅 GET）
  if (config.cache && method === 'get') {
    const key = config.cache.key ?? buildCacheKey(method, config.url ?? '', config.params)
    const cached = cacheGet<T>(key)
    if (cached !== null) return cached
  }

  try {
    const res = await instance.request<ApiResponse<unknown>, AxiosResponse<ApiResponse<unknown>>>(
      config
    )
    let data = res.data.data
    if (config.usePageAdapter) {
      data = adaptBackendPage(data as Record<string, unknown>, _getResponseFieldMap()) as unknown
    }

    if (config.cache && method === 'get') {
      const key = config.cache.key ?? buildCacheKey(method, config.url ?? '', config.params)
      cacheSet(key, data, config.cache.ttl)
    }

    return data as T
  } catch (err) {
    // 401 自动 refresh + retry（仅一次）
    if (
      err instanceof ApiError &&
      (err.code === 401 || err.code === BusinessCode.UNAUTHORIZED) &&
      !config._retried &&
      !isRefreshRequestUrl(config.url)
    ) {
      try {
        const newToken = await getValidToken()
        config._retried = true
        // 更新 Authorization header
        if (config.headers) {
          const headers = config.headers as Record<string, string>
          headers.Authorization = `Bearer ${newToken}`
        }
        // 递归调用：_retried=true 防止无限循环
        return await request<T>(config)
      } catch {
        // refresh 失败：登出 + 抛出原 ApiError
        performLogout()
      }
    }
    throw err
  }
}

/**
 * axios 原始实例导出：仅供需要自定义拦截器或流式进度的特殊场景。
 * 普通业务应使用 request<T>()。
 */
export default instance
