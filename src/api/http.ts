import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { BusinessCode, HttpStatus } from '@/enums/httpEnum'
import type { ApiResponse } from './types/api.d'

// 单一来源：所有 API url 都不带 /api 前缀，由 baseURL 统一拼装。
// 避免因 .env 或调用方误写双 /api 导致 404（如 /api/api/auth/login）。
const API_BASE_URL = '/api'

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 拦截器职责单一：响应只管解包业务码 + 错误归一化；返回类型用 as any 绕过 axios 期望 AxiosResponse 的强约束
instance.interceptors.response.use(
  ((response: AxiosResponse) => {
    const body = response.data as ApiResponse<unknown>
    if (body.code === BusinessCode.SUCCESS) return body.data
    if (body.code === BusinessCode.UNAUTHORIZED) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(new Error(body.message))
    }
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message))
  }) as never,
  (error) => {
    const status = error.response?.status
    const msg =
      status === HttpStatus.UNAUTHORIZED
        ? '请先登录'
        : status === HttpStatus.FORBIDDEN
          ? '无权限访问'
          : status === HttpStatus.NOT_FOUND
            ? '资源不存在'
            : status === HttpStatus.SERVER_ERROR
              ? '服务器错误'
              : '网络异常，请稍后重试'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export function request<T>(config: AxiosRequestConfig): Promise<T> {
  return instance.request<unknown, T>(config)
}

export default instance
