// webVitals 插件类型声明（与 src/plugins/index.ts 聚合使用）

import type { WebVitalsOptions } from './webVitals'

declare module 'vue' {
  interface ComponentCustomOptions {
    /**
     * 注册 Web Vitals 采集 + 自定义上报。
     *
     * @example
     *   app.use(WebVitals, {
     *     report: (metric) => {
     *       // Sentry / Ga / 自有 APM 任选其一
     *     },
     *   })
     */
    webVitals?: WebVitalsOptions
  }
}

/** 类型与 .ts 一致，导出供外部 import。 */
export type { WebVitalsOptions }
