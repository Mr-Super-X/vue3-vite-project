import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { autoRegisteredRoutes } from './auto-register'
import { fallbackRoute } from './fallback'
import { setupAuthGuard } from './guards/auth'
import { setupRouterErrorBoundary } from './error-boundary'
import { ROUTER_CONFIG } from './config'

// 路由注册顺序：
//   1. autoRegisteredRoutes：业务模块（src/modules/**/routes/index.ts），自动扫描
//   2. fallbackRoute：catch-all 404 兜底（必须在最后，单独注册避免字典序问题）
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
  routes: [...autoRegisteredRoutes, fallbackRoute],
})

setupAuthGuard(router)

// 错误边界：动态 import 失败 / 路由解析异常 → 跳 /500 错误页（见 error-boundary.ts）
setupRouterErrorBoundary(router)

export default router
