// Web Vitals 客户端采集
//
// 安装：pnpm add web-vitals
//
// 设计要点：
//   - 4 项核心指标（LCP / INP / CLS / TTFB）；FCP 可选启用
//   - dev 模式：默认 console.info 输出便于开发者立即观察
//   - prod 模式：默认 noop（不上报到任何端点）；业务通过 options.report 自定义
//   - 上报 endpoint **未实现**——后端协议未定，业务后续接入见 docs/12-web-vitals使用规范.md
//
// 为何不上报到自家端点：
//   - 上报协议（fetch / sendBeacon / image ping）和端点 URL 需与运维约定
//   - 采集与上报解耦：web-vitals 库负责采，业务层只在 options.report 里加一行
//
// 接入示例（见 docs/12 完整版本）：
//   ```ts
//   app.use(WebVitals, {
//     report: (metric) => {
//       // Sentry: Sentry.setMeasurement(metric.name, metric.value)
//       // Ga: gtag('event', metric.name, { value: metric.value })
//       // 自有 APM: navigator.sendBeacon('/apm/web-vitals', JSON.stringify(metric))
//     },
//   })
//   ```

import type { App } from 'vue'
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

/** 4 项核心指标；FCP 可选加入（开发期调试用） */
export type WebVitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB'

export interface WebVitalsOptions {
  /**
   * 自定义上报回调。不传则默认在 dev 模式 console.info，prod 模式 noop。
   *
   * @example Sentry
   *   report: (m) => Sentry.setMeasurement(m.name, m.value)
   *
   * @example 自有 APM
   *   report: (m) => navigator.sendBeacon('/api/perf', JSON.stringify(m))
   */
  report?: (metric: Metric) => void
  /** 选择监控的指标子集；默认全 4 项 */
  metrics?: ReadonlyArray<WebVitalName>
}

const ALL_METRICS: ReadonlyArray<WebVitalName> = ['LCP', 'INP', 'CLS', 'TTFB']

/**
 * 默认 reporter：dev 模式 console.info 便于观察；prod 模式 noop。
 * 设计取舍：未接入端点前不让数据"偷偷打到某处"，避免未审查数据外发。
 */
function defaultReporter(metric: Metric): void {
  if (import.meta.env.DEV) {
    // metric.value 数字、metric.rating ('good'/'needs-improvement'/'poor')、metric.id
    console.info(`[WebVitals] ${metric.name}=${Math.round(metric.value)} (${metric.rating})`)
  }
}

/** 路由表：把字符串 name 映射到 web-vitals 的注册函数。避免 switch 串到 install 主体。 */
const REGISTRY = {
  LCP: onLCP,
  INP: onINP,
  CLS: onCLS,
  TTFB: onTTFB,
} as const satisfies Record<WebVitalName, (cb: (m: Metric) => void) => void>

export default {
  /**
   * Vue 插件 install：把 4 项指标的回调注册到 web-vitals 库。
   *
   * @example
   *   app.use(WebVitals, { report: (m) => myReporter(m) })
   */
  install(_app: App, options: WebVitalsOptions = {}): void {
    const reporter = options.report ?? defaultReporter
    const metrics = options.metrics ?? ALL_METRICS

    for (const name of metrics) {
      const handler = REGISTRY[name]
      try {
        handler(reporter)
      } catch (err) {
        // 单项指标注册失败不阻塞其他指标
        if (import.meta.env.DEV) {
          console.warn(`[WebVitals] 注册 ${name} 失败：`, err)
        }
      }
    }
  },
}
