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

// 路由加载错误全局捕获
// 触发场景：
//   1. 动态 import 失败（语法错误、循环依赖、chunks 加载失败）
//   2. 路由解析异常（如 component 字段无效）
// 行为：跳 /500 错误页，避免用户看到空白屏
router.onError((error) => {
  console.error('[router] 路由加载失败:', error)
  // 避免在 500 页面本身加载失败时无限递归
  if (router.currentRoute.value.path !== '/500') {
    router.push('/500').catch(() => {
      console.error('[router] 跳 /500 也失败:', error)
    })
  }
})

export default router
