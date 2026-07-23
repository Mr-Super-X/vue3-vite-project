// errorHandler 插件类型定义（与 errorHandler.ts 配套）
// 分离类型到 .d.ts：与 directives 同范式

import type { WebVitalsOptions } from './webVitals'

/**
 * 错误来源标识
 *
 * - 已知值（errorHandler 内部使用）：'vue' | 'window.error' | 'unhandledrejection'
 * - 业务自定义：任意字符串（如 'parse-config'、'third-party-sdk'）
 *
 * 设为 string 而非 union 是为了支持 safeAsync 等工具自由传入上下文标签。
 */
export type ErrorSource = string

/**
 * 错误上下文（透传给 report 回调）
 */
export interface ErrorContext {
  source: ErrorSource
  /** 附加信息（Vue 错误时是 lifecycle hook name 等） */
  extra?: unknown
}

/**
 * 错误上报回调签名
 *
 * 生产环境对接 Sentry / 自建日志服务时实现此函数。
 * 默认 undefined（仅 console 输出）。
 */
export type ErrorReporter = (error: Error, context: ErrorContext) => void

/**
 * errorHandler 插件 options
 */
export interface ErrorHandlerOptions {
  /** 错误上报回调（生产环境接 Sentry/自建日志服务） */
  report?: ErrorReporter
  /** 是否在控制台输出。默认 dev=true / prod=false */
  logToConsole?: boolean
}

/**
 * plugins 聚合 options（plugins/index.ts 接收）
 */
export interface PluginsOptions {
  errorHandler?: ErrorHandlerOptions | false
  /** Web Vitals 上报（不传则默认 dev console.log / prod noop；传 false 完全关闭） */
  webVitals?: WebVitalsOptions | false
}
