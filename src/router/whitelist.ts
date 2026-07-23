// 路由白名单（单一事实来源）
//
// 用途：白名单路由跳过登录检查 + 跳过权限检查
// 判定依据：路由的 `name` 在 ROUTE_WHITE_LIST 中（按 name 而非 path 匹配）
//
// 为什么用 name 而不是 path：
//   - 路由 path 可能变化（如 `/login` → `/signin`），name 更稳定
//   - 后端菜单可能用任意 path 注入，按 name 校验更可控
//
// 注意：白名单路由仍建议挂载 layout（避免裸路由破布局）
//
// 自动吸收 demo 路由名：dev 模式从 src/modules/demo/routes 展开，
// prod 构建时 Vite 静态替换 import.meta.env.DEV 为 false，
// `...(false ? demoRouteNames : [])` 被 Rollup 优化为 `...[]` 并消除，
// demo 字符串不进入生产包。scripts/check-routes.ts 已对 'Demo' 前缀做一致性豁免。

import { routeNames as demoRouteNames } from '@/modules/demo/routes'

/**
 * 白名单路由集合。增删只需修改下方字面量数组。
 *
 * @example 业务路由加入白名单
 * ```ts
 * // 在字面量数组中追加即可：
 * 'Preview',
 * ```
 */
export const ROUTE_WHITE_LIST: ReadonlySet<string> = new Set<string>([
  'Login', // 登录页
  'Forbidden', // 403 无权限
  'NotFound', // 404 页面
  'ServerError', // 500 页面
  // dev 模式追加 demo 路由；prod 整个 spread 被 Rollup 消除
  ...(import.meta.env.DEV ? demoRouteNames : []),
])

/**
 * 判断路由是否在白名单内（跳过登录 + 权限检查）。
 *
 * @param routeName 路由 name（Vue Router 中可能是 string | symbol | null | undefined；
 *                   symbol 用于命名空间，本系统未使用，统一按 string 处理）
 * @returns true 表示在白名单内，可直接放行
 */
export function isWhiteListed(routeName: unknown): boolean {
  if (typeof routeName !== 'string') return false
  return ROUTE_WHITE_LIST.has(routeName)
}
