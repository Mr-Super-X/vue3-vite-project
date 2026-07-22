// 设计要点：
// - 单一来源：所有 API url 都不带 /api 前缀，由 baseURL 统一拼装（避免 /api/api 双拼）
// - 拦截器职责单一：响应只管副作用（toast + 401 跳转）+ 抛 ApiError
// - 业务码解包与 data 提取下沉到 request<T>()，拦截器签名天然满足 AxiosInterceptorFulfilled 类型
//   （AxiosResponse -> AxiosResponse），避免使用 `as any` / `as never` 逃类型
// - token 来源统一走 utils/storage.ts 的 Session，与项目命名空间约定一致；
//   Session.get('token') 在生产环境自动 secure + sameSite=lax
// - 所有抛出错误归一为 ApiError，调用方 `err instanceof ApiError` 即可 narrowing
// - 可选能力（cancel/retry/merge）拆到独立模块，request<T> 保持简单，业务层零迁移

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { BusinessCode, HttpStatus } from '@/enums/httpEnum'
import { Session, clearCookies } from '@/utils/storage'
import type { ApiResponse } from './types/api.d'
import { ApiError } from './types/error'

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
  return config
})

// 响应拦截器：副作用 + 抛 ApiError，不做数据解包。
// 签名是 AxiosResponse -> AxiosResponse，天然满足 axios 类型约束，
// 解包责任下沉到 request<T>() 的 .then，避免拦截器里逃类型。
const onResponseFulfilled = (
  response: AxiosResponse<ApiResponse<unknown>>
): AxiosResponse<ApiResponse<unknown>> => {
  const body = response.data
  if (body?.code === BusinessCode.UNAUTHORIZED) {
    ElMessage.error(body.message || '登录已过期，请重新登录')
    Session.remove('token')
    clearCookies()
    window.location.href = '/login'
    throw new ApiError({
      code: body.code,
      message: body.message ?? 'unauthorized',
      url: response.config.url,
    })
  }
  if (body && body.code !== BusinessCode.SUCCESS) {
    const message = body.message || '请求失败'
    ElMessage.error(message)
    throw new ApiError({
      code: body.code ?? -1,
      message,
      url: response.config.url,
    })
  }
  return response
}

const onResponseRejected = (error: {
  response?: AxiosResponse
  config?: { url?: string }
  message?: string
}): never => {
  const status = error.response?.status
  const message =
    status === HttpStatus.UNAUTHORIZED
      ? '请先登录'
      : status === HttpStatus.FORBIDDEN
        ? '无权限访问'
        : status === HttpStatus.NOT_FOUND
          ? '资源不存在'
          : status === HttpStatus.SERVER_ERROR
            ? '服务器错误'
            : '网络异常，请稍后重试'
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
