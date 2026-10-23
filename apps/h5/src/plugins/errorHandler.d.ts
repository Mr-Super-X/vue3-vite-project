// errorHandler 插件类型定义（与 errorHandler.ts 配套）
// 分离类型到 .d.ts：与 directives 同范式

import type { WebVitalsOptions } from './webVitals'

// P1-3 包化：ErrorSource / ErrorContext / ErrorReporter 契约随 safeAsync 下沉到
// @vv/shared（shared 不反向依赖 app 的 plugins）；此处 re-export 保持既有消费方
// （errorHandler.ts / plugins/index.ts / safeAsync 注入链）零改动。
export type { ErrorSource, ErrorContext, ErrorReporter } from '@vv/shared'

import type { ErrorReporter } from '@vv/shared'

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
  /** REM 适配（H5）：viewport meta 幂等确保；传 false 完全关闭。fontSize 激活归 layouts/h5 */
  remAdaptation?: false
}
