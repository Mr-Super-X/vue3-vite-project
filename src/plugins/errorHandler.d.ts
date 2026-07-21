// errorHandler 插件类型定义（与 errorHandler.ts 配套）
// 分离类型到 .d.ts：与 directives 同范式

/**
 * 错误来源标识
 *
 * - 'vue'：Vue 组件渲染 / 生命周期 / 自定义指令等抛出的错误（app.config.errorHandler）
 * - 'window.error'：window 全局 JS 错误（语法错误、未捕获异常等）
 * - 'unhandledrejection'：未捕获的 Promise 拒绝
 */
export type ErrorSource = 'vue' | 'window.error' | 'unhandledrejection'

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
}
