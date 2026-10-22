/**
 * 路由白名单判定（纯函数）。
 *
 * 包内只持有判定逻辑；白名单数据（ROUTE_WHITE_LIST）归各 app 私有
 * （admin：apps/admin/src/router/whitelist.ts），经参数注入——
 * 不同 app 的公开页面集合不同，不应沉淀到共享包。
 *
 * 为什么按 name 而不是 path：路由 path 可能变化，name 更稳定；
 * 后端菜单可能用任意 path 注入，按 name 校验更可控。
 *
 * @group 路由：白名单
 */

/**
 * 判断路由名是否命中白名单（跳过登录 + 权限检查）。
 *
 * @param routeName 路由 name（Vue Router 中可能是 string | symbol | null | undefined；
 *                   symbol 用于命名空间，本系统未使用，统一按 string 处理）
 * @param whitelist app 侧的白名单路由名集合
 * @returns true 表示在白名单内，可直接放行
 */
export function isWhiteListed(routeName: unknown, whitelist: ReadonlySet<string>): boolean {
  if (typeof routeName !== 'string') return false
  return whitelist.has(routeName)
}
