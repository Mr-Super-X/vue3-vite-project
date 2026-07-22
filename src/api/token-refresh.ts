import axios from 'axios'
import { Session } from '@/utils/storage'

/**
 * Token 自动刷新管理器（单例）。
 *
 * 设计要点：
 * - 并发去重：同一时刻只发一个 refresh 请求；并发 401 共享结果
 * - 配置化：endpoint + request/response transformers 可配（后端契约确定后调整）
 * - 默认约定：POST /auth/refresh + 空 body + 从 body.data.token 提取新 token
 * - 失败传播：refresh 失败时抛出，由调用方（http.ts）决定后续行为（清 token + 跳登录页）
 *
 * 注意：当前 refresh 接口契约暂未与后端确认，默认实现是占位。
 * 后端契约确定后，仅需修改 configureTokenRefresh 配置参数即可。
 */

const getAPIBaseURL = () => import.meta.env.VITE_API_BASE_URL

/**
 * Token 刷新配置。
 *
 * 后端契约确定后调整：
 * - url：refresh 接口路径
 * - fetchToken：自定义请求函数（默认 axios POST）
 * - extractToken：从响应中提取新 token
 */
export interface TokenRefreshConfig {
  /** refresh 接口路径（相对于 baseURL） */
  url: string
  /** 自定义 fetch 函数（默认使用 axios POST） */
  fetchToken?: () => Promise<unknown>
  /** 从响应数据中提取新 token（默认 body.data.token） */
  extractToken?: (data: unknown) => string | null
}

const DEFAULT_CONFIG: Required<Omit<TokenRefreshConfig, 'fetchToken' | 'extractToken'>> & {
  fetchToken: () => Promise<unknown>
  extractToken: (data: unknown) => string | null
} = {
  url: '/auth/refresh',
  fetchToken: async () => {
    // baseURL 在 vitest jsdom 环境可能为 undefined，降级为空串避免路径拼接异常
    // url 使用 currentConfig.url（运行时读取）确保 configureTokenRefresh 改动生效
    const baseURL = getAPIBaseURL() ?? ''
    const res = await axios.post(`${baseURL}${currentConfig.url}`, {}, { timeout: 15000 })
    return res.data
  },
  extractToken: (data: unknown) => {
    if (data && typeof data === 'object') {
      const body = data as { data?: { token?: unknown } }
      const token = body.data?.token
      return typeof token === 'string' ? token : null
    }
    return null
  },
}

/**
 * 当前生效配置（模块级单例；通过 configureTokenRefresh 修改）
 */
let currentConfig: Required<TokenRefreshConfig> = {
  ...DEFAULT_CONFIG,
}

/**
 * 修改 refresh 适配器配置（应用启动时调用一次）。
 *
 * 注意：只覆盖显式提供的字段；undefined 值不会覆盖已有配置。
 */
export function configureTokenRefresh(config: Partial<TokenRefreshConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...(config.url !== undefined ? { url: config.url } : {}),
    ...(config.fetchToken !== undefined ? { fetchToken: config.fetchToken } : {}),
    ...(config.extractToken !== undefined ? { extractToken: config.extractToken } : {}),
  }
}

/**
 * 单例刷新状态：保存正在进行的 refresh Promise（用于并发去重）
 */
let refreshingPromise: Promise<string> | null = null

/**
 * 获取有效的 access token：
 * - 若当前已有 refresh 在飞：等待其完成并复用结果
 * - 否则：发起新的 refresh 请求，存储新 token，返回
 *
 * 失败时抛出错误，调用方决定后续行为。
 *
 * 循环防护：http.ts 调用时检查 config.url 是否为 refresh 端点，是则跳过本函数。
 */
export async function getValidToken(): Promise<string> {
  if (!refreshingPromise) {
    refreshingPromise = doRefresh()
  }
  try {
    return await refreshingPromise
  } catch (err) {
    // 失败时清空状态，让下次重试可以重新发起
    refreshingPromise = null
    throw err
  }
}

async function doRefresh(): Promise<string> {
  const data = await currentConfig.fetchToken()
  const token = currentConfig.extractToken(data)
  if (!token) {
    throw new Error('[token-refresh] refresh response has no token')
  }
  Session.set('token', token)
  // 成功完成后再清空 refreshingPromise（保证并发请求都能拿到结果）
  refreshingPromise = null
  return token
}

/** @internal 测试用：清空 refresh 状态 */
export function _resetRefreshing(): void {
  refreshingPromise = null
}

/** @internal 测试用：读取当前配置 */
export function _getCurrentConfig(): Readonly<Required<TokenRefreshConfig>> {
  return currentConfig
}
