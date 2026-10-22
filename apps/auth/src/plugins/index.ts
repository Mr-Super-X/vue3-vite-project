import type { App } from 'vue'
import errorHandler from './errorHandler'
import webVitals from './webVitals'
import type { PluginsOptions } from './errorHandler.d'

/**
 * 项目插件统一注册入口（auth 裁剪版）。
 *
 * 与 admin 的 plugins/index.ts 同范式（export default install(app, options)），
 * 裁剪掉 remAdaptation（viewport meta 幂等/h5 rem 适配——auth 无 h5 布局，
 * viewport meta 在 index.html 静态声明）。
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

  // 2. Web Vitals 采集（默认启用；dev 模式 console 徽章、prod 默认 noop）
  if (options.webVitals !== false) {
    app.use(webVitals, options.webVitals)
  }
}

export default install
