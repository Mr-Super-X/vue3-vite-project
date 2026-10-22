import type { App } from 'vue'
import errorHandler from './errorHandler'
import webVitals from './webVitals'
import remAdaptation from './remAdaptation'
import type { PluginsOptions } from './errorHandler.d'

/**
 * 项目插件统一注册入口
 *
 * 与 src/directives/index.ts 同范式：export default install(app, options)，
 * 让 main.ts 集中注册所有插件（不散落 app.use(...)）。
 *
 * 未来新增插件在此处统一添加：
 * - permissionPlugin(app, options.permission)
 * - analyticsPlugin(app, options.analytics)
 * - sentryPlugin(app, options.sentry)
 *
 * 用法（main.ts）：
 * ```ts
 * import Plugins from '@/plugins'
 * app.use(Plugins, {
 *   errorHandler: {
 *     report: (err, ctx) => Sentry.captureException(err, { tags: ctx })
 *   }
 * })
 * ```
 *
 * @see [`./errorHandler.ts`](./errorHandler.ts) 全局错误处理
 * @see [`./webVitals.ts`](./webVitals.ts) 性能指标采集
 * @group 插件：注册入口
 */
const install = (app: App, options: PluginsOptions = {}): void => {
  // 1. 全局错误处理（默认启用；传 false 可关闭）
  if (options.errorHandler !== false) {
    app.use(errorHandler, options.errorHandler)
  }

  // 2. Web Vitals 采集（默认启用；dev 模式 console.info、prod 默认 noop）
  //    上报 endpoint 待接入——业务方在 main.ts 传 options.webVitals.report 自定义
  if (options.webVitals !== false) {
    app.use(webVitals, options.webVitals)
  }

  // 3. REM 适配（H5）：viewport meta 幂等确保（默认启用；传 false 可关闭）。
  //    P3-2 起 h5 layout / h5-demo 已独立为 apps/h5，admin 仅保留 viewport meta 兜底
  if (options.remAdaptation !== false) {
    app.use(remAdaptation)
  }
}

export default install
