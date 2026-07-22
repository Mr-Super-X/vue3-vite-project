// 路由辅助函数（标题解析、meta 提取）
//
// 提供给 sidebar / breadcrumb / 页面组件使用，统一 i18n 解析逻辑。

import type { RouteLocationNormalized, RouteMeta } from 'vue-router'

/**
 * 解析路由的展示标题。
 *
 * 优先级：
 *   1. meta.titleKey + i18n.t()           // 国际化路径（需调用方传入 t 函数）
 *   2. meta.title                          // 兜底字符串
 *   3. route.name                          // 开发期兜底（便于调试）
 *
 * 不在本函数内直接 import @/locales，理由：
 *  - helpers.ts 处于 router 层，调用 @/locales 会形成 router ↔ locales 的双向依赖
 *  - 业务侧通常已有 useI18n() 的 t 函数，让调用方注入更解耦
 *  - 不在 SFC setup 外调 useI18n 会报错（i18n 必须在 setup 上下文）
 *
 * 未传入 t 或 t 返回 key 本身 → fallback 到 meta.title / route.name，不抛错。
 *
 * @example
 *   // setup 中：
 *   const { t } = useI18n()
 *   const title = resolveRouteTitle(route, t)
 *
 *   // 不需要 i18n 时：
 *   const title = resolveRouteTitle(route)
 */
export function resolveRouteTitle(
  to: Pick<RouteLocationNormalized, 'meta' | 'name'>,
  t?: (key: string) => string
): string {
  const meta = to.meta as RouteMeta
  const titleKey = (meta as { titleKey?: string }).titleKey
  if (titleKey && t) {
    const translated = t(titleKey)
    if (translated && translated !== titleKey) return translated
  }

  const title = (meta as { title?: string }).title
  if (title) return title

  return typeof to.name === 'string' ? to.name : ''
}

/**
 * 提取路由的权限码（业务侧 useAuth 比较用）。
 *
 * @returns 元数据中的 permissions 数组，缺失返回 undefined
 */
export function extractRoutePermissions(
  to: Pick<RouteLocationNormalized, 'meta'>
): string[] | undefined {
  return (to.meta as { permissions?: string[] }).permissions
}

/**
 * 提取路由图标名（Element Plus icon 名）。
 */
export function extractRouteIcon(to: Pick<RouteLocationNormalized, 'meta'>): string | undefined {
  return (to.meta as { icon?: string }).icon
}
