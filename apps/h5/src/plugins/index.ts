import type { App } from 'vue'
import errorHandler from './errorHandler'
import webVitals from './webVitals'
import remAdaptation from './remAdaptation'
import type { PluginsOptions } from './errorHandler.d'

/**
 * 项目插件统一注册入口（h5 版）。
 *
 * 与 docs 的 plugins/index.ts 同范式（export default install(app, options)），
 * 差异：含 remAdaptation（viewport meta 幂等确保——h5 全站移动端，install 时
 * 创建缺失的 viewport meta；html fontSize 激活/恢复由 layouts/h5 组件生命周期
 * 驱动，见 remAdaptation.ts 头注释）。
 *
 * @see [`./errorHandler.ts`](./errorHandler.ts) 全局错误处理
 * @see [`./webVitals.ts`](./webVitals.ts) 性能指标采集
 * @see [`./remAdaptation.ts`](./remAdaptation.ts) viewport meta 幂等确保
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

  // 3. REM 适配（H5）：viewport meta 幂等确保（默认启用；传 false 可关闭）。
  //    html fontSize 激活/恢复不在此处 —— 由 layouts/h5 组件生命周期驱动
  //    （见 remAdaptation.ts 头注释）
  if (options.remAdaptation !== false) {
    app.use(remAdaptation)
  }
}

export default install
