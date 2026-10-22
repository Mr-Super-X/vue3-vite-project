import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw, RouterScrollBehavior } from 'vue-router'
import { registerAppRouter } from '@vv/shared'
import { autoRegisteredRoutes } from './auto-register'
import { fallbackRoute } from './fallback'
import { setupAuthGuard } from './guards/auth'
import { setupRouterErrorBoundary } from './error-boundary'
import { ROUTER_CONFIG } from './config'
import { useTagsViewStore } from '@/store/modules/tags-view'

/**
 * 根路径重定向：访问 `/` 时跳到工作台（admin 登录后的默认落地页）。
 *
 * 为什么不放 fallback：fallback 是 catch-all（`/:pathMatch(.*)*`），会把 `/` 也吞掉
 * 跳到 `/404` —— 与"打开站点应该看到首页"的预期不符
 *
 * 为什么不放业务模块的 `routes/index.ts`：根路径不属于任何业务模块，
 * 是全局级入口，集中在 `router/` 目录管理
 *
 * P3-1 变更：原落地页 /home（portal 布局官网）独立为 apps/portal，
 * admin 落地页改为 /workbench（workbench 是 default 布局验收模块的 index 子路由）。
 *
 * 守卫行为：redirect 后 vue-router 会对 `/workbench` 重新触发守卫链
 * （白名单 → 可见性 → 登录态 → 远程菜单 → 权限），未登录用户最终经
 * `redirectToAuthLogin` 整页跳 apps/auth 登录页（P4，admin 内已无 /login 路由）
 *
 * @group 路由：根重定向
 */
const rootRedirect: RouteRecordRaw = {
  path: '/',
  redirect: '/workbench',
}

// 路由注册顺序：
//   1. rootRedirect      根路径 → 工作台（先匹配，避免被 fallback 拦截）
//   2. autoRegisteredRoutes：业务模块（src/modules/**/routes/index.ts），自动扫描
//   3. fallbackRoute：catch-all 404 兜底（必须在最后，单独注册避免字典序问题）
//
// history 模式由 ROUTER_CONFIG.historyMode 决定：
//   - web：主流，URL 干净（需要后端 SPA fallback）
//   - hash：URL 带 #，无需后端配合，适合子路径部署 / 静态托管
//   通过 .env.development 或 .env.production 设 VITE_HISTORY_MODE=hash|web 覆盖

// 路由切换后的滚动行为：
//   - 浏览器前进/后退（popstate）：用浏览器记录的 savedPosition
//   - 目标路由带 hash 锚点：平滑滚到对应元素（不同浏览器可能表现不一致）
//   - 其他导航：滚到页面顶部
const scrollBehavior: RouterScrollBehavior = (to, _from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash, behavior: 'smooth' }
  return { top: 0, left: 0 }
}

export const router = createRouter({
  history:
    ROUTER_CONFIG.historyMode === 'hash'
      ? createWebHashHistory(ROUTER_CONFIG.base)
      : createWebHistory(ROUTER_CONFIG.base),
  routes: [rootRedirect, ...autoRegisteredRoutes, fallbackRoute],
  scrollBehavior,
})

// 把实例注入 @vv/shared（useAppRouter / http 401 登出跳转经 DI 读取）；
// 必须先于 setupAuthGuard——守卫链内 checkLoginState / 远程菜单加载会触发请求与跳转
registerAppRouter(router)

setupAuthGuard(router)

// 错误边界：动态 import 失败 / 路由解析异常 → 跳 /500 错误页（见 error-boundary.ts）
setupRouterErrorBoundary(router)

// 多页签：每次路由切换后自动加入 visitedViews（layout 中通过 keep-alive :include 联动 cache）
// 注意：必须在 setupAuthGuard 后调用，否则未登录的 redirect 会污染 visitedViews
router.afterEach((to) => {
  useTagsViewStore().addRouteView(to)
})

export default router
