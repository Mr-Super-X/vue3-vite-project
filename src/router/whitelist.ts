/**
 * 路由白名单（单一事实来源）。
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
 * 自动吸收 demo 路由名：`demoWhitelistNames` 在 dev 本地开发 或 gh-pages 演示构建
 * （VITE_DEMO_NO_AUTH=true）时从 `src/modules/demo/routes` 展开为全部 demo 路由名；
 * 常规 prod 构建时条件被 Vite 静态替换为 false，常量折叠为空数组，
 * `...[]` spread 被 Rollup 消除，demo 字符串不进入生产包。
 * 条件与 demo 路由注册开关（src/modules/demo/routes/index.ts 的 isDemoRoutesEnabled）
 * 保持同步。`scripts/check-routes.ts` 已对 `'Demo'` 前缀做一致性豁免。
 *
 * @see [`./guards/auth.ts`](./guards/auth.ts) `isWhiteListed` 调用点
 * @group 路由：白名单
 */

import { routeNames as demoRouteNames } from '@/modules/demo/routes'

/**
 * demo 路由名吸收集合：dev 本地开发 或 gh-pages 演示构建（VITE_DEMO_NO_AUTH=true）
 * 时展开为全部 demo 路由名；常规 prod 构建静态折叠为空数组。
 * 条件与 demo 路由注册开关（src/modules/demo/routes/index.ts 的 isDemoRoutesEnabled）联动。
 *
 * 提取为独立常量而非内联 `...(cond ? demoRouteNames : [])` 的原因：
 * scripts/check-routes.ts 用正则提取 Set 字面量内容（`[^\]]+` 遇首个 `]` 截断），
 * 内联 false 分支的 `[]` 会截断提取串并把 `'true'` 误捕获成路由名（2026-10-21 实测踩坑）。
 */
const demoWhitelistNames: readonly string[] =
  import.meta.env.DEV || import.meta.env.VITE_DEMO_NO_AUTH === 'true' ? demoRouteNames : []

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
  'Home', // 企业官网首页（公开访问：门户落地页免登录，登录入口在页内顶栏）
  'Forbidden', // 403 无权限
  'NotFound', // 404 页面
  'ServerError', // 500 页面
  'H5Demo', // H5 示例页（h5 layout 验收；免登录方便真机扫码预览）
  'BigDemo', // 数据大屏（big layout 验收；免登录方便演示厅直接打开）
  'BigDemoWide', // 超宽拼接大屏示例（9000×1080 设计稿）
  'BigDemoStateDemo', // 五态示范页（异步数据形态验收；与 BigDemo 同权限语义）
  ...demoWhitelistNames,
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
