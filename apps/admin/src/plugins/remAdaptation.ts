/**
 * REM 适配插件（H5 移动端面板能力的一部分）。
 *
 * 职责边界（为何这么薄）：
 *   - 本插件只做「viewport meta 幂等确保」这一件全局一次性的事。
 *   - html fontSize 动态计算 / 宽屏限宽 / resize 监听**故意不在 install 执行**——
 *     本 SPA 多布局共存（default / portal / h5），install 时全局设置会泄漏：
 *     从 h5 页返回后台时 html 内联 width/margin 残留会挤压 default 布局。
 *     激活/恢复由 `src/layouts/h5/config/rem.ts` 承担，绑定 h5 layout 组件生命周期
 *     （onMounted 激活 / onUnmounted 恢复），路由挂 h5 layout 即获得能力。
 *
 * @see [`src/layouts/h5/config/rem.ts`](../layouts/h5/config/rem.ts) fontSize 激活/恢复
 * @see [`./index.ts`](./index.ts) 插件统一注册入口
 * @group 插件：REM 适配
 */

import type { App } from 'vue'

/**
 * viewport meta content 唯一事实源（index.html 不再静态拷贝，install 时创建——
 * app.use 序列先于 app.mount，首帧渲染前 meta 已就位）。
 * 幂等检查只查存在性：宿主 HTML 自带不同 content 的 meta 时尊重宿主（只兜"缺失"）。
 */
const VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'

/**
 * 确保 viewport meta 存在（幂等）。
 * install 是唯一创建路径（plugins/index.ts 默认启用，可用 remAdaptation: false 关闭——
 * 关闭即自担 viewport 责任，适用于宿主 HTML 自行管理的场景）。
 * 业务方经 default export 的 install 间接受用；具名导出仅供测试与 layouts/h5 直接调用。
 */
export function ensureViewportMeta(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector('meta[name="viewport"]')) return
  const meta = document.createElement('meta')
  meta.setAttribute('name', 'viewport')
  meta.setAttribute('content', VIEWPORT_CONTENT)
  document.head.appendChild(meta)
}

export default {
  /** Vue 插件 install：仅确保 viewport meta。无可配项（关闭走 plugins/index.ts 的 false 开关） */
  install(_app: App): void {
    ensureViewportMeta()
  },
}
