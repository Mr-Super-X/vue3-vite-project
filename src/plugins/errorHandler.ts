import type { App } from 'vue'
import type { ErrorHandlerOptions, ErrorSource } from './errorHandler.d'

/**
 * 全局错误处理插件
 *
 * 接管 3 类错误：
 * 1. Vue 组件错误（app.config.errorHandler）
 * 2. window 全局 JS 错误（window.addEventListener('error')）
 * 3. 未捕获的 Promise 拒绝（unhandledrejection）
 *
 * 设计要点：
 * - install 模式：与 directives 一致，方便 main.ts 统一注册
 * - options.report：预留 Sentry/自建日志服务扩展点（未传时仅 console 输出）
 * - logToConsole：dev 默认 true / prod 默认 false
 * - 错误规范化：非 Error 实例包装为 Error（统一类型）
 *
 * 用法：
 * ```ts
 * import errorHandler from './errorHandler'
 * app.use(errorHandler, {
 *   report: (err, ctx) => Sentry.captureException(err, { tags: ctx })
 * })
 * ```
 */
export default {
  install(app: App, options: ErrorHandlerOptions = {}): void {
    const { report, logToConsole = import.meta.env.DEV } = options

    /** 错误统一规范化与上报 */
    const handle = (err: unknown, source: ErrorSource, extra?: unknown): void => {
      const error = err instanceof Error ? err : new Error(String(err))
      if (logToConsole) {
        // dev 环境 console.error 输出原始错误（含 stack）
        console.error(`[${source}]`, error, extra)
      }
      report?.(error, { source, extra })
    }

    // 1. Vue 组件错误
    app.config.errorHandler = (err, _instance, info) => {
      handle(err, 'vue', info)
    }

    // 2. window 全局 JS 错误
    window.addEventListener('error', (event) => {
      handle(event.error ?? event.message, 'window.error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // 3. 未捕获的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      handle(event.reason, 'unhandledrejection')
    })
  },
}
