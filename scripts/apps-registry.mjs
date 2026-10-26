/**
 * App 注册表 —— Monorepo「App 名单」单一事实来源
 *
 * 收敛 3 处硬编码（可扩展性审查第一崩点：新增第 7 个 app 原本要手改多处且无校验；
 * 原第 4 处 docker/nginx.dev.conf 已随 node 网关方案消灭——网关路由表由
 * scripts/node-gateway.ts 的 buildGatewayRoutes(APPS) 单源代码派生，无第二事实源）：
 *   1. scripts/dev-gateway.ts 的 APPS 端口表（dev:gateway 串行拉起顺序）
 *   2. eslint.config.mjs 的 MONOREPO_APPS（boundary-apps-<a> 逐 app 边界规则粒度）
 *   3. scripts/check-routes.ts 的 REQUIRED_BY_APP（系统兜底路由 B/C 校验名单）
 *
 * 端口另有两处代码消费（同 import 本表，非硬编码）：scripts/node-gateway.ts 网关路由表、
 * playwright.config.ts 的 app projects baseURL。
 *
 * 对照组 build-pages.ts / generate-tsconfig-paths.ts 走 readdirSync(apps) 自发现，不引用本表
 * （纯目录枚举、无端口/路由元数据诉求）。
 *
 * 为什么用 .mjs 而不是 .ts：eslint.config.mjs 由 ESLint 直接加载，Node 不带
 * --experimental-strip-types，读不了 .ts；故运行时单源必须是纯 ESM 形态，
 * 类型镜像在 apps-registry.d.mts（改字段时两处同步）。
 *
 * 新增第 7 个 app 的步骤：apps/<name> 目录 + 本表追加一条 + vite.config portOffset
 * 同改（check-routes 端口双写锁死校验兜底，漏改即红）；网关路由表自动派生无需另改。
 */
export const APPS = [
  {
    name: 'admin',
    port: 5174,
    // 系统错误页宿主：无权限/404/500 兜底页必须可匿名访问（未登录命中错误也要求可到达）
    requiredRoutes: ['Forbidden', 'NotFound', 'ServerError'],
  },
  {
    name: 'docs',
    port: 5175,
    // 全公开 app：仅 404 兜底要求匿名可达
    requiredRoutes: ['NotFound'],
  },
  {
    name: 'portal',
    port: 5176,
    requiredRoutes: ['NotFound'],
  },
  {
    name: 'h5',
    port: 5177,
    requiredRoutes: ['NotFound'],
  },
  {
    name: 'big',
    port: 5178,
    requiredRoutes: ['NotFound'],
  },
  {
    name: 'auth',
    port: 5179,
    // Login：唯一含登录路由的 app；NotFound：登出落地页与 404 兜底同样要求匿名可达
    requiredRoutes: ['Login', 'NotFound'],
  },
]
