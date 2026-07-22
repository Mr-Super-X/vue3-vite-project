import { HttpStatus } from '@/enums/httpEnum'

/**
 * HTTP 状态码 → 用户可见中文文案查表。
 *
 * 设计要点：
 * - 表格形式而非三元嵌套，方便单测与扩展（加状态码加一行即可）
 * - 命中 key → 返回对应文案
 * - 未命中 + status 在 5xx 范围 → 走服务器通用文案
 * - 未命中 + status 在 4xx 范围 → 走客户端通用文案
 * - status undefined（网络异常/超时/取消）→ 走网络通用文案
 *
 * 三档 fallback 文案分开配置，避免所有错误都返回同一条 "网络异常" 的粗暴兜底。
 */
const STATUS_MESSAGES: Record<number, string> = {
  // 4xx 客户端错误
  [HttpStatus.BAD_REQUEST]: '请求参数错误',
  [HttpStatus.UNAUTHORIZED]: '请先登录',
  [HttpStatus.FORBIDDEN]: '无权限访问',
  [HttpStatus.NOT_FOUND]: '资源不存在',
  // 5xx 服务器错误
  [HttpStatus.SERVER_ERROR]: '服务器错误',
  [HttpStatus.BAD_GATEWAY]: '网关错误',
  [HttpStatus.SERVICE_UNAVAILABLE]: '服务暂不可用',
  [HttpStatus.GATEWAY_TIMEOUT]: '网关超时',
}

const NETWORK_MESSAGE = '网络异常，请稍后重试'
const SERVER_FALLBACK_MESSAGE = '服务异常，请稍后重试'
const CLIENT_FALLBACK_MESSAGE = '请求失败，请检查后重试'

export function resolveHttpStatusMessage(status: number | undefined): string {
  if (status === undefined) return NETWORK_MESSAGE
  const mapped = STATUS_MESSAGES[status]
  if (mapped !== undefined) return mapped
  if (status >= 500) return SERVER_FALLBACK_MESSAGE
  if (status >= 400) return CLIENT_FALLBACK_MESSAGE
  return NETWORK_MESSAGE
}
