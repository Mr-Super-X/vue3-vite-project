/**
 * 路由白名单（admin 单一事实来源）。
 *
 * 用途：白名单路由跳过登录检查 + 跳过权限检查
 * 判定依据：路由的 `name` 在 `ROUTE_WHITE_LIST` 中（按 name 而非 path 匹配）
 *
 * 为什么用 name 而不是 path：
 * - 路由 path 可能变化（如 `/login` → `/signin`），name 更稳定
 * - 后端菜单可能用任意 path 注入，按 name 校验更可控
 *
 * 注意：白名单路由仍建议挂载 layout（避免裸路由破布局）
 *
 * P2 变更：demo 模块物理独立到 apps/docs（连同 `demoWhitelistNames` 吸收链），
 * 本集合只剩 admin 仍承载的公开路由（H5Demo/BigDemo 系列）。
 * P3-1 变更：home 模块（企业官网）物理独立到 apps/portal（连同 'Home' 白名单行），
 * admin 不再有公开落地页——未登录访问 `/` 由守卫跳 /login（rootRedirect 已指向 /workbench）。
 *
 * @see [`./guards/auth.ts`](./guards/auth.ts) `isWhiteListed` 调用点
 * @group 路由：白名单
 */

import { isWhiteListed } from '@vv/shared/router-guards'

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
  'H5Demo', // H5 示例页（h5 layout 验收；免登录方便真机扫码预览）
  'BigDemo', // 数据大屏（big layout 验收；免登录方便演示厅直接打开）
  'BigDemoWide', // 超宽拼接大屏示例（9000×1080 设计稿）
  'BigDemoStateDemo', // 五态示范页（异步数据形态验收；与 BigDemo 同权限语义）
])

/**
 * 判定路由是否在 admin 白名单内（跳过登录 + 权限检查）。
 *
 * 判定谓词 `isWhiteListed` 归 @vv/shared（P1-3 守卫骨架下沉）；
 * 数据 ROUTE_WHITE_LIST 归 admin 私有，两者在此接线。
 *
 * @param routeName 路由 name（Vue Router 中可能是 string | symbol | null | undefined；
 *                   symbol 用于命名空间，本系统未使用，统一按 string 处理）
 * @returns true 表示在白名单内，可直接放行
 */
export function isAdminWhiteListed(routeName: unknown): boolean {
  return isWhiteListed(routeName, ROUTE_WHITE_LIST)
}
