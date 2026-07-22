// 设计要点：
// - 单一来源：所有 API url 都不带 /api 前缀，由 baseURL 统一拼装（避免 /api/api 双拼）
// - 拦截器职责单一：响应只管副作用（toast + 401 跳转）+ 抛 ApiError
// - 业务码解包与 data 提取下沉到 request<T>()，拦截器签名天然满足 AxiosInterceptorFulfilled 类型
//   （AxiosResponse -> AxiosResponse），避免使用 `as any` / `as never` 逃类型
// - token 来源统一走 utils/storage.ts 的 Session，与项目命名空间约定一致；
//   Session.get('token') 在生产环境自动 secure + sameSite=lax
// - 所有抛出错误归一为 ApiError，调用方 `err instanceof ApiError` 即可 narrowing
// - 可选能力（cancel/retry/merge）拆到独立模块，request<T> 保持简单，业务层零迁移

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

const getAPIBaseURL = () => import.meta.env.VITE_API_BASE_URL

const instance: AxiosInstance = axios.create({
  baseURL: getAPIBaseURL(),
  timeout: 15000,
})

instance.interceptors.request.use((config) => {
  // Session.get('token') 在生产环境强制 secure + sameSite=lax，
  // 与 utils/storage.ts 的 token 存储约定一致。
  const token = Session.get<string>('token')
  if (typeof token === 'string' && token.length > 0) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  // 合并 per-request signal 与 globalAbort signal；
  // logout 时 globalAbort.abort() 会取消所有在途请求。
  // 类型 cast：axios 的 GenericAbortSignal 是 AbortSignal 的结构子集，
  // 运行时 AbortSignal 完全兼容 GenericAbortSignal，仅 TS 类型层不可推导。
  config.signal = chainSignals(
    config.signal as unknown as AbortSignal | undefined,
    globalAbort.signal as AbortSignal | undefined
  ) as GenericAbortSignal
  return config
})

// 业务码响应处理：副作用（toast + 401 跳转）+ 抛 ApiError。
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
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await instance.request<ApiResponse<T>, AxiosResponse<ApiResponse<T>>>(config)
  return res.data.data
}

/**
 * axios 原始实例导出：仅供需要自定义拦截器或流式进度的特殊场景。
 * 普通业务应使用 request<T>()。
 */
export default instance
