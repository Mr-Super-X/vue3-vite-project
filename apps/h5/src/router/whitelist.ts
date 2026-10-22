/**
 * 路由白名单（h5 单一事实来源）。
 *
 * h5 全站公开：h5-demo 模块全部路由名从 `@/modules/h5-demo/routes` 的 routeNames
 * 全量吸收（h5-demo 物理独立后随 app 走，无构建剔除门控），外加站内 404。
 * 判定依据：路由的 `name` 在集合中（按 name 而非 path 匹配，path 可能变化）。
 *
 * @see [`./index.ts`](./index.ts) 守卫挂接点
 * @group 路由：白名单
 */

import { isWhiteListed } from '@vv/shared/router-guards'
import { routeNames as h5DemoRouteNames } from '@/modules/h5-demo/routes'

export const ROUTE_WHITE_LIST: ReadonlySet<string> = new Set<string>([
  'NotFound', // 404 页面
  ...h5DemoRouteNames,
])

/**
 * 判定路由是否在 h5 白名单内（直通放行）。
 *
 * 判定谓词 `isWhiteListed` 归 @vv/shared；数据 ROUTE_WHITE_LIST 归 h5 私有，两者在此接线。
 *
 * @param routeName 路由 name（string | symbol | null | undefined；统一按 string 处理）
 * @returns true 表示在白名单内，可直接放行
 */
export function isH5WhiteListed(routeName: unknown): boolean {
  return isWhiteListed(routeName, ROUTE_WHITE_LIST)
}
