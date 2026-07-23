import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { autoRegisteredRoutes } from './auto-register'
import { fallbackRoute } from './fallback'
import { setupAuthGuard } from './guards/auth'
import { setupRouterErrorBoundary } from './error-boundary'
import { ROUTER_CONFIG } from './config'
import { useTagsViewStore } from '@/store/modules/tags-view'

// 根路径重定向：访问 / 时跳到首页（仪表盘）
//
// 为什么不放 fallback：fallback 是 catch-all（/:pathMatch(.*)*），会把 / 也吞掉
// 跳到 /404 — 与"打开站点应该看到首页"的预期不符
//
// 为什么不放业务模块的 routes/index.ts：根路径不属于任何业务模块，
// 是全局级入口，集中在 router/ 目录管理
//
// 守卫行为：redirect 后 vue-router 会对 /home 重新触发守卫链
// （白名单 → 可见性 → 登录态 → 远程菜单 → 权限），未登录用户最终会跳 /login
const rootRedirect: RouteRecordRaw = {
  path: '/',
  redirect: '/home',
}

// 路由注册顺序：
//   1. rootRedirect      根路径 → 首页（先匹配，避免被 fallback 拦截）
//   2. autoRegisteredRoutes：业务模块（src/modules/**/routes/index.ts），自动扫描
//   3. fallbackRoute：catch-all 404 兜底（必须在最后，单独注册避免字典序问题）
//
// history 模式由 ROUTER_CONFIG.historyMode 决定：
//   - web：主流，URL 干净（需要后端 SPA fallback）
//   - hash：URL 带 #，无需后端配合，适合子路径部署 / 静态托管
//   通过 .env.development 或 .env.production 设 VITE_HISTORY_MODE=hash|web 覆盖
export const router = createRouter({
  history:
    ROUTER_CONFIG.historyMode === 'hash'
      ? createWebHashHistory(ROUTER_CONFIG.base)
      : createWebHistory(ROUTER_CONFIG.base),
  routes: [rootRedirect, ...autoRegisteredRoutes, fallbackRoute],
})

setupAuthGuard(router)

// 错误边界：动态 import 失败 / 路由解析异常 → 跳 /500 错误页（见 error-boundary.ts）
setupRouterErrorBoundary(router)

// 多页签：每次路由切换后自动加入 visitedViews（layout 中通过 keep-alive :include 联动 cache）
// 注意：必须在 setupAuthGuard 后调用，否则未登录的 redirect 会污染 visitedViews
router.afterEach((to) => {
  useTagsViewStore().addRouteView(to)
})

export default router
