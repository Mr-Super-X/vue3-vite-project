import { createRouter, createWebHistory } from 'vue-router'
import { autoRegisteredRoutes } from './auto-register'
import { fallbackRoute } from './fallback'
import { setupAuthGuard } from './guards/auth'

// 路由注册顺序：
//   1. autoRegisteredRoutes：业务模块（src/modules/**/routes/index.ts），自动扫描
//   2. fallbackRoute：catch-all 404 兜底（必须在最后，单独注册避免字典序问题）
export const router = createRouter({
  history: createWebHistory(),
  routes: [...autoRegisteredRoutes, fallbackRoute],
})

setupAuthGuard(router)

export default router
