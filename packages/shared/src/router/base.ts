/**
 * 路由创建配置工具（@vv/shared）。
 *
 * 文件角色：6 个 app 的 router/index.ts 中逐字重复的零差异段的单源实现。
 * P5 架构审查裁决「抽工具不抽流程」：app.use 装配序列与各 app 私有路由
 * 编排（守卫串接 / rootRedirect / 白名单）保持各 app 手写，仅纯函数零差异段
 * （base 路径解析 / scroll 行为）下沉本包，消除 5-6 份拷贝的漂移风险。
 *
 * @group 路由：创建配置
 */
import type { RouterScrollBehavior } from 'vue-router'

/**
 * 解析路由部署 base 路径（`VITE_BASE`）。
 *
 * 业务约束：vue-router basename 要求以 `/` 开头、`/` 结尾；env 缺省或形态
 * 非法时归一补全，子路径部署在 .env.production 设 `VITE_BASE=/sub-path/`。
 *
 * 下沉原因：5 个 app 的 router/index.ts + admin 的 router/config.ts 共 6 份逐字拷贝。
 */
export function resolveBasePath(): string {
  const raw = import.meta.env.VITE_BASE ?? '/'
  if (!raw.startsWith('/')) return `/${raw}`
  if (!raw.endsWith('/')) return `${raw}/`
  return raw
}

/**
 * 创建各 app 统一的路由滚动行为。
 *
 * 业务语义：
 * - 浏览器前进/后退（popstate）：恢复浏览器记录的 savedPosition
 * - 目标路由带 hash 锚点：平滑滚动到对应元素
 * - 其他导航：回页面顶部
 *
 * 下沉原因：6 个 app 的 router/index.ts 逐字重复同一函数体，集中单源防止漂移。
 */
export function createDefaultScrollBehavior(): RouterScrollBehavior {
  return (to, _from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0, left: 0 }
  }
}
