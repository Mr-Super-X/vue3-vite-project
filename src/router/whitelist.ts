// 路由白名单（单一事实来源）
//
// 用途：白名单路由跳过登录检查 + 跳过权限检查
// 判定依据：路由的 `name` 在 ROUTE_WHITE_LIST 中（按 name 而非 path 匹配）
//
// 为什么用 name 而不是 path：
//   - 路由 path 可能变化（如 `/login` → `/signin`），name 更稳定
//   - 后端菜单可能用任意 path 注入，按 name 校验更可控
//   - 类型安全（RouteName 联合类型约束，新增 name 必须显式声明）
//
// 注意：白名单路由仍建议挂载 layout（避免裸路由破布局）

import type { RouteName } from './types'

/**
 * 白名单路由集合。增删白名单只需修改此处。
 *
 * @example 业务路由加入白名单
 * ```ts
 * // 预览页跳过权限（任何人可访问，无需登录）
 * 'Preview' as RouteName,
 * ```
 */
export const ROUTE_WHITE_LIST: ReadonlySet<RouteName> = new Set<RouteName>([
  'Login', // 登录页
  'Forbidden', // 403 无权限
  'NotFound', // 404 页面
  'ServerError', // 500 页面
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
  return ROUTE_WHITE_LIST.has(routeName as RouteName)
}
