// errorHandler 插件类型定义（与 errorHandler.ts 配套）
// 分离类型到 .d.ts：与 directives 同范式

import type { WebVitalsOptions } from './webVitals'

// ErrorSource / ErrorContext / ErrorReporter 契约归 @vv/shared
// （shared 不反向依赖 app 的 plugins）；此处 re-export 保持与 admin 同形态
export type { ErrorSource, ErrorContext, ErrorReporter } from '@utils/safeAsync'

import type { ErrorReporter } from '@utils/safeAsync'

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
 * plugins 聚合 options（plugins/index.ts 接收）。
 * 相对 admin 裁剪：无 remAdaptation 项（h5 rem 适配归 admin，docs 无 h5 布局）。
 */
export interface PluginsOptions {
  errorHandler?: ErrorHandlerOptions | false
  /** Web Vitals 上报（不传则默认 dev console 徽章 / prod noop；传 false 完全关闭） */
  webVitals?: WebVitalsOptions | false
}
